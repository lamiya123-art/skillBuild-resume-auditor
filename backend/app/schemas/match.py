from pydantic import BaseModel
from typing import List, Optional

class RequirementMatch(BaseModel):
    requirement: str
    raw_phrase: str
    importance: str # "required", "preferred", "nice_to_have"
    matched_tier: Optional[int] = None # 0, 1, 2, 3 or None if not found
    status: str # "strong_match" (tier 2-3), "weak_match" (tier 1), "gap" (tier 0 / missing)
    evidence_repo_id: Optional[int] = None
    rationale: str

class ActionSuggestion(BaseModel):
    skill_name: str
    type: str # "micro_project" or "learning_resource"
    title: str
    description: str
    estimated_hours: str
    url: Optional[str] = None

class MatchReportResponse(BaseModel):
    application_id: Optional[int] = None
    company: str
    role: str
    total_requirements: int
    strong_matches_count: int
    weak_matches_count: int
    gaps_count: int
    match_score_percentage: float
    matches: List[RequirementMatch]
    honest_summary: str
    gap_actions: List[ActionSuggestion]
