import logging
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.models.models import JobApplication, User, SkillClaim, Repo
from app.core.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class InterviewQuestion(BaseModel):
    category: str = Field(..., description="Category: 'technical', 'project', 'behavioral', or 'gap_defense'")
    question: str = Field(..., description="Interview question text")
    context: str = Field(..., description="Why this question is asked based on user's verified evidence or identified gap")
    suggested_talking_points: List[str] = Field(default_factory=list, description="Ground-truth talking points candidate can defend in interview")

class InterviewPrepOutput(BaseModel):
    application_id: int
    company: str
    role: str
    questions: List[InterviewQuestion]

def generate_interview_prep(db: Session, application_id: int) -> InterviewPrepOutput:
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise ValueError(f"Job application {application_id} not found.")

    user = db.query(User).filter(User.id == app.user_id).first()
    skills = db.query(SkillClaim).filter(SkillClaim.user_id == user.id).all()
    repos = db.query(Repo).filter(Repo.user_id == user.id).all()

    verified_skills = [s.skill_name for s in skills if s.tier >= 2]
    weak_skills = [s.skill_name for s in skills if s.tier == 1]
    gaps = []
    
    match_report = app.match_report or {}
    for m in match_report.get("matches", []):
        if m.get("status") == "gap":
            gaps.append(m.get("requirement"))

    prompt = f"""
    Generate realistic interview preparation questions for a candidate applying for '{app.role}' at '{app.company}'.

    JOB DESCRIPTION:
    {app.jd_text[:1500]}

    CANDIDATE GROUND-TRUTH EVIDENCE:
    - Verified Strong Skills (Tier 2-3): {verified_skills}
    - Weak/Learning Skills (Tier 1): {weak_skills}
    - Unevidenced Gaps for Role: {gaps}
    - Audited Repositories: {[r.name for r in repos]}

    RULES:
    1. Technical questions MUST focus ONLY on skills the candidate actually possesses or needs for this role.
    2. Project questions MUST reference actual verified project skills.
    3. Gap Defense questions MUST help the candidate handle missing skills honestly without fabricating experience.
    """

    try:
        result = llm_provider.generate_structured_output(
            prompt=prompt,
            response_schema=InterviewPrepOutput,
            system_instruction="You are a senior engineering manager preparing candidates for real technical interviews."
        )
        result.application_id = application_id
        result.company = app.company
        result.role = app.role
        return result
    except Exception as e:
        logger.error(f"Failed to generate interview prep via LLM: {e}")
        # Rule-based fallback
        fallback_questions = []
        for s in verified_skills[:2]:
            fallback_questions.append(InterviewQuestion(
                category="project",
                question=f"Can you explain how you implemented {s} in your project and key architecture decisions you made?",
                context=f"You have Tier 2/3 verified evidence for {s}.",
                suggested_talking_points=[f"Discuss project repository implementation", f"Explain data flow and error handling with {s}"]
            ))
        for g in gaps[:2]:
            fallback_questions.append(InterviewQuestion(
                category="gap_defense",
                question=f"This role lists {g}, which isn't heavily featured in your background yet. How do you plan to get up to speed?",
                context=f"Unevidenced gap identified for {g}.",
                suggested_talking_points=[f"Be upfront about current level", f"Highlight strong baseline in related technologies", f"Outline concrete learning plan for {g}"]
            ))
        if not fallback_questions:
            fallback_questions.append(InterviewQuestion(
                category="behavioral",
                question=f"Walk me through a challenging bug or architecture hurdle you solved recently.",
                context="General interview preparation",
                suggested_talking_points=["Use STAR method (Situation, Task, Action, Result)"]
            ))

        return InterviewPrepOutput(
            application_id=application_id,
            company=app.company,
            role=app.role,
            questions=fallback_questions
        )
