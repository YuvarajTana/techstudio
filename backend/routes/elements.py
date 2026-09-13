from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from database import (
    get_db,
    Asset,
    User,
    ElementCategory,
    ElementFavorite,
    ElementRecentItem,
    ElementCollection,
    ElementCollectionItem,
)
from auth import get_current_user
from datetime import datetime, timezone
from starlette.concurrency import run_in_threadpool
import uuid
import json
import hashlib

router = APIRouter(prefix="/api/elements", tags=["elements"])


# ═══════════════════════════════════════════════════════════════════════════════
# CURATED PHOTO CATALOG — free, public-domain photos via Picsum
# ═══════════════════════════════════════════════════════════════════════════════

PHOTO_CATEGORIES = {
    "nature": [
        {"seed": 10, "w": 800, "h": 600, "title": "Mountain Lake Sunrise"},
        {"seed": 15, "w": 800, "h": 600, "title": "Forest Trail Canopy"},
        {"seed": 20, "w": 800, "h": 600, "title": "River Valley Landscape"},
        {"seed": 25, "w": 800, "h": 600, "title": "Wildflower Meadow"},
        {"seed": 29, "w": 800, "h": 600, "title": "Ocean Sunset Horizon"},
        {"seed": 33, "w": 800, "h": 600, "title": "Alpine Lake Reflection"},
        {"seed": 37, "w": 800, "h": 600, "title": "Green Mountain Valley"},
        {"seed": 42, "w": 800, "h": 600, "title": "Fresh Leaf Macro"},
        {"seed": 48, "w": 800, "h": 600, "title": "Desert Dunes Golden"},
        {"seed": 52, "w": 800, "h": 600, "title": "Lavender Field Sunset"},
        {"seed": 58, "w": 800, "h": 600, "title": "Rocky Coastline Waves"},
        {"seed": 64, "w": 800, "h": 600, "title": "Botanical Garden Path"},
    ],
    "technology": [
        {"seed": 100, "w": 800, "h": 600, "title": "Circuit Board Macro"},
        {"seed": 105, "w": 800, "h": 600, "title": "Code on Screen"},
        {"seed": 110, "w": 800, "h": 600, "title": "Laptop and Devices"},
        {"seed": 115, "w": 800, "h": 600, "title": "AI Chip Concept"},
        {"seed": 120, "w": 800, "h": 600, "title": "Virtual Reality"},
        {"seed": 125, "w": 800, "h": 600, "title": "Cloud Computing"},
        {"seed": 130, "w": 800, "h": 600, "title": "Server Data Center"},
        {"seed": 135, "w": 800, "h": 600, "title": "Robotic Hand"},
        {"seed": 140, "w": 800, "h": 600, "title": "Cybersecurity Shield"},
        {"seed": 145, "w": 800, "h": 600, "title": "Data Analytics"},
        {"seed": 150, "w": 800, "h": 600, "title": "Smart Devices"},
        {"seed": 155, "w": 800, "h": 600, "title": "Automation Workflow"},
    ],
    "business": [
        {"seed": 200, "w": 800, "h": 600, "title": "Executive Meeting"},
        {"seed": 205, "w": 800, "h": 600, "title": "Business Handshake"},
        {"seed": 210, "w": 800, "h": 600, "title": "Analytics Dashboard"},
        {"seed": 215, "w": 800, "h": 600, "title": "Laptop Workspace"},
        {"seed": 220, "w": 800, "h": 600, "title": "Boardroom Presentation"},
        {"seed": 225, "w": 800, "h": 600, "title": "Team Collaboration"},
        {"seed": 230, "w": 800, "h": 600, "title": "Corporate Buildings"},
        {"seed": 235, "w": 800, "h": 600, "title": "Creative Workspace"},
        {"seed": 240, "w": 800, "h": 600, "title": "Strategy Planning"},
        {"seed": 245, "w": 800, "h": 600, "title": "Startup Brainstorm"},
        {"seed": 250, "w": 800, "h": 600, "title": "Finance Reports"},
        {"seed": 255, "w": 800, "h": 600, "title": "Remote Work Setup"},
    ],
    "food-drink": [
        {"seed": 300, "w": 800, "h": 600, "title": "Fresh Garden Salad"},
        {"seed": 305, "w": 800, "h": 600, "title": "Burger and Fries"},
        {"seed": 310, "w": 800, "h": 600, "title": "Cafe Latte Cup"},
        {"seed": 315, "w": 800, "h": 600, "title": "Pasta Dish"},
        {"seed": 320, "w": 800, "h": 600, "title": "Fresh Fruit Bowl"},
        {"seed": 325, "w": 800, "h": 600, "title": "Orange Juice Glass"},
        {"seed": 330, "w": 800, "h": 600, "title": "Chocolate Cake"},
        {"seed": 335, "w": 800, "h": 600, "title": "Market Vegetables"},
        {"seed": 340, "w": 800, "h": 600, "title": "Sushi Plate"},
        {"seed": 345, "w": 800, "h": 600, "title": "Breakfast Table"},
        {"seed": 350, "w": 800, "h": 600, "title": "Artisan Pizza"},
        {"seed": 355, "w": 800, "h": 600, "title": "Berry Dessert"},
    ],
    "fashion": [
        {"seed": 400, "w": 800, "h": 600, "title": "Fashion Portrait"},
        {"seed": 405, "w": 800, "h": 600, "title": "Clothing Rack"},
        {"seed": 410, "w": 800, "h": 600, "title": "White Sneakers"},
        {"seed": 415, "w": 800, "h": 600, "title": "Tailored Jacket"},
        {"seed": 420, "w": 800, "h": 600, "title": "Sunglasses Portrait"},
        {"seed": 425, "w": 800, "h": 600, "title": "Jewelry Flatlay"},
        {"seed": 430, "w": 800, "h": 600, "title": "Luxury Handbag"},
        {"seed": 435, "w": 800, "h": 600, "title": "Textile Detail"},
        {"seed": 440, "w": 800, "h": 600, "title": "Runway Stage"},
        {"seed": 445, "w": 800, "h": 600, "title": "Street Style"},
        {"seed": 450, "w": 800, "h": 600, "title": "Beauty Products"},
        {"seed": 455, "w": 800, "h": 600, "title": "Evening Dress"},
    ],
    "fitness": [
        {"seed": 500, "w": 800, "h": 600, "title": "Gym Training"},
        {"seed": 505, "w": 800, "h": 600, "title": "Yoga Practice"},
        {"seed": 510, "w": 800, "h": 600, "title": "Weight Training"},
        {"seed": 515, "w": 800, "h": 600, "title": "Outdoor Running"},
        {"seed": 520, "w": 800, "h": 600, "title": "Dumbbells Setup"},
        {"seed": 525, "w": 800, "h": 600, "title": "Road Cycling"},
        {"seed": 530, "w": 800, "h": 600, "title": "Workout Gear"},
        {"seed": 535, "w": 800, "h": 600, "title": "Boxing Training"},
        {"seed": 540, "w": 800, "h": 600, "title": "Pilates Session"},
        {"seed": 545, "w": 800, "h": 600, "title": "Swimming Lanes"},
        {"seed": 550, "w": 800, "h": 600, "title": "Sports Field"},
        {"seed": 555, "w": 800, "h": 600, "title": "Active Lifestyle"},
    ],
    "travel": [
        {"seed": 600, "w": 800, "h": 600, "title": "Tropical Beach"},
        {"seed": 605, "w": 800, "h": 600, "title": "Airplane Sky"},
        {"seed": 610, "w": 800, "h": 600, "title": "Mountain Pier"},
        {"seed": 615, "w": 800, "h": 600, "title": "Hot Air Balloons"},
        {"seed": 620, "w": 800, "h": 600, "title": "Island Village"},
        {"seed": 625, "w": 800, "h": 600, "title": "City Skyline Night"},
        {"seed": 630, "w": 800, "h": 600, "title": "Camper Van Trip"},
        {"seed": 635, "w": 800, "h": 600, "title": "National Canyon"},
        {"seed": 640, "w": 800, "h": 600, "title": "European Street"},
        {"seed": 645, "w": 800, "h": 600, "title": "Temple Ruins"},
        {"seed": 650, "w": 800, "h": 600, "title": "Northern Lights"},
        {"seed": 655, "w": 800, "h": 600, "title": "Safari Sunset"},
    ],
    "abstract": [
        {"seed": 700, "w": 800, "h": 800, "title": "Colorful Fluid Art"},
        {"seed": 705, "w": 800, "h": 800, "title": "Dark Marble Texture"},
        {"seed": 710, "w": 800, "h": 800, "title": "Vivid Paint Flow"},
        {"seed": 715, "w": 800, "h": 800, "title": "Geometric Blocks"},
        {"seed": 720, "w": 800, "h": 800, "title": "Blue Wave Texture"},
        {"seed": 725, "w": 800, "h": 800, "title": "Neon Light Lines"},
        {"seed": 730, "w": 800, "h": 800, "title": "Pastel Marble"},
        {"seed": 735, "w": 800, "h": 800, "title": "Line Art Pattern"},
        {"seed": 740, "w": 800, "h": 800, "title": "Gradient Waves"},
        {"seed": 745, "w": 800, "h": 800, "title": "Abstract Shapes"},
        {"seed": 750, "w": 800, "h": 800, "title": "Color Splash"},
        {"seed": 755, "w": 800, "h": 800, "title": "Smoke Effect"},
    ],
    "architecture": [
        {"seed": 800, "w": 800, "h": 600, "title": "Modern House"},
        {"seed": 805, "w": 800, "h": 600, "title": "Glass Building"},
        {"seed": 810, "w": 800, "h": 600, "title": "Living Interior"},
        {"seed": 815, "w": 800, "h": 600, "title": "City Skyline"},
        {"seed": 820, "w": 800, "h": 600, "title": "Office Interior"},
        {"seed": 825, "w": 800, "h": 600, "title": "Steel Bridge"},
        {"seed": 830, "w": 800, "h": 600, "title": "Museum Atrium"},
        {"seed": 835, "w": 800, "h": 600, "title": "Stone Staircase"},
        {"seed": 840, "w": 800, "h": 600, "title": "Rooftop Terrace"},
        {"seed": 845, "w": 800, "h": 600, "title": "Minimal Facade"},
        {"seed": 850, "w": 800, "h": 600, "title": "Urban Corridor"},
        {"seed": 855, "w": 800, "h": 600, "title": "Glass Facade"},
    ],
    "animals": [
        {"seed": 900, "w": 800, "h": 600, "title": "Dog Portrait"},
        {"seed": 905, "w": 800, "h": 600, "title": "Lion Wildlife"},
        {"seed": 910, "w": 800, "h": 600, "title": "Elephant Savanna"},
        {"seed": 915, "w": 800, "h": 600, "title": "Colorful Parrot"},
        {"seed": 920, "w": 800, "h": 600, "title": "Tiger Closeup"},
        {"seed": 925, "w": 800, "h": 600, "title": "Dolphin Jump"},
        {"seed": 930, "w": 800, "h": 600, "title": "Cat Portrait"},
        {"seed": 935, "w": 800, "h": 600, "title": "Horse Sunset"},
        {"seed": 940, "w": 800, "h": 600, "title": "Owl Night"},
        {"seed": 945, "w": 800, "h": 600, "title": "Butterfly Garden"},
        {"seed": 950, "w": 800, "h": 600, "title": "Penguin Colony"},
        {"seed": 955, "w": 800, "h": 600, "title": "Fox Forest"},
    ],
    "people": [
        {"seed": 1000, "w": 800, "h": 600, "title": "Professional Portrait"},
        {"seed": 1005, "w": 800, "h": 600, "title": "Friends Group"},
        {"seed": 1010, "w": 800, "h": 600, "title": "Family Moment"},
        {"seed": 1015, "w": 800, "h": 600, "title": "Team Portrait"},
        {"seed": 1020, "w": 800, "h": 600, "title": "Student Headshot"},
        {"seed": 1025, "w": 800, "h": 600, "title": "Outdoor Family"},
        {"seed": 1030, "w": 800, "h": 600, "title": "Business Portrait"},
        {"seed": 1035, "w": 800, "h": 600, "title": "Traveler Portrait"},
        {"seed": 1040, "w": 800, "h": 600, "title": "Creative Portrait"},
        {"seed": 1045, "w": 800, "h": 600, "title": "Group Laughter"},
        {"seed": 1050, "w": 800, "h": 600, "title": "Candid Street"},
        {"seed": 1055, "w": 800, "h": 600, "title": "Diverse Team"},
    ],
    "minimal": [
        {"seed": 1100, "w": 800, "h": 800, "title": "Plant Vase"},
        {"seed": 1105, "w": 800, "h": 800, "title": "Zen Stones"},
        {"seed": 1110, "w": 800, "h": 800, "title": "Modern Chair"},
        {"seed": 1115, "w": 800, "h": 800, "title": "Potted Plant"},
        {"seed": 1120, "w": 800, "h": 800, "title": "Ceramic Vases"},
        {"seed": 1125, "w": 800, "h": 800, "title": "Empty Frame"},
        {"seed": 1130, "w": 800, "h": 800, "title": "Clean Desk"},
        {"seed": 1135, "w": 800, "h": 800, "title": "Coffee Cup"},
        {"seed": 1140, "w": 800, "h": 800, "title": "Simple Bottle"},
        {"seed": 1145, "w": 800, "h": 800, "title": "Notebook Flat"},
        {"seed": 1150, "w": 800, "h": 800, "title": "White Pebbles"},
        {"seed": 1155, "w": 800, "h": 800, "title": "Single Flower"},
    ],
}

