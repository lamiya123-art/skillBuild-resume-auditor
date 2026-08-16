from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.models import ApplicationStage

class JobApplicationCreate(BaseModel):
    company: str
    role: str
    jd_text: str
    jd_url: Optional[str] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None

class JobApplicationUpdate(BaseModel):
    stage: Optional[ApplicationStage] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    company: str
    role: str
    jd_text: str
    jd_url: Optional[str] = None
    match_report: Optional[Dict[str, Any]] = None
    stage: ApplicationStage
    deadline: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
