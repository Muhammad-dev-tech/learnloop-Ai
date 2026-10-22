import { 
  LearningSession, 
  SessionDetail, 
  SendMessageResponse, 
  LearningMode, 
  DifficultyLevel 
} from '../types/session';
import { API_BASE_URL, parseApiResponse } from './config';

function getAuthToken(token?: string | null): string | null {
  return token || localStorage.getItem('learnloop_token');
}

export interface CreateSessionParams {
  topic_id?: number;
  document_id?: number;
  session_type?: string;
  current_difficulty?: DifficultyLevel;
  learning_mode?: LearningMode;
}

export async function createSession(params: CreateSessionParams, token?: string | null): Promise<SessionDetail> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/sessions/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic_id: params.topic_id,
      document_id: params.document_id,
      session_type: params.session_type || (params.document_id ? 'document' : 'topic'),
      current_difficulty: params.current_difficulty || 'beginner',
      learning_mode: params.learning_mode || 'tutor',
    }),
  });

  return parseApiResponse<SessionDetail>(res, 'Failed to create learning session');
}

export async function fetchUserSessions(token?: string | null): Promise<LearningSession[]> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/sessions/`, { headers });
  return parseApiResponse<LearningSession[]>(res, 'Failed to fetch user learning sessions');
}

export async function fetchSessionDetail(sessionId: number, token?: string | null): Promise<SessionDetail> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, { headers });
  return parseApiResponse<SessionDetail>(res, `Failed to fetch session #${sessionId}`);
}

export async function sendMessageToTutor(
  sessionId: number,
  content: string,
  learningMode?: LearningMode,
  token?: string | null,
  documentId?: number
): Promise<SendMessageResponse> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content,
      learning_mode: learningMode,
      document_id: documentId || null,
    }),
  });

  return parseApiResponse<SendMessageResponse>(res, 'Failed to send message to AI Tutor');
}
