from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.academic import Topic
from app.models.document import Document
from app.models.assessment import Question, QuizAttempt
from app.schemas.assessment import (
    GenerateQuizRequest,
    QuestionStudentRead,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    QuizAttemptRead,
    StudentAssessmentStats
)
from app.services.assessment_engine import generate_quiz_questions, evaluate_answer
from app.services.knowledge_tracer import update_student_mastery

router = APIRouter(prefix="/api/assessment", tags=["Automated Formative Assessment & Quizzing"])

@router.post("/generate", response_model=List[QuestionStudentRead], status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: GenerateQuizRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically generates curriculum-aligned diagnostic quiz questions for a topic.
    Stores the questions server-side and returns them without revealing correct answers.
    """
    topic_query = (
        select(Topic)
        .options(selectinload(Topic.learning_objectives))
        .where(Topic.id == payload.topic_id)
    )
    topic_res = await db.execute(topic_query)
    topic = topic_res.scalars().first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {payload.topic_id} not found."
        )

    # Optional syllabus document grounding context
    doc_context = None
    if payload.document_id:
        doc_query = (
            select(Document)
            .options(selectinload(Document.chunks))
            .where(Document.id == payload.document_id, Document.user_id == current_user.id)
        )
        doc_res = await db.execute(doc_query)
        doc = doc_res.scalars().first()
        if doc and doc.chunks:
            doc_context = "\n".join([c.content for c in doc.chunks[:5]])

    objectives = [o.objective_text for o in topic.learning_objectives]

    # Generate questions via Gemini (or educational fallback)
    raw_questions = await generate_quiz_questions(
        topic_name=topic.name,
        objectives=objectives,
        difficulty=payload.difficulty or "intermediate",
        count=payload.count or 4,
        document_context=doc_context
    )

    created_questions = []
    for q_data in raw_questions:
        q_obj = Question(
            topic_id=topic.id,
            question_type=q_data.get("question_type", "multiple_choice"),
            question_text=q_data["question_text"],
            options=q_data.get("options", []),
            correct_answer=q_data["correct_answer"],
            explanation=q_data["explanation"],
            difficulty=payload.difficulty or "intermediate",
            source_metadata={"misconception_tag": q_data.get("misconception_tag")}
        )
        db.add(q_obj)
        created_questions.append(q_obj)

    await db.commit()
    for q in created_questions:
        await db.refresh(q)

    # Return student view (without answers)
    return created_questions

@router.get("/topics/{topic_id}/questions", response_model=List[QuestionStudentRead])
async def get_topic_questions(
    topic_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches all existing questions for a specific topic (without correct answers)."""
    query = (
        select(Question)
        .where(Question.topic_id == topic_id)
        .order_by(Question.id.desc())
        .limit(20)
    )
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/submit", response_model=SubmitAnswerResponse)
async def submit_quiz_answer(
    payload: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a student's answer for real-time automated scoring and diagnostic feedback.
    Records the attempt under the student's isolated account.
    """
    query = select(Question).where(Question.id == payload.question_id)
    res = await db.execute(query)
    question = res.scalars().first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {payload.question_id} not found."
        )

    # Retrieve misconception tag if present
    misconception_tag = None
    if isinstance(question.source_metadata, dict):
        misconception_tag = question.source_metadata.get("misconception_tag")

    eval_result = evaluate_answer(
        selected_answer=payload.selected_answer,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        misconception_tag=misconception_tag
    )

    attempt = QuizAttempt(
        user_id=current_user.id,
        question_id=question.id,
        session_id=payload.session_id,
        selected_answer=payload.selected_answer.strip(),
        is_correct=eval_result["is_correct"],
        score=eval_result["score"],
        feedback=eval_result["feedback"],
        misconception_tag=eval_result["misconception_tag"]
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Automatically update longitudinal knowledge tracing mastery & recommendations
    if question.topic_id:
        await update_student_mastery(
            db=db,
            user_id=current_user.id,
            topic_id=question.topic_id,
            is_correct=eval_result["is_correct"],
            misconception_tag=eval_result["misconception_tag"]
        )

    return SubmitAnswerResponse(
        attempt_id=attempt.id,
        question_id=question.id,
        selected_answer=attempt.selected_answer,
        is_correct=attempt.is_correct,
        score=attempt.score,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        feedback=attempt.feedback,
        misconception_tag=attempt.misconception_tag
    )

@router.get("/history", response_model=List[QuizAttemptRead])
async def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve all formative assessment attempts for the authenticated student."""
    query = (
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(50)
    )
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/stats", response_model=StudentAssessmentStats)
async def get_student_assessment_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes overall accuracy rate, total questions answered, and aggregate score
    strictly for the logged-in student.
    """
    # Total attempts
    total_query = select(func.count(QuizAttempt.id)).where(QuizAttempt.user_id == current_user.id)
    total_res = await db.execute(total_query)
    total_attempts = total_res.scalar() or 0

    # Correct attempts
    correct_query = (
        select(func.count(QuizAttempt.id))
        .where(QuizAttempt.user_id == current_user.id, QuizAttempt.is_correct == True)
    )
    correct_res = await db.execute(correct_query)
    correct_attempts = correct_res.scalar() or 0

    # Average score
    score_query = (
        select(func.avg(QuizAttempt.score))
        .where(QuizAttempt.user_id == current_user.id)
    )
    score_res = await db.execute(score_query)
    avg_score = score_res.scalar() or 0.0

    # Recent attempts
    recent_query = (
        select(QuizAttempt)
        .where(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(10)
    )
    recent_res = await db.execute(recent_query)
    recent_attempts = recent_res.scalars().all()

    accuracy_rate = round((correct_attempts / total_attempts * 100), 1) if total_attempts > 0 else 0.0

    return StudentAssessmentStats(
        total_attempts=total_attempts,
        correct_attempts=correct_attempts,
        accuracy_rate=accuracy_rate,
        average_score=round(float(avg_score), 2),
        recent_attempts=recent_attempts
    )
