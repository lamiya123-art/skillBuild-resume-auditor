import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import SkillClaim, Repo, User
from app.schemas.skill import ClassifySkillTool, SkillClaimResponse
from app.core.llm_provider import llm_provider

logger = logging.getLogger(__name__)

def classify_user_skills(db: Session, user: User) -> List[SkillClaim]:
    """
    Analyzes user profile and audited repos, using LLM function calling to classify skills into Tiers 0-3.
    """
    profile = user.master_profile_data or {}
    repos = user.repos or []

    skills_to_evaluate = set(profile.get("skills", []))
    for exp in profile.get("experience", []):
        skills_to_evaluate.update(exp.get("technologies", []))
    for proj in profile.get("projects", []):
        skills_to_evaluate.update(proj.get("technologies", []))

    for repo in repos:
        details = repo.audit_details or {}
        for dep in details.get("dependencies", []):
            skills_to_evaluate.add(dep)

    if not skills_to_evaluate:
        return []

    # Prepare repo evidence summary for LLM prompt
    repo_summaries = []
    for r in repos:
        repo_summaries.append({
            "repo_id": r.id,
            "name": r.name,
            "readiness_score": r.readiness_score,
            "languages": r.languages,
            "dependencies": (r.audit_details or {}).get("dependencies", []),
            "flags": r.flags
        })

    classified_claims: List[SkillClaim] = []

    for skill in skills_to_evaluate:
        prompt = f"""
        Classify the skill '{skill}' for user candidate into Tier 0, 1, 2, or 3 based on ground truth data below:

        CANDIDATE REPOSITORIES EVIDENCE:
        {repo_summaries}

        PROFILE DECLARED EXPERIENCE:
        {profile}

        CLASSIFICATION RULES:
        - Tier 0 (Mentioned only): Skill listed in profile but NO repo evidence and NO coursework link.
        - Tier 1 (Coursework / self-taught): User-declared in experience/education, no dedicated high-quality repo.
        - Tier 2 (Used within project): Appears in repo dependencies or secondary technology list of a larger project.
        - Tier 3 (Dedicated project): Primary language/technology of a repo with a healthy readiness score (>= 60).

        Return ONLY a structured function call response conforming to ClassifySkillTool schema.
        """

        try:
            result = llm_provider.generate_structured_output(
                prompt=prompt,
                response_schema=ClassifySkillTool,
                system_instruction="You are an expert technical interviewer and skill auditor enforcing strict tiered honesty."
            )
            
            # Validate output tier bounds
            if result.tier not in (0, 1, 2, 3):
                result.tier = 0

            # Store or update SkillClaim in DB
            existing = db.query(SkillClaim).filter(
                SkillClaim.user_id == user.id,
                SkillClaim.skill_name.ilike(skill)
            ).first()

            if existing:
                existing.tier = result.tier
                existing.evidence_repo_id = result.evidence_repo_id
                existing.rationale = result.rationale
                claim = existing
            else:
                claim = SkillClaim(
                    user_id=user.id,
                    skill_name=skill,
                    tier=result.tier,
                    evidence_repo_id=result.evidence_repo_id,
                    rationale=result.rationale
                )
                db.add(claim)
            classified_claims.append(claim)

        except Exception as e:
            logger.error(f"Failed to classify skill '{skill}': {e}")
            # Fallback heuristic classification if LLM call fails
            claim = _rule_based_fallback_classification(db, user, skill, repos)
            classified_claims.append(claim)

    db.commit()
    return db.query(SkillClaim).filter(SkillClaim.user_id == user.id).all()

def _rule_based_fallback_classification(db: Session, user: User, skill: str, repos: List[Repo]) -> SkillClaim:
    skill_lower = skill.lower()
    matched_repo = None
    tier = 0
    rationale = f"Mentioned in resume profile."

    for repo in repos:
        details = repo.audit_details or {}
        deps = [d.lower() for d in details.get("dependencies", [])]
        langs = [l.lower() for l in (repo.languages or {}).keys()]

        if skill_lower in langs or skill_lower in repo.name.lower():
            if repo.readiness_score >= 60:
                tier = 3
                matched_repo = repo
                rationale = f"Primary technology in dedicated repo '{repo.name}' (Readiness Score: {repo.readiness_score}/100)."
                break
            else:
                tier = 2
                matched_repo = repo
                rationale = f"Used in repo '{repo.name}' but readiness score is low ({repo.readiness_score}/100)."
        elif skill_lower in deps:
            tier = 2
            matched_repo = repo
            rationale = f"Appears as a dependency in project '{repo.name}'."

    existing = db.query(SkillClaim).filter(
        SkillClaim.user_id == user.id,
        SkillClaim.skill_name.ilike(skill)
    ).first()

    if existing:
        existing.tier = tier
        existing.evidence_repo_id = matched_repo.id if matched_repo else None
        existing.rationale = rationale
        return existing
    else:
        claim = SkillClaim(
            user_id=user.id,
            skill_name=skill,
            tier=tier,
            evidence_repo_id=matched_repo.id if matched_repo else None,
            rationale=rationale
        )
        db.add(claim)
        return claim
