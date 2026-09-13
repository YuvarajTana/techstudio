import base64
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from asset_providers import AssetSearchInput, LocalDatabaseAssetProvider
from database import get_db, Asset, User
from auth import get_current_user
import random
import string

router = APIRouter(prefix="/api/assets", tags=["assets"])
MEDIA_ROOT = Path(__file__).resolve().parents[1] / "media"


CANONICAL_IMAGE_CATEGORIES = [
    {"id": "nature", "label": "Nature"},
    {"id": "business", "label": "Business"},
    {"id": "food-drink", "label": "Food & Drink"},
    {"id": "technology", "label": "Technology"},
    {"id": "fashion", "label": "Fashion"},
    {"id": "fitness", "label": "Fitness"},
    {"id": "travel", "label": "Travel"},
    {"id": "abstract", "label": "Abstract"},
    {"id": "architecture", "label": "Architecture"},
    {"id": "animals", "label": "Animals"},
    {"id": "people", "label": "People"},
    {"id": "minimal", "label": "Minimal"},
    {"id": "education", "label": "Education"},
    {"id": "healthcare", "label": "Healthcare"},
    {"id": "finance", "label": "Finance"},
    {"id": "marketing", "label": "Marketing"},
    {"id": "social-media", "label": "Social Media"},
    {"id": "events", "label": "Events"},
    {"id": "sports", "label": "Sports"},
    {"id": "music", "label": "Music"},
    {"id": "entertainment", "label": "Entertainment"},
    {"id": "real-estate", "label": "Real Estate"},
    {"id": "e-commerce", "label": "E-commerce"},
    {"id": "startup", "label": "Startup"},
    {"id": "office", "label": "Office"},
    {"id": "lifestyle", "label": "Lifestyle"},
    {"id": "beauty", "label": "Beauty"},
    {"id": "luxury", "label": "Luxury"},
    {"id": "automotive", "label": "Automotive"},
    {"id": "gaming", "label": "Gaming"},
    {"id": "science", "label": "Science"},
    {"id": "space", "label": "Space"},
    {"id": "environment", "label": "Environment"},
    {"id": "agriculture", "label": "Agriculture"},
    {"id": "festivals", "label": "Festivals"},
    {"id": "backgrounds", "label": "Backgrounds"},
    {"id": "textures", "label": "Textures"},
    {"id": "patterns", "label": "Patterns"},
    {"id": "gradients", "label": "Gradients"},
    {"id": "illustrations", "label": "Illustrations"},
    {"id": "icons", "label": "Icons"},
    {"id": "stickers", "label": "Stickers"},
    {"id": "frames", "label": "Frames"},
    {"id": "mockups", "label": "Mockups"},
    {"id": "product-images", "label": "Product Images"},
    {"id": "ui-elements", "label": "UI Elements"},
    {"id": "infographics", "label": "Infographics"},
    {"id": "charts", "label": "Charts"},
    {"id": "maps", "label": "Maps"},
    {"id": "technical-diagrams", "label": "Technical Diagrams"},
]


