export type LearningMode = 'tutor' | 'teach_me' | 'challenge' | 'notes';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source_references?: any;
  created_at: string;
}

export interface LearningSession {
  id: number;
  user_id: number;
  topic_id?: number;
  topic_name?: string;
  subject_name?: string;
  session_type: string;
  current_difficulty: DifficultyLevel;
  status: string;
  created_at: string;
  completed_at?: string;
  conversation_id?: number;
  learning_mode?: LearningMode;
}

export interface SessionDetail extends LearningSession {
  messages: Message[];
}

export interface SendMessageResponse {
  user_message: Message;
  assistant_message: Message;
  suggested_followups: string[];
  model_used: string;
}
