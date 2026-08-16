import pytest
from app.services.repo_audit import compute_readiness_score
from tests.fixtures import (
    get_well_documented_repo,
    get_unmodified_boilerplate_repo,
    get_single_bulk_commit_repo,
    get_low_ownership_forked_repo,
    get_generic_commit_messages_repo
)

def test_well_documented_repo_high_score():
    repo_data = get_well_documented_repo()
    result = compute_readiness_score(repo_data)
    assert result.readiness_score >= 85
    assert len(result.flags) == 0
    assert result.breakdown.readme_exists_score == 25
    assert result.breakdown.readme_quality_score == 15
    assert result.breakdown.commit_spread_score == 25

def test_unmodified_boilerplate_repo_flags():
    repo_data = get_unmodified_boilerplate_repo()
    result = compute_readiness_score(repo_data)
    assert result.breakdown.readme_quality_score == 0
    assert any("boilerplate" in flag.lower() for flag in result.flags)
    assert result.readiness_score < 50

def test_single_bulk_commit_repo_flags():
    repo_data = get_single_bulk_commit_repo()
    result = compute_readiness_score(repo_data)
    assert result.breakdown.commit_spread_score == 0
    assert any("bulk upload" in flag.lower() or "single day" in flag.lower() for flag in result.flags)

def test_low_ownership_forked_repo_flags():
    repo_data = get_low_ownership_forked_repo()
    result = compute_readiness_score(repo_data)
    assert result.breakdown.authorship_score == 0
    assert any("authorship" in flag.lower() or "forked" in flag.lower() for flag in result.flags)

def test_generic_commit_messages_repo_flags():
    repo_data = get_generic_commit_messages_repo()
    result = compute_readiness_score(repo_data)
    assert result.breakdown.commit_messages_score == 0
    assert any("generic commit messages" in flag.lower() for flag in result.flags)
