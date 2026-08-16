from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractedRequirement(BaseModel):
    skill_name: str = Field(..., description="Normalized technology or skill name")
    raw_phrase_from_jd: str = Field(..., description="Literal context excerpt from the JD")

class ParsedJDOutput(BaseModel):
    required: List[ExtractedRequirement] = []
    preferred: List[ExtractedRequirement] = []
    nice_to_have: List[ExtractedRequirement] = []
    is_inferred: bool = False

class ParseJDRequest(BaseModel):
    jd_text: Optional[str] = None
    jd_url: Optional[str] = None
    role_title: Optional[str] = None
    company_name: Optional[str] = None
