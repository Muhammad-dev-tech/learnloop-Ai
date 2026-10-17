from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class DocumentChunkRead(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    content: str
    page_or_section: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentRead(BaseModel):
    id: int
    user_id: int
    filename: str
    file_type: str
    file_size: int
    processing_status: str
    error_message: Optional[str] = None
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailRead(DocumentRead):
    chunks: List[DocumentChunkRead] = []

class DocumentQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000, description="The student's question to answer from the document")
    top_k: Optional[int] = Field(default=4, ge=1, le=10, description="Number of source chunks to retrieve")

class Citation(BaseModel):
    source_document: str
    page_or_section: str
    snippet: str
    score: float

class DocumentQueryResponse(BaseModel):
    document_id: int
    document_title: str
    query: str
    answer: str
    citations: List[Citation] = []
    model_used: str
