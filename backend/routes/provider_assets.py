from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from config import settings


router = APIRouter(prefix="/api/provider-assets", tags=["provider-assets"])

ProviderName = Literal["iconify", "unsplash", "lottiefiles"]
AssetKind = Literal["shape", "graphic", "photo", "animation"]


class ProviderAsset(BaseModel):
    id: str
    title: str
    provider: ProviderName
    kind: AssetKind
    thumbnailUrl: str | None = None
    previewUrl: str | None = None
    sourceUrl: str
    sourcePageUrl: str | None = None
    mimeType: str | None = None
    authorName: str | None = None
    authorUrl: str | None = None
    licenseName: str | None = None
    licenseUrl: str | None = None
    attributionRequired: bool = False
    attributionText: str | None = None
    width: int | None = None
    height: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProviderAssetResponse(BaseModel):
    provider: ProviderName
    kind: AssetKind
    query: str
    page: int
    perPage: int
    items: list[ProviderAsset]


class ProviderStatus(BaseModel):
    provider: ProviderName
    configured: bool
    requiresKey: bool


class ProviderStatusResponse(BaseModel):
    providers: list[ProviderStatus]


def _headers(provider: ProviderName) -> dict[str, str]:
    if provider == "unsplash":
        return {"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY.strip()}"}
    if provider == "lottiefiles" and settings.LOTTIEFILES_API_KEY.strip():
        return {"Authorization": f"Bearer {settings.LOTTIEFILES_API_KEY.strip()}"}
    if provider == "iconify" and settings.ICONIFY_API_KEY.strip():
        return {"Authorization": f"Bearer {settings.ICONIFY_API_KEY.strip()}"}
    return {}


def _require_provider_config(provider: ProviderName) -> None:
    if provider == "iconify":
        return
    if provider == "unsplash" and not settings.UNSPLASH_ACCESS_KEY.strip():
        raise HTTPException(
            status_code=503,
            detail="UNSPLASH_ACCESS_KEY is not configured on the backend.",
        )
    if provider == "lottiefiles" and (
        not settings.LOTTIEFILES_API_KEY.strip() or not settings.LOTTIEFILES_API_URL.strip()
    ):
        raise HTTPException(
            status_code=503,
            detail="LOTTIEFILES_API_KEY and LOTTIEFILES_API_URL must be configured on the backend.",
        )


def _client() -> httpx.Client:
    timeout = httpx.Timeout(12.0, connect=5.0)
    return httpx.Client(timeout=timeout, follow_redirects=True)


def _iconify_items(payload: dict[str, Any], kind: AssetKind) -> list[ProviderAsset]:
    icons = payload.get("icons") or []
    items: list[ProviderAsset] = []
    for icon_id in icons:
        if not isinstance(icon_id, str) or ":" not in icon_id:
            continue
        prefix, name = icon_id.split(":", 1)
        svg_url = f"https://api.iconify.design/{prefix}:{name}.svg"
        items.append(
            ProviderAsset(
                id=f"iconify:{icon_id}",
                title=name.replace("-", " ").replace("_", " ").title(),
                provider="iconify",
                kind=kind,
                thumbnailUrl=svg_url,
                previewUrl=svg_url,
                sourceUrl=svg_url,
                sourcePageUrl=f"https://icon-sets.iconify.design/{prefix}/{name}/",
                mimeType="image/svg+xml",
                licenseName="Icon set license",
                attributionRequired=False,
                metadata={"icon": icon_id, "prefix": prefix},
            )
        )
    return items


def _unsplash_items(payload: dict[str, Any]) -> list[ProviderAsset]:
    results = payload.get("results") or []
    items: list[ProviderAsset] = []
    for photo in results:
        if not isinstance(photo, dict):
            continue
        urls = photo.get("urls") or {}
        links = photo.get("links") or {}
        user = photo.get("user") or {}
        source_url = urls.get("regular") or urls.get("full") or urls.get("raw")
        thumb_url = urls.get("small") or urls.get("thumb") or source_url
        if not source_url:
            continue
        author_name = user.get("name") if isinstance(user, dict) else None
        author_url = (user.get("links") or {}).get("html") if isinstance(user, dict) else None
        items.append(
            ProviderAsset(
                id=f"unsplash:{photo.get('id')}",
                title=photo.get("alt_description") or photo.get("description") or "Unsplash photo",
                provider="unsplash",
                kind="photo",
                thumbnailUrl=thumb_url,
                previewUrl=source_url,
                sourceUrl=source_url,
                sourcePageUrl=links.get("html"),
                mimeType="image/jpeg",
                authorName=author_name,
                authorUrl=author_url,
                licenseName="Unsplash License",
                licenseUrl="https://unsplash.com/license",
                attributionRequired=True,
                attributionText=f"Photo by {author_name or 'Unsplash'} on Unsplash",
                width=photo.get("width"),
                height=photo.get("height"),
                metadata={"downloadLocation": links.get("download_location")},
            )
        )
    return items