def normalize_image_category(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower().replace("&", "and").replace("_", "-")
    normalized = "-".join(part for part in normalized.replace(" and ", "-").replace(" ", "-").split("-") if part)
    aliases = {
        "food-and-drink": "food-drink",
        "food-drinks": "food-drink",
        "food": "food-drink",
        "social": "social-media",
        "socialmedia": "social-media",
        "realestate": "real-estate",
        "realty": "real-estate",
        "ecommerce": "e-commerce",
        "commerce": "e-commerce",
        "product": "product-images",
        "products": "product-images",
        "ui": "ui-elements",
        "interface": "ui-elements",
        "graphic": "illustrations",
        "graphics": "illustrations",
        "map": "maps",
        "chart": "charts",
        "technical": "technical-diagrams",
        "technical-diagram": "technical-diagrams",
        "technical-diagrams": "technical-diagrams",
        "system-architecture": "technical-diagrams",
        "distributed-systems": "technical-diagrams",
        "microservices": "technical-diagrams",
        "database-sharding": "technical-diagrams",
    }
    normalized = aliases.get(normalized, normalized)
    valid = {category["id"] for category in CANONICAL_IMAGE_CATEGORIES}
    if normalized not in valid:
        raise HTTPException(status_code=400, detail=f"Unsupported asset category: {value}")
    return normalized


TECHNICAL_DIAGRAM_SEARCH_MAP = {
    "distributed system": "distributed system architecture diagram distributed computing diagram distributed application architecture distributed database sharding backend nodes network",
    "distributed systems": "distributed system architecture diagram distributed computing diagram distributed application architecture distributed database sharding backend nodes network",
    "distributed database": "distributed database architecture diagram sharding replication partition nodes consensus router",
    "client server": "client server architecture diagram client server communication browser api backend database network",
    "client server architecture": "client server architecture diagram client server communication browser api backend database network",
    "microservice": "microservices architecture diagram api gateway service mesh database per service container backend",
    "microservices": "microservices architecture diagram api gateway service mesh database per service container backend",
    "microservices architecture": "microservices architecture diagram api gateway service mesh database per service container backend",
    "database sharding": "database sharding architecture diagram shard router partition distributed database replica",
    "sharding": "database sharding architecture diagram shard router partition distributed database replica",
    "backend": "backend system architecture diagram api gateway application server cache queue database worker",
    "backend architecture": "backend system architecture diagram api gateway application server cache queue database worker",
    "database": "database architecture diagram schema replication sharding cache query storage",
    "database architecture": "database architecture diagram schema replication sharding cache query storage",
    "cloud": "cloud architecture diagram compute storage network database load balancer service",
    "cloud architecture": "cloud architecture diagram compute storage network database load balancer service",
    "api": "api gateway architecture diagram client gateway authentication backend service database",
    "api gateway": "api gateway architecture diagram client gateway authentication backend service database",
    "api architecture": "api gateway architecture diagram client gateway authentication backend service database",
    "network": "computer network architecture diagram nodes router switch server client topology",
    "network architecture": "computer network architecture diagram nodes router switch server client topology",
    "load balancer": "load balancer architecture diagram traffic distribution multiple servers backend health checks",
    "load balancing": "load balancer architecture diagram traffic distribution multiple servers backend health checks",
    "ai architecture": "ai architecture diagram model inference vector database prompt pipeline agents",
    "machine learning": "machine learning architecture diagram data pipeline training inference model registry",
    "machine learning architecture": "machine learning architecture diagram data pipeline training inference model registry",
    "devops": "devops architecture diagram ci cd pipeline build deploy monitor infrastructure",
    "devops architecture": "devops architecture diagram ci cd pipeline build deploy monitor infrastructure",
    "process flow": "process flow diagram workflow steps decision input output technical",
    "data flow": "data flow diagram pipeline ingestion processing storage output technical",
    "software architecture": "software architecture diagram layers components services database",
}


def mapped_technical_diagram_query(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = " ".join(value.strip().lower().replace("-", " ").replace("_", " ").split())
    if not normalized:
        return None
    for key, mapped in TECHNICAL_DIAGRAM_SEARCH_MAP.items():
        if key in normalized:
            return mapped
    technical_terms = {
        "architecture",
        "diagram",
        "distributed",
        "microservices",
        "sharding",
        "server",
        "backend",
        "database",
        "api",
        "gateway",
        "cloud",
        "network",
        "load",
        "balancer",
        "devops",
        "machine",
        "learning",
    }
    if any(term in normalized.split() for term in technical_terms):
        return f"{normalized} architecture diagram technical system design"
    return None


def generate_id():
    return "asset_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


class AssetCreate(BaseModel):
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    file_data: Optional[str] = None
    file_type: Optional[str] = "svg"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    local_storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    orientation: Optional[str] = None
    source: Optional[str] = "user-upload"
    source_asset_id: Optional[str] = None
    source_url: Optional[str] = None
    source_page_url: Optional[str] = None
    author_name: Optional[str] = None
    author_url: Optional[str] = None
    license: Optional[str] = "User provided"
    license_name: Optional[str] = None
    license_url: Optional[str] = None
    attribution_required: Optional[bool] = False
    attribution: Optional[str] = None
    attribution_text: Optional[str] = None
    commercial_use_allowed: Optional[bool] = True
    modification_allowed: Optional[bool] = True
    provider: Optional[str] = "user-library"
    width: Optional[int] = None
    height: Optional[int] = None
    is_active: Optional[bool] = True
    is_premium: Optional[bool] = False


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    file_data: Optional[str] = None
    file_type: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    local_storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    orientation: Optional[str] = None
    source: Optional[str] = None
    source_asset_id: Optional[str] = None
    source_url: Optional[str] = None
    source_page_url: Optional[str] = None
    author_name: Optional[str] = None
    author_url: Optional[str] = None
    license: Optional[str] = None
    license_name: Optional[str] = None
    license_url: Optional[str] = None
    attribution_required: Optional[bool] = None
    attribution: Optional[str] = None
    attribution_text: Optional[str] = None
    commercial_use_allowed: Optional[bool] = None
    modification_allowed: Optional[bool] = None
    provider: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_active: Optional[bool] = None
    is_premium: Optional[bool] = None


class AssetResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    name: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str]
    tags: Optional[str]
    file_data: Optional[str]
    file_type: str
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    local_storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    orientation: Optional[str] = None
    source: Optional[str] = None
    source_asset_id: Optional[str] = None
    source_url: Optional[str] = None
    source_page_url: Optional[str] = None
    author_name: Optional[str] = None
    author_url: Optional[str] = None
    license: Optional[str] = None
    license_name: Optional[str] = None
    license_url: Optional[str] = None
    attribution_required: Optional[bool] = None
    attribution: Optional[str] = None
    attribution_text: Optional[str] = None
    commercial_use_allowed: Optional[bool] = None
    modification_allowed: Optional[bool] = None
    provider: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_active: Optional[bool] = None
    is_premium: bool
    use_count: int


class AssetListResponse(BaseModel):
    assets: List[AssetResponse]
    total: int


class AssetCategoryResponse(BaseModel):
    id: str
    label: str
    count: int


class AssetCategoriesResponse(BaseModel):
    success: bool
    categories: List[AssetCategoryResponse]
    total: int


class AssetSearchItem(BaseModel):
    id: str
    title: str
    category: str
    description: Optional[str] = None
    imageUrl: str
    thumbnailUrl: str
    previewUrl: str
    sourceUrl: str
    originalUrl: str
    localStoragePath: Optional[str] = None
    width: int
    height: int
    orientation: str
    mimeType: str
    tags: List[str]
    source: Optional[str] = None
    sourceAssetId: Optional[str] = None
    sourcePageUrl: Optional[str] = None
    authorName: Optional[str] = None
    authorUrl: Optional[str] = None
    licenseName: Optional[str] = None
    attributionRequired: bool
    attributionText: Optional[str] = None
    commercialUseAllowed: bool
    modificationAllowed: bool


class AssetSearchResponse(BaseModel):
    success: bool
    category: Optional[str] = None
    items: List[AssetSearchItem]
    page: int
    perPage: int
    total: int
    hasMore: bool


class AssetDataUrlResponse(BaseModel):
    success: bool
    id: str
    mimeType: str
    dataUrl: str
    width: int
    height: int


def asset_tags(asset: Asset) -> List[str]:
    return [tag.strip() for tag in (asset.tags or "").split(",") if tag.strip()]


def asset_category_slug(asset: Asset) -> str:
    for tag in asset_tags(asset):
        if tag.startswith("category:"):
            return tag.split(":", 1)[1]
    return asset.category or "images"


def browser_asset_url(value: Optional[str], request: Optional[Request] = None) -> str:
    if not value:
        return ""
    if value.startswith("/media/") and request is not None:
        return f"{str(request.base_url).rstrip('/')}{value}"
    return value


def media_path_from_asset_url(value: Optional[str]) -> Optional[Path]:
    if not value:
        return None
    parsed = urlparse(value)
    media_path = parsed.path if parsed.scheme in {"http", "https"} else value
    if not media_path.startswith("/media/"):
        return None

    media_root = MEDIA_ROOT.resolve()
    candidate = (media_root / media_path.removeprefix("/media/").lstrip("/")).resolve()
    try:
        candidate.relative_to(media_root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media asset path")
    return candidate


def to_search_item(asset: Asset, request: Optional[Request] = None) -> AssetSearchItem:
    image_url = browser_asset_url(asset.image_url or asset.file_data, request)
    thumbnail_url = browser_asset_url(asset.thumbnail_url, request) or image_url
    width = asset.width or 1
    height = asset.height or 1
    orientation = asset.orientation or (
        "landscape" if width > height else "portrait" if height > width else "square"
    )
    return AssetSearchItem(
        id=asset.id,
        title=asset.title or asset.name,
        category=asset_category_slug(asset),
        description=asset.description,
        imageUrl=image_url,
        thumbnailUrl=thumbnail_url,
        previewUrl=image_url,
        sourceUrl=image_url,
        originalUrl=image_url,
        localStoragePath=asset.local_storage_path,
        width=width,
        height=height,
        orientation=orientation,
        mimeType=asset.mime_type or asset.file_type or "image/svg+xml",
        tags=asset_tags(asset),
        source=asset.source,
        sourceAssetId=asset.source_asset_id,
        sourcePageUrl=asset.source_page_url or asset.source_url,
        authorName=asset.author_name,
        authorUrl=asset.author_url,
        licenseName=asset.license_name or asset.license,
        attributionRequired=bool(asset.attribution_required),
        attributionText=asset.attribution_text or asset.attribution,
        commercialUseAllowed=asset.commercial_use_allowed is not False,
        modificationAllowed=asset.modification_allowed is not False,
    )


def to_asset_response(asset: Asset, request: Optional[Request] = None) -> AssetResponse:
    return AssetResponse(
        id=asset.id,
        user_id=asset.user_id,
        name=asset.name,
        title=asset.title,
        description=asset.description,
        category=asset.category,
        tags=asset.tags,
        file_data=asset.file_data,
        file_type=asset.file_type,
        image_url=browser_asset_url(asset.image_url, request),
        thumbnail_url=browser_asset_url(asset.thumbnail_url, request),
        local_storage_path=asset.local_storage_path,
        mime_type=asset.mime_type,
        orientation=asset.orientation,
        source=asset.source,
        source_asset_id=asset.source_asset_id,
        source_url=asset.source_url,
        source_page_url=asset.source_page_url,
        author_name=asset.author_name,
        author_url=asset.author_url,
        license=asset.license,
        license_name=asset.license_name,
        license_url=asset.license_url,
        attribution_required=asset.attribution_required,
        attribution=asset.attribution,
        attribution_text=asset.attribution_text,
        commercial_use_allowed=asset.commercial_use_allowed,
        modification_allowed=asset.modification_allowed,
        provider=asset.provider,
        width=asset.width,
        height=asset.height,
        is_active=asset.is_active,
        is_premium=asset.is_premium,
        use_count=asset.use_count,
    )


@router.get("/categories", response_model=AssetCategoriesResponse)
def list_asset_categories(db: Session = Depends(get_db)):
    categories: List[AssetCategoryResponse] = []
    for category in CANONICAL_IMAGE_CATEGORIES:
        tag = f"%category:{category['id']}%"
        count = db.query(Asset).filter(
            Asset.user_id.is_(None),
            Asset.category == "images",
            Asset.tags.ilike(tag),
            Asset.is_active.is_(True),
        ).count()
        categories.append(AssetCategoryResponse(
            id=category["id"],
            label=category["label"],
            count=count,
        ))
    return AssetCategoriesResponse(
        success=True,
        categories=categories,
        total=sum(category.count for category in categories),
    )


@router.get("/search", response_model=AssetSearchResponse)
def search_assets(
    request: Request = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 24,
    db: Session = Depends(get_db),
):
    normalized_category = normalize_image_category(category)
    requested_search = q or search
    technical_query = mapped_technical_diagram_query(requested_search)
    if normalized_category == "technical-diagrams":
        requested_search = technical_query or requested_search
    elif technical_query:
        normalized_category = "technical-diagrams"
        requested_search = technical_query
    safe_page = max(page, 1)
    safe_per_page = min(max(per_page, 1), 60)
    provider = LocalDatabaseAssetProvider(db)
    result = provider.search(AssetSearchInput(
        category="images",
        theme=normalized_category,
        search=requested_search,
        limit=safe_per_page,
        offset=(safe_page - 1) * safe_per_page,
    ))
    return AssetSearchResponse(
        success=True,
        category=normalized_category,
        items=[to_search_item(asset, request) for asset in result.assets],
        page=safe_page,
        perPage=safe_per_page,
        total=result.total,
        hasMore=safe_page * safe_per_page < result.total,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: str, request: Request = None, db: Session = Depends(get_db)):
    asset = LocalDatabaseAssetProvider(db).get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return to_asset_response(asset, request)


@router.get("/{asset_id}/data-url", response_model=AssetDataUrlResponse)
def get_asset_data_url(asset_id: str, db: Session = Depends(get_db)):
    asset = LocalDatabaseAssetProvider(db).get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    source = asset.image_url or asset.thumbnail_url or asset.file_data
    if not source:
        raise HTTPException(status_code=404, detail="Asset image source not found")

    if source.startswith("data:image/"):
        mime_type = source.removeprefix("data:").split(";", 1)[0]
        return AssetDataUrlResponse(
            success=True,
            id=asset.id,
            mimeType=mime_type,
            dataUrl=source,
            width=asset.width or 1,
            height=asset.height or 1,
        )

    media_path = media_path_from_asset_url(source)
    if media_path is None:
        raise HTTPException(status_code=400, detail="Only local media assets can be converted to data URLs")
    if not media_path.exists() or not media_path.is_file():
        raise HTTPException(status_code=404, detail="Asset image file not found")

    image_bytes = media_path.read_bytes()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Asset image file is empty")

    mime_type = asset.mime_type or mimetypes.guess_type(media_path.name)[0] or "application/octet-stream"
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=422, detail=f"Asset file is not an image: {mime_type}")

    return AssetDataUrlResponse(
        success=True,
        id=asset.id,
        mimeType=mime_type,
        dataUrl=f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}",
        width=asset.width or 1,
        height=asset.height or 1,
    )


