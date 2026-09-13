from __future__ import annotations

import base64
import random
import re
import string
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import get_current_user
from database import BrandColor, BrandFont, BrandKit, BrandLogo, User, get_db

router = APIRouter(prefix="/api/brand-kits", tags=["brand-kits"])

HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
DATA_URL_RE = re.compile(r"^data:(image/(?:png|jpe?g|webp|gif|svg\+xml));base64,(.+)$", re.IGNORECASE | re.DOTALL)
MAX_LOGO_BYTES = 5 * 1024 * 1024
ALLOWED_COLOR_ROLES = {"primary", "secondary", "accent", "background", "text", "custom"}
ALLOWED_FONT_ROLES = {"heading", "body", "accent", "caption", "custom"}
ALLOWED_LOGO_ROLES = {"primary", "secondary", "icon", "watermark", "custom"}


def generate_id(prefix: str = "bk") -> str:
    return f"{prefix}_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def _clean_text(value: Optional[str], max_length: int, field_name: str, required: bool = False) -> Optional[str]:
    if value is None:
        if required:
            raise ValueError(f"{field_name} is required")
        return None
    cleaned = value.strip()
    if required and not cleaned:
        raise ValueError(f"{field_name} is required")
    if not cleaned:
        return None
    if len(cleaned) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or less")
    return cleaned


def _normalize_hex(value: str) -> str:
    color = value.strip()
    if not HEX_COLOR_RE.match(color):
        raise ValueError("Color must be a valid hex value, for example #8B5CF6")
    if len(color) == 4:
        color = "#" + "".join(ch * 2 for ch in color[1:])
    return color.upper()


def _normalize_role(value: Optional[str], allowed: set[str], fallback: str) -> str:
    role = (value or fallback).strip().lower()
    if role not in allowed:
        return fallback
    return role


def _validate_logo_data(file_data: str, file_type: Optional[str]) -> tuple[str, str, int]:
    data = file_data.strip()
    match = DATA_URL_RE.match(data)
    if not match:
        raise ValueError("Logo must be a base64 image data URL")

    detected_type = match.group(1).lower().replace("image/jpg", "image/jpeg")
    requested_type = (file_type or detected_type).strip().lower().replace("image/jpg", "image/jpeg")
    if requested_type != detected_type:
        requested_type = detected_type

    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except Exception as exc:
        raise ValueError("Logo image data is not valid base64") from exc

    if not image_bytes:
        raise ValueError("Logo image is empty")
    if len(image_bytes) > MAX_LOGO_BYTES:
        raise ValueError("Logo image must be 5MB or smaller")

    return data, requested_type, len(image_bytes)


# ─── Request / Response Models ────────────────────────────────────────────────
class BrandKitCreate(BaseModel):
    name: str
    company_name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_text(value, 100, "Brand kit name", required=True) or ""

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 150, "Company name")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 1000, "Description")

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Industry")

    @field_validator("website")
    @classmethod
    def validate_website(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 255, "Website")


class BrandKitUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Brand kit name")

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 150, "Company name")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 1000, "Description")

    @field_validator("industry")
    @classmethod
    def validate_industry(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Industry")

    @field_validator("website")
    @classmethod
    def validate_website(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 255, "Website")


class ColorCreate(BaseModel):
    name: str
    hex_value: str
    role: Optional[str] = "custom"
    description: Optional[str] = None
    is_primary: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_text(value, 100, "Color name", required=True) or ""

    @field_validator("hex_value")
    @classmethod
    def validate_hex(cls, value: str) -> str:
        return _normalize_hex(value)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> str:
        return _normalize_role(value, ALLOWED_COLOR_ROLES, "custom")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 500, "Description")


class ColorUpdate(BaseModel):
    name: Optional[str] = None
    hex_value: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    is_primary: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Color name")

    @field_validator("hex_value")
    @classmethod
    def validate_hex(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_hex(value) if value is not None else None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_role(value, ALLOWED_COLOR_ROLES, "custom") if value is not None else None

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 500, "Description")


