from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import User, SkillClaim, JobApplication
from app.schemas.jd import ParsedJDOutput
from app.schemas.match import MatchReportResponse, RequirementMatch, ActionSuggestion
from app.services.action_suggestions import generate_action_for_gap

def generate_match_report(
    db: Session,
    user: User,
    company: str,
    role: str,
    parsed_jd: ParsedJDOutput,
    application_id: int = None
) -> MatchReportResponse:
    # Fetch user skill claims indexed by skill name (case insensitive)
    user_skills = db.query(SkillClaim).filter(SkillClaim.user_id == user.id).all()
    skill_map: Dict[str, SkillClaim] = {s.skill_name.lower(): s for s in user_skills}

    matches: List[RequirementMatch] = []
    gap_actions: List[ActionSuggestion] = []

    strong_count = 0
    weak_count = 0
    gap_count = 0

    all_reqs = []
    for req in parsed_jd.required:
        all_reqs.append((req, "required"))
    for req in parsed_jd.preferred:
        all_reqs.append((req, "preferred"))
    for req in parsed_jd.nice_to_have:
        all_reqs.append((req, "nice_to_have"))

    for req, importance in all_reqs:
        skill_key = req.skill_name.lower()
        claim = skill_map.get(skill_key)

        if claim:
            matched_tier = claim.tier
            evidence_repo_id = claim.evidence_repo_id
            if claim.tier in (2, 3):
                status = "strong_match"
                strong_count += 1
                rationale = f"Verified at Tier {claim.tier}: {claim.rationale}"
            elif claim.tier == 1:
                status = "weak_match"
                weak_count += 1
                rationale = f"Tier 1 (Coursework/Self-taught): {claim.rationale}"
            else:
                status = "gap"
                gap_count += 1
                rationale = f"Tier 0 (Mentioned only): No project repo evidence available."
                gap_actions.append(generate_action_for_gap(req.skill_name))
        else:
            matched_tier = 0
            evidence_repo_id = None
            status = "gap"
            gap_count += 1
            rationale = "Skill not present in candidate profile or repo history."
            gap_actions.append(generate_action_for_gap(req.skill_name))

        matches.append(RequirementMatch(
            requirement=req.skill_name,
            raw_phrase=req.raw_phrase_from_jd,
            importance=importance,
            matched_tier=matched_tier,
            status=status,
            evidence_repo_id=evidence_repo_id,
            rationale=rationale
        ))

    total = len(all_reqs)
    score_pct = round(((strong_count * 1.0 + weak_count * 0.5) / max(total, 1)) * 100, 1)

    # Generate plain-language honest summary
    honest_summary = _build_honest_summary(company, role, strong_count, weak_count, gap_count, matches)

    return MatchReportResponse(
        application_id=application_id,
        company=company,
        role=role,
        total_requirements=total,
        strong_matches_count=strong_count,
        weak_matches_count=weak_count,
        gaps_count=gap_count,
        match_score_percentage=score_pct,
        matches=matches,
        honest_summary=honest_summary,
        gap_actions=gap_actions
    )

def _build_honest_summary(company: str, role: str, strong: int, weak: int, gaps: int, matches: List[RequirementMatch]) -> str:
    gap_skills = [m.requirement for m in matches if m.status == "gap"]
    strong_skills = [m.requirement for m in matches if m.status == "strong_match"]

    summary = f"Match Analysis for {role} at {company}: You have {strong} verified strong evidence skills"
    if strong_skills:
        summary += f" ({', '.join(strong_skills[:3])})"
    summary += f", {weak} self-taught/weak matches, and {gaps} unevidenced gaps"
    if gap_skills:
        summary += f" ({', '.join(gap_skills[:3])})"
    summary += ". In interviews, frame your strong project repos upfront and be honest about gaps rather than attempting to over-inflate unevidenced skills."

    return summary
