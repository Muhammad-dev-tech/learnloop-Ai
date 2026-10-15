from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, JSON, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class StudentTopicProgress(Base):
    __tablename__ = "student_topic_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    total_attempts = Column(Integer, default=0, nullable=False)
    correct_attempts = Column(Integer, default=0, nullable=False)
    recent_attempts = Column(Integer, default=0, nullable=False) # last <= 5 attempts
    recent_correct = Column(Integer, default=0, nullable=False)  # correct in last <= 5
    current_difficulty = Column(String(50), default="beginner", nullable=False) # 'beginner', 'intermediate', 'advanced'
    estimated_mastery = Column(Float, default=0.0, nullable=False) # heuristic 0.0 - 100.0%
    misconception_tags = Column(JSON, default=list, nullable=False) # list of tags identified
    consecutive_correct = Column(Integer, default=0, nullable=False)
    consecutive_incorrect = Column(Integer, default=0, nullable=False)
    last_practiced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'topic_id', name='uq_user_topic_progress'),
    )

    user = relationship("User", back_populates="topic_progress")
    topic = relationship("Topic", back_populates="student_progress")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    recommendation_type = Column(String(50), nullable=False) # 'review_weak_topic', 'advance_difficulty', 'revisit_prerequisite'
    explanation = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False) # 'pending', 'completed', 'dismissed'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="recommendations")