def _lottie_items(payload: dict[str, Any]) -> list[ProviderAsset]:
    results = payload.get("animations") or payload.get("items") or payload.get("results") or []
    items: list[ProviderAsset] = []
    for animation in results:
        if not isinstance(animation, dict):
            continue
        asset_id = animation.get("id") or animation.get("uuid") or animation.get("slug")
        title = animation.get("title") or animation.get("name") or "Lottie animation"
        source_url = (
            animation.get("lottieUrl")
            or animation.get("jsonUrl")
            or animation.get("downloadUrl")
            or animation.get("url")
        )
        thumbnail_url = (
            animation.get("previewUrl")
            or animation.get("thumbnailUrl")
            or animation.get("image")
            or animation.get("gifUrl")
        )
        if not source_url and not thumbnail_url:
            continue
        user = animation.get("user") if isinstance(animation.get("user"), dict) else {}
        items.append(
            ProviderAsset(
                id=f"lottiefiles:{asset_id or title}",
                title=title,
                provider="lottiefiles",
                kind="animation",
                thumbnailUrl=thumbnail_url,
                previewUrl=thumbnail_url,
                sourceUrl=source_url or thumbnail_url,
                sourcePageUrl=animation.get("htmlUrl") or animation.get("pageUrl"),
                mimeType="application/json" if (source_url or "").endswith(".json") else None,
                authorName=user.get("name"),
                authorUrl=user.get("profileUrl") or user.get("url"),
                licenseName=animation.get("license") or "LottieFiles",
                attributionRequired=True,
                attributionText=f"Animation by {user.get('name') or 'LottieFiles'}",
                metadata={"raw": {key: animation.get(key) for key in ("id", "uuid", "slug")}},
            )
        )
    return items


@router.get("/providers", response_model=ProviderStatusResponse)
def list_provider_status() -> ProviderStatusResponse:
    return ProviderStatusResponse(
        providers=[
            ProviderStatus(provider="iconify", configured=True, requiresKey=False),
            ProviderStatus(
                provider="unsplash",
                configured=bool(settings.UNSPLASH_ACCESS_KEY.strip()),
                requiresKey=True,
            ),
            ProviderStatus(
                provider="lottiefiles",
                configured=bool(settings.LOTTIEFILES_API_KEY.strip() and settings.LOTTIEFILES_API_URL.strip()),
                requiresKey=True,
            ),
        ]
    )


@router.get("/search", response_model=ProviderAssetResponse)
def search_provider_assets(
    provider: ProviderName = Query(...),
    kind: AssetKind = Query(...),
    q: str = Query("", max_length=120),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=50),
) -> ProviderAssetResponse:
    valid_pairs: dict[ProviderName, set[AssetKind]] = {
        "iconify": {"shape", "graphic"},
        "unsplash": {"photo"},
        "lottiefiles": {"animation"},
    }
    if kind not in valid_pairs[provider]:
        raise HTTPException(status_code=400, detail=f"{provider} does not provide {kind} assets.")

    _require_provider_config(provider)
    query = (q or "").strip() or {
        "shape": "geometric shape",
        "graphic": "illustration",
        "photo": "technology",
        "animation": "loader",
    }[kind]

    try:
        with _client() as client:
            if provider == "iconify":
                response = client.get(
                    "https://api.iconify.design/search",
                    params={"query": query, "limit": per_page, "start": (page - 1) * per_page},
                    headers=_headers(provider),
                )
                response.raise_for_status()
                items = _iconify_items(response.json(), kind)
            elif provider == "unsplash":
                response = client.get(
                    "https://api.unsplash.com/search/photos",
                    params={
                        "query": query,
                        "page": page,
                        "per_page": per_page,
                        "content_filter": "high",
                    },
                    headers=_headers(provider),
                )
                response.raise_for_status()
                items = _unsplash_items(response.json())
            else:
                response = client.get(
                    settings.LOTTIEFILES_API_URL,
                    params={"query": query, "search": query, "page": page, "per_page": per_page, "limit": per_page},
                    headers=_headers(provider),
                )
                response.raise_for_status()
                items = _lottie_items(response.json())
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"{provider} asset search failed: {exc}") from exc

    return ProviderAssetResponse(
        provider=provider,
        kind=kind,
        query=query,
        page=page,
        perPage=per_page,
        items=items,
    )
