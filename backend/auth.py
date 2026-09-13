from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from hashlib import sha256
import secrets
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db, User, AuthSession
from config import settings

LEGACY_SALT = "teckstudio_2026"
BCRYPT_ROUNDS = 12

# JWT Bearer
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return bcrypt.hashpw(_bcrypt_password(password), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode("utf-8")


def _bcrypt_password(password: str) -> bytes:
    return sha256(password.encode("utf-8")).digest()


def _legacy_hash_password(password: str) -> str:
    return sha256(f"{LEGACY_SALT}{password}".encode()).hexdigest()


def needs_password_rehash(hashed_password: str) -> bool:
    """Return true for legacy SHA-256 hashes or outdated bcrypt parameters."""
    if not hashed_password:
        return True
    if len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password.lower()):
        return True
    return not hashed_password.startswith(("$2a$", "$2b$", "$2y$"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt or legacy SHA-256 hash."""
    if not hashed_password:
        return False

    if len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password.lower()):
        return secrets.compare_digest(_legacy_hash_password(plain_password), hashed_password)

    try:
        return bcrypt.checkpw(_bcrypt_password(plain_password), hashed_password.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def create_token(user_id: str, email: str) -> str:
    """Create JWT token."""
    if not settings.JWT_SECRET.strip():
        raise RuntimeError("JWT_SECRET is not configured.")

    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRY_DAYS)
    payload = {
        "id": user_id,
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from token."""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("id")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token_hash = sha256(token.encode("utf-8")).hexdigest()
    session = db.query(AuthSession).filter(
        AuthSession.user_id == user.id,
        AuthSession.token_hash == token_hash,
        AuthSession.revoked_at.is_(None),
    ).first()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if session.expires_at:
        expires_at = session.expires_at if session.expires_at.tzinfo is not None else session.expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Invalid or expired session")

    return user


