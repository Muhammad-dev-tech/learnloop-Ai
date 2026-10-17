from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class LearningObjectiveRead(BaseModel):
    id: int
    topic_id: Optional[int] = None
    objective_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TopicSimpleRead(BaseModel):
    id: int
    subject_id: int
    name: str
    description: Optional[str] = None
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TopicDetailRead(BaseModel):
    id: int
    subject_id: int
    name: str
    description: Optional[str] = None
    order_index: int
    created_at: datetime
    learning_objectives: List[LearningObjectiveRead] = []

    model_config = ConfigDict(from_attributes=True)

class SubjectRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    topics: List[TopicSimpleRead] = []

    model_config = ConfigDict(from_attributes=True)

class SubjectDetailRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    topics: List[TopicDetailRead] = []

    model_config = ConfigDict(from_attributes=True)
