from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class StudentTopicProgressRead(BaseModel):
    id: int
    user_id: int
    topic_id: int
    topic_name: str
    subject_name: Optional[str] = None
    total_attempts: int
    correct_attempts: int
    recent_attempts: int
    recent_correct: int
    current_difficulty: str
    estimated_mastery: float
    misconception_tags: List[str] = []
    consecutive_correct: int
    consecutive_incorrect: int
    last_practiced_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RecommendationRead(BaseModel):
    id: int
    user_id: int
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    recommendation_type: str
    explanation: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OverallStudentMasterySummary(BaseModel):
    overall_mastery_index: float
    total_topics_practiced: int
    total_questions_answered: int
    global_accuracy_rate: float
    topic_progress: List[StudentTopicProgressRead] = []
    active_recommendations: List[RecommendationRead] = []
    all_misconception_tags: List[str] = []
