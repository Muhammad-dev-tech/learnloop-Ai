export interface LearningObjective {
  id: number;
  topic_id: number;
  objective_text: string;
  created_at: string;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
  learning_objectives?: LearningObjective[];
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  topics: Topic[];
}
