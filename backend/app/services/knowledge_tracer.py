import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.progress import StudentTopicProgress, Recommendation
from app.models.academic import Topic

logger = logging.getLogger(__name__)

def calculate_mastery_score(
    total_attempts: int,
    correct_attempts: int,
    recent_attempts: int,
    recent_correct: int,
    consecutive_correct: int
) -> float:
    """
    Computes a heuristic mastery score in [0.0, 100.0]%.
    Balances overall historical performance (40%) with recent short-term trend (60%),
    plus bonuses for consecutive correct streaks.
    """
    if total_attempts == 0:
        return 0.0

    overall_ratio = correct_attempts / total_attempts
    recent_ratio = (recent_correct / recent_attempts) if recent_attempts > 0 else overall_ratio

    # 40% overall + 60% recent trend
    weighted_score = (overall_ratio * 40.0) + (recent_ratio * 60.0)

    # Streak bonus (up to 10 extra points)
    streak_bonus = min(10.0, consecutive_correct * 2.5)
    final_mastery = min(100.0, weighted_score + streak_bonus)

    return round(final_mastery, 1)

async def update_student_mastery(
    db: AsyncSession,
    user_id: int,
    topic_id: int,
    is_correct: bool,
    misconception_tag: Optional[str] = None
) -> StudentTopicProgress:
    """
    Updates the student's longitudinal topic progress record, adjusts mastery,
    evaluates difficulty promotion/demotion, and generates actionable recommendations.
    """
    query = (
        select(StudentTopicProgress)
        .where(
            StudentTopicProgress.user_id == user_id,
            StudentTopicProgress.topic_id == topic_id
        )
    )
    res = await db.execute(query)
    progress = res.scalars().first()

    if not progress:
        progress = StudentTopicProgress(
            user_id=user_id,
            topic_id=topic_id,
            total_attempts=0,
            correct_attempts=0,
            recent_attempts=0,
            recent_correct=0,
            current_difficulty="beginner",
            estimated_mastery=0.0,
            misconception_tags=[],
            consecutive_correct=0,
            consecutive_incorrect=0
        )
        db.add(progress)
        await db.flush()

    # Update attempt counters
    progress.total_attempts += 1
    if is_correct:
        progress.correct_attempts += 1
        progress.consecutive_correct += 1
        progress.consecutive_incorrect = 0
    else:
        progress.consecutive_incorrect += 1
        progress.consecutive_correct = 0

    # Update recent sliding window (cap at 5)
    if progress.recent_attempts < 5:
        progress.recent_attempts += 1
        if is_correct:
            progress.recent_correct += 1
    else:
        # Simple moving estimate
        if is_correct and progress.recent_correct < 5:
            progress.recent_correct += 1
        elif not is_correct and progress.recent_correct > 0:
            progress.recent_correct -= 1

    # Record misconception tag if any
    if misconception_tag and not is_correct:
        tags = list(progress.misconception_tags or [])
        if misconception_tag not in tags:
            tags.append(misconception_tag)
            progress.misconception_tags = tags

    # Compute new mastery score
    progress.estimated_mastery = calculate_mastery_score(
        total_attempts=progress.total_attempts,
        correct_attempts=progress.correct_attempts,
        recent_attempts=progress.recent_attempts,
        recent_correct=progress.recent_correct,
        consecutive_correct=progress.consecutive_correct
    )

    # Dynamic Difficulty Scaling
    topic_res = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = topic_res.scalars().first()
    topic_name = topic.name if topic else "this topic"

    if progress.estimated_mastery >= 85.0 and progress.consecutive_correct >= 3:
        if progress.current_difficulty == "beginner":
            progress.current_difficulty = "intermediate"
            rec = Recommendation(
                user_id=user_id,
                topic_id=topic_id,
                recommendation_type="advance_difficulty",
                explanation=f"Outstanding work! You've mastered beginner concepts in {topic_name}. Ready to advance to Intermediate difficulty."
            )
            db.add(rec)
        elif progress.current_difficulty == "intermediate":
            progress.current_difficulty = "advanced"
            rec = Recommendation(
                user_id=user_id,
                topic_id=topic_id,
                recommendation_type="advance_difficulty",
                explanation=f"High proficiency reached in {topic_name}! Advanced architectural and edge-case challenges unlocked."
            )
            db.add(rec)

    elif progress.estimated_mastery < 45.0 and progress.consecutive_incorrect >= 2:
        tag_desc = f" especially around '{misconception_tag.replace('_', ' ')}'" if misconception_tag else ""
        rec = Recommendation(
            user_id=user_id,
            topic_id=topic_id,
            recommendation_type="review_weak_topic",
            explanation=f"Targeted review recommended for {topic_name}{tag_desc}. Switch to Socratic Mode with your AI tutor to clarify foundational mechanics."
        )
        db.add(rec)

    await db.commit()
    await db.refresh(progress)
    return progress
