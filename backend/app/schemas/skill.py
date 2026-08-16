from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ClassifySkillTool(BaseModel):
    """Function calling schema for LLM skill classification"""
    skill_name: str = Field(..., description="Literal skill or technology name")
    tier: int = Field(..., description="Tier 0 (Mentioned only), 1 (Coursework/self-taught), 2 (Used in project), 3 (Dedicated project)")
    evidence_repo_id: Optional[int] = Field(None, description="Database Repo ID providing evidence, if applicable")
    rationale: str = Field(..., description="Specific objective rationale for tier assignment")

class SkillClaimCreate(BaseModel):
    skill_name: str
    tier: int
    evidence_repo_id: Optional[int] = None
    rationale: str

class SkillClaimResponse(BaseModel):
    id: int
    user_id: int
    skill_name: str
    tier: int
    evidence_repo_id: Optional[int] = None
    rationale: str
    created_at: datetime

    class Config:
        from_attributes = True

class ClassifySkillsResponse(BaseModel):
    skills: List[SkillClaimResponse]
