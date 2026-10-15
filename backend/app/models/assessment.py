from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    objective_id = Column(Integer, ForeignKey("learning_objectives.id", ondelete="SET NULL"), nullable=True)
    question_type = Column(String(50), nullable=False) # 'multiple_choice', 'short_answer', 'true_false'
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True) # list of options for multiple_choice
    correct_answer = Column(Text, nullable=False) # server-side correct answer / criteria (never exposed before submission)
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(50), default="intermediate", nullable=False) # 'beginner', 'intermediate', 'advanced'
    source_metadata = Column(JSON, nullable=True) # doc id, page, chunk references for doc-grounded questions
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic = relationship("Topic", back_populates="questions")
    learning_objective = relationship("LearningObjective", back_populates="questions")
    attempts = relationship("QuizAttempt", back_populates="question")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("learning_sessions.id", ondelete="SET NULL"), nullable=True)
    submission_id = Column(String(100), unique=True, index=True, nullable=True) # idempotency key
    selected_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    feedback = Column(Text, nullable=False)
    misconception_tag = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="quiz_attempts")
    question = relationship("Question", back_populates="attempts")
    session = relationship("LearningSession", back_populates="quiz_attempts")
