import { Document, DocumentDetail, DocumentQueryResponse } from '../types/document';
import { API_BASE_URL, parseApiResponse } from './config';

function getAuthToken(token?: string | null): string | null {
  return token || localStorage.getItem('learnloop_token');
}

export async function uploadDocument(file: File, token?: string | null): Promise<Document> {
  const authToken = getAuthToken(token);
  if (!authToken) {
    throw new Error('Please sign in to your student account to upload course documents.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${authToken}`
  };

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  return parseApiResponse<Document>(res, 'Failed to upload and parse document');
}

export async function fetchDocuments(token?: string | null): Promise<Document[]> {
  const authToken = getAuthToken(token);
  if (!authToken) {
    // If not logged in, return empty list gracefully without throwing 401
    return [];
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${authToken}`
  };

  const res = await fetch(`${API_BASE_URL}/api/documents/`, { headers });
  return parseApiResponse<Document[]>(res, 'Failed to fetch syllabus documents');
}

export async function fetchDocumentDetail(id: number, token?: string | null): Promise<DocumentDetail> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, { headers });
  return parseApiResponse<DocumentDetail>(res, `Failed to fetch document #${id}`);
}

export async function deleteDocument(id: number, token?: string | null): Promise<void> {
  const authToken = getAuthToken(token);
  if (!authToken) {
    throw new Error('Please sign in to delete documents.');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${authToken}`
  };

  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
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
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/documents/${documentId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, top_k: topK }),
  });

  return parseApiResponse<DocumentQueryResponse>(res, 'Failed to execute grounded document query');
}
