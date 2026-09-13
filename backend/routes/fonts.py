from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from pathlib import Path
import random
import re
import string
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import decode_token, get_current_user
from config import resolve_runtime_path, settings
from database import AuthSession, BrandFont, BrandKit, Favorite, FontAsset, RecentHistory, User, get_db
from font_catalog import BUILT_IN_FONTS


router = APIRouter(prefix="/api/fonts", tags=["fonts"])
optional_security = HTTPBearer(auto_error=False)
FONT_ROOT = resolve_runtime_path(settings.MEDIA_ROOT) / "fonts"
MAX_FONT_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".ttf", ".otf", ".woff", ".woff2"}
MIME_TYPES = {
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


class FontResponse(BaseModel):
    id: str
    family: str
    displayName: str
    category: str
    source: str
    url: Optional[str] = None
    weights: list[int]
    styles: list[str]
    isPremium: bool
    isVariable: bool = False
    licence: Optional[str] = None
    previewText: Optional[str] = None
    isFavourite: bool = False
    canDelete: bool = False


class FontListResponse(BaseModel):
    fonts: list[FontResponse]
    categories: list[str]


class FontActionResponse(BaseModel):
    success: bool
    fontId: str
    isFavourite: Optional[bool] = None


def _id(prefix: str) -> str:
    return f"{prefix}_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_token(token)
        user_id = payload.get("id")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        token_hash = sha256(token.encode("utf-8")).hexdigest()
        session = db.query(AuthSession).filter(
            AuthSession.user_id == user.id,
            AuthSession.token_hash == token_hash,
            AuthSession.revoked_at.is_(None),
        ).first()
        if not session or (session.expires_at and session.expires_at < datetime.utcnow()):
            return None
        return user
    except HTTPException:
        return None


def _public_url(request: Request, relative: str) -> str:
    return f"{str(request.base_url).rstrip('/')}{relative}"


def _safe_family(value: str) -> str:
    family = re.sub(r"[^a-zA-Z0-9 _-]+", "", value).strip()
    if not family:
        raise HTTPException(status_code=422, detail="Font family is required")
    return family[:150]


def _validate_font_bytes(extension: str, content: bytes) -> None:
    if not content:
        raise HTTPException(status_code=422, detail="Font file is empty")
    if len(content) > MAX_FONT_SIZE:
        raise HTTPException(status_code=413, detail="Font file exceeds the 10 MB limit")
    signature = content[:4]
    valid = {
        ".ttf": signature in {b"\x00\x01\x00\x00", b"true", b"typ1"},
        ".otf": signature == b"OTTO",
        ".woff": signature == b"wOFF",
        ".woff2": signature == b"wOF2",
    }
    if not valid.get(extension, False):
        raise HTTPException(status_code=422, detail="The uploaded file is not a valid supported font")


def _favourite_ids(db: Session, user: Optional[User]) -> set[str]:
    if not user:
        return set()
    return {row[0] for row in db.query(Favorite.item_id).filter(Favorite.user_id == user.id, Favorite.item_type == "font").all()}


def _built_in(item: dict, favourites: set[str]) -> FontResponse:
    return FontResponse(
        id=item["id"], family=item["family"], displayName=item["display_name"], category=item["category"],
        source=item["source"], url=item.get("url"), weights=item["weights"], styles=item["styles"],
        isPremium=item["is_premium"], isVariable=item["is_variable"], licence=item.get("licence"),
        previewText=item.get("preview_text"), isFavourite=item["id"] in favourites, canDelete=False,
    )


def _uploaded(item: FontAsset, favourites: set[str]) -> FontResponse:
    return FontResponse(
        id=item.id, family=item.family, displayName=item.display_name, category=item.category, source=item.source,
        url=item.public_url, weights=item.weights or [400], styles=item.styles or ["normal"],
        isPremium=bool(item.is_premium), isVariable=bool(item.is_variable), licence=item.licence,
        previewText="Your uploaded font preview", isFavourite=item.id in favourites, canDelete=True,
    )


@router.get("", response_model=FontListResponse)
def list_fonts(
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[str] = Query(default=None, max_length=80),
    source: Optional[str] = Query(default=None, pattern="^(built-in|premium|brand|uploaded)$"),
    collection: str = Query(default="all", pattern="^(all|favorites|recent)$"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    favourites = _favourite_ids(db, current_user)
    fonts = [_built_in(item, favourites) for item in BUILT_IN_FONTS]
    if current_user:
        fonts.extend(_uploaded(item, favourites) for item in db.query(FontAsset).filter(FontAsset.user_id == current_user.id).order_by(FontAsset.created_at.desc()).all())
        brand_rows = db.query(BrandFont).join(BrandKit, BrandKit.id == BrandFont.brand_kit_id).filter(BrandKit.user_id == current_user.id).all()
        fonts.extend(FontResponse(
            id=f"brand_font_{item.id}", family=item.family, displayName=item.name, category="brand-fonts", source="brand",
            weights=[int(item.weight)] if str(item.weight).isdigit() else [400], styles=[item.style or "normal"],
            isPremium=False, licence="User brand font reference", previewText="Brand font preview",
            isFavourite=f"brand_font_{item.id}" in favourites, canDelete=False,
        ) for item in brand_rows)

    if q and q.strip():
        needle = q.strip().lower()
        fonts = [item for item in fonts if needle in item.family.lower() or needle in item.displayName.lower() or needle in item.category.lower()]
    if category:
        fonts = [item for item in fonts if item.category == category]
    if source:
        fonts = [item for item in fonts if item.source == source]
    if collection == "favorites":
        fonts = [item for item in fonts if item.id in favourites]
    elif collection == "recent":
        if not current_user:
            fonts = []
        else:
            rows = db.query(RecentHistory.item_id).filter(RecentHistory.user_id == current_user.id, RecentHistory.item_type == "font").order_by(RecentHistory.created_at.desc()).limit(40).all()
            order = {row[0]: index for index, row in enumerate(rows)}
            fonts = sorted((item for item in fonts if item.id in order), key=lambda item: order[item.id])

    return FontListResponse(fonts=fonts, categories=sorted({item.category for item in fonts}))


@router.post("/upload", response_model=FontResponse, status_code=status.HTTP_201_CREATED)
async def upload_font(
    request: Request,
    file: UploadFile = File(...),
    family: str = Form(...),
    display_name: Optional[str] = Form(default=None),
    category: str = Form(default="uploaded"),
    weight: int = Form(default=400, ge=100, le=900),
    style_name: str = Form(default="normal", pattern="^(normal|italic)$"),
    licence: str = Form(default="User-provided; user confirms font usage rights"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Supported font formats are TTF, OTF, WOFF, and WOFF2")
    content = await file.read(MAX_FONT_SIZE + 1)
    _validate_font_bytes(extension, content)
    normalized_family = _safe_family(family)
    duplicate = db.query(FontAsset).filter(FontAsset.user_id == current_user.id, FontAsset.family == normalized_family).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="A font with this family name already exists")

    font_id = _id("font")
    user_dir = FONT_ROOT / current_user.id
    user_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{font_id}{extension}"
    storage_path = user_dir / stored_name
    storage_path.write_bytes(content)
    relative = f"/media/fonts/{current_user.id}/{stored_name}"
    record = FontAsset(
        id=font_id, user_id=current_user.id, family=normalized_family,
        display_name=(display_name or normalized_family).strip()[:150], category=category.strip()[:80] or "uploaded",
        source="uploaded", filename=(file.filename or stored_name)[:255], mime_type=MIME_TYPES[extension],
        file_size=len(content), storage_path=str(storage_path), public_url=_public_url(request, relative),
        weights=[weight], styles=[style_name], is_premium=False, is_variable=False, licence=licence[:255],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _uploaded(record, set())


@router.delete("/{font_id}")
def delete_font(font_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(FontAsset).filter(FontAsset.id == font_id, FontAsset.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Uploaded font not found")
    path = Path(record.storage_path)
    if path.exists() and path.is_file():
        path.unlink()
    db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.item_type == "font", Favorite.item_id == font_id).delete()
    db.delete(record)
    db.commit()
    return {"success": True, "fontId": font_id}


@router.post("/{font_id}/favorite", response_model=FontActionResponse, status_code=status.HTTP_201_CREATED)
def favorite_font(font_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.item_type == "font", Favorite.item_id == font_id).first()
    if not existing:
        db.add(Favorite(id=_id("fav"), user_id=current_user.id, item_type="font", item_id=font_id))
        db.commit()
    return FontActionResponse(success=True, fontId=font_id, isFavourite=True)


@router.delete("/{font_id}/favorite", response_model=FontActionResponse)
def unfavorite_font(font_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favourite = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.item_type == "font", Favorite.item_id == font_id).first()
    if favourite:
        db.delete(favourite)
        db.commit()
    return FontActionResponse(success=True, fontId=font_id, isFavourite=False)


@router.post("/{font_id}/use", response_model=FontActionResponse)
def record_font_use(font_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(RecentHistory).filter(RecentHistory.user_id == current_user.id, RecentHistory.item_type == "font", RecentHistory.item_id == font_id).first()
    if existing:
        existing.created_at = datetime.utcnow()
    else:
        db.add(RecentHistory(id=_id("recent"), user_id=current_user.id, item_type="font", item_id=font_id))
    db.commit()
    return FontActionResponse(success=True, fontId=font_id)