# All photo category slugs for "show all" queries
ALL_PHOTO_CATEGORIES = list(PHOTO_CATEGORIES.keys())


def _picsum_url(seed: int, width: int, height: int) -> str:
    return f"https://picsum.photos/seed/{seed}/{width}/{height}"


def _curated_photo_asset(cat_slug: str, photo: dict, index: int) -> dict:
    """Build an element dict that matches the frontend ElementItem shape."""
    seed = photo["seed"]
    w = photo["w"]
    h = photo["h"]
    orientation = "landscape" if w > h else "portrait" if h > w else "square"
    img_url = _picsum_url(seed, w, h)
    thumb_url = _picsum_url(seed, min(w, 400), min(h, 300))
    asset_id = f"curated_photo_{cat_slug}_{seed}"
    tags = [cat_slug, "photo", "curated", "free"]
    return {
        "id": asset_id,
        "title": photo["title"],
        "displayName": photo["title"],
        "kind": "photo",
        "category": cat_slug,
        "subcategory": cat_slug,
        "tags": tags,
        "thumbnailUrl": thumb_url,
        "previewUrl": img_url,
        "sourceUrl": img_url,
        "mimeType": "image/jpeg",
        "width": w,
        "height": h,
        "aspectRatio": w / h if h else 1.0,
        "isPremium": False,
        "isAnimated": False,
        "provider": "picsum",
        "licence": "Unsplash License (free)",
        "svgData": None,
        "colors": None,
        "style": None,
    }


