from __future__ import annotations

from datetime import datetime
from hashlib import sha256
import random
import string
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import decode_token, get_current_user
from database import AuthSession, Favorite, RecentHistory, User, get_db
from sticker_catalog import STICKER_CATALOG


router = APIRouter(prefix="/api/stickers", tags=["stickers"])
optional_security = HTTPBearer(auto_error=False)


class StickerResponse(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str]
    thumbnailUrl: str
    sourceUrl: str
    fileType: str
    width: Optional[int] = None
    height: Optional[int] = None
    isPremium: bool
    isFeatured: bool = False
    isFavourite: bool = False
    createdAt: Optional[str] = None


class StickerListResponse(BaseModel):
    stickers: list[StickerResponse]
    page: int
    perPage: int
    total: int
    hasMore: bool


class StickerCategoryResponse(BaseModel):
    id: str
    label: str
    count: int


class StickerCategoriesResponse(BaseModel):
    categories: list[StickerCategoryResponse]


class StickerActionResponse(BaseModel):
    success: bool
    stickerId: str
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


def _catalog_item(sticker_id: str) -> dict:
    item = next((entry for entry in STICKER_CATALOG if entry["id"] == sticker_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Sticker not found")
    return item


def _favourite_ids(db: Session, user: Optional[User]) -> set[str]:
    if not user:
        return set()
    rows = db.query(Favorite.item_id).filter(
        Favorite.user_id == user.id,
        Favorite.item_type == "sticker",
    ).all()
    return {row[0] for row in rows}


def _serialize(item: dict, favourite_ids: set[str]) -> StickerResponse:
    return StickerResponse(
        id=item["id"],
        name=item["name"],
        category=item["category"],
        tags=item["tags"],
        thumbnailUrl=item["thumbnail_url"],
        sourceUrl=item["source_url"],
        fileType=item["file_type"],
        width=item.get("width"),
        height=item.get("height"),
        isPremium=bool(item.get("is_premium")),
        isFeatured=bool(item.get("is_featured")),
        isFavourite=item["id"] in favourite_ids,
        createdAt=item.get("created_at"),
    )


@router.get("/categories", response_model=StickerCategoriesResponse)
def list_sticker_categories():
    counts: dict[str, dict] = {}
    for item in STICKER_CATALOG:
        category = item["category"]
        counts.setdefault(category, {"id": category, "label": item["category_label"], "count": 0})
        counts[category]["count"] += 1
    return StickerCategoriesResponse(categories=[StickerCategoryResponse(**value) for value in counts.values() if value["count"] > 0])


@router.get("", response_model=StickerListResponse)
def list_stickers(
    q: Optional[str] = Query(default=None, max_length=100),
    category: Optional[str] = Query(default=None, max_length=80),
    collection: str = Query(default="all", pattern="^(all|featured|favorites|recent)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=24, ge=1, le=60),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    favourite_ids = _favourite_ids(db, current_user)
    items = list(STICKER_CATALOG)

    if category:
        items = [item for item in items if item["category"] == category]
    if q and q.strip():
        needle = q.strip().lower()
        items = [item for item in items if needle in item["name"].lower() or any(needle in tag for tag in item["tags"])]
    if collection == "featured":
        items = [item for item in items if item.get("is_featured")]
    elif collection == "favorites":
        items = [item for item in items if item["id"] in favourite_ids]
    elif collection == "recent":
        if not current_user:
            items = []
        else:
            rows = db.query(RecentHistory.item_id).filter(
                RecentHistory.user_id == current_user.id,
                RecentHistory.item_type == "sticker",
            ).order_by(RecentHistory.created_at.desc()).limit(60).all()
            order = {row[0]: index for index, row in enumerate(rows)}
            items = sorted((item for item in items if item["id"] in order), key=lambda item: order[item["id"]])

    total = len(items)
    start = (page - 1) * per_page
    page_items = items[start:start + per_page]
    return StickerListResponse(
        stickers=[_serialize(item, favourite_ids) for item in page_items],
        page=page,
        perPage=per_page,
        total=total,
        hasMore=start + len(page_items) < total,
    )


@router.post("/{sticker_id}/favorite", response_model=StickerActionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{sticker_id}/favourite", response_model=StickerActionResponse, status_code=status.HTTP_201_CREATED)
def favorite_sticker(
    sticker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _catalog_item(sticker_id)
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.item_type == "sticker",
        Favorite.item_id == sticker_id,
    ).first()
    if not existing:
        db.add(Favorite(id=_id("fav"), user_id=current_user.id, item_type="sticker", item_id=sticker_id))
        db.commit()
    return StickerActionResponse(success=True, stickerId=sticker_id, isFavourite=True)


@router.delete("/{sticker_id}/favorite", response_model=StickerActionResponse)
@router.delete("/{sticker_id}/favourite", response_model=StickerActionResponse)
def unfavorite_sticker(
    sticker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _catalog_item(sticker_id)
    favourite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.item_type == "sticker",
        Favorite.item_id == sticker_id,
    ).first()
    if favourite:
        db.delete(favourite)
        db.commit()
    return StickerActionResponse(success=True, stickerId=sticker_id, isFavourite=False)


@router.post("/{sticker_id}/use", response_model=StickerActionResponse)
def record_sticker_use(
    sticker_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _catalog_item(sticker_id)
    existing = db.query(RecentHistory).filter(
        RecentHistory.user_id == current_user.id,
        RecentHistory.item_type == "sticker",
        RecentHistory.item_id == sticker_id,
    ).first()
    if existing:
        existing.created_at = datetime.utcnow()
    else:
        db.add(RecentHistory(id=_id("recent"), user_id=current_user.id, item_type="sticker", item_id=sticker_id))
    db.commit()
    return StickerActionResponse(success=True, stickerId=sticker_id)
