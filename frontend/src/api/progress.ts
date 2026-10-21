import { StudentMasterySummary } from '../types/progress';
import { API_BASE_URL, parseApiResponse } from './config';

function getAuthToken(token?: string | null): string | null {
  return token || localStorage.getItem('learnloop_token');
}

export async function fetchMasterySummary(
  token?: string | null
): Promise<StudentMasterySummary> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/progress/summary`, {
    method: 'GET',
    headers,
  });

  return parseApiResponse<StudentMasterySummary>(res, 'Failed to fetch student mastery summary');
}

export async function dismissRecommendation(
  recId: number,
  token?: string | null
): Promise<{ status: string; recommendation_id: number }> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/progress/recommendations/${recId}/dismiss`, {
    method: 'POST',
    headers,
  });

  return parseApiResponse<{ status: string; recommendation_id: number }>(res, 'Failed to dismiss recommendation');
}
