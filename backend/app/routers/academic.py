from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.models.academic import Subject, Topic, LearningObjective
from app.schemas.academic import SubjectRead, SubjectDetailRead, TopicDetailRead, LearningObjectiveRead

router = APIRouter(prefix="/api/academic", tags=["Academic Curriculum"])

@router.get("/subjects", response_model=List[SubjectRead])
async def list_subjects(db: AsyncSession = Depends(get_db)):
    """Fetch all academic subjects and their associated topics."""
    query = select(Subject).options(selectinload(Subject.topics)).order_by(Subject.id)
    result = await db.execute(query)
    subjects = result.scalars().all()
    return subjects

@router.get("/subjects/{subject_id}", response_model=SubjectDetailRead)
async def get_subject_detail(subject_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch detailed information for a single subject including all topics and objectives."""
    query = (
        select(Subject)
        .options(selectinload(Subject.topics).selectinload(Topic.learning_objectives))
        .where(Subject.id == subject_id)
    )
    result = await db.execute(query)
    subject = result.scalars().first()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {subject_id} not found."
        )
    return subject

@router.get("/topics/{topic_id}", response_model=TopicDetailRead)
async def get_topic_detail(topic_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch a specific topic with all of its granular learning objectives."""
    query = (
        select(Topic)
        .options(selectinload(Topic.learning_objectives))
        .where(Topic.id == topic_id)
    )
    result = await db.execute(query)
    topic = result.scalars().first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} not found."
        )
    return topic

@router.get("/topics/{topic_id}/objectives", response_model=List[LearningObjectiveRead])
async def get_topic_objectives(topic_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve all learning objectives defined for a specific topic."""
    # Ensure topic exists
    topic_query = select(Topic).where(Topic.id == topic_id)
    topic_res = await db.execute(topic_query)
    if not topic_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} not found."
        )

    query = (
        select(LearningObjective)
        .where(LearningObjective.topic_id == topic_id)
        .order_by(LearningObjective.id)
    )
    result = await db.execute(query)
    objectives = result.scalars().all()
    return objectives
