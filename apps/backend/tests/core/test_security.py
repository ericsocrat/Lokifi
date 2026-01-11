import os
from datetime import timedelta

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_jwt_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    validate_email,
    validate_password_strength,
    verify_jwt_token,
    verify_password,
)


def setup_secret(monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "test-secret-key")
    monkeypatch.setattr(settings, "JWT_ALGORITHM", "HS256")


def test_hash_and_verify_password():
    hashed = hash_password("StrongPass1!")
    assert verify_password("StrongPass1!", hashed) is True
    assert verify_password("Wrong", hashed) is False


def test_validate_email_basic():
    assert validate_email("User@Test.com") is True
    assert validate_email("bad@@example") is False


@pytest.mark.parametrize(
    "pwd,ok",
    [
        ("password", False),
        ("Short1!", False),
        ("Abcdef1!", True),
        ("LongerPwd123!A", True),
    ],
)
def test_validate_password_strength_various(pwd, ok):
    assert validate_password_strength(pwd) is ok


def test_create_and_verify_jwt_token(monkeypatch):
    setup_secret(monkeypatch)
    token = create_jwt_token(
        {"sub": "u1", "email": "a@b.com"}, expires_delta=timedelta(minutes=5)
    )
    payload = verify_jwt_token(token)
    assert payload["sub"] == "u1"
    assert payload["email"] == "a@b.com"


def test_access_and_refresh_tokens(monkeypatch):
    setup_secret(monkeypatch)
    at = create_access_token("u1", "a@b.com")
    rt = create_refresh_token("u1")
    assert verify_jwt_token(at)["type"] == "access"
    assert verify_jwt_token(rt)["type"] == "refresh"


def test_verify_jwt_token_expired(monkeypatch):
    setup_secret(monkeypatch)
    # Create a token that is already expired
    token = create_jwt_token({"sub": "u1"}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        verify_jwt_token(token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


def test_verify_jwt_token_invalid_signature(monkeypatch):
    # Create token with one secret, then verify with a different secret.
    # Force usage of `lokifi_jwt_secret` which `get_jwt_secret()` prioritizes.
    monkeypatch.setattr(settings, "lokifi_jwt_secret", "secret-1")
    monkeypatch.setattr(settings, "JWT_ALGORITHM", "HS256")
    token = create_jwt_token({"sub": "u1"}, expires_delta=timedelta(minutes=5))
    # Change secret before verification to force signature mismatch
    monkeypatch.setattr(settings, "lokifi_jwt_secret", "secret-2")
    with pytest.raises(HTTPException) as exc:
        verify_jwt_token(token)
    assert exc.value.status_code == 401
    assert "validate" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_valid_token(monkeypatch):
    setup_secret(monkeypatch)
    token = create_jwt_token({"sub": "42", "email": "x@y.com", "handle": "h"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = await get_current_user(creds)
    assert user["id"] == "42"
    assert user["email"] == "x@y.com"
    assert user["handle"] == "h"


@pytest.mark.asyncio
async def test_get_current_user_anon_when_no_token():
    user = await get_current_user(None)
    assert user["handle"] == "anon"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token_raises(monkeypatch):
    # Create token with one secret (using prioritized lokifi_jwt_secret)
    monkeypatch.setattr(settings, "lokifi_jwt_secret", "secret-a")
    monkeypatch.setattr(settings, "JWT_ALGORITHM", "HS256")
    token = create_jwt_token({"sub": "42", "email": "x@y.com", "handle": "h"})
    # Change secret so decoding fails
    monkeypatch.setattr(settings, "lokifi_jwt_secret", "secret-b")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with pytest.raises(HTTPException) as exc:
        await get_current_user(creds)
    assert exc.value.status_code == 401
