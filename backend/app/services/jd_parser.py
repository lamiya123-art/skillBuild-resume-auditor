import re
import logging
import httpx
from typing import Optional
from app.schemas.jd import ParsedJDOutput, ParseJDRequest, ExtractedRequirement
from app.core.llm_provider import llm_provider

logger = logging.getLogger(__name__)

def fetch_url_text(url: str) -> str:
    try:
        response = httpx.get(url, timeout=10.0, follow_redirects=True)
        # Stripping basic HTML tags if any
        clean_text = re.sub(r'<[^>]+>', ' ', response.text)
        return clean_text[:5000] # Limit size
    except Exception as e:
        logger.error(f"Failed to fetch JD URL {url}: {e}")
        return f"Job Description URL: {url}"

def parse_job_description(request: ParseJDRequest) -> ParsedJDOutput:
    jd_content = ""
    is_inferred = False

    if request.jd_url:
        jd_content = fetch_url_text(request.jd_url)
    elif request.jd_text and len(request.jd_text.strip()) > 20:
        jd_content = request.jd_text.strip()
    elif request.role_title and request.company_name:
        is_inferred = True
        jd_content = f"Target Role: {request.role_title} at {request.company_name}. Infer standard technical requirements for this engineering role."
    else:
        raise ValueError("Must provide either jd_text, jd_url, or both role_title and company_name.")

    prompt = f"""
    Extract structured skills and technical requirements from this Job Description text:

    ---
    {jd_content}
    ---

    Categorize requirements into three lists:
    1. 'required': Core hard requirements mentioned as required, must-have, or primary stack.
    2. 'preferred': Nice to have or bonus skills.
    3. 'nice_to_have': Domain experience or general methodologies.

    For each item, provide 'skill_name' (normalized technology name e.g. Python, Docker) and 'raw_phrase_from_jd' (context excerpt).
    Return ONLY a JSON response conforming to ParsedJDOutput.
    """

    try:
        parsed = llm_provider.generate_structured_output(
            prompt=prompt,
            response_schema=ParsedJDOutput,
            system_instruction="You are an expert technical recruiter parsing Job Descriptions with high precision."
        )
        parsed.is_inferred = is_inferred
        return parsed
    except Exception as e:
        logger.error(f"JD parsing failed: {e}")
        # Rule-based fallback regex parser if LLM fails
        return _fallback_jd_parse(jd_content, is_inferred)

def _fallback_jd_parse(text: str, is_inferred: bool) -> ParsedJDOutput:
    common_techs = [
        "Python", "FastAPI", "React", "Next.js", "TypeScript", "JavaScript",
        "PostgreSQL", "Docker", "AWS", "Kubernetes", "Git", "REST API", "GraphQL", "Java", "C++"
    ]
    found_reqs = []
    text_lower = text.lower()
    for tech in common_techs:
        if tech.lower() in text_lower:
            found_reqs.append(ExtractedRequirement(skill_name=tech, raw_phrase_from_jd=f"Requires knowledge of {tech}"))

    if not found_reqs:
        found_reqs = [
            ExtractedRequirement(skill_name="Python", raw_phrase_from_jd="Core language"),
            ExtractedRequirement(skill_name="FastAPI", raw_phrase_from_jd="Backend framework")
        ]

    return ParsedJDOutput(
        required=found_reqs[:3],
        preferred=found_reqs[3:5],
        nice_to_have=[],
        is_inferred=is_inferred
    )
