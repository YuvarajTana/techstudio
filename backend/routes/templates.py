from __future__ import annotations

import json
from hashlib import sha256
import random
import re
import string
from datetime import datetime
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth import decode_token, get_current_user
from database import (
    AuthSession,
    Category,
    DesignVersion,
    Project,
    Template,
    TemplateFavourite,
    TemplateSubcategory,
    TemplateUsage,
    User,
    get_db,
)
from schemas.templates import (
    ProjectFromTemplateResponse,
    TemplateCategoriesResponse,
    TemplateCategoryResponse,
    TemplateCategoryWithSubcategoriesResponse,
    TemplateCreateRequest,
    TemplateFavouriteToggleResponse,
    TemplateListResponse,
    TemplateQuickReplaceRequest,
    TemplateRemixRequest,
    TemplateResponse,
    TemplateTransformSummary,
    TemplateSubcategoryResponse,
    TemplateUpdateRequest,
    TemplateUseRequest,
    TemplateUseResponse,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])
optional_security = HTTPBearer(auto_error=False)

DEFAULT_VIEWPORT_TRANSFORM = [1, 0, 0, 1, 0, 0]

VALID_TEMPLATE_SORTS = {
    "recommended",
    "popular",
    "most-popular",
    "recent",
    "recently-added",
    "newest",
    "oldest",
    "az",
    "a-z",
    "name",
    "premium",
    "free",
}


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


def optional_user_id(user: object) -> Optional[str]:
    return user.id if isinstance(user, User) else None


def generate_id(prefix: str = "tmpl") -> str:
    return f"{prefix}_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "template"


def unique_template_slug(db: Session, name: str, template_id: Optional[str] = None) -> str:
    base = slugify(name)
    slug = base
    suffix = 2
    while True:
        query = db.query(Template).filter(Template.slug == slug)
        if template_id:
            query = query.filter(Template.id != template_id)
        if not query.first():
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1


def normalize_slug(value: Optional[str]) -> Optional[str]:
    return slugify(value) if value and value.strip() else None


TEMPLATE_TYPE_ALIASES = {
    "poster": "poster",
    "posters": "poster",
    "instagram-post": "instagram-post",
    "instagram-posts": "instagram-post",
    "instagram": "instagram-post",
    "instagram-story": "instagram-story",
    "instagram-stories": "instagram-story",
    "story": "instagram-story",
    "stories": "instagram-story",
    "youtube-thumbnail": "youtube-thumbnail",
    "youtube-thumbnails": "youtube-thumbnail",
    "youtube": "youtube-thumbnail",
    "linkedin-post": "linkedin-post",
    "linkedin-posts": "linkedin-post",
    "linkedin": "linkedin-post",
    "invitation": "invitation",
    "invitations": "invitation",
    "flyer": "flyer",
    "flyers": "flyer",
    "business-card": "business-card",
    "business-cards": "business-card",
    "card": "business-card",
    "cards": "business-card",
    "logo": "logo",
    "logos": "logo",
    "education": "education",
    "education-template": "education",
    "education-templates": "education",
}
CANONICAL_TEMPLATE_TYPES = set(TEMPLATE_TYPE_ALIASES.values())


def normalize_template_type(value: Optional[str], *, strict: bool = False) -> Optional[str]:
    normalized = normalize_slug(value)
    if not normalized or normalized == "all":
        return None
    canonical = TEMPLATE_TYPE_ALIASES.get(normalized)
    if canonical:
        return canonical
    if normalized in CANONICAL_TEMPLATE_TYPES:
        return normalized
    if strict:
        raise HTTPException(status_code=422, detail=f"Unsupported template type: {value}")
    return normalized


def template_type_query_values(value: Optional[str]) -> list[str]:
    canonical = normalize_template_type(value)
    if not canonical:
        return []
    aliases = {alias for alias, target in TEMPLATE_TYPE_ALIASES.items() if target == canonical}
    aliases.add(canonical)
    return sorted(aliases)


def parse_tags(value: Optional[str]) -> list[str]:
    if not value:
        return []
    try:
        decoded = json.loads(value)
        if isinstance(decoded, list):
            return [str(item).strip() for item in decoded if str(item).strip()]
    except (TypeError, ValueError):
        pass
    return [part.strip() for part in value.split(",") if part.strip()]


def positive_int(value: object, fallback: int) -> int:
    try:
        parsed = int(value)  # type: ignore[arg-type]
        return parsed if parsed > 0 else fallback
    except (TypeError, ValueError):
        return fallback


def normalize_viewport_transform(value: object) -> list[int | float]:
    if not isinstance(value, list) or len(value) < 6:
        return DEFAULT_VIEWPORT_TRANSFORM.copy()
    try:
        parsed = [float(item) for item in value[:6]]
    except (TypeError, ValueError):
        return DEFAULT_VIEWPORT_TRANSFORM.copy()
    return parsed if all(item == item for item in parsed) else DEFAULT_VIEWPORT_TRANSFORM.copy()


def normalize_fabric_objects(objects: list[object]) -> None:
    for index, item in enumerate(objects):
        if not isinstance(item, dict):
            continue
        object_type = str(item.get("type") or "").lower()
        if object_type in {"text", "i-text", "textbox"} and not isinstance(item.get("styles"), dict):
            item["styles"] = {}
        if not item.get("name"):
            label = object_type or "layer"
            item["name"] = f"{label[:1].upper()}{label[1:]} {index + 1}"


