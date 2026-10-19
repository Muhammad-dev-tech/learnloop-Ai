// Centralized API configuration supporting local proxy and production cloud backend
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function parseApiResponse<T>(res: Response, defaultError: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      if (res.status === 405 || res.status === 404) {
        throw new Error('Cannot reach backend server. Please ensure VITE_API_URL is configured in your Vercel project settings and the deployment is rebuilt.');
      }
      throw new Error(`Server returned HTTP ${res.status}. If the backend was sleeping on Render free tier, please wait 30 seconds and try again.`);
    }
    throw new Error('Received unexpected response format from server.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.detail || defaultError);
  }
  return data as T;
}
