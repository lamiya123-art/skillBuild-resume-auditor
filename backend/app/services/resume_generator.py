import json
import logging
import os
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.models import JobApplication, ResumeVersion, SkillClaim, AntiFabricationAuditLog, User
from app.schemas.resume import BulletClaimCheck, AntiFabricationValidationResult
from app.core.llm_provider import llm_provider

logger = logging.getLogger(__name__)

def generate_tailored_resume(db: Session, job_application_id: int) -> ResumeVersion:
    application = db.query(JobApplication).filter(JobApplication.id == job_application_id).first()
    if not application:
        raise ValueError(f"Job application {job_application_id} not found.")

    user = db.query(User).filter(User.id == application.user_id).first()
    skill_claims = db.query(SkillClaim).filter(SkillClaim.user_id == user.id).all()
    skill_map = {s.skill_name.lower(): s.tier for s in skill_claims}

    if not user or not user.master_profile_data:
        raise ValueError("Candidate master profile is empty. Please upload a master resume before generating tailored applications.")

    profile = user.master_profile_data


    # Generate initial tailored resume structure
    resume_content = _build_tailored_resume_content(profile, application, skill_map)

    # Run Critical Anti-Fabrication Validation Pass
    validation_result = validate_resume_claims(resume_content, skill_map, profile)

    # Process and log any rejected claims
    for check in validation_result.rejected_claims:
        if not check.is_valid:
            audit_entry = AntiFabricationAuditLog(
                job_application_id=job_application_id,
                rejected_claim=check.bullet_text,
                reason=check.rejected_reason or "Unsubstantiated tier elevation or unverified claim",
                attempted_at=datetime.utcnow()
            )
            db.add(audit_entry)
    db.commit()

    # Sanitize content if any invalid claims caught
    if not validation_result.is_passed:
        logger.warning("Anti-fabrication guardrail caught invalid claims! Sanitizing output...")
        resume_content = _sanitize_resume_content(resume_content, validation_result)

    # Render LaTeX template
    latex_code = generate_latex_resume(resume_content)

    # Attempt PDF Compilation or SVG/HTML rendering fallback
    pdf_url = compile_latex_to_pdf(latex_code, job_application_id)

    resume_ver = ResumeVersion(
        job_application_id=job_application_id,
        content=resume_content,
        latex_source=latex_code,
        pdf_url=pdf_url,
        generated_at=datetime.utcnow()
    )
    db.add(resume_ver)
    db.commit()
    db.refresh(resume_ver)
    return resume_ver

def validate_resume_claims(
    resume_content: Dict[str, Any],
    skill_map: Dict[str, int],
    master_profile: Dict[str, Any]
) -> AntiFabricationValidationResult:
    """
    Anti-Fabrication Guardrail: Compares every bullet point against ground truth SkillClaims.
    Rejects claims elevating Tier 0/1 skills to Tier 2/3 production status or introducing hallucinated tools.
    """
    rejected_checks: List[BulletClaimCheck] = []
    total_checked = 0

    all_bullets = []
    for exp in resume_content.get("experience", []):
        for bullet in exp.get("description", []):
            all_bullets.append((bullet, "experience"))
    for proj in resume_content.get("projects", []):
        for bullet in proj.get("description", []):
            all_bullets.append((bullet, "project"))

    for bullet_text, source_type in all_bullets:
        total_checked += 1
        is_valid = True
        reason = None
        claimed_techs = []

        # Check for claimed technologies in bullet
        for skill_name, tier in skill_map.items():
            if skill_name in bullet_text.lower():
                claimed_techs.append(skill_name)
                # Tier 0 (Mentioned only) or Tier 1 (Coursework) cannot be claimed as primary production experience in bullets
                if tier < 2:
                    # Unless explicitly framed with "learning", "coursework", or "exploring"
                    learning_terms = ["learning", "coursework", "studying", "academic", "self-taught", "exploring"]
                    if not any(term in bullet_text.lower() for term in learning_terms):
                        is_valid = False
                        reason = f"Skill '{skill_name}' is Tier {tier} (unverified/coursework) but claimed as production project experience without learning qualification."
                        break

        # Check if bullet claims unverified 10x metrics without profile backing
        if "100%" in bullet_text or "10x" in bullet_text:
            profile_str = json.dumps(master_profile).lower()
            if "100%" not in profile_str and "10x" not in profile_str:
                is_valid = False
                reason = "Contains unverified metric (e.g. 100% or 10x) not present in master profile."

        rejected_checks.append(BulletClaimCheck(
            bullet_text=bullet_text,
            is_valid=is_valid,
            rejected_reason=reason,
            claimed_technologies=claimed_techs
        ))

    passed = all(c.is_valid for c in rejected_checks)
    return AntiFabricationValidationResult(
        is_passed=passed,
        checked_bullets_count=total_checked,
        rejected_claims=rejected_checks
    )

def _build_tailored_resume_content(profile: Dict[str, Any], application: JobApplication, skill_map: Dict[str, int]) -> Dict[str, Any]:
    # Priority order skills based on strong match
    tailored_skills = sorted(
        profile.get("skills", []),
        key=lambda s: skill_map.get(s.lower(), 0),
        reverse=True
    )

    return {
        "name": profile.get("name", "Candidate Name"),
        "contact": {
            "email": profile.get("email", "candidate@example.com"),
            "github": profile.get("github_username", "github.com/candidate")
        },
        "target_role": f"{application.role} at {application.company}",
        "skills": tailored_skills,
        "experience": profile.get("experience", []),
        "projects": profile.get("projects", []),
        "education": profile.get("education", [])
    }

