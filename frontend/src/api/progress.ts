import { StudentMasterySummary } from '../types/progress';

export async function fetchMasterySummary(
  token?: string | null
): Promise<StudentMasterySummary> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/progress/summary', {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch student mastery summary');
  }

  return res.json();
}

export async function dismissRecommendation(
  recId: number,
  token?: string | null
): Promise<{ status: string; recommendation_id: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/progress/recommendations/${recId}/dismiss`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to dismiss recommendation');
  }

  return res.json();
}
