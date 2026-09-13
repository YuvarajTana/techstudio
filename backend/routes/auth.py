from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db, User, AuthSession
from auth import hash_password, verify_password, needs_password_rehash, create_token, get_current_user, security
from config import settings
import random
import string

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


def generate_user_id():
    return "user_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def generate_session_id():
    return "sess_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=16))


def create_auth_session_record(db: Session, user: User, token: str, request: Request) -> None:
    session = AuthSession(
        id=generate_session_id(),
        user_id=user.id,
        token_hash=sha256(token.encode("utf-8")).hexdigest(),
        user_agent=request.headers.get("user-agent", "")[:255],
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRY_DAYS),
    )
    db.add(session)
    db.commit()


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = generate_user_id()
    hashed = hash_password(req.password)
    
    user = User(
        id=user_id,
        name=req.name,
        email=req.email.lower().strip(),
        password_hash=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate token
    token = create_token(user.id, user.email)
    create_auth_session_record(db, user, token, request)
    
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email)
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if needs_password_rehash(user.password_hash):
        user.password_hash = hash_password(req.password)
        db.commit()
    
    token = create_token(user.id, user.email)
    create_auth_session_record(db, user, token, request)
    
    return AuthResponse(
        token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email
    )


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    token_hash = sha256(credentials.credentials.encode("utf-8")).hexdigest()
    session = db.query(AuthSession).filter(
        AuthSession.user_id == current_user.id,
        AuthSession.token_hash == token_hash,
        AuthSession.revoked_at.is_(None),
    ).first()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return {"message": "Logged out"}

