export interface TopicMasteryProgress {
  topic_id: number;
  topic_name: string;
  subject_name: string;
  mastery_score: number;
  total_quizzes_taken: number;
  total_questions_attempted: number;
  total_correct: number;
  accuracy_percentage: number;
  streak_count: number;
  recommended_difficulty: 'beginner' | 'intermediate' | 'advanced';
  misconceptions_detected: string[];
  last_activity_at: string | null;
}

export interface RecommendationItem {
  id: number;
  topic_id: number | null;
  topic_name: string | null;
  recommendation_type: 'remediation' | 'advancement' | 'practice';
  title: string;
  message: string;
  suggested_action: string;
  suggested_mode: 'tutor' | 'teach_me' | 'challenge' | 'notes';
  is_active: boolean;
  created_at: string;
}

export interface StudentMasterySummary {
  student_id: number;
  student_name: string;
  overall_mastery_index: number;
  topics_tracked_count: number;
  total_quizzes_completed: number;
  total_questions_answered: number;
  overall_accuracy_percentage: number;
  topics_progress: TopicMasteryProgress[];
  active_recommendations: RecommendationItem[];
  mastery_tier: 'Novice' | 'Developing' | 'Proficient' | 'Mastery';
}
