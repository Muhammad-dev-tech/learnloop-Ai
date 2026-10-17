import { DifficultyLevel } from './session';

export interface Question {
  id: number;
  topic_id?: number;
  objective_id?: number;
  question_type: string;
  question_text: string;
  options: string[];
  difficulty: DifficultyLevel;
  created_at: string;
}

export interface SubmitAnswerResponse {
  attempt_id: number;
  question_id: number;
  selected_answer: string;
  is_correct: boolean;
  score: number;
  correct_answer: string;
  explanation: string;
  feedback: string;
  misconception_tag?: string;
}

export interface QuizAttempt {
  id: number;
  user_id: number;
  question_id: number;
  session_id?: number;
  selected_answer: string;
  is_correct: boolean;
  score: number;
  feedback: string;
  misconception_tag?: string;
  created_at: string;
}

export interface StudentAssessmentStats {
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  average_score: number;
  recent_attempts: QuizAttempt[];
}
