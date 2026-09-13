import base64
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from auth import get_current_user
from config import resolve_runtime_path, settings
from database import ProcessedImage, User, get_db
from services.background_removal_service import remove_background_with_provider


router = APIRouter(prefix="/api/images", tags=["image-processing"])

MEDIA_ROOT = resolve_runtime_path(settings.MEDIA_ROOT) / "processed-images"
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _safe_filename(filename: Optional[str]) -> str:
    raw = Path(filename or "image.png").name
    safe = "".join(character for character in raw if character.isalnum() or character in {"-", "_", "."})
    return safe[:180] or "image.png"


async def _read_image(upload: UploadFile, field_name: str = "image") -> tuple[bytes, Image.Image]:
    if upload.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"{field_name} must be PNG, JPEG, or WebP.")
    payload = await upload.read(MAX_IMAGE_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=422, detail=f"{field_name} is empty.")
    if len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"{field_name} exceeds the 15 MB limit.")
    try:
        image = Image.open(io.BytesIO(payload))
        image.load()
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise HTTPException(status_code=413, detail=f"{field_name} dimensions are too large.")
        return payload, image.convert("RGBA")
    except UnidentifiedImageError as error:
        raise HTTPException(status_code=422, detail=f"{field_name} is not a valid image.") from error


def _png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    payload = output.getvalue()
    if not payload:
        raise HTTPException(status_code=502, detail="Image processing produced an empty result.")
    Image.open(io.BytesIO(payload)).verify()
    return payload


def _local_edge_matte(image: Image.Image) -> tuple[Image.Image, Image.Image, float]:
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    working = rgb.copy()
    marker = (1, 254, 1)
    threshold = 42
    corners = [(0, 0), (rgb.width - 1, 0), (0, rgb.height - 1), (rgb.width - 1, rgb.height - 1)]
    for point in corners:
        if working.getpixel(point) != marker:
            ImageDraw.floodfill(working, point, marker, thresh=threshold)

    marker_image = Image.new("RGB", working.size, marker)
    difference = ImageChops.difference(working, marker_image).convert("L")
    background = difference.point(lambda value: 255 if value == 0 else 0)
    foreground_alpha = ImageOps.invert(background).filter(ImageFilter.GaussianBlur(radius=1.2))
    foreground_ratio = sum(1 for value in foreground_alpha.resize((100, 100)).getdata() if value > 128) / 10_000
    if foreground_ratio < 0.04 or foreground_ratio > 0.96:
        raise HTTPException(
            status_code=422,
            detail="No clear foreground subject was detected. Try a photo with visible separation between the subject and background.",
        )
    cutout = rgba.copy()
    cutout.putalpha(foreground_alpha)
    confidence = round(1 - abs(0.55 - foreground_ratio), 3)
    return cutout, foreground_alpha, confidence


def _remove_bg_provider(payload: bytes) -> Optional[Image.Image]:
    return remove_background_with_provider(payload)


def _hex_color(value: str, fallback: str = "#8b5cf6") -> tuple[int, int, int, int]:
    candidate = value.strip().lstrip("#")
    if len(candidate) != 6:
        candidate = fallback.lstrip("#")
    try:
        return (
            int(candidate[0:2], 16),
            int(candidate[2:4], 16),
            int(candidate[4:6], 16),
            255,
        )
    except ValueError:
        return _hex_color(fallback, "#8b5cf6")


def _apply_person_effect(
    image: Image.Image,
    operation: str,
    color: str,
    width: int,
    blur: int,
    original: Optional[Image.Image] = None,
    background: Optional[Image.Image] = None,
) -> Image.Image:
    cutout = image.convert("RGBA")
    alpha = cutout.getchannel("A")
    if alpha.getextrema() == (255, 255) and operation not in {"posterize", "duotone"}:
        raise HTTPException(status_code=422, detail="A transparent person cutout is required for this effect. Remove the background first.")
    effect_color = _hex_color(color)
    safe_width = max(1, min(40, width))
    safe_blur = max(0, min(80, blur))

    if operation == "outline":
        kernel = min(81, safe_width * 2 + 1)
        if kernel % 2 == 0:
            kernel += 1
        expanded = alpha.filter(ImageFilter.MaxFilter(kernel))
        outline_alpha = ImageChops.subtract(expanded, alpha)
        outline = Image.new("RGBA", cutout.size, effect_color)
        outline.putalpha(outline_alpha)
        return Image.alpha_composite(outline, cutout)
    if operation == "glow":
        glow_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(2, safe_blur)))
        glow = Image.new("RGBA", cutout.size, effect_color)
        glow.putalpha(glow_alpha.point(lambda value: int(value * 0.75)))
        return Image.alpha_composite(glow, cutout)
    if operation == "shadow":
        shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(1, safe_blur)))
        shifted = Image.new("L", cutout.size, 0)
        shifted.paste(shadow_alpha, (safe_width, safe_width))
        shadow = Image.new("RGBA", cutout.size, effect_color)
        shadow.putalpha(shifted.point(lambda value: int(value * 0.65)))
        return Image.alpha_composite(shadow, cutout)
    if operation == "silhouette":
        silhouette = Image.new("RGBA", cutout.size, effect_color)
        silhouette.putalpha(alpha)
        return silhouette
    if operation == "posterize":
        posterized = ImageOps.posterize(cutout.convert("RGB"), 3).convert("RGBA")
        posterized.putalpha(alpha)
        return posterized
    if operation == "duotone":
        gray = ImageOps.grayscale(cutout)
        duo = ImageOps.colorize(gray, black="#111827", white=color).convert("RGBA")
        duo.putalpha(alpha)
        return duo
    if operation == "background-color":
        return Image.alpha_composite(Image.new("RGBA", cutout.size, effect_color), cutout)
    if operation == "background-gradient":
        top = _hex_color(color)
        bottom = (17, 24, 39, 255)
        gradient = Image.new("RGBA", cutout.size)
        pixels = gradient.load()
        for y in range(gradient.height):
            ratio = y / max(1, gradient.height - 1)
            row_color = tuple(round(top[index] * (1 - ratio) + bottom[index] * ratio) for index in range(4))
            for x in range(gradient.width):
                pixels[x, y] = row_color
        return Image.alpha_composite(gradient, cutout)
    if operation == "background-blur":
        if original is None:
            raise HTTPException(status_code=422, detail="The original image is required for background blur.")
        resized_original = ImageOps.fit(original.convert("RGBA"), cutout.size)
        blurred = resized_original.filter(ImageFilter.GaussianBlur(radius=max(4, safe_blur)))
        return Image.alpha_composite(blurred, cutout)
    if operation == "background-image":
        if background is None:
            raise HTTPException(status_code=422, detail="A replacement background image is required.")
        fitted = ImageOps.fit(background.convert("RGBA"), cutout.size)
        return Image.alpha_composite(fitted, cutout)
    raise HTTPException(status_code=422, detail="Unsupported image effect operation.")


