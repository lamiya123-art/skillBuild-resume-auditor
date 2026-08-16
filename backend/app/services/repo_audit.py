import re
import logging
from typing import Dict, Any, List
from datetime import datetime
from app.schemas.repo import ScoreResult, ReadinessScoreBreakdown, LLMRepoAuditTool
from app.core.llm_provider import llm_provider

logger = logging.getLogger(__name__)

KNOWN_BOILERPLATE_FINGERPRINTS = [
    r"getting started with create react app",
    r"this project was bootstrapped with create react app",
    r"vite \+ react",
    r"fusion starter",
    r"next\.js project bootstrapped with create-next-app",
    r"react app default readme",
    r"welcome to your new app",
    r"edit app\.tsx and save to test",
    r"npm run dev.*open http://localhost",
    r"standard starter template"
]

def check_is_boilerplate(readme_content: str) -> bool:
    if not readme_content:
        return True
    content_lower = readme_content.lower()
    for fingerprint in KNOWN_BOILERPLATE_FINGERPRINTS:
        if re.search(fingerprint, content_lower):
            return True
    return False

def compute_readiness_score(repo_data: Dict[str, Any]) -> ScoreResult:
    """
    Computes an Interview Readiness Score (0-100) from real repository signals & domain intelligence.
    Evaluates individual technical depth, evidence quality, commit spread, authorship, and interview durability.
    Leverages Gemini AI for deep technical evaluation when API key is configured.
    """
    name = repo_data.get("name") or repo_data.get("github_repo_id") or "Repository"
    description = repo_data.get("description") or ""
    readme_content = repo_data.get("readme_content") or ""
    commits = repo_data.get("commits") or []
    github_username = repo_data.get("github_username") or ""

    flags: List[str] = []

    # Metric 1: README Existence & Word Count (Max 25 pts)
    words = readme_content.strip().split()
    word_count = len(words)
    if word_count >= 200:
        readme_exists_score = 25
    elif word_count > 0:
        readme_exists_score = max(5, int(25 * (word_count / 200.0)))
        if word_count < 80:
            flags.append(f"⚠️ README is very short ({word_count} words vs 200+ recommended) — recommend adding setup & architecture details.")
    else:
        readme_exists_score = 0
        flags.append("⚠️ README missing completely — code-only repos are vulnerable during technical interviews.")

    # Metric 2: README Boilerplate Fingerprinting (Max 15 pts)
    if word_count > 0:
        is_boilerplate = check_is_boilerplate(readme_content)
        if not is_boilerplate:
            readme_quality_score = 15
        else:
            readme_quality_score = 0
            flags.append("⚠️ README appears to be an unmodified starter/boilerplate template — update before using as primary evidence.")
    else:
        readme_quality_score = 0

    # Metric 3: Commit Count & Spread over time (Max 25 pts)
    commit_count = len(commits)
    unique_days = set()
    for c in commits:
        ts = c.get("timestamp")
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                unique_days.add(dt.date())
            except Exception:
                pass
        elif isinstance(ts, datetime):
            unique_days.add(ts.date())

    spread_days = len(unique_days)
    if commit_count >= 3:
        # Spread score (max 15): 3 pts per unique day
        spread_score = min(15, spread_days * 3) if spread_days > 0 else 0
        # Volume score (max 10): 1 pt per commit up to 10
        volume_score = min(10, commit_count)
        
        commit_spread_score = spread_score + volume_score

        if spread_days == 1 and commit_count > 5:
            flags.append("⚠️ All commits made on a single day — signals single-burst work rather than sustained development.")
    elif commit_count > 0:
        commit_spread_score = 0
        flags.append(f"⚠️ Very low commit count ({commit_count} commit(s)) — looks like a bulk upload.")
    else:
        commit_spread_score = 0
        flags.append("⚠️ No commit history found — unable to verify development progress over time.")

    # Metric 4: Commit Message Quality (Max 15 pts)
    generic_messages = {"initial commit", "update", "fix", "wip", "commit", "changes", "test", "first commit", "add files"}
    if commit_count > 0:
        generic_count = sum(1 for c in commits if c.get("message", "").strip().lower() in generic_messages)
        generic_ratio = generic_count / commit_count
        commit_messages_score = max(0, int(15 * (1.0 - generic_ratio)))
        if generic_ratio >= 0.5:
            flags.append(f"⚠️ High ratio of generic commit messages ({int(generic_ratio*100)}% are 'update'/'fix'/'initial commit').")
    else:
        commit_messages_score = 0

    # Metric 5: Ownership / Authorship Percentage (Max 20 pts)
    if commit_count > 0 and github_username:
        user_commits = sum(
            1 for c in commits
            if c.get("author", "").lower() == github_username.lower() or c.get("author_login", "").lower() == github_username.lower()
        )
        ownership_pct = (user_commits / commit_count) * 100
        if ownership_pct >= 70.0:
            authorship_score = 20
        elif ownership_pct < 20.0:
            authorship_score = 0
            flags.append(f"⚠️ User authorship is only {ownership_pct:.1f}% (< 70% threshold) — forked or multi-contributor project.")
        else:
            authorship_score = max(0, int(20 * (ownership_pct / 70.0)))
            flags.append(f"⚠️ User authorship is only {ownership_pct:.1f}% (< 70% threshold) — forked or multi-contributor project.")
    elif commit_count > 0:
        authorship_score = 20
        ownership_pct = 100.0
    else:
        authorship_score = 0
        ownership_pct = 0.0

    total_score = readme_exists_score + readme_quality_score + commit_spread_score + commit_messages_score + authorship_score
    total_score = min(100, max(0, total_score))

    # Additional Domain Specific Guidance for interview durability
    name_lower = name.lower()
    desc_lower = (description or "").lower()
    if any(k in name_lower or k in desc_lower for k in ["leetcode", "dsa", "html", "problems", "solutions"]):
        if not any("algorithm" in f.lower() for f in flags):
            flags.append("⚠️ Algorithm practice repository — lacks full-stack system architecture evidence for technical interviews")

    breakdown = ReadinessScoreBreakdown(
        readme_exists_score=readme_exists_score,
        readme_quality_score=readme_quality_score,
        commit_spread_score=commit_spread_score,
        commit_messages_score=commit_messages_score,
        authorship_score=authorship_score
    )

    metrics = {
        "word_count": word_count,
        "commit_count": commit_count,
        "spread_days": spread_days,
        "ownership_pct": round(ownership_pct, 1)
    }

    # Execute Gemini AI evaluation when active Gemini key is provided
    if llm_provider.gemini_key and repo_data.get("use_ai_eval", True):
        try:
            prompt = f"""
            Audit candidate repository '{name}' for technical interview readiness and codebase quality.

            REPOSITORY DATA:
            Name: {name}
            Description: {description}
            Tech Stack / Dependencies: {repo_data.get('dependencies', [])}
            Candidate Username: {github_username}
            Word Count: {word_count}
            Commit Count: {commit_count} (Spread Days: {spread_days}, Candidate Ownership: {ownership_pct:.1f}%)

            README CONTENT EXCERPT:
            ---
            {readme_content[:1500]}
            ---

            BASE HEURISTIC METRICS CALCULATED:
            - README Existence: {readme_exists_score}/25
            - README Quality: {readme_quality_score}/15
            - Commit Spread: {commit_spread_score}/25
            - Commit Messages: {commit_messages_score}/15
            - Authorship: {authorship_score}/20
            - Detected Heuristic Flags: {flags}

            INSTRUCTIONS:
            Evaluate the candidate's repository evidence. Return JSON conforming strictly to LLMRepoAuditTool schema:
            1. Evaluate scores out of max points (README existence <= 25, quality <= 15, commit spread <= 25, messages <= 15, authorship <= 20).
            2. Compute total readiness_score (0-100).
            3. Provide specific coaching_flags for technical interview defense.
            4. Provide a concise technical_assessment summary.
            """

            ai_res: LLMRepoAuditTool = llm_provider.generate_structured_output(
                prompt=prompt,
                response_schema=LLMRepoAuditTool,
                system_instruction="You are a principal engineer and hiring auditor evaluating software candidate project evidence."
            )

            combined_flags = list(dict.fromkeys(flags + ai_res.coaching_flags))

            breakdown = ReadinessScoreBreakdown(
                readme_exists_score=min(25, max(0, ai_res.readme_exists_score)),
                readme_quality_score=min(15, max(0, ai_res.readme_quality_score)),
                commit_spread_score=min(25, max(0, ai_res.commit_spread_score)),
                commit_messages_score=min(15, max(0, ai_res.commit_messages_score)),
                authorship_score=min(20, max(0, ai_res.authorship_score))
            )

            metrics["ai_evaluated"] = True
            metrics["technical_assessment"] = ai_res.technical_assessment

            return ScoreResult(
                readiness_score=min(100, max(0, ai_res.readiness_score)),
                flags=combined_flags,
                breakdown=breakdown,
                metrics=metrics
            )
        except Exception as e:
            logger.warning(f"Gemini AI repo audit call failed: {e}. Falling back to baseline heuristic metrics.")

    return ScoreResult(
        readiness_score=total_score,
        flags=flags,
        breakdown=breakdown,
        metrics=metrics
    )


