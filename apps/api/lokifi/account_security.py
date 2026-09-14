"""Verified accounts, bounded transactional email and account lifecycle."""

import html
import secrets
from datetime import timedelta
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import ConfigDict, EmailStr, Field
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal, get_db
from .identity import COOKIE, current_user, digest, hasher, throttle
from .models import AccountToken, Conversation, EmailQuota, LoginSession, User, now
from .schemas import Input, Message, UserView

router = APIRouter(tags=["account security"])


class RecoveryInput(Input):
    email: EmailStr
    turnstile_token: str | None = Field(default=None, max_length=2048)


class TokenInput(Input):
    token: str = Field(min_length=20, max_length=128)


class ResetInput(TokenInput):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    password: str = Field(min_length=12, max_length=128)


class ChallengeInput(Input):
    turnstile_token: str | None = Field(default=None, max_length=2048)


class DeleteInput(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    password: str = Field(min_length=1, max_length=128)


def challenge(token: str | None, action: str):
    cfg = settings()
    if cfg.environment == "test" or (cfg.environment == "local" and not cfg.turnstile_secret):
        return
    if not token or not cfg.turnstile_secret:
        raise HTTPException(403, "Complete the verification challenge")
    try:
        response = httpx.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": cfg.turnstile_secret.get_secret_value(), "response": token},
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Verification is unavailable. Please retry.") from None
    if not (
        result.get("success") is True
        and result.get("action") == action
        and result.get("hostname") == urlparse(cfg.web_origin).hostname
    ):
        raise HTTPException(403, "The verification challenge expired or was not valid")


def issue_email(user: User, kind: str):
    cfg = settings()
    if not cfg.resend_api_key or not cfg.email_from:
        raise HTTPException(503, "Account email delivery has not been configured")
    token = secrets.token_urlsafe(32)
    day = now().date()
    # Reserve before sending; failures still count conservatively against the limit.
    with SessionLocal.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(8123101)"))
        quota = db.get(EmailQuota, day)
        if quota is None:
            quota = EmailQuota(day=day, sent=0)
            db.add(quota)
        if quota.sent >= 90:
            raise HTTPException(429, "Today's email allowance is exhausted. Please try again tomorrow.")
        quota.sent += 1
        db.execute(delete(AccountToken).where(AccountToken.user_id == user.id, AccountToken.kind == kind))
        db.add(
            AccountToken(
                token_hash=digest(token),
                user_id=user.id,
                kind=kind,
                expires_at=now() + (timedelta(hours=24) if kind == "verify" else timedelta(minutes=30)),
            )
        )
    route = "verify-email" if kind == "verify" else "reset-password"
    label = "Verify your email" if kind == "verify" else "Reset your password"
    # Fragment is read by the app; it is not sent to static hosting request logs.
    link = f"{cfg.web_origin}/{route}#token={token}"
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            timeout=15,
            headers={
                "Authorization": f"Bearer {cfg.resend_api_key.get_secret_value()}",
                "Idempotency-Key": digest(token),
            },
            json={
                "from": cfg.email_from,
                "to": [user.email],
                "subject": f"Lokifi: {label}",
                "html": f'<p>{label} to continue using Lokifi.</p><p><a href="{html.escape(link)}">{label}</a></p><p>If you did not request this, ignore this email.</p>',
            },
        )
        response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(503, "The email could not be sent. Please request another link.") from None


def consume(db: Session, token: str, kind: str) -> User:
    record = db.scalar(select(AccountToken).where(AccountToken.token_hash == digest(token)).with_for_update())
    if record is None or record.kind != kind or record.used_at or record.expires_at <= now():
        raise HTTPException(400, "This link is invalid or expired. Request another link.")
    record.used_at = now()
    user = db.get(User, record.user_id)
    if user is None:
        raise HTTPException(400, "This link is no longer valid")
    return user


@router.get("/config")
def public_config():
    cfg = settings()
    return {
        "signup_enabled": cfg.signup_enabled,
        "turnstile_site_key": cfg.turnstile_site_key,
        "chat_enabled": bool(cfg.groq_api_key and cfg.groq_free_confirmed),
        "research_enabled": cfg.research_enabled,
        "support_email": cfg.support_email,
        "environment": cfg.environment,
    }


@router.post("/auth/verification/request", response_model=Message)
def verification_request(data: ChallengeInput, request: Request, user: User = Depends(current_user)):
    throttle(request, user.email)
    challenge(data.turnstile_token, "verify_email")
    if not user.email_verified:
        issue_email(user, "verify")
    return {"detail": "Check your email for a verification link."}


@router.post("/auth/verification/confirm", response_model=Message)
def verification_confirm(data: TokenInput, db: Session = Depends(get_db)):
    user = consume(db, data.token, "verify")
    user.email_verified = True
    db.commit()
    return {"detail": "Email verified. You can now use the assistant."}


@router.post("/auth/recovery", response_model=Message)
def recovery(data: RecoveryInput, request: Request, db: Session = Depends(get_db)):
    email = str(data.email).lower()
    throttle(request, email)
    challenge(data.turnstile_token, "recovery")
    user = db.scalar(select(User).where(User.email == email))
    if user:
        issue_email(user, "reset")
    return {"detail": "If an account exists, a password reset link has been sent."}


@router.post("/auth/reset-password", response_model=Message)
def reset_password(data: ResetInput, db: Session = Depends(get_db)):
    user = consume(db, data.token, "reset")
    user.password_hash = hasher.hash(data.password)
    db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
    db.commit()
    return {"detail": "Password reset. Sign in with your new password."}


@router.post("/account/ai-consent", response_model=UserView)
def ai_consent(user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.ai_consent_at = now()
    db.commit()
    return user


@router.delete("/account/chat-data", response_model=Message)
def delete_chat(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(Conversation).where(Conversation.user_id == user.id))
    user.ai_consent_at = None
    db.commit()
    return {"detail": "Chat history deleted and AI consent withdrawn."}


@router.delete("/account", response_model=Message)
def delete_account(
    data: DeleteInput, response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    from argon2.exceptions import VerificationError

    try:
        hasher.verify(user.password_hash, data.password)
    except VerificationError:
        raise HTTPException(403, "Password is incorrect") from None
    # Cascades delete owned records; quota totals survive without a user identifier.
    db.delete(user)
    db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"detail": "Account and owned records deleted."}