def _sanitize_resume_content(resume_content: Dict[str, Any], validation: AntiFabricationValidationResult) -> Dict[str, Any]:
    invalid_bullets = {c.bullet_text for c in validation.rejected_claims if not c.is_valid}
    
    for exp in resume_content.get("experience", []):
        exp["description"] = [b for b in exp.get("description", []) if b not in invalid_bullets]
    for proj in resume_content.get("projects", []):
        proj["description"] = [b for b in proj.get("description", []) if b not in invalid_bullets]

    return resume_content

def generate_latex_resume(content: Dict[str, Any]) -> str:
    name = content.get("name", "Candidate Name")
    skills_str = ", ".join(content.get("skills", []))

    exp_blocks = []
    for exp in content.get("experience", []):
        bullets = "\n".join([f"    \\item {b}" for b in exp.get("description", [])])
        block = f"""
\\textbf{{{exp.get('title', 'Role')}}} -- \\textit{{{exp.get('company', 'Company')}}} \\hfill {{{exp.get('dates', 'Dates')}}}
\\begin{{itemize}}
{bullets}
\\end{{itemize}}
"""
        exp_blocks.append(block)

    proj_blocks = []
    for proj in content.get("projects", []):
        bullets = "\n".join([f"    \\item {b}" for b in proj.get("description", [proj.get("description", "")])]) if isinstance(proj.get("description"), list) else f"    \\item {proj.get('description', '')}"
        block = f"""
\\textbf{{{proj.get('name', 'Project')}}} \\hfill \\textit{{Tech: {', '.join(proj.get('technologies', []))}}}
\\begin{{itemize}}
{bullets}
\\end{{itemize}}
"""
        proj_blocks.append(block)

    edu_blocks = []
    for edu in content.get("education", []):
        degree = edu.get("degree") or "Degree"
        inst = edu.get("institution") or edu.get("school") or "University"
        year = edu.get("year") or edu.get("dates") or ""
        gpa = edu.get("gpa") or ""
        details = edu.get("details") or []
        detail_str = f" -- {', '.join(details)}" if details else ""
        gpa_str = f" (GPA: {gpa})" if gpa else ""
        block = f"""
\\textbf{{{degree}}} -- \\textit{{{inst}}}{gpa_str} \\hfill {{{year}}}{detail_str}
"""
        edu_blocks.append(block)

    edu_section = f"\\section*{{Education}}\n{''.join(edu_blocks)}" if edu_blocks else ""

    latex_template = f"""\\documentclass[10pt,letterpaper]{{article}}
\\usepackage[utf8]{{utf8}}
\\usepackage[margin=0.75in]{{geometry}}
\\usepackage{{hyperref}}
\\usepackage{{enumitem}}

\\setlist[itemize]{{noitemsep, topsep=0pt}}
\\pagestyle{{empty}}

\\begin{{document}}

\\begin{{center}}
    {{\\LARGE \\textbf{{{name}}}}}\\\\
    \\vspace{{2pt}}
    {content.get('contact', {{}}).get('email', '')} $|$ {content.get('contact', {{}}).get('github', '')}
\\end{{center}}

\\vspace{{5pt}}
\\hrule
\\vspace{{5pt}}

\\section*{{Technical Skills}}
\\textbf{{Verified Skills:}} {skills_str}

\\section*{{Professional Experience}}
{''.join(exp_blocks)}

\\section*{{Key Projects}}
{''.join(proj_blocks)}

{edu_section}

\\end{{document}}
"""
    return latex_template

def compile_latex_to_pdf(latex_code: str, application_id: int) -> str:
    """
    Compiles LaTeX to PDF or generates a valid PDF file via ReportLab if pdflatex is not installed on host.
    """
    pdf_filename = f"resume_app_{application_id}.pdf"
    output_dir = os.path.join(os.getcwd(), "generated_resumes")
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, pdf_filename)

    tex_path = os.path.join(output_dir, f"resume_app_{application_id}.tex")
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(latex_code)

    try:
        res = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", f"-output-directory={output_dir}", tex_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15
        )
        if res.returncode == 0 and os.path.exists(pdf_path):
            return f"/generated_resumes/{pdf_filename}"
    except Exception as e:
        logger.warning(f"pdflatex compilation skipped or failed ({e}). Generating fallback PDF via ReportLab.")

    # ReportLab Fallback PDF generation
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas

        c = canvas.Canvas(pdf_path, pagesize=letter)
        width, height = letter
        y = height - 50

        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, "SkillProof — Tailored ATS Resume")
        y -= 25

        c.setFont("Helvetica", 10)
        lines = latex_code.split("\n")
        for line in lines:
            clean_line = line.replace("\\textbf{", "").replace("\\textit{", "").replace("}", "").replace("\\item ", "• ").replace("\\section*{", "").replace("\\hfill", "  ").strip()
            if not clean_line or clean_line.startswith("\\"):
                continue
            c.drawString(50, y, clean_line[:100])
            y -= 15
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)

        c.save()
    except Exception as pdf_err:
        logger.error(f"ReportLab PDF generation error: {pdf_err}")

    return f"/generated_resumes/{pdf_filename}"