class ColorResponse(BaseModel):
    id: str
    name: str
    hex_value: str
    role: str
    description: Optional[str] = None
    is_primary: bool = False
    sort_order: int


class FontCreate(BaseModel):
    name: str
    family: str
    weight: Optional[str] = "normal"
    role: Optional[str] = "body"
    style: Optional[str] = None
    fallback: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_text(value, 100, "Font name", required=True) or ""

    @field_validator("family")
    @classmethod
    def validate_family(cls, value: str) -> str:
        return _clean_text(value, 100, "Font family", required=True) or ""

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, value: Optional[str]) -> str:
        return _clean_text(value or "normal", 50, "Font weight") or "normal"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> str:
        return _normalize_role(value, ALLOWED_FONT_ROLES, "body")

    @field_validator("style")
    @classmethod
    def validate_style(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 50, "Font style")

    @field_validator("fallback")
    @classmethod
    def validate_fallback(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Fallback font")


class FontUpdate(BaseModel):
    name: Optional[str] = None
    family: Optional[str] = None
    weight: Optional[str] = None
    role: Optional[str] = None
    style: Optional[str] = None
    fallback: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Font name")

    @field_validator("family")
    @classmethod
    def validate_family(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Font family")

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 50, "Font weight")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_role(value, ALLOWED_FONT_ROLES, "body") if value is not None else None

    @field_validator("style")
    @classmethod
    def validate_style(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 50, "Font style")

    @field_validator("fallback")
    @classmethod
    def validate_fallback(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 100, "Fallback font")


class FontResponse(BaseModel):
    id: str
    name: str
    family: str
    weight: str
    role: str
    style: Optional[str] = None
    fallback: Optional[str] = None
    sort_order: int


class LogoCreate(BaseModel):
    name: str
    file_data: str
    file_type: Optional[str] = "image/png"
    role: Optional[str] = "primary"
    width: Optional[int] = None
    height: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _clean_text(value, 200, "Logo name", required=True) or ""

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> str:
        return _normalize_role(value, ALLOWED_LOGO_ROLES, "primary")


class LogoUpdate(BaseModel):
    name: Optional[str] = None
    file_data: Optional[str] = None
    file_type: Optional[str] = None
    role: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        return _clean_text(value, 200, "Logo name")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        return _normalize_role(value, ALLOWED_LOGO_ROLES, "primary") if value is not None else None


class LogoResponse(BaseModel):
    id: str
    name: str
    file_data: str
    file_type: str
    role: str
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    sort_order: int


class BrandKitResponse(BaseModel):
    id: str
    name: str
    company_name: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    colors: List[ColorResponse]
    fonts: List[FontResponse]
    logos: List[LogoResponse]
    created_at: str
    updated_at: str


class BrandKitListResponse(BaseModel):
    brand_kits: List[BrandKitResponse]


# ─── Brand Kit ────────────────────────────────────────────────────────────────
@router.get("", response_model=BrandKitListResponse)
def list_brand_kits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kits = (
        db.query(BrandKit)
        .filter(BrandKit.user_id == current_user.id)
        .order_by(BrandKit.updated_at.desc(), BrandKit.created_at.desc())
        .all()
    )
    return BrandKitListResponse(brand_kits=[_kit_to_response(k, db) for k in kits])


@router.post("", response_model=BrandKitResponse, status_code=status.HTTP_201_CREATED)
def create_brand_kit(
    req: BrandKitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_unique_kit_name(req.name, current_user.id, db)
    kit = BrandKit(
        id=generate_id(),
        name=req.name,
        company_name=req.company_name,
        description=req.description,
        industry=req.industry,
        website=req.website,
        user_id=current_user.id,
    )
    try:
        db.add(kit)
        db.commit()
        db.refresh(kit)
        return _kit_to_response(kit, db)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create brand kit") from exc


@router.get("/{kit_id}", response_model=BrandKitResponse)
def get_brand_kit(
    kit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _kit_to_response(_get_user_kit(kit_id, current_user.id, db), db)


@router.patch("/{kit_id}", response_model=BrandKitResponse)
def update_brand_kit(
    kit_id: str,
    req: BrandKitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    update_data = req.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"]:
        _ensure_unique_kit_name(update_data["name"], current_user.id, db, exclude_kit_id=kit.id)
    for field, value in update_data.items():
        setattr(kit, field, value)
    _touch(kit)
    db.commit()
    db.refresh(kit)
    return _kit_to_response(kit, db)


@router.post("/{kit_id}/duplicate", response_model=BrandKitResponse, status_code=status.HTTP_201_CREATED)
def duplicate_brand_kit(
    kit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    new_name = _unique_copy_name(kit.name, current_user.id, db)
    copy = BrandKit(
        id=generate_id(),
        name=new_name,
        company_name=kit.company_name,
        description=kit.description,
        industry=kit.industry,
        website=kit.website,
        user_id=current_user.id,
    )
    db.add(copy)
    db.flush()

    for color in db.query(BrandColor).filter(BrandColor.brand_kit_id == kit.id).all():
        db.add(BrandColor(
            id=generate_id("bc"),
            brand_kit_id=copy.id,
            name=color.name,
            hex_value=color.hex_value,
            role=color.role or "custom",
            description=color.description,
            is_primary=bool(color.is_primary),
            sort_order=color.sort_order,
        ))
    for font in db.query(BrandFont).filter(BrandFont.brand_kit_id == kit.id).all():
        db.add(BrandFont(
            id=generate_id("bf"),
            brand_kit_id=copy.id,
            name=font.name,
            family=font.family,
            weight=font.weight,
            role=font.role or "body",
            style=font.style,
            fallback=font.fallback,
            sort_order=font.sort_order,
        ))
    for logo in db.query(BrandLogo).filter(BrandLogo.brand_kit_id == kit.id).all():
        db.add(BrandLogo(
            id=generate_id("bl"),
            brand_kit_id=copy.id,
            name=logo.name,
            file_data=logo.file_data,
            file_type=logo.file_type,
            role=logo.role or "primary",
            width=logo.width,
            height=logo.height,
            file_size=logo.file_size,
            sort_order=logo.sort_order,
        ))

    db.commit()
    db.refresh(copy)
    return _kit_to_response(copy, db)


@router.delete("/{kit_id}")
def delete_brand_kit(
    kit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    db.delete(kit)
    db.commit()
    return {"message": "Brand kit deleted"}


# ─── Brand Colors ─────────────────────────────────────────────────────────────
@router.post("/{kit_id}/colors", response_model=ColorResponse, status_code=status.HTTP_201_CREATED)
def add_color(
    kit_id: str,
    req: ColorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    if req.is_primary:
        _clear_primary_colors(kit_id, db)
    color = BrandColor(
        id=generate_id("bc"),
        brand_kit_id=kit_id,
        name=req.name,
        hex_value=req.hex_value,
        role=req.role or "custom",
        description=req.description,
        is_primary=req.is_primary,
        sort_order=db.query(BrandColor).filter(BrandColor.brand_kit_id == kit_id).count(),
    )
    db.add(color)
    _touch(kit)
    db.commit()
    db.refresh(color)
    return _color_response(color)


@router.put("/{kit_id}/colors/{color_id}", response_model=ColorResponse)
def update_color(
    kit_id: str,
    color_id: str,
    req: ColorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    color = _get_kit_color(kit_id, color_id, db)
    update_data = req.model_dump(exclude_unset=True)
    if update_data.get("is_primary"):
        _clear_primary_colors(kit_id, db)
    for field, value in update_data.items():
        setattr(color, field, value)
    _touch(kit)
    db.commit()
    db.refresh(color)
    return _color_response(color)


@router.delete("/{kit_id}/colors/{color_id}")
def delete_color(
    kit_id: str,
    color_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    color = _get_kit_color(kit_id, color_id, db)
    db.delete(color)
    _touch(kit)
    db.commit()
    return {"message": "Color deleted"}


# ─── Brand Fonts ──────────────────────────────────────────────────────────────
@router.post("/{kit_id}/fonts", response_model=FontResponse, status_code=status.HTTP_201_CREATED)
def add_font(
    kit_id: str,
    req: FontCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    font = BrandFont(
        id=generate_id("bf"),
        brand_kit_id=kit_id,
        name=req.name,
        family=req.family,
        weight=req.weight or "normal",
        role=req.role or "body",
        style=req.style,
        fallback=req.fallback,
        sort_order=db.query(BrandFont).filter(BrandFont.brand_kit_id == kit_id).count(),
    )
    db.add(font)
    _touch(kit)
    db.commit()
    db.refresh(font)
    return _font_response(font)


@router.put("/{kit_id}/fonts/{font_id}", response_model=FontResponse)
def update_font(
    kit_id: str,
    font_id: str,
    req: FontUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    font = _get_kit_font(kit_id, font_id, db)
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(font, field, value)
    _touch(kit)
    db.commit()
    db.refresh(font)
    return _font_response(font)


@router.delete("/{kit_id}/fonts/{font_id}")
def delete_font(
    kit_id: str,
    font_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    font = _get_kit_font(kit_id, font_id, db)
    db.delete(font)
    _touch(kit)
    db.commit()
    return {"message": "Font deleted"}


# ─── Brand Logos ──────────────────────────────────────────────────────────────
@router.post("/{kit_id}/logos", response_model=LogoResponse, status_code=status.HTTP_201_CREATED)
def add_logo(
    kit_id: str,
    req: LogoCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    try:
        file_data, file_type, file_size = _validate_logo_data(req.file_data, req.file_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    logo = BrandLogo(
        id=generate_id("bl"),
        brand_kit_id=kit_id,
        name=req.name,
        file_data=file_data,
        file_type=file_type,
        role=req.role or "primary",
        width=req.width,
        height=req.height,
        file_size=file_size,
        sort_order=db.query(BrandLogo).filter(BrandLogo.brand_kit_id == kit_id).count(),
    )
    db.add(logo)
    _touch(kit)
    db.commit()
    db.refresh(logo)
    return _logo_response(logo)


@router.put("/{kit_id}/logos/{logo_id}", response_model=LogoResponse)
def update_logo(
    kit_id: str,
    logo_id: str,
    req: LogoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    logo = _get_kit_logo(kit_id, logo_id, db)
    update_data = req.model_dump(exclude_unset=True)
    if "file_data" in update_data and update_data["file_data"]:
        try:
            file_data, file_type, file_size = _validate_logo_data(update_data["file_data"], update_data.get("file_type") or logo.file_type)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        logo.file_data = file_data
        logo.file_type = file_type
        logo.file_size = file_size
        update_data.pop("file_data", None)
        update_data.pop("file_type", None)
    for field, value in update_data.items():
        setattr(logo, field, value)
    _touch(kit)
    db.commit()
    db.refresh(logo)
    return _logo_response(logo)


@router.delete("/{kit_id}/logos/{logo_id}")
def delete_logo(
    kit_id: str,
    logo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    kit = _get_user_kit(kit_id, current_user.id, db)
    logo = _get_kit_logo(kit_id, logo_id, db)
    db.delete(logo)
    _touch(kit)
    db.commit()
    return {"message": "Logo deleted"}


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _touch(kit: BrandKit) -> None:
    kit.updated_at = datetime.utcnow()


def _ensure_unique_kit_name(name: str, user_id: str, db: Session, exclude_kit_id: Optional[str] = None) -> None:
    query = db.query(BrandKit).filter(BrandKit.user_id == user_id, func.lower(BrandKit.name) == name.lower())
    if exclude_kit_id:
        query = query.filter(BrandKit.id != exclude_kit_id)
    if query.first():
        raise HTTPException(status_code=409, detail="A brand kit with this name already exists")


def _unique_copy_name(name: str, user_id: str, db: Session) -> str:
    base = f"{name} Copy"[:95]
    candidate = base
    index = 2
    while db.query(BrandKit).filter(BrandKit.user_id == user_id, func.lower(BrandKit.name) == candidate.lower()).first():
        suffix = f" {index}"
        candidate = f"{base[:100 - len(suffix)]}{suffix}"
        index += 1
    return candidate


def _get_user_kit(kit_id: str, user_id: str, db: Session) -> BrandKit:
    kit = db.query(BrandKit).filter(BrandKit.id == kit_id, BrandKit.user_id == user_id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return kit


def _get_kit_color(kit_id: str, color_id: str, db: Session) -> BrandColor:
    color = db.query(BrandColor).filter(BrandColor.id == color_id, BrandColor.brand_kit_id == kit_id).first()
    if not color:
        raise HTTPException(status_code=404, detail="Color not found")
    return color


def _get_kit_font(kit_id: str, font_id: str, db: Session) -> BrandFont:
    font = db.query(BrandFont).filter(BrandFont.id == font_id, BrandFont.brand_kit_id == kit_id).first()
    if not font:
        raise HTTPException(status_code=404, detail="Font not found")
    return font


def _get_kit_logo(kit_id: str, logo_id: str, db: Session) -> BrandLogo:
    logo = db.query(BrandLogo).filter(BrandLogo.id == logo_id, BrandLogo.brand_kit_id == kit_id).first()
    if not logo:
        raise HTTPException(status_code=404, detail="Logo not found")
    return logo


def _clear_primary_colors(kit_id: str, db: Session) -> None:
    db.query(BrandColor).filter(BrandColor.brand_kit_id == kit_id, BrandColor.is_primary == True).update({"is_primary": False})


def _color_response(color: BrandColor) -> ColorResponse:
    return ColorResponse(
        id=color.id,
        name=color.name,
        hex_value=color.hex_value,
        role=color.role or "custom",
        description=color.description,
        is_primary=bool(color.is_primary),
        sort_order=color.sort_order or 0,
    )


def _font_response(font: BrandFont) -> FontResponse:
    return FontResponse(
        id=font.id,
        name=font.name,
        family=font.family,
        weight=font.weight or "normal",
        role=font.role or "body",
        style=font.style,
        fallback=font.fallback,
        sort_order=font.sort_order or 0,
    )


def _logo_response(logo: BrandLogo) -> LogoResponse:
    return LogoResponse(
        id=logo.id,
        name=logo.name,
        file_data=logo.file_data,
        file_type=logo.file_type or "image/png",
        role=logo.role or "primary",
        width=logo.width,
        height=logo.height,
        file_size=logo.file_size,
        sort_order=logo.sort_order or 0,
    )


def _kit_to_response(kit: BrandKit, db: Session) -> BrandKitResponse:
    colors = db.query(BrandColor).filter(BrandColor.brand_kit_id == kit.id).order_by(BrandColor.sort_order, BrandColor.name).all()
    fonts = db.query(BrandFont).filter(BrandFont.brand_kit_id == kit.id).order_by(BrandFont.sort_order, BrandFont.name).all()
    logos = db.query(BrandLogo).filter(BrandLogo.brand_kit_id == kit.id).order_by(BrandLogo.sort_order, BrandLogo.name).all()
    return BrandKitResponse(
        id=kit.id,
        name=kit.name,
        company_name=kit.company_name,
        description=kit.description,
        industry=kit.industry,
        website=kit.website,
        colors=[_color_response(color) for color in colors],
        fonts=[_font_response(font) for font in fonts],
        logos=[_logo_response(logo) for logo in logos],
        created_at=kit.created_at.isoformat() if kit.created_at else "",
        updated_at=kit.updated_at.isoformat() if kit.updated_at else "",
    )
