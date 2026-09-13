from __future__ import annotations

import io
import re
import shutil
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from config import resolve_runtime_path, settings
from database import Project, UploadedAsset, User


MEDIA_ROOT = resolve_runtime_path(settings.MEDIA_ROOT) / "uploads"
ALLOWED_FORMATS = {
    "PNG": ("image/png", ".png"),
    "JPEG": ("image/jpeg", ".jpg"),
    "WEBP": ("image/webp", ".webp"),
}
ALLOWED_DECLARED_TYPES = {mime for mime, _extension in ALLOWED_FORMATS.values()}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_IMAGE_MB * 1024 * 1024


@dataclass(frozen=True)
class PreparedImage:
    content: bytes
    thumbnail: bytes
    mime_type: str
    extension: str
    width: int
    height: int
    metadata: dict


def safe_filename(filename: Optional[str], extension: str) -> str:
    stem = Path(filename or "image").stem
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", stem).strip("._")[:160] or "image"
    return f"{cleaned}{extension}"


def _encode_image(image: Image.Image, image_format: str) -> bytes:
    output = io.BytesIO()
    if image_format == "JPEG":
        image.convert("RGB").save(output, format="JPEG", quality=92, optimize=True)
    elif image_format == "WEBP":
        image.save(output, format="WEBP", quality=92, method=4)
    else:
        image.save(output, format="PNG", optimize=True)
    payload = output.getvalue()
    if not payload:
        raise HTTPException(status_code=422, detail="The image could not be normalized.")
    return payload


def prepare_uploaded_image(
    payload: bytes,
    declared_type: Optional[str],
    original_filename: Optional[str] = None,
) -> PreparedImage:
    if not payload:
        raise HTTPException(status_code=422, detail="The selected image is empty.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"The selected image exceeds the {settings.MAX_UPLOAD_IMAGE_MB} MB limit.",
        )
    if declared_type and declared_type.lower() not in ALLOWED_DECLARED_TYPES:
        raise HTTPException(status_code=415, detail="Only PNG, JPG, JPEG, and WebP images are supported.")
    if original_filename:
        extension = Path(original_filename).suffix.lower()
        if extension not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise HTTPException(status_code=415, detail="The file extension must be PNG, JPG, JPEG, or WebP.")

    try:
        source = Image.open(io.BytesIO(payload))
        actual_format = (source.format or "").upper()
        if actual_format not in ALLOWED_FORMATS:
            raise HTTPException(status_code=415, detail="Only PNG, JPG, JPEG, and WebP images are supported.")
        source.load()
        if source.width <= 0 or source.height <= 0:
            raise HTTPException(status_code=422, detail="The image has invalid dimensions.")
        if source.width * source.height > settings.MAX_UPLOAD_IMAGE_PIXELS:
            raise HTTPException(status_code=413, detail="The image dimensions are too large.")

        normalized = ImageOps.exif_transpose(source)
        if normalized.mode not in {"RGB", "RGBA"}:
            normalized = normalized.convert("RGBA" if "A" in normalized.getbands() else "RGB")
        mime_type, extension = ALLOWED_FORMATS[actual_format]
        content = _encode_image(normalized, actual_format)

        thumbnail_image = normalized.copy()
        thumbnail_image.thumbnail(
            (settings.UPLOAD_THUMBNAIL_SIZE, settings.UPLOAD_THUMBNAIL_SIZE),
            Image.Resampling.LANCZOS,
        )
        thumbnail = _encode_image(thumbnail_image, "PNG")
        return PreparedImage(
            content=content,
            thumbnail=thumbnail,
            mime_type=mime_type,
            extension=extension,
            width=normalized.width,
            height=normalized.height,
            metadata={
                "sourceFormat": actual_format,
                "exifOrientationNormalized": True,
                "thumbnailWidth": thumbnail_image.width,
                "thumbnailHeight": thumbnail_image.height,
            },
        )
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail="The selected file is not a valid image or is corrupted.") from error


def ensure_owned_project(db: Session, user: User, project_id: Optional[str]) -> Optional[str]:
    if not project_id:
        return None
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project.id


def persist_uploaded_image(
    db: Session,
    *,
    user: User,
    project_id: Optional[str],
    original_filename: Optional[str],
    prepared: PreparedImage,
    asset_role: str = "upload",
    extra_metadata: Optional[dict] = None,
) -> UploadedAsset:
    asset_id = f"ua_{uuid.uuid4().hex}"
    directory = MEDIA_ROOT / user.id / asset_id
    filename = safe_filename(original_filename, prepared.extension)
    image_path = directory / filename
    thumbnail_path = directory / "thumbnail.png"
    directory.mkdir(parents=True, exist_ok=False)
    try:
        image_path.write_bytes(prepared.content)
        thumbnail_path.write_bytes(prepared.thumbnail)
        relative = f"/media/uploads/{user.id}/{asset_id}"
        record = UploadedAsset(
            id=asset_id,
            user_id=user.id,
            project_id=project_id,
            filename=filename,
            mime_type=prepared.mime_type,
            file_size=len(prepared.content),
            storage_path=str(image_path),
            public_url=f"{relative}/{filename}",
            width=prepared.width,
            height=prepared.height,
            thumbnail_storage_path=str(thumbnail_path),
            thumbnail_url=f"{relative}/thumbnail.png",
            metadata_json={
                **prepared.metadata,
                "originalFilename": original_filename or filename,
                "storedFilename": filename,
                "storageKey": f"uploads/{user.id}/{asset_id}/{filename}",
                **(extra_metadata or {}),
            },
            asset_role=asset_role,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        shutil.rmtree(directory, ignore_errors=True)
        raise


def persist_generated_png(
    db: Session,
    *,
    user: User,
    project_id: Optional[str],
    filename: str,
    image: Image.Image,
    metadata: Optional[dict] = None,
) -> UploadedAsset:
    output = io.BytesIO()
    image.convert("RGBA").save(output, format="PNG", optimize=True)
    prepared = prepare_uploaded_image(output.getvalue(), "image/png")
    return persist_uploaded_image(
        db,
        user=user,
        project_id=project_id,
        original_filename=filename,
        prepared=prepared,
        asset_role="poster-generated",
        extra_metadata=metadata,
    )


def delete_uploaded_image_files(record: UploadedAsset) -> None:
    storage_path = Path(record.storage_path)
    asset_directory = storage_path.parent
    if MEDIA_ROOT in asset_directory.parents:
        shutil.rmtree(asset_directory, ignore_errors=True)
