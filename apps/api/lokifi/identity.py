import hashlib
import secrets
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal, get_db
from .models import Attempt, LoginSession, User, now
from .schemas import AccountInput, Credentials, Message, PasswordInput, Registration, UserView

router = APIRouter(prefix="/auth", tags=["identity"])
hasher = PasswordHasher()
COOKIE = "lokifi_session"


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE, "")
    if not token or len(token) > 200:
        raise HTTPException(401, "Sign in to continue")
    session = db.get(LoginSession, digest(token))
    if session is None or session.expires_at <= now():
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(401, "Sign in to continue")
    return user


def administrator(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator access required")
    return user


def throttle(request: Request, email: str):
    # Persist attempts separately: failed auth transactions must not erase them.
    for value, limit in ((email, 10), (request.client.host if request.client else "local", 100)):
        bucket = digest(value)
        with SessionLocal.begin() as db:
            db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": int(bucket[:15], 16)})
            db.execute(delete(Attempt).where(Attempt.created_at < now() - timedelta(minutes=15)))
            count = db.scalar(select(func.count()).select_from(Attempt).where(Attempt.bucket == bucket))
            if count >= limit:
                raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
            db.add(Attempt(bucket=bucket))


def establish(response: Response, user: User, db: Session):
    token = secrets.token_urlsafe(48)
    db.execute(delete(LoginSession).where(LoginSession.expires_at < now()))
    db.add(
        LoginSession(
            token_hash=digest(token),
            user_id=user.id,
            expires_at=now() + timedelta(hours=settings().session_hours),
        )
    )
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        secure=settings().environment == "production",
        samesite="lax",
        max_age=settings().session_hours * 3600,
        path="/",
    )


@router.post("/register", response_model=UserView, status_code=201)
def register(data: Registration, request: Request, response: Response, db: Session = Depends(get_db)):
    throttle(request, str(data.email))
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(409, "An account already uses this email")
    user = User(email=str(data.email), name=data.name, password_hash=hasher.hash(data.password))
    db.add(user)
    db.flush()
    establish(response, user, db)
    db.commit()
    return user


@router.post("/login", response_model=UserView)
def login(data: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    throttle(request, str(data.email))
    user = db.scalar(select(User).where(User.email == data.email))
    valid = False
    try:
        valid = hasher.verify(user.password_hash if user else DUMMY_HASH, data.password)
    except (VerificationError, InvalidHashError):
        pass
    if not user or not valid:
        raise HTTPException(401, "Email or password is incorrect")
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(data.password)
    establish(response, user, db)
    db.commit()
    return user


DUMMY_HASH = hasher.hash(secrets.token_hex(32))


@router.get("/me", response_model=UserView)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserView)
def update_me(data: AccountInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.name = data.name
    db.commit()
    return user


@router.post("/logout", response_model=Message)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    db.execute(delete(LoginSession).where(LoginSession.token_hash == digest(request.cookies.get(COOKIE, ""))))
    db.commit()
    response.delete_cookie(
        COOKIE, path="/", secure=settings().environment == "production", httponly=True, samesite="lax"
    )
    return {"detail": "Signed out"}


@router.post("/password", response_model=Message)
def password(
    data: PasswordInput,
    response: Response,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    throttle(request, user.email)
    try:
        hasher.verify(user.password_hash, data.current_password)
    except VerificationError:
        raise HTTPException(400, "Current password is incorrect") from None
    user.password_hash = hasher.hash(data.new_password)
    db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
    establish(response, user, db)
    db.commit()
    return {"detail": "Password updated. Other sessions have been signed out."}
