from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class BulletClaimCheck(BaseModel):
    bullet_text: str
    is_valid: bool
    rejected_reason: Optional[str] = None
    claimed_technologies: List[str] = []

class AntiFabricationValidationResult(BaseModel):
    is_passed: bool
    checked_bullets_count: int
    rejected_claims: List[BulletClaimCheck] = []

class GenerateResumeRequest(BaseModel):
    job_application_id: int

class ResumeVersionResponse(BaseModel):
    id: int
    job_application_id: int
    content: Dict[str, Any]
    latex_source: str
    pdf_url: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    job_application_id: int
    rejected_claim: str
    reason: str
    attempted_at: datetime

    class Config:
        from_attributes = True
