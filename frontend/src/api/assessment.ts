import { 
  Question, 
  SubmitAnswerResponse, 
  QuizAttempt, 
  StudentAssessmentStats 
} from '../types/assessment';
import { DifficultyLevel } from '../types/session';

export interface GenerateQuizParams {
  topic_id: number;
  difficulty?: DifficultyLevel;
  count?: number;
  document_id?: number;
}

export async function generateQuiz(
  params: GenerateQuizParams,
  token?: string | null
): Promise<Question[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/assessment/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic_id: params.topic_id,
      difficulty: params.difficulty || 'intermediate',
      count: params.count || 4,
      document_id: params.document_id || null,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to generate quiz questions');
  }

  return res.json();
}

export async function submitQuizAnswer(
  questionId: number,
  selectedAnswer: string,
  sessionId?: number,
  token?: string | null
): Promise<SubmitAnswerResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/assessment/submit', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question_id: questionId,
      selected_answer: selectedAnswer,
      session_id: sessionId || null,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit quiz answer');
  }

  return res.json();
}

export async function fetchQuizHistory(token?: string | null): Promise<QuizAttempt[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/assessment/history', { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch assessment history');
  }

  return res.json();
}

export async function fetchAssessmentStats(token?: string | null): Promise<StudentAssessmentStats> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/assessment/stats', { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch student assessment statistics');
  }

  return res.json();
}
