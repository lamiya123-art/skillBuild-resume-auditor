from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class RepoBase(BaseModel):
    github_repo_id: str
    name: str

class ReadinessScoreBreakdown(BaseModel):
    readme_exists_score: int # Max 25
    readme_quality_score: int # Max 15
    commit_spread_score: int # Max 25
    commit_messages_score: int # Max 15
    authorship_score: int # Max 20

class ScoreResult(BaseModel):
    readiness_score: int
    flags: List[str]
    breakdown: ReadinessScoreBreakdown
    metrics: Dict[str, Any]

class LLMRepoAuditTool(BaseModel):
    readiness_score: int
    readme_exists_score: int
    readme_quality_score: int
    commit_spread_score: int
    commit_messages_score: int
    authorship_score: int
    coaching_flags: List[str]
    technical_assessment: str

class RepoResponse(RepoBase):
    id: int
    user_id: int
    readiness_score: int
    flags: List[str]
    languages: Dict[str, Any]
    audit_details: Dict[str, Any]
    last_audited_at: datetime

    class Config:
        from_attributes = True

class AuditRepoRequest(BaseModel):
    github_repo_id: str
    name: str
    readme_content: Optional[str] = None
    commit_history: Optional[List[Dict[str, Any]]] = None
    dependencies: Optional[List[str]] = None
    contributors: Optional[List[Dict[str, Any]]] = None