def _build_curated_photos(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 30,
) -> tuple[list[dict], int]:
    """Return (elements, total) from the curated photo catalog."""
    cats_to_search = [category] if (category and category in PHOTO_CATEGORIES) else ALL_PHOTO_CATEGORIES
    all_photos: list[dict] = []
    for cat_slug in cats_to_search:
        for idx, photo in enumerate(PHOTO_CATEGORIES[cat_slug]):
            all_photos.append(_curated_photo_asset(cat_slug, photo, idx))

    if subcategory:
        sub_lower = subcategory.strip().lower()
        all_photos = [p for p in all_photos if sub_lower in (p.get("subcategory", "") or "").lower() or sub_lower in " ".join(p.get("tags", []))]
    if search:
        terms = search.lower().split()
        def _matches(photo: dict) -> bool:
            text = f"{photo['title']} {photo['category']} {' '.join(photo.get('tags', []))}".lower()
            return all(t in text for t in terms)
        all_photos = [p for p in all_photos if _matches(p)]

    total = len(all_photos)
    start = (page - 1) * limit
    return all_photos[start:start + limit], total

# Category tree seed definitions
DEFAULT_ELEMENT_CATEGORIES = [
    {"id": "cat_images", "name": "Images", "slug": "images", "icon": "image", "display_order": 1},
    {"id": "cat_graphics", "name": "Graphics", "slug": "graphics", "icon": "paintbrush", "display_order": 2},
    {"id": "cat_videos", "name": "Videos", "slug": "videos", "icon": "film", "display_order": 3},
    {"id": "cat_code", "name": "Code", "slug": "code", "icon": "cpu", "display_order": 4},
    {"id": "cat_music", "name": "Music", "slug": "music", "icon": "music", "display_order": 5},
    {"id": "cat_sound_effects", "name": "Sound Effects", "slug": "sound-effects", "icon": "zap", "display_order": 6},
    {"id": "cat_voiceover", "name": "Voiceover", "slug": "voiceover", "icon": "mic", "display_order": 7},
    {"id": "cat_shapes", "name": "Shapes", "slug": "shapes", "icon": "shapes", "display_order": 8},
    {"id": "cat_3d", "name": "3D", "slug": "3d", "icon": "box", "display_order": 9},
    {"id": "cat_animations", "name": "Animations", "slug": "animations", "icon": "zap", "display_order": 10},
    {"id": "cat_charts", "name": "Charts", "slug": "charts", "icon": "bar-chart", "display_order": 11},
    {"id": "cat_forms", "name": "Forms", "slug": "forms", "icon": "file-spreadsheet", "display_order": 12},
    {"id": "cat_sheets", "name": "Sheets", "slug": "sheets", "icon": "table", "display_order": 13},
    {"id": "cat_tables", "name": "Tables", "slug": "tables", "icon": "table", "display_order": 14},
    {"id": "cat_frames", "name": "Frames", "slug": "frames", "icon": "frame", "display_order": 15},
    {"id": "cat_grids", "name": "Grids", "slug": "grids", "icon": "layout-grid", "display_order": 16},
]


