from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class MessageBase(BaseModel):
    role: str
    content: str
    source_references: Optional[List[Dict[str, Any]]] = None

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000, description="The student message content")

class MessageRead(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    source_references: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationRead(BaseModel):
    id: int
    user_id: int
    session_id: Optional[int] = None
    title: str
    learning_mode: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageRead] = []

    model_config = ConfigDict(from_attributes=True)

class SessionCreate(BaseModel):
    topic_id: int = Field(..., description="The ID of the topic to study")
    session_type: str = Field(default="topic", description="'topic', 'document', or 'challenge'")
    current_difficulty: str = Field(default="beginner", description="'beginner', 'intermediate', or 'advanced'")
    learning_mode: str = Field(default="tutor", description="'tutor', 'teach_me', 'challenge', or 'notes'")

class SessionRead(BaseModel):
    id: int
    user_id: int
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    subject_name: Optional[str] = None
    session_type: str
    current_difficulty: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    conversation_id: Optional[int] = None
    learning_mode: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SessionDetailRead(SessionRead):
    messages: List[MessageRead] = []

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000, description="Message from student to AI tutor")
    learning_mode: Optional[str] = Field(None, description="Optional override for learning mode")

class SendMessageResponse(BaseModel):
    user_message: MessageRead
    assistant_message: MessageRead
    suggested_followups: List[str] = []
    model_used: str
