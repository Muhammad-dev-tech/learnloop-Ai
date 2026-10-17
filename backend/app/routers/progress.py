from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.academic import Topic, Subject
from app.models.progress import StudentTopicProgress, Recommendation
from app.schemas.progress import (
    StudentTopicProgressRead,
    RecommendationRead,
    OverallStudentMasterySummary
)

router = APIRouter(prefix="/api/progress", tags=["Knowledge Tracing & Mastery Analytics"])

@router.get("/summary", response_model=OverallStudentMasterySummary)
async def get_student_mastery_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes the student's holistic knowledge tracing profile, including per-topic mastery scores,
    difficulty levels, active learning recommendations, and detected misconceptions.
    Guarantees strict multi-tenant account isolation.
    """
    # 1. Fetch topic progress
    query_progress = (
        select(StudentTopicProgress)
        .options(
            selectinload(StudentTopicProgress.topic).selectinload(Topic.subject)
        )
        .where(StudentTopicProgress.user_id == current_user.id)
        .order_by(StudentTopicProgress.estimated_mastery.asc())
    )
    res_progress = await db.execute(query_progress)
    progress_records = res_progress.scalars().all()

    # 2. Fetch pending recommendations
    query_rec = (
        select(Recommendation)
        .options(selectinload(Recommendation.user))
        .where(Recommendation.user_id == current_user.id, Recommendation.status == "pending")
        .order_by(Recommendation.created_at.desc())
    )
    res_rec = await db.execute(query_rec)
    recommendation_records = res_rec.scalars().all()

    # Transform progress records
    progress_list = []
    total_attempts_all = 0
    total_correct_all = 0
    mastery_scores = []
    all_tags = set()

    for p in progress_records:
        topic_name = p.topic.name if p.topic else f"Topic #{p.topic_id}"
        subject_name = p.topic.subject.name if p.topic and p.topic.subject else None
        progress_list.append(
            StudentTopicProgressRead(
                id=p.id,
                user_id=p.user_id,
                topic_id=p.topic_id,
                topic_name=topic_name,
                subject_name=subject_name,
                total_attempts=p.total_attempts,
                correct_attempts=p.correct_attempts,
                recent_attempts=p.recent_attempts,
                recent_correct=p.recent_correct,
                current_difficulty=p.current_difficulty,
                estimated_mastery=p.estimated_mastery,
                misconception_tags=p.misconception_tags or [],
                consecutive_correct=p.consecutive_correct,
                consecutive_incorrect=p.consecutive_incorrect,
                last_practiced_at=p.last_practiced_at
            )
        )
        total_attempts_all += p.total_attempts
        total_correct_all += p.correct_attempts
        mastery_scores.append(p.estimated_mastery)
        for t in (p.misconception_tags or []):
            all_tags.add(t)

    # Transform recommendations
    rec_list = []
    for r in recommendation_records:
        t_name = None
        if r.topic_id:
            t_res = await db.execute(select(Topic).where(Topic.id == r.topic_id))
            t_obj = t_res.scalars().first()
            if t_obj:
                t_name = t_obj.name

        rec_list.append(
            RecommendationRead(
                id=r.id,
                user_id=r.user_id,
                topic_id=r.topic_id,
                topic_name=t_name,
                recommendation_type=r.recommendation_type,
                explanation=r.explanation,
                status=r.status,
                created_at=r.created_at
            )
        )

    overall_mastery = round(sum(mastery_scores) / len(mastery_scores), 1) if mastery_scores else 0.0
    global_accuracy = round((total_correct_all / total_attempts_all * 100), 1) if total_attempts_all > 0 else 0.0

    return OverallStudentMasterySummary(
        overall_mastery_index=overall_mastery,
        total_topics_practiced=len(progress_records),
        total_questions_answered=total_attempts_all,
        global_accuracy_rate=global_accuracy,
        topic_progress=progress_list,
        active_recommendations=rec_list,
        all_misconception_tags=sorted(list(all_tags))
    )

@router.post("/recommendations/{rec_id}/dismiss", response_model=RecommendationRead)
async def dismiss_recommendation(
    rec_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Marks a diagnostic learning recommendation as dismissed or completed."""
    query = select(Recommendation).where(Recommendation.id == rec_id, Recommendation.user_id == current_user.id)
    res = await db.execute(query)
    rec = res.scalars().first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recommendation with ID {rec_id} not found or access denied."
        )

    rec.status = "dismissed"
    await db.commit()
    await db.refresh(rec)

    return RecommendationRead(
        id=rec.id,
        user_id=rec.user_id,
        topic_id=rec.topic_id,
        recommendation_type=rec.recommendation_type,
        explanation=rec.explanation,
        status=rec.status,
        created_at=rec.created_at
    )
