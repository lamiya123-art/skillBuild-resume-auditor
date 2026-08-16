import pytest
from app.core.security import hash_password, verify_password, create_access_token

def test_password_hashing_and_verification():
    raw_password = "SecurePassword123!"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_access_token_creation():
    token = create_access_token({"sub": "42"})
    assert isinstance(token, str)
    assert len(token) > 20
