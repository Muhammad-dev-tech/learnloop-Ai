from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any
from datetime import datetime

class QuestionStudentRead(BaseModel):
    id: int
    topic_id: Optional[int] = None
    objective_id: Optional[int] = None
    question_type: str
    question_text: str
    options: Optional[List[str]] = None
    difficulty: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class QuestionDetailRead(QuestionStudentRead):
    correct_answer: str
    explanation: str
    misconception_tag: Optional[str] = None

class GenerateQuizRequest(BaseModel):
    topic_id: int = Field(..., description="Target academic topic ID")
    difficulty: Optional[str] = Field(default="intermediate", description="'beginner', 'intermediate', or 'advanced'")
    count: Optional[int] = Field(default=4, ge=1, le=10, description="Number of questions to generate (1-10)")
    document_id: Optional[int] = Field(default=None, description="Optional document ID for syllabus-grounded questions")

class SubmitAnswerRequest(BaseModel):
    question_id: int = Field(..., description="ID of question being answered")
    selected_answer: str = Field(..., min_length=1, description="Student's submitted answer text or chosen option")
    session_id: Optional[int] = Field(default=None, description="Optional associated learning session ID")

class SubmitAnswerResponse(BaseModel):
    attempt_id: int
    question_id: int
    selected_answer: str
    is_correct: bool
    score: float
    correct_answer: str
    explanation: str
    feedback: str
    misconception_tag: Optional[str] = None

class QuizAttemptRead(BaseModel):
    id: int
    user_id: int
    question_id: int
    session_id: Optional[int] = None
    selected_answer: str
    is_correct: bool
    score: float
    feedback: str
    misconception_tag: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StudentAssessmentStats(BaseModel):
    total_attempts: int
    correct_attempts: int
    accuracy_rate: float
    average_score: float
    recent_attempts: List[QuizAttemptRead] = []