class FavoriteToggleRequest(BaseModel):
    element_id: str


class RecentItemRequest(BaseModel):
    element_id: str


class CollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionItemAddRequest(BaseModel):
    element_id: str


class AIElementGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt describing the element to generate")
    element_type: str = Field("icon", description="icon, illustration, sticker, shape, texture")
    style: Optional[str] = "flat"  # flat, 3d, outline, minimalist, neon, watercolor
    color_palette: Optional[List[str]] = None


@router.get("/categories")
def list_element_categories(db: Session = Depends(get_db)):
    """List hierarchical element categories."""
    categories = db.query(ElementCategory).order_by(ElementCategory.display_order.asc()).all()
    if not categories:
        # Seed default categories if empty
        for cat in DEFAULT_ELEMENT_CATEGORIES:
            db.add(ElementCategory(**cat))
        db.commit()
        categories = db.query(ElementCategory).order_by(ElementCategory.display_order.asc()).all()

    return {
        "categories": [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "icon": c.icon,
                "display_order": c.display_order,
            }
            for c in categories
        ]
    }


@router.get("")
def list_elements(
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    is_premium: Optional[bool] = Query(None),
    is_animated: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List & filter elements with pagination and category/subcategory support.

    For the 'images' (photos) category, DB assets are merged with a curated
    catalog of free Picsum photos so the panel always has content.
    """
    is_photo_query = (category or "").strip().lower() == "images"

    query = db.query(Asset).filter(Asset.is_active == True)

    if category:
        cat = category.strip().lower()
        query = query.filter(Asset.category == cat)
    if subcategory:
        sub = subcategory.strip().lower()
        query = query.filter(
            (Asset.tags.ilike(f"%{sub}%")) | (Asset.category.ilike(f"%{sub}%"))
        )
    if is_premium is not None:
        query = query.filter(Asset.is_premium == is_premium)
    if is_animated is not None:
        query = query.filter(Asset.is_animated == is_animated)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            (Asset.name.ilike(s)) |
            (Asset.tags.ilike(s)) |
            (Asset.category.ilike(s)) |
            (Asset.title.ilike(s))
        )

    total = query.count()
    items = query.order_by(Asset.use_count.desc(), Asset.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    db_elements = [
        {
            "id": a.id,
            "title": a.name,
            "displayName": a.name,
            "kind": a.category or "shape",
            "category": a.category,
            "subcategory": getattr(a, 'subcategory', None) or a.category,
            "tags": json.loads(a.tags) if a.tags and a.tags.startswith("[") else [a.category or "shape"],
            "thumbnailUrl": a.thumbnail_url or a.image_url,
            "previewUrl": a.image_url or a.thumbnail_url,
            "sourceUrl": a.image_url,
            "mimeType": a.mime_type or "image/svg+xml",
            "width": a.width or 400,
            "height": a.height or 400,
            "aspectRatio": (a.width / a.height) if a.width and a.height else 1.0,
            "isPremium": a.is_premium or False,
            "isAnimated": getattr(a, 'is_animated', False) or False,
            "provider": a.provider or "teckstudio",
            "licence": a.license or "commercial-free",
            "svgData": a.file_data if a.file_type == "svg" else None,
            "colors": getattr(a, 'colors', None),
            "style": getattr(a, 'style', None),
        }
        for a in items
    ]

    # For photo queries, merge DB results with curated Picsum catalog
    if is_photo_query:
        curated_elements, curated_total = _build_curated_photos(
            category=category,
            subcategory=subcategory,
            search=search,
            page=page,
            limit=limit,
        )
        # Deduplicate by id
        seen_ids = {el["id"] for el in db_elements}
        merged = db_elements + [el for el in curated_elements if el["id"] not in seen_ids]
        total = total + curated_total
        # Apply limit
        start = (page - 1) * limit
        merged = merged[start:start + limit]
        return {
            "page": page,
            "limit": limit,
            "total": total,
            "elements": merged,
        }

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "elements": db_elements,
    }


@router.get("/search")
def search_elements(
    q: str = Query(..., description="Search query"),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    is_premium: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Rich server-side search across element title, tags, category, and metadata."""
    return list_elements(category=category, subcategory=subcategory, is_premium=is_premium, search=q, page=page, limit=limit, db=db)


@router.get("/recent")
def get_recent_elements(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch user's recently inserted elements."""
    recents = db.query(ElementRecentItem).filter(
        ElementRecentItem.user_id == current_user.id
    ).order_by(ElementRecentItem.last_used_at.desc()).limit(20).all()

    element_ids = [r.element_id for r in recents]
    if not element_ids:
        return {"recents": []}

    assets = db.query(Asset).filter(Asset.id.in_(element_ids)).all()
    asset_map = {a.id: a for a in assets}

    result = []
    for r in recents:
        a = asset_map.get(r.element_id)
        if a:
            result.append({
                "id": a.id,
                "title": a.name,
                "category": a.category,
                "thumbnailUrl": a.thumbnail_url or a.image_url,
                "sourceUrl": a.image_url,
                "last_used_at": r.last_used_at.isoformat(),
            })

    return {"recents": result}


@router.post("/recent")
def add_recent_element(req: RecentItemRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Record an element insertion in user's recently used history."""
    rec = db.query(ElementRecentItem).filter(
        ElementRecentItem.user_id == current_user.id,
        ElementRecentItem.element_id == req.element_id
    ).first()

    if rec:
        rec.usage_count += 1
        rec.last_used_at = datetime.now(timezone.utc)
    else:
        rec = ElementRecentItem(
            id=f"rec_{uuid.uuid4().hex[:12]}",
            user_id=current_user.id,
            element_id=req.element_id,
            usage_count=1,
            last_used_at=datetime.now(timezone.utc),
        )
        db.add(rec)

    # Increment global asset use count
    asset = db.query(Asset).filter(Asset.id == req.element_id).first()
    if asset:
        asset.use_count += 1

    db.commit()
    return {"success": True}


@router.get("/favorites")
def get_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's favorited elements."""
    favs = db.query(ElementFavorite).filter(ElementFavorite.user_id == current_user.id).order_by(ElementFavorite.created_at.desc()).all()
    fav_ids = [f.element_id for f in favs]

    if not fav_ids:
        return {"favorites": []}

    assets = db.query(Asset).filter(Asset.id.in_(fav_ids)).all()
    return {
        "favorites": [
            {
                "id": a.id,
                "title": a.name,
                "category": a.category,
                "thumbnailUrl": a.thumbnail_url or a.image_url,
                "sourceUrl": a.image_url,
            }
            for a in assets
        ]
    }


@router.post("/favorites/{element_id}")
def toggle_favorite(element_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Toggle favorite status for an element."""
    fav = db.query(ElementFavorite).filter(
        ElementFavorite.user_id == current_user.id,
        ElementFavorite.element_id == element_id
    ).first()

    if fav:
        db.delete(fav)
        db.commit()
        return {"success": True, "favorited": False}
    else:
        fav = ElementFavorite(
            id=f"fav_{uuid.uuid4().hex[:12]}",
            user_id=current_user.id,
            element_id=element_id,
        )
        db.add(fav)
        db.commit()
        return {"success": True, "favorited": True}


@router.get("/recommendations")
def get_recommendations(
    query: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Contextual recommendations based on current design prompt or active category."""
    q = db.query(Asset).filter(Asset.is_active == True)
    if category:
        q = q.filter(Asset.category == category.strip().lower())

    recommendations = q.order_by(Asset.use_count.desc()).limit(limit).all()
    return {
        "recommendations": [
            {
                "id": a.id,
                "title": a.name,
                "category": a.category,
                "thumbnailUrl": a.thumbnail_url or a.image_url,
                "sourceUrl": a.image_url,
                "isPremium": a.is_premium or False,
            }
            for a in recommendations
        ]
    }


@router.post("/generate")
async def generate_ai_element(req: AIElementGenerateRequest, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate original AI element from text prompt using configured AI providers."""
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Element prompt cannot be empty")

    element_type = req.element_type.strip().lower()
    style = (req.style or "flat").strip().lower()

    # Build enhanced prompt based on element type and style
    enhanced_prompt = prompt
    if style == "3d":
        enhanced_prompt = f"3D rendered {prompt}, isometric style, high quality"
    elif style == "outline":
        enhanced_prompt = f"Outline style {prompt}, minimal, clean lines"
    elif style == "flat":
        enhanced_prompt = f"Flat vector {prompt}, minimal design, clean"

    # Use the AI provider system from ai.py routes
    try:
        from routes.ai import generate_image_via_proxy, normalize_image_result_to_dimensions, persist_generated_asset, persist_generation_job
        from starlette.concurrency import run_in_threadpool

        result = await run_in_threadpool(generate_image_via_proxy, enhanced_prompt, 500, 500)

        if result.get("success") and result.get("url"):
            # Normalize to desired dimensions
            result = await run_in_threadpool(normalize_image_result_to_dimensions, result, 500, 500)

            # Persist the generated asset
            persisted = persist_generated_asset(
                db,
                base_url=str(request.base_url),
                asset_type="image",
                image_source=result["url"],
                original_prompt=prompt,
                enhanced_prompt=enhanced_prompt,
                provider=result.get("source"),
                model=None,
                width=500,
                height=500,
                fallback_used=False,
                user_id=current_user.id,
            )
            persist_generation_job(
                db,
                job_type="element",
                status="completed",
                user_id=current_user.id,
                asset_id=persisted.id,
                provider=result.get("source"),
                metadata={"prompt": prompt, "element_type": element_type, "style": style},
            )

            element_id = persisted.id
            image_url = persisted.public_url
            provider = result.get("source", "ai")
        else:
            # Fallback to Pollinations if no provider succeeded
            encoded_prompt = enhanced_prompt.replace(" ", "%20")
            image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=500&height=500&seed=42"
            element_id = f"ai_elem_{uuid.uuid4().hex[:12]}"
            provider = "pollinations"
    except Exception:
        # Fallback to Pollinations on any error
        encoded_prompt = enhanced_prompt.replace(" ", "%20")
        image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=500&height=500&seed=42"
        element_id = f"ai_elem_{uuid.uuid4().hex[:12]}"
        provider = "pollinations"

    asset = Asset(
        id=element_id,
        user_id=current_user.id,
        name=f"AI {element_type.title()}: {prompt[:30]}",
        title=prompt,
        category=element_type,
        tags=json.dumps([element_type, style, "ai-generated", "custom"]),
        image_url=image_url,
        thumbnail_url=image_url,
        source="ai-generated",
        provider=provider,
        license="commercial-free",
        is_premium=False,
    )
    db.add(asset)
    db.commit()

    return {
        "success": True,
        "element": {
            "id": asset.id,
            "title": asset.name,
            "kind": element_type,
            "category": element_type,
            "sourceUrl": asset.image_url,
            "thumbnailUrl": asset.thumbnail_url,
            "provider": asset.provider,
        }
    }


@router.get("/collections")
def list_collections(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List user's custom element collections."""
    cols = db.query(ElementCollection).filter(ElementCollection.user_id == current_user.id).order_by(ElementCollection.created_at.desc()).all()
    return {
        "collections": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in cols
        ]
    }


@router.post("/collections")
def create_collection(req: CollectionCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new user element collection."""
    col = ElementCollection(
        id=f"col_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        name=req.name.strip(),
        description=req.description.strip() if req.description else None,
    )
    db.add(col)
    db.commit()
    return {"success": True, "collection": {"id": col.id, "name": col.name}}


@router.delete("/collections/{collection_id}")
def delete_collection(collection_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a user element collection."""
    col = db.query(ElementCollection).filter(
        ElementCollection.id == collection_id,
        ElementCollection.user_id == current_user.id
    ).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(col)
    db.commit()
    return {"success": True}

