import { Document, DocumentDetail, DocumentQueryResponse } from '../types/document';

export async function uploadDocument(file: File, token?: string | null): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload and parse document');
  }

  return res.json();
}

export async function fetchDocuments(token?: string | null): Promise<Document[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/documents/', { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch syllabus documents');
  }

  return res.json();
}

export async function fetchDocumentDetail(id: number, token?: string | null): Promise<DocumentDetail> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/documents/${id}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch document #${id}`);
  }

  return res.json();
}

export async function deleteDocument(id: number, token?: string | null): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete document #${id}`);
  }
}

export async function queryDocumentRAG(
  documentId: number,
  query: string,
  topK: number = 4,
  token?: string | null
): Promise<DocumentQueryResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/documents/${documentId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, top_k: topK }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to execute grounded document query');
  }

  return res.json();
}
