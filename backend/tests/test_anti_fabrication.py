import pytest
from app.services.resume_generator import validate_resume_claims

def test_anti_fabrication_accepts_valid_ground_truth_claims():
    skill_map = {
        "python": 3,
        "fastapi": 2,
        "docker": 2,
        "aws": 0 # Mentioned only
    }
    master_profile = {"name": "Candidate", "skills": ["Python", "FastAPI", "Docker", "AWS"]}

    valid_resume_content = {
        "experience": [
            {
                "company": "Tech Corp",
                "description": [
                    "Developed backend microservices using Python and FastAPI framework.",
                    "Containerized applications with Docker for automated CI/CD deployment."
                ]
            }
        ],
        "projects": []
    }

    result = validate_resume_claims(valid_resume_content, skill_map, master_profile)
    assert result.is_passed is True
    assert len([c for c in result.rejected_claims if not c.is_valid]) == 0

def test_anti_fabrication_rejects_tier_0_overclaim_as_production():
    skill_map = {
        "python": 3,
        "aws": 0 # Tier 0: Mentioned only!
    }
    master_profile = {"name": "Candidate", "skills": ["Python", "AWS"]}

    # Deliberately injected fake production claim for Tier 0 AWS skill
    fabricated_resume_content = {
        "experience": [
            {
                "company": "Tech Corp",
                "description": [
                    "Architected enterprise AWS cloud infrastructure managing EC2 and S3 production clusters."
                ]
            }
        ],
        "projects": []
    }

    result = validate_resume_claims(fabricated_resume_content, skill_map, master_profile)
    assert result.is_passed is False
    rejected = [c for c in result.rejected_claims if not c.is_valid]
    assert len(rejected) == 1
    assert "Tier 0" in rejected[0].rejected_reason or "unverified" in rejected[0].rejected_reason

def test_anti_fabrication_rejects_hallucinated_10x_metrics():
    skill_map = {"python": 3}
    master_profile = {"name": "Candidate", "skills": ["Python"]} # Does NOT contain "10x" or "100%"

    fabricated_resume_content = {
        "experience": [
            {
                "company": "Tech Corp",
                "description": [
                    "Improved team engineering velocity by 10x using Python automation scripts."
                ]
            }
        ],
        "projects": []
    }

    result = validate_resume_claims(fabricated_resume_content, skill_map, master_profile)
    assert result.is_passed is False
    rejected = [c for c in result.rejected_claims if not c.is_valid]
    assert "unverified metric" in rejected[0].rejected_reason.lower()
