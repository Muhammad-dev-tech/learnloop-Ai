from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from pathlib import Path

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.schemas.document import (
    DocumentRead,
    DocumentDetailRead,
    DocumentQueryRequest,
    DocumentQueryResponse,
    Citation
)
from app.services.document_parser import (
    validate_and_save_upload,
    extract_text_from_file,
    chunk_text
)
from app.services.rag_retriever import query_document_rag

router = APIRouter(prefix="/api/documents", tags=["Syllabus & Document RAG"])

@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
@router.post("/upload/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a course syllabus or lecture notes document (PDF, DOCX, TXT, MD).
    Saves the file securely, extracts text per section/page, generates overlapping chunks,
    and isolates access strictly to the authenticated student.
    """
    saved_path, orig_filename, file_type = validate_and_save_upload(file)

    try:
        file_size = saved_path.stat().st_size

        # Create Document record
        doc = Document(
            user_id=current_user.id,
            filename=orig_filename,
            safe_filename=saved_path.name,
            file_type=file_type,
            file_size=file_size,
            processing_status="processing"
        )
        db.add(doc)
        await db.flush()

        # Extract text per page/section
        sections = extract_text_from_file(saved_path, file_type)
        if not sections:
            doc.processing_status = "failed"
            doc.error_message = "No readable text content found in document."
            await db.commit()
            await db.refresh(doc)
            return doc

        # Chunk text
        chunks_data = chunk_text(sections)
        for c in chunks_data:
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=c["chunk_index"],
                content=c["content"],
                page_or_section=c["page_or_section"]
            )
            db.add(chunk)

        doc.chunk_count = len(chunks_data)
        doc.processing_status = "ready"
        await db.commit()
        await db.refresh(doc)
        return doc

    except Exception as e:
        # Cleanup uploaded file on unexpected failure
        saved_path.unlink(missing_ok=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing and processing document: {str(e)}"
        )

@router.get("", response_model=List[DocumentRead])
@router.get("/", response_model=List[DocumentRead])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all documents uploaded by the current student, ordered chronologically."""
    query = (
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{document_id}", response_model=DocumentDetailRead)
async def get_document_detail(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve details and all chunks for a specific document.
    Enforces account isolation: only the owner can view their document.
    """
    query = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id, Document.user_id == current_user.id)
    )
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found or access denied."
        )
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes an uploaded document, its associated chunks, and removes the physical file from disk.
    """
    query = select(Document).where(Document.id == document_id, Document.user_id == current_user.id)
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found or access denied."
        )

    # Remove physical file
    file_path = Path(settings.UPLOAD_DIR) / doc.safe_filename
    file_path.unlink(missing_ok=True)

    await db.delete(doc)
    await db.commit()
    return None

@router.post("/{document_id}/query", response_model=DocumentQueryResponse)
async def query_document(
    document_id: int,
    payload: DocumentQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform a syllabus-grounded RAG query against an uploaded document.
    Retrieves the most relevant chunks and generates an AI answer with verified citations.
    """
    query = (
        select(Document)
        .options(selectinload(Document.chunks))
        .where(Document.id == document_id, Document.user_id == current_user.id)
    )
    res = await db.execute(query)
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found or access denied."
        )

    if doc.processing_status != "ready" or not doc.chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not ready for querying or has no text chunks."
        )

    rag_result = await query_document_rag(
        query=payload.query,
        document_title=doc.filename,
        chunks=doc.chunks,
        top_k=payload.top_k or 4
    )

    citations_out = [
        Citation(
            source_document=c["source_document"],
            page_or_section=c["page_or_section"],
            snippet=c["snippet"],
            score=c["score"]
        )
        for c in rag_result["citations"]
    ]

    return DocumentQueryResponse(
        document_id=doc.id,
        document_title=doc.filename,
        query=payload.query,
        answer=rag_result["answer"],
        citations=citations_out,
        model_used=rag_result["model_used"]
    )
