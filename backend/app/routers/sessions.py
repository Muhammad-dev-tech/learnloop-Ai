from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.academic import Topic, Subject, LearningObjective
from app.models.document import Document
from app.models.session import LearningSession, Conversation, Message
from app.schemas.session import (
    SessionCreate,
    SessionRead,
    SessionDetailRead,
    SendMessageRequest,
    SendMessageResponse,
    MessageRead
)
from app.services.ai_tutor import generate_tutor_response

router = APIRouter(prefix="/api/sessions", tags=["Learning Sessions & AI Tutor"])

@router.post("", response_model=SessionDetailRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SessionDetailRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a new isolated learning session on a specific topic or uploaded course document.
    Automatically generates a conversation and initial introductory pedagogical greeting from the AI tutor.
    """
    topic = None
    doc = None

    if payload.topic_id and payload.topic_id > 0:
        topic_query = (
            select(Topic)
            .options(selectinload(Topic.subject), selectinload(Topic.learning_objectives))
            .where(Topic.id == payload.topic_id)
        )
        topic_res = await db.execute(topic_query)
        topic = topic_res.scalars().first()

    if payload.document_id:
        doc_query = select(Document).options(selectinload(Document.chunks)).where(
            Document.id == payload.document_id, Document.user_id == current_user.id
        )
        doc_res = await db.execute(doc_query)
        doc = doc_res.scalars().first()

    if not topic and not doc:
        first_topic = await db.execute(
            select(Topic).options(selectinload(Topic.subject), selectinload(Topic.learning_objectives)).limit(1)
        )
        topic = first_topic.scalars().first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No curriculum topic or document available to initiate learning session."
            )

    topic_id_val = topic.id if topic else None
    topic_name = topic.name if topic else (doc.filename if doc else "Course Notes")
    subject_name = topic.subject.name if (topic and topic.subject) else "Uploaded Course Notes"
    session_type = "document" if (doc and not topic) else payload.session_type

    # 1. Create LearningSession
    session = LearningSession(
        user_id=current_user.id,
        topic_id=topic_id_val,
        session_type=session_type,
        current_difficulty=payload.current_difficulty,
        status="active"
    )
    db.add(session)
    await db.flush()

    # 2. Create associated Conversation
    title = f"{topic_name} ({payload.learning_mode.capitalize()})"
    conversation = Conversation(
        user_id=current_user.id,
        session_id=session.id,
        title=title,
        learning_mode=payload.learning_mode
    )
    db.add(conversation)
    await db.flush()

    # 3. Generate initial welcoming tutor message
    objectives = [obj.objective_text for obj in topic.learning_objectives] if topic else [f"Course content from {topic_name}"]
    welcome_prompt = (
        f"The student is beginning a new study session on '{topic_name}'. "
        f"Selected mode: {payload.learning_mode}, difficulty: {payload.current_difficulty}. "
        f"Introduce yourself warmly as their LearnLoop AI tutor, outline what we will cover, and ask a kick-off question."
    )
    doc_ctx = "\n---\n".join([f"[{c.page_or_section}]: {c.content}" for c in doc.chunks[:5]]) if (doc and doc.chunks) else None
    tutor_reply = await generate_tutor_response(
        prompt=welcome_prompt,
        topic_name=topic_name,
        learning_mode=payload.learning_mode,
        difficulty=payload.current_difficulty,
        conversation_history=[],
        learning_objectives=objectives,
        document_context=doc_ctx
    )

    initial_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=tutor_reply["content"],
        source_references={"suggested_followups": tutor_reply.get("suggested_followups", [])}
    )
    db.add(initial_msg)
    await db.commit()
    await db.refresh(session)
    await db.refresh(initial_msg)

    return SessionDetailRead(
        id=session.id,
        user_id=session.user_id,
        topic_id=session.topic_id,
        topic_name=topic_name,
        subject_name=subject_name,
        session_type=session.session_type,
        current_difficulty=session.current_difficulty,
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        conversation_id=conversation.id,
        learning_mode=conversation.learning_mode,
        messages=[
            MessageRead(
                id=initial_msg.id,
                conversation_id=initial_msg.conversation_id,
                role=initial_msg.role,
                content=initial_msg.content,
                source_references=initial_msg.source_references if isinstance(initial_msg.source_references, list) else None,
                created_at=initial_msg.created_at
            )
        ]
    )

@router.get("/", response_model=List[SessionRead])
async def list_user_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all learning sessions for the currently authenticated student.
    Guarantees strict multi-tenant account isolation.
    """
    query = (
        select(LearningSession)
        .options(
            selectinload(LearningSession.topic).selectinload(Topic.subject),
            selectinload(LearningSession.conversations)
        )
        .where(LearningSession.user_id == current_user.id)
        .order_by(LearningSession.created_at.desc())
    )
    result = await db.execute(query)
    sessions = result.scalars().all()

    output = []
    for s in sessions:
        conv = s.conversations[0] if s.conversations else None
        output.append(
            SessionRead(
                id=s.id,
                user_id=s.user_id,
                topic_id=s.topic_id,
                topic_name=s.topic.name if s.topic else "General Study",
                subject_name=s.topic.subject.name if s.topic and s.topic.subject else None,
                session_type=s.session_type,
                current_difficulty=s.current_difficulty,
                status=s.status,
                created_at=s.created_at,
                completed_at=s.completed_at,
                conversation_id=conv.id if conv else None,
                learning_mode=conv.learning_mode if conv else "tutor"
            )
        )
    return output

@router.get("/{session_id}", response_model=SessionDetailRead)
async def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch a session and its full message history.
    Enforces account isolation: only the student who owns this session can view it.
    """
    query = (
        select(LearningSession)
        .options(
            selectinload(LearningSession.topic).selectinload(Topic.subject),
            selectinload(LearningSession.conversations).selectinload(Conversation.messages)
        )
        .where(LearningSession.id == session_id, LearningSession.user_id == current_user.id)
    )
    result = await db.execute(query)
    session = result.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning session {session_id} not found or access denied."
        )

    conv = session.conversations[0] if session.conversations else None
    messages_out = []
    if conv:
        for m in sorted(conv.messages, key=lambda x: x.created_at):
            messages_out.append(
                MessageRead(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    role=m.role,
                    content=m.content,
                    source_references=m.source_references if isinstance(m.source_references, list) else None,
                    created_at=m.created_at
                )
            )

    return SessionDetailRead(
        id=session.id,
        user_id=session.user_id,
        topic_id=session.topic_id,
        topic_name=session.topic.name if session.topic else "General Study",
        subject_name=session.topic.subject.name if session.topic and session.topic.subject else None,
        session_type=session.session_type,
        current_difficulty=session.current_difficulty,
        status=session.status,
        created_at=session.created_at,
        completed_at=session.completed_at,
        conversation_id=conv.id if conv else None,
        learning_mode=conv.learning_mode if conv else "tutor",
        messages=messages_out
    )

@router.post("/{session_id}/messages", response_model=SendMessageResponse)
async def send_message_to_tutor(
    session_id: int,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message from the student to the AI Tutor within an existing session.
    Invokes the Gemini AI service, stores both user and tutor messages in the database,
    and returns the updated response with suggested follow-up questions.
    """
    query = (
        select(LearningSession)
        .options(
            selectinload(LearningSession.topic).selectinload(Topic.learning_objectives),
            selectinload(LearningSession.conversations).selectinload(Conversation.messages)
        )
        .where(LearningSession.id == session_id, LearningSession.user_id == current_user.id)
    )
    result = await db.execute(query)
    session = result.scalars().first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning session {session_id} not found or access denied."
        )

    conv = session.conversations[0] if session.conversations else None
    if not conv:
        conv = Conversation(
            user_id=current_user.id,
            session_id=session.id,
            title=f"{session.topic.name if session.topic else 'Session'} Conversation",
            learning_mode=payload.learning_mode or "tutor"
        )
        db.add(conv)
        await db.flush()

    # Update mode if provided
    active_mode = payload.learning_mode or conv.learning_mode
    if payload.learning_mode and payload.learning_mode != conv.learning_mode:
        conv.learning_mode = payload.learning_mode

    # 1. Save student user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=payload.content.strip()
    )
    db.add(user_msg)
    await db.flush()

    # 2. Gather conversation history for context
    history_turns = []
    if conv.messages:
        for m in sorted(conv.messages, key=lambda x: x.created_at):
            history_turns.append({"role": m.role, "content": m.content})

    # Add the current user message to turns
    history_turns.append({"role": "user", "content": payload.content.strip()})

    raw_title = conv.title.split(" (")[0] if conv else "General Study"
    topic_name = session.topic.name if session.topic else raw_title
    objectives = [obj.objective_text for obj in session.topic.learning_objectives] if session.topic else [f"Course concepts from {topic_name}"]

    # Check for attached or associated course document
    doc_context = None
    retrieved_citations = []
    target_doc_id = payload.document_id

    if not target_doc_id:
        doc_match = await db.execute(
            select(Document).where(Document.user_id == current_user.id, Document.filename == raw_title)
        )
        found_doc = doc_match.scalars().first()
        if found_doc:
            target_doc_id = found_doc.id

    if target_doc_id:
        doc_res = await db.execute(
            select(Document).options(selectinload(Document.chunks)).where(
                Document.id == target_doc_id, Document.user_id == current_user.id
            )
        )
        matched_doc = doc_res.scalars().first()
        if matched_doc and matched_doc.chunks:
            from app.services.rag_retriever import retrieve_relevant_chunks
            retrieved_citations = retrieve_relevant_chunks(payload.content.strip(), matched_doc.chunks, top_k=4)
            if retrieved_citations:
                doc_context = "\n---\n".join([f"[{c['page_or_section']}]: {c['content']}" for c in retrieved_citations])
            if not session.topic:
                topic_name = matched_doc.filename

    # 3. Call AI Tutor Service
    tutor_reply = await generate_tutor_response(
        prompt=payload.content.strip(),
        topic_name=topic_name,
        learning_mode=active_mode,
        difficulty=session.current_difficulty,
        conversation_history=history_turns,
        learning_objectives=objectives,
        document_context=doc_context
    )

    # 4. Save AI tutor response with citations
    source_ref = {
        "suggested_followups": tutor_reply.get("suggested_followups", []),
        "citations": retrieved_citations if retrieved_citations else None,
        "document_name": topic_name if doc_context else None
    }
    assistant_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=tutor_reply["content"],
        source_references=source_ref
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return SendMessageResponse(
        user_message=MessageRead(
            id=user_msg.id,
            conversation_id=user_msg.conversation_id,
            role=user_msg.role,
            content=user_msg.content,
            source_references=None,
            created_at=user_msg.created_at
        ),
        assistant_message=MessageRead(
            id=assistant_msg.id,
            conversation_id=assistant_msg.conversation_id,
            role=assistant_msg.role,
            content=assistant_msg.content,
            source_references=assistant_msg.source_references if isinstance(assistant_msg.source_references, list) else None,
            created_at=assistant_msg.created_at
        ),
        suggested_followups=tutor_reply.get("suggested_followups", []),
        model_used=tutor_reply.get("model_used", settings.GEMINI_MODEL)
    )
