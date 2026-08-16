import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import User, SkillClaim
from app.schemas.jd import ParsedJDOutput, ExtractedRequirement
from app.services.match_engine import generate_match_report

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_match_engine_categorizes_strong_weak_gap(db_session):
    user = User(email="test@example.com", github_username="testuser")
    db_session.add(user)
    db_session.commit()

    # Add claims
    db_session.add(SkillClaim(user_id=user.id, skill_name="Python", tier=3, rationale="Dedicated project"))
    db_session.add(SkillClaim(user_id=user.id, skill_name="React", tier=1, rationale="Coursework"))
    db_session.commit()

    parsed_jd = ParsedJDOutput(
        required=[
            ExtractedRequirement(skill_name="Python", raw_phrase_from_jd="3+ yrs Python"),
            ExtractedRequirement(skill_name="Docker", raw_phrase_from_jd="Docker experience")
        ],
        preferred=[
            ExtractedRequirement(skill_name="React", raw_phrase_from_jd="React frontend")
        ]
    )

    report = generate_match_report(
        db=db_session,
        user=user,
        company="Acme Corp",
        role="Backend Engineer",
        parsed_jd=parsed_jd
    )

    assert report.strong_matches_count == 1 # Python (Tier 3)
    assert report.weak_matches_count == 1   # React (Tier 1)
    assert report.gaps_count == 1           # Docker (Missing -> Gap)
    assert len(report.gap_actions) == 1
    assert report.gap_actions[0].skill_name.lower() == "docker"