@router.get("", response_model=AssetListResponse)
def list_assets(
    request: Request = None,
    category: Optional[str] = None,
    theme: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    provider = LocalDatabaseAssetProvider(db)
    result = provider.search(AssetSearchInput(
        category=category,
        theme=theme,
        search=search,
        limit=min(max(limit, 1), 200),
        offset=max(offset, 0),
    ))
    return AssetListResponse(
        assets=[to_asset_response(asset, request) for asset in result.assets],
        total=result.total
    )


@router.post("", response_model=AssetResponse)
def create_asset(
    req: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    asset = Asset(
        id=generate_id(), user_id=current_user.id, name=req.name, title=req.title or req.name,
        description=req.description, category=req.category, tags=req.tags,
        file_data=req.file_data, file_type=req.file_type,
        image_url=req.image_url or req.file_data, thumbnail_url=req.thumbnail_url or req.image_url or req.file_data,
        local_storage_path=req.local_storage_path,
        mime_type=req.mime_type or req.file_type, orientation=req.orientation,
        source=req.source, source_asset_id=req.source_asset_id, source_url=req.source_url,
        source_page_url=req.source_page_url, author_name=req.author_name, author_url=req.author_url,
        license=req.license, license_name=req.license_name or req.license, license_url=req.license_url,
        attribution_required=req.attribution_required, attribution=req.attribution,
        attribution_text=req.attribution_text or req.attribution,
        commercial_use_allowed=req.commercial_use_allowed, modification_allowed=req.modification_allowed,
        provider=req.provider, width=req.width, height=req.height, is_active=req.is_active,
        is_premium=req.is_premium,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return to_asset_response(asset, None)


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    req: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if req.name is not None:
        asset.name = req.name
    if req.title is not None:
        asset.title = req.title
    if req.description is not None:
        asset.description = req.description
    if req.category is not None:
        asset.category = req.category
    if req.tags is not None:
        asset.tags = req.tags
    if req.file_data is not None:
        asset.file_data = req.file_data
    if req.file_type is not None:
        asset.file_type = req.file_type
    if req.image_url is not None:
        asset.image_url = req.image_url
    if req.thumbnail_url is not None:
        asset.thumbnail_url = req.thumbnail_url
    if req.local_storage_path is not None:
        asset.local_storage_path = req.local_storage_path
    if req.mime_type is not None:
        asset.mime_type = req.mime_type
    if req.orientation is not None:
        asset.orientation = req.orientation
    if req.source is not None:
        asset.source = req.source
    if req.source_asset_id is not None:
        asset.source_asset_id = req.source_asset_id
    if req.source_url is not None:
        asset.source_url = req.source_url
    if req.source_page_url is not None:
        asset.source_page_url = req.source_page_url
    if req.author_name is not None:
        asset.author_name = req.author_name
    if req.author_url is not None:
        asset.author_url = req.author_url
    if req.license is not None:
        asset.license = req.license
    if req.license_name is not None:
        asset.license_name = req.license_name
    if req.license_url is not None:
        asset.license_url = req.license_url
    if req.attribution_required is not None:
        asset.attribution_required = req.attribution_required
    if req.attribution is not None:
        asset.attribution = req.attribution
    if req.attribution_text is not None:
        asset.attribution_text = req.attribution_text
    if req.commercial_use_allowed is not None:
        asset.commercial_use_allowed = req.commercial_use_allowed
    if req.modification_allowed is not None:
        asset.modification_allowed = req.modification_allowed
    if req.provider is not None:
        asset.provider = req.provider
    if req.width is not None:
        asset.width = req.width
    if req.height is not None:
        asset.height = req.height
    if req.is_active is not None:
        asset.is_active = req.is_active
    if req.is_premium is not None:
        asset.is_premium = req.is_premium

    db.commit()
    db.refresh(asset)
    return to_asset_response(asset, None)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.user_id == current_user.id
    ).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}
