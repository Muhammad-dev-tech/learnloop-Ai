import { 
  Question, 
  SubmitAnswerResponse, 
  QuizAttempt, 
  StudentAssessmentStats 
} from '../types/assessment';
import { DifficultyLevel } from '../types/session';
import { API_BASE_URL, parseApiResponse } from './config';

function getAuthToken(token?: string | null): string | null {
  return token || localStorage.getItem('learnloop_token');
}

export interface GenerateQuizParams {
  topic_id?: number;
  difficulty?: DifficultyLevel;
  count?: number;
  document_id?: number;
}

export async function generateQuiz(
  params: GenerateQuizParams,
  token?: string | null
): Promise<Question[]> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/assessment/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      topic_id: params.topic_id,
      difficulty: params.difficulty || 'intermediate',
      count: params.count || 4,
      document_id: params.document_id || null,
    }),
  });

  return parseApiResponse<Question[]>(res, 'Failed to generate quiz questions');
}

export async function submitQuizAnswer(
  questionId: number,
  selectedAnswer: string,
  sessionId?: number,
  token?: string | null
): Promise<SubmitAnswerResponse> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/assessment/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      question_id: questionId,
      selected_answer: selectedAnswer,
      session_id: sessionId || null,
    }),
  });

  return parseApiResponse<SubmitAnswerResponse>(res, 'Failed to submit quiz answer');
}

export async function fetchQuizHistory(token?: string | null): Promise<QuizAttempt[]> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/assessment/history`, { headers });
  return parseApiResponse<QuizAttempt[]>(res, 'Failed to fetch assessment history');
}

export async function fetchAssessmentStats(token?: string | null): Promise<StudentAssessmentStats> {
  const authToken = getAuthToken(token);
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/assessment/stats`, { headers });
  return parseApiResponse<StudentAssessmentStats>(res, 'Failed to fetch student assessment statistics');
}
