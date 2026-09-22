"""Revisioned, user-owned product and service catalog for existing brand kits."""

from datetime import datetime
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from auth import get_current_user
from database import BrandCatalogItem, BrandCatalogMedia, BrandKit, User, get_db
from services.creative_media_service import resolve_owned_asset

router = APIRouter(
    prefix="/api/brand-kits/{brand_id}/catalog", tags=["creative-catalog"]
)


class MediaRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: Literal["uploaded", "generated"]
    asset_id: str = Field(min_length=1, max_length=50)
    role: Literal["hero", "gallery", "logo", "reference"] = "hero"
    sort_order: int = Field(default=0, ge=0, le=99, strict=True)


class CatalogCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["product", "service"]
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    benefits: list[str] = Field(default_factory=list, max_length=12)
    price_text: str | None = Field(default=None, max_length=200)
    cta_text: str | None = Field(default=None, max_length=255)
    cta_url: str | None = Field(default=None, max_length=2048)
    media: list[MediaRef] = Field(default_factory=list, max_length=20)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("Name cannot be blank.")
        return value.strip()

    @field_validator("benefits")
    @classmethod
    def clean_benefits(cls, value):
        if any(not item.strip() or len(item) > 300 for item in value):
            raise ValueError("Benefits must contain 1–300 characters.")
        return [item.strip() for item in value]

    @field_validator("cta_url")
    @classmethod
    def safe_url(cls, value):
        if value and not value.startswith(("https://", "http://", "mailto:", "tel:")):
            raise ValueError("CTA URL must use https, http, mailto or tel.")
        return value


class CatalogUpdate(CatalogCreate):
    expected_revision: int = Field(ge=1, strict=True)


def owned_brand(db, user_id, brand_id):
    brand = (
        db.query(BrandKit)
        .filter(BrandKit.id == brand_id, BrandKit.user_id == user_id)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not brand:
        raise HTTPException(404, "Brand kit not found.")
    return brand


def owned_item(db, user_id, brand_id, item_id):
    owned_brand(db, user_id, brand_id)
    item = (
        db.query(BrandCatalogItem)
        .filter(
            BrandCatalogItem.id == item_id,
            BrandCatalogItem.brand_kit_id == brand_id,
            BrandCatalogItem.user_id == user_id,
            BrandCatalogItem.archived_at.is_(None),
        )
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not item:
        raise HTTPException(404, "Catalog item not found.")
    return item


def item_response(item):
    return {
        "id": item.id,
        "brand_kit_id": item.brand_kit_id,
        "kind": item.kind,
        "name": item.name,
        "description": item.description,
        "benefits": item.benefits or [],
        "price_text": item.price_text,
        "cta_text": item.cta_text,
        "cta_url": item.cta_url,
        "revision": item.revision,
        "archived_at": item.archived_at.isoformat() if item.archived_at else None,
        "media": [
            {
                "source": "uploaded" if media.uploaded_asset_id else "generated",
                "asset_id": media.uploaded_asset_id or media.generated_asset_id,
                "role": media.role,
                "sort_order": media.sort_order,
            }
            for media in sorted(item.media, key=lambda row: row.sort_order)
        ],
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def assign_media(db, user_id, item, media):
    refs = []
    seen = set()
    for entry in media:
        _, _, metadata = resolve_owned_asset(db, user_id, entry.source, entry.asset_id)
        if metadata["kind"] != "image":
            raise HTTPException(422, "Catalog media must be images.")
        if (entry.source, entry.asset_id) in seen:
            raise HTTPException(422, "Catalog media references must be unique.")
        seen.add((entry.source, entry.asset_id))
        refs.append(
            BrandCatalogMedia(
                id=f"cm_{uuid4().hex}",
                uploaded_asset_id=(
                    entry.asset_id if entry.source == "uploaded" else None
                ),
                generated_asset_id=(
                    entry.asset_id if entry.source == "generated" else None
                ),
                role=entry.role,
                sort_order=entry.sort_order,
            )
        )
    item.media = refs


@router.get("")
def list_catalog(
    brand_id: str,
    include_archived: bool = False,
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_brand(db, user.id, brand_id)
    query = db.query(BrandCatalogItem).filter(
        BrandCatalogItem.user_id == user.id, BrandCatalogItem.brand_kit_id == brand_id
    )
    if not include_archived:
        query = query.filter(BrandCatalogItem.archived_at.is_(None))
    total = query.count()
    rows = (
        query.order_by(BrandCatalogItem.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "items": [item_response(item) for item in rows],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("", status_code=201)
def create(
    brand_id: str,
    req: CatalogCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_brand(db, user.id, brand_id)
    item = BrandCatalogItem(
        id=f"ci_{uuid4().hex}",
        user_id=user.id,
        brand_kit_id=brand_id,
        **req.model_dump(exclude={"media"}),
    )
    assign_media(db, user.id, item, req.media)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_response(item)


@router.get("/{item_id}")
def get_item(
    brand_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return item_response(owned_item(db, user.id, brand_id, item_id))


@router.put("/{item_id}")
def update(
    brand_id: str,
    item_id: str,
    req: CatalogUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = owned_item(db, user.id, brand_id, item_id)
    if item.revision != req.expected_revision:
        raise HTTPException(409, "Catalog item changed. Reload before saving.")
    assign_media(db, user.id, item, req.media)
    for key, value in req.model_dump(exclude={"expected_revision", "media"}).items():
        setattr(item, key, value)
    item.revision += 1
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item_response(item)


@router.delete("/{item_id}")
def archive(
    brand_id: str,
    item_id: str,
    expected_revision: int = Query(ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = owned_item(db, user.id, brand_id, item_id)
    if item.revision != expected_revision:
        raise HTTPException(409, "Catalog item changed. Reload before archiving.")
    item.archived_at = datetime.utcnow()
    item.revision += 1
    db.commit()
    return {"id": item.id, "archived": True, "revision": item.revision}