def normalize_template_canvas_data(template: Template, width_override: Optional[int] = None, height_override: Optional[int] = None) -> tuple[str, int, int]:
    if not template.data or not str(template.data).strip():
        raise HTTPException(status_code=422, detail="Template has no editable canvas data to load in the editor")

    try:
        parsed = json.loads(template.data)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Template canvas data is invalid JSON") from None

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail="Template canvas data must be a Fabric.js canvas object")

    objects = parsed.get("objects")
    if objects is None:
        parsed["objects"] = []
    elif not isinstance(objects, list):
        raise HTTPException(status_code=422, detail="Template canvas data objects must be an array")

    normalize_fabric_objects(objects)

    width = positive_int(width_override, positive_int(parsed.get("width"), template.width or 800))
    height = positive_int(height_override, positive_int(parsed.get("height"), template.height or 800))
    parsed["width"] = width
    parsed["height"] = height
    parsed["viewportTransform"] = normalize_viewport_transform(parsed.get("viewportTransform"))
    parsed["version"] = parsed.get("version") or "5.3.0"
    if not parsed.get("background") and template.metadata_json and isinstance(template.metadata_json, dict):
        parsed["background"] = template.metadata_json.get("background_color") or "#ffffff"
    parsed["background"] = parsed.get("background") or parsed.get("backgroundColor") or "#ffffff"

    return json.dumps(parsed), width, height


REMIX_PALETTES = {
    "technology": ["#06b6d4", "#111827", "#a855f7", "#f8fafc"],
    "business": ["#2563eb", "#0f172a", "#38bdf8", "#f8fafc"],
    "food": ["#f97316", "#431407", "#facc15", "#fff7ed"],
    "fashion": ["#ec4899", "#18181b", "#f9a8d4", "#fdf2f8"],
    "fitness": ["#ef4444", "#111827", "#22c55e", "#f8fafc"],
    "travel": ["#0ea5e9", "#082f49", "#f59e0b", "#f0f9ff"],
    "luxury": ["#d4af37", "#111111", "#f5e7a3", "#fffaf0"],
    "eco": ["#16a34a", "#052e16", "#86efac", "#f0fdf4"],
    "default": ["#8b5cf6", "#111827", "#ec4899", "#f8fafc"],
}

FONT_PRESETS = {
    "modern": ("Inter", "Inter"),
    "premium": ("Playfair Display", "Inter"),
    "bold": ("Montserrat", "Inter"),
    "editorial": ("Georgia", "Inter"),
    "friendly": ("Outfit", "Inter"),
}

PLACEHOLDER_FIELDS = [
    "business_name",
    "event_name",
    "event_date",
    "phone_number",
    "offer",
    "website",
]


def _compact_json(data: dict) -> str:
    return json.dumps(data, separators=(",", ":"))


def _load_template_canvas(template: Template, width_override: Optional[int] = None, height_override: Optional[int] = None) -> tuple[dict, int, int]:
    canvas_data, canvas_width, canvas_height = normalize_template_canvas_data(template, width_override, height_override)
    parsed = json.loads(canvas_data)
    return parsed, canvas_width, canvas_height


def _clean_prompt(value: Optional[str], fallback: str = "modern editable design") -> str:
    cleaned = re.sub(r"\s+", " ", value or "").strip()
    return cleaned[:500] if cleaned else fallback


