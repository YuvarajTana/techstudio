from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, Favorite, User
from auth import get_current_user
import random
import string

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


def generate_id():
    return "fav_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


class FavoriteCreate(BaseModel):
    item_type: str  # template, project, asset
    item_id: str


class FavoriteResponse(BaseModel):
    id: str
    item_type: str
    item_id: str
    created_at: str


class FavoriteListResponse(BaseModel):
    favorites: List[FavoriteResponse]


@router.get("", response_model=FavoriteListResponse)
def list_favorites(
    item_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Favorite).filter(Favorite.user_id == current_user.id)
    if item_type:
        query = query.filter(Favorite.item_type == item_type)

    favs = query.order_by(Favorite.created_at.desc()).all()
    return FavoriteListResponse(
        favorites=[
            FavoriteResponse(
                id=f.id, item_type=f.item_type, item_id=f.item_id,
                created_at=f.created_at.isoformat() if f.created_at else "",
            )
            for f in favs
        ]
    )


@router.post("", response_model=FavoriteResponse)
def add_favorite(
    req: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.item_type == req.item_type,
        Favorite.item_id == req.item_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already favorited")

    fav = Favorite(
        id=generate_id(),
        user_id=current_user.id,
        item_type=req.item_type,
        item_id=req.item_id,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return FavoriteResponse(
        id=fav.id, item_type=fav.item_type, item_id=fav.item_id,
        created_at=fav.created_at.isoformat() if fav.created_at else "",
    )


@router.delete("/{fav_id}")
def remove_favorite(
    fav_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fav = db.query(Favorite).filter(Favorite.id == fav_id, Favorite.user_id == current_user.id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}
