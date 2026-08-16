import pytest
from pydantic import ValidationError
from app.schemas.skill import ClassifySkillTool

def test_classify_skill_valid_schema():
    tool = ClassifySkillTool(
        skill_name="Python",
        tier=3,
        evidence_repo_id=10,
        rationale="Primary technology in dedicated repo with high readiness score."
    )
    assert tool.skill_name == "Python"
    assert tool.tier == 3
    assert tool.evidence_repo_id == 10

def test_classify_skill_missing_required_fields():
    with pytest.raises(ValidationError):
        # Missing rationale
        ClassifySkillTool(
            skill_name="Docker",
            tier=2
        )

def test_classify_skill_invalid_tier_type():
    with pytest.raises(ValidationError):
        ClassifySkillTool(
            skill_name="FastAPI",
            tier="master", # String instead of integer
            rationale="Invalid"
        )