def _persist_result(
    db: Session,
    user: User,
    original_payload: bytes,
    original_filename: str,
    processed: Image.Image,
    operation: str,
    provider: str,
    mask: Optional[Image.Image] = None,
    metadata: Optional[dict] = None,
) -> ProcessedImage:
    record_id = f"processed_{uuid.uuid4().hex}"
    directory = MEDIA_ROOT / user.id / record_id
    directory.mkdir(parents=True, exist_ok=True)
    original_path = directory / _safe_filename(original_filename)
    processed_path = directory / "processed.png"
    mask_path = directory / "mask.png" if mask is not None else None
    original_path.write_bytes(original_payload)
    processed_payload = _png_bytes(processed)
    processed_path.write_bytes(processed_payload)
    if mask_path is not None and mask is not None:
        mask_path.write_bytes(_png_bytes(mask.convert("L")))

    relative = f"/media/processed-images/{user.id}/{record_id}"
    record = ProcessedImage(
        id=record_id,
        user_id=user.id,
        operation=operation,
        provider=provider,
        original_filename=_safe_filename(original_filename),
        original_storage_path=str(original_path),
        processed_storage_path=str(processed_path),
        mask_storage_path=str(mask_path) if mask_path else None,
        original_url=f"{relative}/{original_path.name}",
        processed_url=f"{relative}/processed.png",
        mask_url=f"{relative}/mask.png" if mask_path else None,
        mime_type="image/png",
        width=processed.width,
        height=processed.height,
        metadata_json=metadata or {},
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _record_response(record: ProcessedImage) -> dict:
    return {
        "success": True,
        "result": {
            "id": record.id,
            "operation": record.operation,
            "provider": record.provider,
            "imageUrl": record.processed_url,
            "originalUrl": record.original_url,
            "maskUrl": record.mask_url,
            "mimeType": record.mime_type,
            "width": record.width,
            "height": record.height,
            "metadata": record.metadata_json or {},
        },
    }


@router.post("/remove-background")
async def remove_background(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload, decoded = await _read_image(image)
    provider_result = _remove_bg_provider(payload)
    if provider_result is not None:
        processed = ImageOps.fit(provider_result, decoded.size)
        mask = processed.getchannel("A")
        provider = "remove.bg"
        metadata = {"personDetection": "provider", "fallbackUsed": False}
    else:
        processed, mask, confidence = _local_edge_matte(decoded)
        provider = "local-edge-matte"
        metadata = {"personDetection": "foreground-edge-segmentation", "confidence": confidence, "fallbackUsed": True}
    record = _persist_result(
        db, current_user, payload, image.filename or "image.png", processed,
        "remove-background", provider, mask, metadata,
    )
    return _record_response(record)


@router.post("/person-mask")
async def person_mask(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload, decoded = await _read_image(image)
    processed, mask, confidence = _local_edge_matte(decoded)
    record = _persist_result(
        db, current_user, payload, image.filename or "image.png", processed,
        "person-mask", "local-edge-matte", mask,
        {"personDetection": "foreground-edge-segmentation", "confidence": confidence, "fallbackUsed": True},
    )
    return _record_response(record)


@router.post("/apply-effect")
async def apply_effect(
    image: UploadFile = File(...),
    operation: str = Form(...),
    color: str = Form("#8b5cf6"),
    width: int = Form(8),
    blur: int = Form(18),
    original_image: Optional[UploadFile] = File(None),
    background_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload, decoded = await _read_image(image)
    original = None
    if original_image is not None:
        _, original = await _read_image(original_image, "original_image")
    background = None
    if background_image is not None:
        _, background = await _read_image(background_image, "background_image")
    processed = _apply_person_effect(decoded, operation, color, width, blur, original, background)
    record = _persist_result(
        db, current_user, payload, image.filename or "image.png", processed,
        operation, "pillow", None,
        {"color": color, "width": width, "blur": blur, "fallbackUsed": False},
    )
    return _record_response(record)