def _title_from_prompt(prompt: str, fallback: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", prompt)
    if not words:
        return fallback[:80]
    ignored = {"create", "design", "template", "poster", "post", "story", "for", "with", "and", "the", "a", "an"}
    useful = [word for word in words if word.lower() not in ignored] or words
    return " ".join(useful[:7]).title()[:80]


def _palette_for_prompt(prompt: str, category: Optional[str] = None) -> list[str]:
    lowered = f"{prompt} {category or ''}".lower()
    for key, palette in REMIX_PALETTES.items():
        if key != "default" and key in lowered:
            return palette.copy()
    if any(word in lowered for word in ["ai", "tech", "code", "software", "digital", "future"]):
        return REMIX_PALETTES["technology"].copy()
    if any(word in lowered for word in ["sale", "launch", "office", "startup", "corporate"]):
        return REMIX_PALETTES["business"].copy()
    if any(word in lowered for word in ["restaurant", "cafe", "coffee", "menu", "food"]):
        return REMIX_PALETTES["food"].copy()
    if any(word in lowered for word in ["wedding", "premium", "elegant", "gold"]):
        return REMIX_PALETTES["luxury"].copy()
    return REMIX_PALETTES["default"].copy()


def _fonts_for_prompt(prompt: str) -> tuple[str, str]:
    lowered = prompt.lower()
    if any(word in lowered for word in ["luxury", "elegant", "wedding", "editorial"]):
        return FONT_PRESETS["premium"]
    if any(word in lowered for word in ["bold", "sports", "fitness", "sale"]):
        return FONT_PRESETS["bold"]
    if any(word in lowered for word in ["friendly", "playful", "kids"]):
        return FONT_PRESETS["friendly"]
    return FONT_PRESETS["modern"]


def _is_text_object(item: dict) -> bool:
    return str(item.get("type") or "").lower() in {"text", "textbox", "i-text"}


def _is_image_object(item: dict) -> bool:
    return str(item.get("type") or "").lower() == "image"


def _is_shape_object(item: dict) -> bool:
    return str(item.get("type") or "").lower() in {"rect", "circle", "triangle", "polygon", "path", "line", "ellipse"}


def _safe_fill(value: object) -> bool:
    if not isinstance(value, str):
        return False
    return value.startswith("#") or value.startswith("rgb") or value.startswith("hsl")


def _is_background_like(item: dict, canvas_width: int, canvas_height: int) -> bool:
    return (
        str(item.get("type") or "").lower() == "rect"
        and float(item.get("left") or 0) <= 1
        and float(item.get("top") or 0) <= 1
        and float(item.get("width") or 0) >= canvas_width * 0.85
        and float(item.get("height") or 0) >= canvas_height * 0.85
    )


def _placeholder_image(prompt: str, width: int, height: int, palette: list[str]) -> str:
    title = _title_from_prompt(prompt, "Image Suggestion")
    accent, dark, secondary, light = (palette + REMIX_PALETTES["default"])[:4]
    image_width = max(320, width)
    image_height = max(240, height)
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="{image_width}" height="{image_height}" viewBox="0 0 {image_width} {image_height}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{dark}"/><stop offset="1" stop-color="{accent}"/></linearGradient></defs>
      <rect width="100%" height="100%" rx="28" fill="url(#g)"/>
      <circle cx="78%" cy="23%" r="18%" fill="{secondary}" opacity="0.28"/>
      <rect x="8%" y="16%" width="84%" height="68%" rx="22" fill="#ffffff" opacity="0.10" stroke="#ffffff" stroke-opacity="0.25"/>
      <text x="12%" y="48%" fill="{light}" font-family="Inter, Arial" font-size="34" font-weight="900">{title}</text>
      <text x="12%" y="58%" fill="#ffffff" opacity="0.82" font-family="Inter, Arial" font-size="18">AI image suggestion</text>
    </svg>
    """
    return "data:image/svg+xml;utf8," + quote(" ".join(svg.split()))


def _apply_palette_to_canvas(canvas: dict, palette: list[str]) -> int:
    if len(palette) < 3:
        return 0
    primary, dark, accent = palette[0], palette[1], palette[2]
    light = palette[3] if len(palette) > 3 else "#ffffff"
    objects = canvas.get("objects") if isinstance(canvas.get("objects"), list) else []
    width = positive_int(canvas.get("width"), 800)
    height = positive_int(canvas.get("height"), 800)
    changed = 0
    for index, item in enumerate(objects):
        if not isinstance(item, dict):
            continue
        if _is_text_object(item) and _safe_fill(item.get("fill")):
            item["fill"] = light if index < 5 else dark
            changed += 1
        elif _is_background_like(item, width, height):
            item["fill"] = dark
            changed += 1
        elif _is_shape_object(item) and _safe_fill(item.get("fill")):
            item["fill"] = primary if index % 2 == 0 else accent
            changed += 1
    canvas["background"] = dark
    return changed


def _apply_fonts_to_canvas(canvas: dict, heading_font: Optional[str], body_font: Optional[str]) -> int:
    objects = canvas.get("objects") if isinstance(canvas.get("objects"), list) else []
    text_objects = [item for item in objects if isinstance(item, dict) and _is_text_object(item)]
    changed = 0
    for index, item in enumerate(text_objects):
        item["fontFamily"] = heading_font if index == 0 and heading_font else (body_font or item.get("fontFamily") or "Inter")
        if index == 0:
            item["fontWeight"] = item.get("fontWeight") or "900"
        changed += 1
    return changed


def _apply_texts_to_canvas(canvas: dict, texts: list[str], replacements: Optional[dict[str, str]] = None) -> int:
    objects = canvas.get("objects") if isinstance(canvas.get("objects"), list) else []
    text_objects = [item for item in objects if isinstance(item, dict) and _is_text_object(item)]
    changed = 0
    clean_replacements = {key: _clean_prompt(value, "") for key, value in (replacements or {}).items() if str(value or "").strip()}
    for item in text_objects:
        original = str(item.get("text") or "")
        updated = original
        for key, value in clean_replacements.items():
            updated = updated.replace("{" + key + "}", value)
        if updated != original:
            item["text"] = updated
            changed += 1
    if changed:
        return changed
    for index, item in enumerate(text_objects[: len(texts)]):
        next_text = texts[index].strip()
        if next_text:
            item["text"] = next_text[:180]
            changed += 1
    return changed


def _replace_images_in_canvas(canvas: dict, prompt: str, palette: list[str]) -> int:
    objects = canvas.get("objects") if isinstance(canvas.get("objects"), list) else []
    changed = 0
    for item in objects:
        if not isinstance(item, dict) or not _is_image_object(item):
            continue
        width = positive_int(item.get("width"), positive_int(canvas.get("width"), 800))
        height = positive_int(item.get("height"), positive_int(canvas.get("height"), 800))
        item["src"] = _placeholder_image(prompt, width, height, palette)
        item["crossOrigin"] = "anonymous"
        item["name"] = item.get("name") or "AI Image Suggestion"
        item["assetPrompt"] = prompt
        changed += 1
    return changed


def _remix_text_plan(template: Template, prompt: str) -> list[str]:
    category = template.category.name if template.category else (template.category_id or "Design")
    title = _title_from_prompt(prompt, template.name)
    tagline = f"Fresh {category.lower()} layout for {prompt[:72].rstrip('.')}"
    cta = "Customize Now"
    lowered = prompt.lower()
    if any(word in lowered for word in ["sale", "offer", "discount"]):
        cta = "Shop the Offer"
    elif any(word in lowered for word in ["event", "conference", "party", "wedding"]):
        cta = "Reserve Your Spot"
    elif any(word in lowered for word in ["course", "class", "learn", "education"]):
        cta = "Start Learning"
    return [title, tagline, cta]


def _metadata_for_transform(template: Template, action: str, source: str, prompt: Optional[str], changes: list[str]) -> dict:
    return {
        "source_template_id": template.id,
        "source_template_name": template.name,
        "template_transform_action": action,
        "template_transform_source": source,
        "template_transform_prompt": prompt,
        "template_transform_changes": changes,
        "created_at": datetime.utcnow().isoformat(),
    }


def _create_template_project(
    *,
    db: Session,
    current_user: User,
    template: Template,
    canvas_data: str,
    canvas_width: int,
    canvas_height: int,
    project_name: str,
    action: str,
    version_name: str,
    transform: Optional[TemplateTransformSummary] = None,
) -> TemplateUseResponse:
    project = Project(
        id=generate_id("proj"),
        name=project_name.strip()[:200] or f"{template.name} Copy",
        user_id=current_user.id,
        data=canvas_data,
        width=canvas_width,
        height=canvas_height,
        background_color="#ffffff",
        design_type=normalize_template_type(template.template_type) or template.template_type,
        category=template.category.slug if template.category else template.category_id,
        tags=template.tags,
    )
    db.add(project)
    db.add(DesignVersion(
        id=generate_id("ver"),
        project_id=project.id,
        version_number=1,
        name=version_name,
        data=canvas_data,
    ))
    usage = TemplateUsage(
        id=generate_id("tuse"),
        user_id=current_user.id,
        template_id=template.id,
        project_id=project.id,
        action=action,
    )
    template.use_count = (template.use_count or 0) + 1
    template.updated_at = datetime.utcnow()
    db.add(usage)
    db.commit()
    db.refresh(project)
    db.refresh(template)
    db.refresh(usage)
    return TemplateUseResponse(
        template=template_to_response(db, template, current_user.id),
        project=project_to_response(project),
        usage_id=usage.id,
        transform=transform,
    )


def serialize_tags(tags: Optional[list[str]]) -> Optional[str]:
    if tags is None:
        return None
    clean_tags = []
    seen = set()
    for tag in tags:
        value = str(tag).strip()
        key = value.lower()
        if value and key not in seen:
            clean_tags.append(value)
            seen.add(key)
    return json.dumps(clean_tags)


def category_response(category: Optional[Category]) -> Optional[TemplateCategoryResponse]:
    if not category:
        return None
    return TemplateCategoryResponse(
        id=category.id,
        name=category.name,
        slug=category.slug,
        icon=category.icon,
        color=category.color,
        group_name=category.group_name,
        sort_order=category.sort_order or 0,
    )


def subcategory_response(subcategory: Optional[TemplateSubcategory]) -> Optional[TemplateSubcategoryResponse]:
    if not subcategory:
        return None
    return TemplateSubcategoryResponse(
        id=subcategory.id,
        category_id=subcategory.category_id,
        name=subcategory.name,
        slug=subcategory.slug,
        sort_order=subcategory.sort_order or 0,
    )


def is_template_favourite(db: Session, template_id: str, user_id: Optional[str]) -> bool:
    if not user_id:
        return False
    return db.query(TemplateFavourite).filter(
        TemplateFavourite.template_id == template_id,
        TemplateFavourite.user_id == user_id,
    ).first() is not None


def template_to_response(db: Session, template: Template, user_id: Optional[str] = None) -> TemplateResponse:
    thumbnail = template.thumbnail_url or template.thumbnail
    return TemplateResponse(
        id=template.id,
        name=template.name,
        slug=template.slug or slugify(template.name),
        description=template.description,
        category_id=template.category_id,
        category=category_response(template.category),
        subcategory_id=template.subcategory_id,
        subcategory=subcategory_response(template.subcategory),
        template_type=normalize_template_type(template.template_type) or template.template_type,
        data=template.data,
        thumbnail=thumbnail,
        thumbnail_url=thumbnail,
        preview_url=template.preview_url or thumbnail,
        width=template.width or 800,
        height=template.height or 800,
        tags=parse_tags(template.tags),
        is_premium=bool(template.is_premium),
        is_featured=bool(template.is_featured),
        is_favourite=is_template_favourite(db, template.id, user_id),
        sort_weight=template.sort_weight or 0,
        status=template.status or "published",
        use_count=template.use_count or 0,
        metadata=template.metadata_json,
        created_at=template.created_at.isoformat() if template.created_at else "",
        updated_at=template.updated_at.isoformat() if template.updated_at else "",
    )


def project_to_response(project: Project) -> ProjectFromTemplateResponse:
    return ProjectFromTemplateResponse(
        id=project.id,
        name=project.name,
        data=project.data,
        width=project.width,
        height=project.height,
        background_color=project.background_color,
        design_type=project.design_type,
        category=project.category,
        tags=project.tags,
        createdAt=project.created_at.isoformat() if project.created_at else "",
        updatedAt=project.updated_at.isoformat() if project.updated_at else "",
    )


def get_template_or_404(template_id: str, db: Session) -> Template:
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


def resolve_category(db: Session, category_id: Optional[str] = None, category_slug: Optional[str] = None) -> Optional[Category]:
    if category_id:
        return db.query(Category).filter(Category.id == category_id).first()
    normalized_slug = normalize_slug(category_slug)
    if normalized_slug:
        return db.query(Category).filter(or_(Category.slug == normalized_slug, Category.id == normalized_slug)).first()
    return None


def resolve_subcategory(
    db: Session,
    category: Optional[Category],
    subcategory_id: Optional[str] = None,
    subcategory_slug: Optional[str] = None,
) -> Optional[TemplateSubcategory]:
    if subcategory_id:
        query = db.query(TemplateSubcategory).filter(TemplateSubcategory.id == subcategory_id)
        if category:
            query = query.filter(TemplateSubcategory.category_id == category.id)
        return query.first()
    normalized_slug = normalize_slug(subcategory_slug)
    if normalized_slug:
        query = db.query(TemplateSubcategory).filter(TemplateSubcategory.slug == normalized_slug)
        if category:
            query = query.filter(TemplateSubcategory.category_id == category.id)
        return query.first()
    return None


def apply_template_sort(query, sort: str):
    normalized_sort = normalize_slug(sort or "recommended") or "recommended"
    if normalized_sort not in VALID_TEMPLATE_SORTS:
        raise HTTPException(status_code=422, detail=f"Unsupported sort option: {sort}")

    if normalized_sort in {"popular", "most-popular"}:
        return query.order_by(Template.use_count.desc(), Template.updated_at.desc())
    if normalized_sort in {"recent", "recently-added", "newest"}:
        return query.order_by(Template.created_at.desc(), Template.updated_at.desc())
    if normalized_sort == "oldest":
        return query.order_by(Template.created_at.asc())
    if normalized_sort in {"az", "a-z", "name"}:
        return query.order_by(Template.name.asc())
    if normalized_sort == "premium":
        return query.order_by(Template.is_premium.desc(), Template.use_count.desc())
    if normalized_sort == "free":
        return query.order_by(Template.is_premium.asc(), Template.use_count.desc())
    return query.order_by(
        Template.is_featured.desc(),
        Template.sort_weight.desc(),
        Template.use_count.desc(),
        Template.updated_at.desc(),
    )


@router.get("/categories", response_model=TemplateCategoriesResponse)
def list_template_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.sort_order.asc(), Category.name.asc()).all()
    subcategories = db.query(TemplateSubcategory).order_by(
        TemplateSubcategory.sort_order.asc(),
        TemplateSubcategory.name.asc(),
    ).all()
    grouped: dict[str, list[TemplateSubcategoryResponse]] = {}
    for subcategory in subcategories:
        response = subcategory_response(subcategory)
        if response:
            grouped.setdefault(subcategory.category_id, []).append(response)

    return TemplateCategoriesResponse(
        categories=[
            TemplateCategoryWithSubcategoriesResponse(
                **category_response(category).model_dump(),
                subcategories=grouped.get(category.id, []),
            )
            for category in categories
            if category_response(category)
        ]
    )


@router.get("", response_model=TemplateListResponse)
def list_templates(
    q: Optional[str] = None,
    search: Optional[str] = None,
    template_type: Optional[str] = None,
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    category: Optional[str] = None,
    category_slug: Optional[str] = None,
    subcategory_id: Optional[str] = None,
    subcategory: Optional[str] = None,
    subcategory_slug: Optional[str] = None,
    is_premium: Optional[bool] = None,
    featured: Optional[bool] = None,
    sort: str = "recommended",
    page: int = 1,
    per_page: int = 24,
    limit: Optional[int] = None,
    offset: int = 0,
    include_drafts: bool = False,
    min_width: Optional[int] = None,
    max_width: Optional[int] = None,
    min_height: Optional[int] = None,
    max_height: Optional[int] = None,
    orientation: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    page = max(1, int(page or 1))
    per_page = min(100, max(1, int(per_page or 24)))
    if limit is not None:
        limit = min(100, max(1, int(limit)))
    offset = max(0, int(offset or 0))

    query = db.query(Template).outerjoin(Category, Template.category_id == Category.id).outerjoin(TemplateSubcategory, Template.subcategory_id == TemplateSubcategory.id)

    if not include_drafts:
        query = query.filter(or_(Template.status == "published", Template.status.is_(None)))

    requested_type = type or template_type
    normalized_type = normalize_template_type(requested_type, strict=bool(requested_type))
    if normalized_type:
        query = query.filter(func.lower(Template.template_type).in_(template_type_query_values(normalized_type)))

    selected_category = resolve_category(db, category_id=category_id, category_slug=category_slug or category)
    if selected_category:
        query = query.filter(Template.category_id == selected_category.id)
    elif category_id or category_slug or category:
        query = query.filter(False)

    selected_subcategory = resolve_subcategory(
        db,
        selected_category,
        subcategory_id=subcategory_id,
        subcategory_slug=subcategory_slug or subcategory,
    )
    if selected_subcategory:
        query = query.filter(Template.subcategory_id == selected_subcategory.id)
    elif subcategory_id or subcategory_slug or subcategory:
        query = query.filter(False)

    if is_premium is not None:
        query = query.filter(Template.is_premium == is_premium)
    if featured is not None:
        query = query.filter(Template.is_featured == featured)

    # Ratio-based filtering for matching templates to canvas dimensions
    if min_width is not None:
        query = query.filter(Template.width >= min_width)
    if max_width is not None:
        query = query.filter(Template.width <= max_width)
    if min_height is not None:
        query = query.filter(Template.height >= min_height)
    if max_height is not None:
        query = query.filter(Template.height <= max_height)
    if orientation:
        normalized_orientation = normalize_slug(orientation)
        if normalized_orientation == "portrait":
            query = query.filter(Template.width < Template.height)
        elif normalized_orientation == "landscape":
            query = query.filter(Template.width > Template.height)
        elif normalized_orientation == "square":
            query = query.filter(Template.width == Template.height)

    term = (q or search or "").strip()
    if term:
        like_term = f"%{term}%"
        query = query.filter(or_(
            Template.name.ilike(like_term),
            Template.description.ilike(like_term),
            Template.tags.ilike(like_term),
            Template.template_type.ilike(like_term),
            Category.name.ilike(like_term),
            Category.slug.ilike(like_term),
            TemplateSubcategory.name.ilike(like_term),
            TemplateSubcategory.slug.ilike(like_term),
        ))

    total = query.count()
    effective_per_page = limit or per_page
    effective_offset = offset if limit is not None else (page - 1) * effective_per_page
    effective_page = (effective_offset // effective_per_page) + 1
    templates = apply_template_sort(query, sort).offset(effective_offset).limit(effective_per_page).all()
    user_id = optional_user_id(current_user)
    serialized_templates = [template_to_response(db, template, user_id) for template in templates]
    total_pages = ((total + effective_per_page - 1) // effective_per_page) if total else 0

    return TemplateListResponse(
        items=serialized_templates,
        templates=serialized_templates,
        total=total,
        page=effective_page,
        page_size=effective_per_page,
        per_page=effective_per_page,
        total_pages=total_pages,
        has_more=effective_offset + len(templates) < total,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return template_to_response(db, get_template_or_404(template_id, db), optional_user_id(current_user))


@router.get("/{template_id}/related", response_model=TemplateListResponse)
def get_related_templates(
    template_id: str,
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    limit = min(24, max(1, int(limit or 8)))
    template = get_template_or_404(template_id, db)
    tags = set(tag.lower() for tag in parse_tags(template.tags))
    query = db.query(Template).filter(
        Template.id != template.id,
        or_(Template.status == "published", Template.status.is_(None)),
        or_(
            Template.category_id == template.category_id,
            Template.subcategory_id == template.subcategory_id,
            Template.template_type == template.template_type,
        ),
    )
    candidates = query.order_by(Template.is_featured.desc(), Template.use_count.desc()).limit(50).all()

    def score(candidate: Template) -> int:
        candidate_tags = set(tag.lower() for tag in parse_tags(candidate.tags))
        return (
            (5 if candidate.category_id and candidate.category_id == template.category_id else 0) +
            (4 if candidate.subcategory_id and candidate.subcategory_id == template.subcategory_id else 0) +
            (3 if candidate.template_type and candidate.template_type == template.template_type else 0) +
            len(tags & candidate_tags) +
            (1 if candidate.is_featured else 0)
        )

    related = sorted(candidates, key=score, reverse=True)[:limit]
    user_id = optional_user_id(current_user)
    serialized_templates = [template_to_response(db, item, user_id) for item in related]
    return TemplateListResponse(
        items=serialized_templates,
        templates=serialized_templates,
        total=len(related),
        page=1,
        page_size=limit,
        per_page=limit,
        total_pages=1 if related else 0,
        has_more=False,
    )


@router.post("/{template_id}/favourite", response_model=TemplateFavouriteToggleResponse, status_code=status.HTTP_201_CREATED)
@router.post("/{template_id}/favorite", response_model=TemplateFavouriteToggleResponse, status_code=status.HTTP_201_CREATED)
def favourite_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_template_or_404(template_id, db)
    existing = db.query(TemplateFavourite).filter(
        TemplateFavourite.user_id == current_user.id,
        TemplateFavourite.template_id == template_id,
    ).first()
    if existing:
        return TemplateFavouriteToggleResponse(
            template_id=existing.template_id,
            is_favourite=True,
            message="Template is already favourited",
        )

    favourite = TemplateFavourite(id=generate_id("tfav"), user_id=current_user.id, template_id=template_id)
    db.add(favourite)
    db.commit()
    return TemplateFavouriteToggleResponse(
        template_id=template_id,
        is_favourite=True,
        message="Added to favourites",
    )


@router.delete("/{template_id}/favourite", response_model=TemplateFavouriteToggleResponse)
@router.delete("/{template_id}/favorite", response_model=TemplateFavouriteToggleResponse)
def unfavourite_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_template_or_404(template_id, db)
    favourite = db.query(TemplateFavourite).filter(
        TemplateFavourite.user_id == current_user.id,
        TemplateFavourite.template_id == template_id,
    ).first()
    if favourite:
        db.delete(favourite)
        db.commit()
    return TemplateFavouriteToggleResponse(
        template_id=template_id,
        is_favourite=False,
        message="Removed from favourites" if favourite else "Template was not favourited",
    )


@router.post("/{template_id}/use", response_model=TemplateUseResponse, status_code=status.HTTP_201_CREATED)
def use_template(
    template_id: str,
    req: TemplateUseRequest = TemplateUseRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    if template.status and template.status != "published":
        raise HTTPException(status_code=404, detail="Template not found")

    canvas, canvas_width, canvas_height = _load_template_canvas(template, req.width, req.height)
    return _create_template_project(
        db=db,
        current_user=current_user,
        template=template,
        canvas_data=_compact_json(canvas),
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        project_name=(req.project_name or f"{template.name} Copy"),
        action="use",
        version_name="Created from template",
    )


class ApplyTemplateRequest(BaseModel):
    project_id: str


@router.post("/{template_id}/apply", response_model=TemplateUseResponse)
def apply_template_to_project(
    template_id: str,
    req: ApplyTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    if template.status and template.status != "published":
        raise HTTPException(status_code=404, detail="Template not found")

    project = db.query(Project).filter(
        Project.id == req.project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    canvas, canvas_width, canvas_height = _load_template_canvas(template)
    canvas_data = _compact_json(canvas)

    project.data = canvas_data
    project.width = canvas_width
    project.height = canvas_height
    project.background_color = canvas.get("background", "#ffffff")
    project.updated_at = datetime.utcnow()

    latest_version = db.query(DesignVersion).filter(
        DesignVersion.project_id == project.id,
    ).order_by(DesignVersion.version_number.desc()).first()

    db.add(DesignVersion(
        id=generate_id("ver"),
        project_id=project.id,
        version_number=(latest_version.version_number + 1) if latest_version else 1,
        name=f"Applied template: {template.name}",
        data=canvas_data,
    ))

    template.use_count = (template.use_count or 0) + 1
    template.updated_at = datetime.utcnow()

    usage = TemplateUsage(
        id=generate_id("tuse"),
        user_id=current_user.id,
        template_id=template.id,
        project_id=project.id,
        action="apply",
    )
    db.add(usage)
    db.commit()
    db.refresh(project)
    db.refresh(template)

    return TemplateUseResponse(
        template=template_to_response(db, template, current_user.id),
        project=project_to_response(project),
        usage_id=usage.id,
        transform=None,
    )


@router.post("/{template_id}/remix", response_model=TemplateUseResponse, status_code=status.HTTP_201_CREATED)
def remix_template(
    template_id: str,
    req: TemplateRemixRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    if template.status and template.status != "published":
        raise HTTPException(status_code=404, detail="Template not found")

    prompt = _clean_prompt(req.prompt, "Create a fresh remix of this template")
    if len(prompt) < 4:
        raise HTTPException(status_code=422, detail="Remix prompt must describe the new design direction")

    canvas, canvas_width, canvas_height = _load_template_canvas(template, req.width, req.height)
    category_name = template.category.name if template.category else template.category_id
    palette = _palette_for_prompt(prompt, category_name)
    heading_font, body_font = _fonts_for_prompt(prompt)
    changes: list[str] = []

    text_count = _apply_texts_to_canvas(canvas, _remix_text_plan(template, prompt))
    if text_count:
        changes.append(f"Updated {text_count} text layer{'s' if text_count != 1 else ''}")
    color_count = _apply_palette_to_canvas(canvas, palette)
    if color_count:
        changes.append(f"Applied prompt-aware colour palette to {color_count} layer{'s' if color_count != 1 else ''}")
    font_count = _apply_fonts_to_canvas(canvas, heading_font, body_font)
    if font_count:
        changes.append(f"Applied {heading_font} / {body_font} font pairing")
    image_count = _replace_images_in_canvas(canvas, prompt, palette)
    if image_count:
        changes.append(f"Replaced {image_count} image layer{'s' if image_count != 1 else ''} with prompt-based image suggestions")

    canvas.setdefault("metadata", {})
    if isinstance(canvas["metadata"], dict):
        canvas["metadata"].update(_metadata_for_transform(template, "remix", "local-remix", prompt, changes))

    transform = TemplateTransformSummary(
        source="local-remix",
        changes=changes or ["Created an editable remix while preserving the original layout structure"],
        warnings=[] if image_count else ["No existing image layers were present to replace; layout and editable objects were preserved."],
    )
    return _create_template_project(
        db=db,
        current_user=current_user,
        template=template,
        canvas_data=_compact_json(canvas),
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        project_name=req.project_name or f"{template.name} AI Remix",
        action="remix",
        version_name="AI remix from template",
        transform=transform,
    )


@router.post("/{template_id}/quick-replace", response_model=TemplateUseResponse, status_code=status.HTTP_201_CREATED)
def quick_replace_template(
    template_id: str,
    req: TemplateQuickReplaceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    if template.status and template.status != "published":
        raise HTTPException(status_code=404, detail="Template not found")

    canvas, canvas_width, canvas_height = _load_template_canvas(template, req.width, req.height)
    changes: list[str] = []
    warnings: list[str] = []
    palette = [value for value in req.palette if isinstance(value, str) and value.strip()]
    if len(palette) < 3:
        palette = _palette_for_prompt(req.image_prompt or template.name, template.category_id)

    if req.replace_text:
        replacements = {key: value for key, value in req.text_replacements.items() if key in PLACEHOLDER_FIELDS and str(value or "").strip()}
        fallback_texts = [
            replacements.get("business_name") or replacements.get("event_name") or template.name,
            replacements.get("offer") or replacements.get("event_date") or "Personalized editable template",
            replacements.get("website") or replacements.get("phone_number") or "Learn More",
        ]
        text_count = _apply_texts_to_canvas(canvas, fallback_texts, replacements)
        if text_count:
            changes.append(f"Replaced {text_count} text layer{'s' if text_count != 1 else ''}")
        else:
            warnings.append("No text layers were available for replacement.")

    if req.apply_palette:
        color_count = _apply_palette_to_canvas(canvas, palette)
        if color_count:
            changes.append(f"Applied a new palette to {color_count} layer{'s' if color_count != 1 else ''}")
        else:
            warnings.append("No colour-editable layers were found.")

    if req.apply_fonts:
        font_count = _apply_fonts_to_canvas(canvas, req.heading_font or "Montserrat", req.body_font or "Inter")
        if font_count:
            changes.append(f"Applied {req.heading_font or 'Montserrat'} / {req.body_font or 'Inter'} font pairing")
        else:
            warnings.append("No text layers were available for font replacement.")

    if req.replace_images:
        image_prompt = _clean_prompt(req.image_prompt, template.name)
        image_count = _replace_images_in_canvas(canvas, image_prompt, palette)
        if image_count:
            changes.append(f"Replaced {image_count} image layer{'s' if image_count != 1 else ''}")
        else:
            warnings.append("No existing image layers were present to replace.")

    if not changes:
        raise HTTPException(status_code=422, detail="No replaceable template layers matched the selected Quick Replace options")

    canvas.setdefault("metadata", {})
    if isinstance(canvas["metadata"], dict):
        canvas["metadata"].update(_metadata_for_transform(template, "quick-replace", "local-quick-replace", req.image_prompt, changes))

    transform = TemplateTransformSummary(source="local-quick-replace", changes=changes, warnings=warnings)
    return _create_template_project(
        db=db,
        current_user=current_user,
        template=template,
        canvas_data=_compact_json(canvas),
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        project_name=req.project_name or f"{template.name} Quick Replace",
        action="quick-replace",
        version_name="Quick Replace from template",
        transform=transform,
    )


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    req: TemplateCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = resolve_category(db, req.category_id, req.category_slug)
    if (req.category_id or req.category_slug) and not category:
        raise HTTPException(status_code=422, detail="Category not found")
    subcategory = resolve_subcategory(db, category, req.subcategory_id, req.subcategory_slug)
    if (req.subcategory_id or req.subcategory_slug) and not subcategory:
        raise HTTPException(status_code=422, detail="Subcategory not found")

    template = Template(
        id=generate_id("tmpl"),
        name=req.name.strip(),
        slug=unique_template_slug(db, req.name),
        description=req.description,
        category_id=category.id if category else None,
        subcategory_id=subcategory.id if subcategory else None,
        template_type=normalize_template_type(req.template_type),
        data=req.data,
        thumbnail=req.thumbnail_url or req.thumbnail,
        thumbnail_url=req.thumbnail_url or req.thumbnail,
        preview_url=req.preview_url,
        width=req.width,
        height=req.height,
        tags=serialize_tags(req.tags),
        is_premium=req.is_premium,
        is_featured=req.is_featured,
        sort_weight=req.sort_weight,
        status=req.status or "published",
        metadata_json=req.metadata,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template_to_response(db, template, current_user.id)


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: str,
    req: TemplateUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    category = None
    subcategory = None
    if req.category_id is not None or req.category_slug is not None:
        category = resolve_category(db, req.category_id, req.category_slug)
        if not category:
            raise HTTPException(status_code=422, detail="Category not found")
        template.category_id = category.id
    if req.subcategory_id is not None or req.subcategory_slug is not None:
        subcategory = resolve_subcategory(db, category or template.category, req.subcategory_id, req.subcategory_slug)
        if not subcategory:
            raise HTTPException(status_code=422, detail="Subcategory not found")
        template.subcategory_id = subcategory.id

    if req.name is not None:
        template.name = req.name.strip()
        template.slug = unique_template_slug(db, template.name, template.id)
    if req.description is not None:
        template.description = req.description
    if req.template_type is not None:
        template.template_type = normalize_template_type(req.template_type)
    if req.data is not None:
        template.data = req.data
    if req.thumbnail is not None or req.thumbnail_url is not None:
        template.thumbnail = req.thumbnail_url or req.thumbnail
        template.thumbnail_url = req.thumbnail_url or req.thumbnail
    if req.preview_url is not None:
        template.preview_url = req.preview_url
    if req.width is not None:
        template.width = req.width
    if req.height is not None:
        template.height = req.height
    if req.tags is not None:
        template.tags = serialize_tags(req.tags)
    if req.is_premium is not None:
        template.is_premium = req.is_premium
    if req.is_featured is not None:
        template.is_featured = req.is_featured
    if req.sort_weight is not None:
        template.sort_weight = req.sort_weight
    if req.status is not None:
        template.status = req.status
    if req.metadata is not None:
        template.metadata_json = req.metadata
    template.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(template)
    return template_to_response(db, template, current_user.id)


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = get_template_or_404(template_id, db)
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
