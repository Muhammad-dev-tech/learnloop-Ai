export interface DocumentChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  page_or_section?: string;
  created_at: string;
}

export interface Document {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message?: string;
  chunk_count: number;
  created_at: string;
}

export interface DocumentDetail extends Document {
  chunks: DocumentChunk[];
}

export interface Citation {
  source_document: string;
  page_or_section: string;
  snippet: string;
  score: number;
}

export interface DocumentQueryResponse {
  document_id: number;
  document_title: string;
  query: string;
  answer: string;
  citations: Citation[];
  model_used: string;
}
