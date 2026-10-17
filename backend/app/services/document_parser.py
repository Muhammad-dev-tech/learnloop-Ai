import uuid
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
from fastapi import UploadFile, HTTPException, status
from pypdf import PdfReader
import docx

from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

def validate_and_save_upload(file: UploadFile) -> Tuple[Path, str, str]:
    """
    Validates file extension and size, then saves it with a secure unique UUID prefix.
    Returns: (saved_file_path, original_filename, file_type)
    """
    orig_name = file.filename or "uploaded_document.txt"
    ext = Path(orig_name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Sanitize and generate safe unique name
    clean_stem = re.sub(r'[^a-zA-Z0-9_\-.]', '_', Path(orig_name).stem)
    unique_name = f"{uuid.uuid4().hex}_{clean_stem}{ext}"
    dest_path = Path(settings.UPLOAD_DIR) / unique_name
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # Stream write with size validation
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_bytes = 0

    with open(dest_path, "wb") as out_f:
        while True:
            chunk = file.file.read(1024 * 64) # 64KB chunks
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                dest_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                )
            out_f.write(chunk)

    file_type = ext.lstrip(".").lower()
    return dest_path, orig_name, file_type

def extract_text_from_file(file_path: Path, file_type: str) -> List[Tuple[str, str]]:
    """
    Extracts text sections along with page or section tags.
    Returns: List of tuples (section_content, page_or_section_label)
    """
    sections: List[Tuple[str, str]] = []

    if file_type == "pdf":
        reader = PdfReader(str(file_path))
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                sections.append((text, f"Page {page_idx + 1}"))

    elif file_type == "docx":
        doc = docx.Document(str(file_path))
        current_heading = "Introduction"
        curr_section_paras = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            if p.style.name.startswith("Heading"):
                if curr_section_paras:
                    sections.append(("\n".join(curr_section_paras), current_heading))
                    curr_section_paras = []
                current_heading = text
            else:
                curr_section_paras.append(text)

        if curr_section_paras:
            sections.append(("\n".join(curr_section_paras), current_heading))

    else:  # txt or md
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                content = f.read()

        # Split into logical sections by double newline
        blocks = [b.strip() for b in content.split("\n\n") if b.strip()]
        for idx, block in enumerate(blocks):
            sections.append((block, f"Section {idx + 1}"))

    return sections

def chunk_text(
    sections: List[Tuple[str, str]],
    target_chunk_chars: int = 700,
    overlap_chars: int = 100
) -> List[Dict[str, Any]]:
    """
    Chunks extracted sections into overlapping contextual windows with provenance tracking.
    """
    chunks: List[Dict[str, Any]] = []
    chunk_index = 0

    for section_text, page_or_sec in sections:
        words = section_text.split()
        if not words:
            continue

        # If section is small, treat as single chunk
        if len(section_text) <= target_chunk_chars:
            chunks.append({
                "chunk_index": chunk_index,
                "content": section_text,
                "page_or_section": page_or_sec
            })
            chunk_index += 1
            continue

        # Build chunks with word boundaries and overlap
        curr_words: List[str] = []
        curr_len = 0

        for word in words:
            curr_words.append(word)
            curr_len += len(word) + 1
            if curr_len >= target_chunk_chars:
                chunk_str = " ".join(curr_words)
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk_str,
                    "page_or_section": page_or_sec
                })
                chunk_index += 1
                # Overlap: keep last ~20% of words
                overlap_count = max(1, len(curr_words) // 5)
                curr_words = curr_words[-overlap_count:]
                curr_len = sum(len(w) + 1 for w in curr_words)

        if curr_words:
            chunk_str = " ".join(curr_words)
            if chunk_str:
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk_str,
                    "page_or_section": page_or_sec
                })
                chunk_index += 1

    return chunks
