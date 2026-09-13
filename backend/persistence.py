import base64
import json
import mimetypes
import random
import re
import string
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

import requests

from config import resolve_runtime_path, settings
from sqlalchemy.orm import Session

from database import GeneratedAsset
from database import GenerationJob
from database import UploadedAsset


MEDIA_ROOT = resolve_runtime_path(settings.MEDIA_ROOT)
GENERATED_ASSET_DIR = MEDIA_ROOT / "generated_assets"
UPLOAD_DIR = MEDIA_ROOT / "uploads"


def generate_id(prefix: str) -> str:
    return prefix + "_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=14))


def public_media_url(base_url: str, relative_path: str) -> str:
    base = base_url.rstrip("/")
    path = relative_path if relative_path.startswith("/") else f"/{relative_path}"
    return f"{base}{path}"


def _extension_for_mime(mime_type: str) -> str:
    normalized = (mime_type or "").split(";")[0].strip().lower()
    if normalized == "image/svg+xml":
        return ".svg"
    if normalized == "image/jpeg":
        return ".jpg"
    return mimetypes.guess_extension(normalized) or ".png"


def _read_data_url(data_url: str) -> tuple[str, bytes]:
    match = re.match(r"^data:([^;,]+)(;base64)?,(.*)$", data_url, re.DOTALL)
    if not match:
        raise ValueError("Invalid data URL returned by image provider")
    mime_type = match.group(1).strip()
    is_base64 = bool(match.group(2))
    payload = match.group(3)
    if is_base64:
        image_bytes = base64.b64decode(payload)
    else:
        image_bytes = payload.encode("utf-8")
    return mime_type, image_bytes


def _read_remote_image(image_url: str) -> tuple[str, bytes]:
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Generated image source must be a data URL or HTTP(S) URL")
    response = requests.get(image_url, timeout=90, allow_redirects=True)
    response.raise_for_status()
    mime_type = response.headers.get("content-type", "").split(";")[0].strip()
    if not mime_type.startswith("image/"):
        raise ValueError(f"Provider returned invalid content type: {mime_type or 'unknown'}")
    return mime_type, response.content


def read_image_bytes(image_source: str) -> tuple[str, bytes]:
    if image_source.startswith("data:"):
        mime_type, image_bytes = _read_data_url(image_source)
    else:
        mime_type, image_bytes = _read_remote_image(image_source)
    if not mime_type.startswith("image/"):
        raise ValueError(f"Generated asset is not an image: {mime_type}")
    if not image_bytes:
        raise ValueError("Generated asset contains no image bytes")
    return mime_type, image_bytes


def _compact_metadata(metadata: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not metadata:
        return {}
    blocked = {"image_url", "poster_url", "thumbnail_url", "imageUrl", "imageData", "url"}
    compact: dict[str, Any] = {}
    for key, value in metadata.items():
        if key in blocked:
            continue
        try:
            encoded = json.dumps(value, default=str)
        except TypeError:
            encoded = json.dumps(str(value))
        if len(encoded) <= 5000:
            compact[key] = value
        else:
            compact[key] = str(value)[:5000]
    return compact


def persist_uploaded_asset(
    db: Session,
    *,
    base_url: str,
    user_id: str,
    filename: str,
    content: bytes,
    mime_type: str,
    project_id: Optional[str] = None,
) -> UploadedAsset:
    if not content:
        raise ValueError("Uploaded file is empty")
    safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename or "upload").strip("._") or "upload"
    asset_id = generate_id("ua")
    extension = Path(safe_name).suffix or mimetypes.guess_extension(mime_type) or ".bin"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{asset_id}{extension}"
    storage_path = UPLOAD_DIR / stored_name
    storage_path.write_bytes(content)
    relative_url = f"/media/uploads/{stored_name}"
    record = UploadedAsset(
        id=asset_id,
        user_id=user_id,
        project_id=project_id,
        filename=safe_name,
        mime_type=mime_type or "application/octet-stream",
        file_size=len(content),
        storage_path=str(storage_path),
        public_url=public_media_url(base_url, relative_url),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def persist_generated_asset(
    db: Session,
    *,
    base_url: str,
    asset_type: str,
    image_source: str,
    original_prompt: str,
    enhanced_prompt: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
    fallback_used: bool = False,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> GeneratedAsset:
    mime_type, image_bytes = read_image_bytes(image_source)
    asset_id = generate_id("ga")
    extension = _extension_for_mime(mime_type)
    GENERATED_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{asset_id}{extension}"
    storage_path = GENERATED_ASSET_DIR / filename
    storage_path.write_bytes(image_bytes)

    relative_url = f"/media/generated_assets/{filename}"
    record = GeneratedAsset(
        id=asset_id,
        user_id=user_id,
        project_id=project_id,
        asset_type=asset_type,
        original_prompt=original_prompt,
        enhanced_prompt=enhanced_prompt,
        provider=provider,
        model=model,
        storage_path=str(storage_path),
        public_url=public_media_url(base_url, relative_url),
        mime_type=mime_type,
        width=width,
        height=height,
        fallback_used=fallback_used,
        generation_metadata=_compact_metadata(metadata),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def persist_generation_job(
    db: Session,
    *,
    job_type: str,
    status: str,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    provider: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> GenerationJob:
    record = GenerationJob(
        id=generate_id("job"),
        user_id=user_id,
        project_id=project_id,
        asset_id=asset_id,
        job_type=job_type,
        provider=provider,
        status=status,
        error=error,
        metadata_json=_compact_metadata(metadata),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
