import { 
  LearningSession, 
  SessionDetail, 
  SendMessageResponse, 
  LearningMode, 
  DifficultyLevel 
} from '../types/session';

export interface CreateSessionParams {
  topic_id: number;
  session_type?: string;
  current_difficulty?: DifficultyLevel;
  learning_mode?: LearningMode;
}

export async function createSession(params: CreateSessionParams, token?: string | null): Promise<SessionDetail> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/sessions/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic_id: params.topic_id,
      session_type: params.session_type || 'topic',
      current_difficulty: params.current_difficulty || 'beginner',
      learning_mode: params.learning_mode || 'tutor',
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create learning session');
  }

  return res.json();
}

export async function fetchUserSessions(token?: string | null): Promise<LearningSession[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/sessions/', { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch user learning sessions');
  }

  return res.json();
}

export async function fetchSessionDetail(sessionId: number, token?: string | null): Promise<SessionDetail> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/sessions/${sessionId}`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch session #${sessionId}`);
  }

  return res.json();
}

export async function sendMessageToTutor(
  sessionId: number,
  content: string,
  learningMode?: LearningMode,
  token?: string | null
): Promise<SendMessageResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content,
      learning_mode: learningMode,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to send message to AI Tutor');
  }

  return res.json();
}
