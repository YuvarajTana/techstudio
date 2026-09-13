from __future__ import annotations

"""
AI Image-Based Poster Generator - Complete Pipeline
Generates professional posters from text prompts with AI image generation.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from typing import Optional, List
from config import settings
import json
import base64
import io
import html
import re
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import ssl
import socket
import random
import uuid
import zipfile
import zlib
import xml.etree.ElementTree as ET
from textwrap import wrap
from datetime import datetime, timedelta
try:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    HAS_PIL = True
except Exception:
    Image = ImageDraw = ImageFont = ImageOps = None
    HAS_PIL = False

router = APIRouter(prefix="/api/ai-poster", tags=["ai-poster"])

# Cache
_response_cache = {}
_cache_ttl = timedelta(hours=1)

SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt"}
SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_IMAGE_BYTES = 12 * 1024 * 1024


def build_ssl_context() -> ssl.SSLContext:
    """Use certifi certificates when available to avoid local macOS CA issues."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def get_image_provider_order() -> list[str]:
    configured = (
        getattr(settings, "AI_PROVIDER_PRIORITY", "")
        or getattr(settings, "IMAGE_PROVIDER_ORDER", "openai,gemini,pollinations")
    )
    providers = [provider.strip().lower() for provider in configured.split(",") if provider.strip()]
    return providers or ["openai", "gemini", "pollinations"]


def get_image_provider_timeout() -> int:
    try:
        timeout = int(getattr(settings, "AI_IMAGE_TIMEOUT_SECONDS", 60))
    except (TypeError, ValueError):
        timeout = 60
    return max(10, min(timeout, 180))


_provider_health: dict[str, dict[str, object]] = {}


def normalize_provider_name(provider: str) -> str:
    provider = provider.lower().strip()
    if provider.startswith("gemini"):
        return "gemini"
    if provider.startswith("openai"):
        return "openai"
    if provider.startswith("pollinations"):
        return "pollinations"
    return provider


def record_provider_health(provider: str, available: bool, reason: str | None = None) -> None:
    _provider_health[normalize_provider_name(provider)] = {
        "available": available,
        "reason": None if available else reason,
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }


def get_provider_health_snapshot() -> dict[str, dict[str, object]]:
    return dict(_provider_health)


def aspect_ratio_for_provider(width: int, height: int) -> str:
    if height <= 0:
        return "1:1"
    ratio = width / height
    supported = {
        "1:1": 1.0,
        "16:9": 16 / 9,
        "9:16": 9 / 16,
        "4:5": 4 / 5,
        "5:4": 5 / 4,
        "3:2": 3 / 2,
        "2:3": 2 / 3,
    }
    return min(supported, key=lambda value: abs(supported[value] - ratio))


def categorize_provider_error(error: BaseException) -> str:
    """Map provider/network exceptions to user-actionable categories without exposing secrets."""
    if isinstance(error, urllib.error.HTTPError):
        detail = ""
        try:
            body = error.read().decode("utf-8", errors="replace")
            payload = json.loads(body)
            provider_error = payload.get("error", payload)
            detail = " ".join(
                str(provider_error.get(field, ""))
                for field in ("type", "code", "message")
            ).lower()
        except Exception:
            detail = ""
        if "quota" in detail or "rate_limit" in detail or "too many" in detail:
            return "quota_or_rate_limit"
        if "billing" in detail or "payment" in detail or "hard_limit" in detail:
            return "billing_required"
        if "model" in detail and ("not found" in detail or "unsupported" in detail or "access" in detail):
            return "model_access_or_config"
        if "invalid" in detail or "bad request" in detail:
            return "invalid_request"
        if error.code in {401, 403}:
            return "auth_error"
        if error.code == 402:
            return "billing_required"
        if error.code == 429:
            return "quota_or_rate_limit"
        if error.code in {408, 504}:
            return "timeout"
        if 500 <= error.code <= 599:
            return "provider_server_error"
        return "provider_http_error"
    if isinstance(error, TimeoutError) or isinstance(error, socket.timeout):
        return "timeout"
    if isinstance(error, urllib.error.URLError):
        reason = str(error.reason).lower()
        if "timed out" in reason or "timeout" in reason:
            return "timeout"
        if "ssl" in reason or "certificate" in reason:
            return "network_or_ssl_error"
        return "network_or_ssl_error"
    if isinstance(error, ssl.SSLError):
        return "network_or_ssl_error"
    return "network_or_ssl_error"


def log_provider_attempt(
    provider: str,
    status: str,
    *,
    http_status: int | None = None,
    mime_type: str | None = None,
    validation: str | None = None,
    failure_category: str | None = None,
    error: str | None = None,
    started_at: float | None = None,
) -> None:
    elapsed_ms = int((time.time() - started_at) * 1000) if started_at else None
    safe_error = type(error).__name__ if isinstance(error, BaseException) else truncate_text(str(error), 80) if error else None
    print(json.dumps({
        "event": "ai_image_provider_attempt",
        "provider": provider,
        "status": status,
        "httpStatus": http_status,
        "mimeType": mime_type,
        "validation": validation,
        "failureCategory": failure_category,
        "error": safe_error,
        "elapsedMs": elapsed_ms,
    }))


def image_result_metadata(image_result: dict, width: int, height: int) -> dict:
    source = image_result.get("source", "unknown")
    url = image_result.get("url", "")
    if url.startswith("data:"):
        mime_type = url.split(";", 1)[0].replace("data:", "")
        image_data = url
        image_url = None
    else:
        mime_type = image_result.get("mime_type") or image_result.get("mimeType") or "image/jpeg"
        image_data = None
        image_url = url or None

    fallback_used = source in {"local", "local-svg"}
    production_quality = bool(image_url or image_data) and not fallback_used and mime_type in {"image/png", "image/jpeg", "image/jpg", "image/webp"}

    return {
        "source": source,
        "mime_type": mime_type,
        "fallback_used": fallback_used,
        "production_quality": production_quality,
        "fallback_reason": "All configured external image providers failed" if fallback_used else None,
        "result": {
            "imageUrl": image_url,
            "imageData": image_data,
            "mimeType": mime_type,
            "width": image_result.get("width", width),
            "height": image_result.get("height", height),
        },
    }


def get_file_extension(filename: str) -> str:
    return f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def truncate_text(value: str, limit: int = 260) -> str:
    value = clean_text(value)
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."


def data_url_from_bytes(content: bytes, mime_type: str) -> str:
    return f"data:{mime_type};base64,{base64.b64encode(content).decode('utf-8')}"


def validate_image_bytes(content: bytes, mime_type: str) -> tuple[int, int]:
    if not content:
        raise ValueError("Provider returned an empty image")
    if not mime_type.startswith("image/"):
        raise ValueError(f"Provider returned invalid content type: {mime_type}")
    if mime_type == "image/svg+xml":
        return 0, 0
    if not HAS_PIL:
        return 0, 0
    with Image.open(io.BytesIO(content)) as image:
        image.verify()
        return image.size


def load_image_from_source(source: str) -> Image.Image | None:
    if not HAS_PIL:
        return None
    try:
        if source.startswith("data:"):
            _, encoded = source.split(",", 1)
            raw = base64.b64decode(encoded)
        elif source.startswith("http://") or source.startswith("https://"):
            with urllib.request.urlopen(source, timeout=20) as response:
                raw = response.read()
        else:
            return None
        return Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception as exc:
        print(f"Image load error: {exc}")
        return None


def extract_text_from_txt(content: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except Exception:
            continue
    return ""


def extract_text_from_docx(content: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            xml_content = archive.read("word/document.xml")
    except Exception as exc:
        print(f"DOCX parse error: {exc}")
        return ""

    try:
        root = ET.fromstring(xml_content)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs: list[str] = []
        for paragraph in root.findall(".//w:p", namespace):
            parts = [node.text for node in paragraph.findall(".//w:t", namespace) if node.text]
            text = clean_text("".join(parts))
            if text:
                paragraphs.append(text)
        return "\n".join(paragraphs)
    except Exception as exc:
        print(f"DOCX xml error: {exc}")
        return ""


def extract_text_from_pdf(content: bytes) -> str:
    text_chunks: list[str] = []
    raw_text = ""
    try:
        raw_text = content.decode("latin-1", errors="ignore")
    except Exception:
        raw_text = ""

    # Try to capture text from uncompressed or lightly compressed PDFs.
    streams = re.findall(rb"stream\s*(.*?)\s*endstream", content, re.S)
    for stream in streams:
        decoded_stream = stream
        try:
            decoded_stream = zlib.decompress(stream)
        except Exception:
            pass

        try:
            stream_text = decoded_stream.decode("latin-1", errors="ignore")
        except Exception:
            continue

        for match in re.findall(r"\(([^)]{2,})\)\s*T[Jj]", stream_text):
            cleaned = clean_text(match)
            if cleaned:
                text_chunks.append(cleaned)

    if not text_chunks:
        for match in re.findall(r"\(([^\)]{8,})\)", raw_text):
            cleaned = clean_text(match)
            if cleaned:
                text_chunks.append(cleaned)

    return "\n".join(text_chunks)


def extract_text_from_document(filename: str, content: bytes) -> str:
    extension = get_file_extension(filename)
    if extension == ".txt":
        return extract_text_from_txt(content)
    if extension == ".docx":
        return extract_text_from_docx(content)
    if extension == ".pdf":
        return extract_text_from_pdf(content)
    return ""


def summarize_uploaded_images(image_items: list[dict]) -> tuple[list[dict], str]:
    summaries: list[dict] = []
    notes: list[str] = []
    for index, item in enumerate(image_items[:4], start=1):
        image = load_image_from_source(item["data_url"])
        if image is None:
            summaries.append({
                "name": item["name"],
                "data_url": item["data_url"],
                "summary": "Reference image",
            })
            notes.append(f"Reference image {index}: {item['name']}")
            continue

        resized = image.resize((24, 24))
        pixels = list(resized.getdata())
        if pixels:
            avg_r = sum(pixel[0] for pixel in pixels) // len(pixels)
            avg_g = sum(pixel[1] for pixel in pixels) // len(pixels)
            avg_b = sum(pixel[2] for pixel in pixels) // len(pixels)
            dominant = f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}"
        else:
            dominant = "#6366f1"
        summaries.append({
            "name": item["name"],
            "data_url": item["data_url"],
            "summary": f"Dominant color {dominant}",
        })
        notes.append(f"Reference image {index}: {item['name']} with dominant color {dominant}")

    return summaries, "\n".join(notes)


def summarize_document_context(text: str, filename: str) -> str:
    cleaned = clean_text(text)
    if not cleaned:
        return f"{filename}: no extractable text"
    bullets = re.split(r"[\n•\-\u2022]+", cleaned)
    snippets = [truncate_text(part, 90) for part in bullets if clean_text(part)]
    if not snippets:
        snippets = [truncate_text(cleaned, 120)]
    return f"{filename}: " + "; ".join(snippets[:4])


def build_attachment_context(document_texts: list[dict], image_items: list[dict]) -> dict:
    document_summaries = []
    context_parts = []
    for doc in document_texts:
        name = doc.get("name", "document")
        text = doc.get("text")
        if text is None and doc.get("content") is not None:
            text = extract_text_from_document(name, doc["content"])
        summary = summarize_document_context(text or "", name)
        document_summaries.append({
            "name": name,
            "summary": summary,
        })
        context_parts.append(summary)

    image_summaries, image_context = summarize_uploaded_images(image_items)
    if image_context:
        context_parts.append(image_context)

    return {
        "document_summaries": document_summaries,
        "image_summaries": image_summaries,
        "attachment_context": "\n".join(context_parts).strip(),
    }


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = clean_text(text).split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def fit_image_box(image: Image.Image, box_size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, box_size, method=Image.Resampling.LANCZOS)


def get_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    font_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_path in font_candidates:
        try:
            return ImageFont.truetype(font_path, size=size)
        except Exception:
            continue
    return ImageFont.load_default()


def render_poster_preview(
    design: dict,
    hero_image_url: str,
    width: int,
    height: int,
    attachment_context: dict | None = None,
) -> str:
    attachment_context = attachment_context or {}
    bg_color = design.get("bg_color", "#0a0a0a")
    primary = design.get("primary_color", "#8b5cf6")
    secondary = design.get("secondary_color", "#ffffff")
    accent = design.get("accent_color", primary)
    heading = design.get("heading", "YOUR TITLE")
    subtitle = design.get("subtitle", "Subtitle here")
    body_text = attachment_context.get("body_text") or design.get("body_text") or "Create a bold, readable poster with a strong visual hierarchy."
    reference_images = attachment_context.get("image_summaries", [])

    if not HAS_PIL:
        def esc(value: object) -> str:
            return html.escape(str(value), quote=True)

        body_lines = wrap(clean_text(body_text), 54)[:5]
        refs = "".join(
            f'<rect x="{48 + index * 166}" y="540" width="144" height="144" rx="18" fill="#111827" fill-opacity="0.9" stroke="#334155" stroke-opacity="0.7" />'
            for index, item in enumerate(reference_images[:3])
        )
        ref_labels = "".join(
            f'<text x="{48 + index * 166}" y="{706}" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">{esc(truncate_text(item.get("name", "Reference"), 18))}</text>'
            for index, item in enumerate(reference_images[:3])
        )
        body_svg = "".join(
            f'<text x="48" y="{680 + (line_index * 28)}" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="22">{esc(line)}</text>'
            for line_index, line in enumerate(body_lines)
        )
        svg = f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="{esc(bg_color)}"/>
              <stop offset="100%" stop-color="#09090b"/>
            </linearGradient>
            <linearGradient id="hero" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="{esc(primary)}" stop-opacity="0.65"/>
              <stop offset="100%" stop-color="{esc(accent)}" stop-opacity="0.65"/>
            </linearGradient>
          </defs>
          <rect width="{width}" height="{height}" fill="url(#bg)"/>
          <rect x="{int(width * 0.08)}" y="{int(height * 0.06)}" width="{int(width * 0.84)}" height="{int(height * 0.42)}" rx="28" fill="url(#hero)" opacity="0.85"/>
          <rect x="0" y="{int(height * 0.47)}" width="{width}" height="{int(height * 0.53)}" fill="#09090b" fill-opacity="0.92"/>
          <rect x="{int(width * 0.08)}" y="{int(height * 0.56)}" width="{int(width * 0.15)}" height="6" rx="3" fill="{esc(accent)}"/>
          <text x="{int(width * 0.08)}" y="{int(height * 0.64)}" fill="{esc(secondary)}" font-family="Arial, sans-serif" font-size="{max(34, min(width // 12, 76))}" font-weight="700">{esc(heading)}</text>
          <text x="{int(width * 0.08)}" y="{int(height * 0.73)}" fill="{esc(primary)}" font-family="Arial, sans-serif" font-size="{max(18, min(width // 28, 28))}">{esc(subtitle)}</text>
          {body_svg}
          <rect x="{int(width * 0.08)}" y="{int(height * 0.83)}" width="{int(width * 0.26)}" height="50" rx="25" fill="{esc(accent)}"/>
          <text x="{int(width * 0.08) + int(width * 0.13)}" y="{int(height * 0.83) + 32}" fill="#ffffff" font-family="Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle">LEARN MORE</text>
          {refs}
          {ref_labels}
          <text x="{int(width * 0.08)}" y="{height - 24}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="12" font-weight="700">TECKSTUDIO AI POSTER</text>
        </svg>
        """
        return data_url_from_bytes(svg.encode("utf-8"), "image/svg+xml")

    poster = Image.new("RGBA", (width, height), bg_color)
    draw = ImageDraw.Draw(poster)

    # Background gradients and subtle shapes.
    for y in range(height):
        ratio = y / max(height - 1, 1)
        overlay = (
            int(int(bg_color[1:3], 16) * (1 - ratio) + 15 * ratio),
            int(int(bg_color[3:5], 16) * (1 - ratio) + 23 * ratio),
            int(int(bg_color[5:7], 16) * (1 - ratio) + 42 * ratio),
        )
        draw.line([(0, y), (width, y)], fill=overlay)

    hero_box = (int(width * 0.08), int(height * 0.06), int(width * 0.92), int(height * 0.48))
    hero_image = load_image_from_source(hero_image_url)
    if hero_image is not None:
        poster.paste(fit_image_box(hero_image, (hero_box[2] - hero_box[0], hero_box[3] - hero_box[1])), hero_box[:2])
    else:
        gradient = Image.new("RGBA", (hero_box[2] - hero_box[0], hero_box[3] - hero_box[1]), primary)
        gdraw = ImageDraw.Draw(gradient)
        for y in range(gradient.height):
            mix = y / max(gradient.height - 1, 1)
            gdraw.line([(0, y), (gradient.width, y)], fill=(
                int(15 + 80 * mix),
                int(23 + 30 * mix),
                int(42 + 100 * mix),
            ))
        poster.paste(gradient, hero_box[:2])
        draw.ellipse((hero_box[0] + int((hero_box[2] - hero_box[0]) * 0.55), hero_box[1] - 18, hero_box[2] + 70, hero_box[1] + 70), fill=(0, 0, 0, 0))

    # Overlay for text readability.
    overlay_top = int(height * 0.47)
    draw.rectangle((0, overlay_top, width, height), fill=(9, 9, 11, 232))
    draw.rounded_rectangle((int(width * 0.08), int(height * 0.05), int(width * 0.92), int(height * 0.48)), radius=28, outline=(255, 255, 255, 30), width=2)

    # Title hierarchy.
    title_font = get_font(max(34, min(width // 12, 76)), bold=True)
    subtitle_font = get_font(max(18, min(width // 28, 28)), bold=False)
    body_font = get_font(max(14, min(width // 38, 22)), bold=False)
    label_font = get_font(14, bold=True)

    title_x = int(width * 0.08)
    title_y = int(height * 0.57)
    draw.rectangle((title_x, title_y - 18, title_x + int(width * 0.15), title_y - 12), fill=accent)
    draw.text((title_x, title_y), heading, font=title_font, fill=secondary)
    draw.text((title_x, title_y + int(title_font.size * 1.15)), subtitle, font=subtitle_font, fill=primary)

    body_lines = wrap_text(draw, body_text, body_font, int(width * 0.84))
    body_y = title_y + int(title_font.size * 1.9)
    for line in body_lines[:5]:
        draw.text((title_x, body_y), line, font=body_font, fill=(220, 225, 233))
        body_y += int(body_font.size * 1.4)

    # CTA
    cta_y = int(height * 0.83)
    cta_w = int(width * 0.26)
    cta_h = 50
    draw.rounded_rectangle((title_x, cta_y, title_x + cta_w, cta_y + cta_h), radius=cta_h // 2, fill=accent)
    draw.text((title_x + 24, cta_y + 15), "LEARN MORE", font=label_font, fill="#ffffff")

    # Reference thumbnails.
    if reference_images:
        thumb_y = int(height * 0.72)
        thumb_size = int(width * 0.16)
        thumb_gap = 14
        current_x = title_x + cta_w + 22
        for item in reference_images[:3]:
            ref_image = load_image_from_source(item["data_url"])
            if ref_image is None:
                continue
            thumb = fit_image_box(ref_image, (thumb_size, thumb_size))
            poster.paste(thumb, (current_x, thumb_y))
            draw.rounded_rectangle((current_x, thumb_y, current_x + thumb_size, thumb_y + thumb_size), radius=16, outline=(255, 255, 255, 30), width=2)
            draw.text((current_x, thumb_y + thumb_size + 6), truncate_text(item["name"], 18), font=label_font, fill=(180, 188, 200))
            current_x += thumb_size + thumb_gap

    # Footer branding.
    draw.text((title_x, height - 34), "TECKSTUDIO AI POSTER", font=get_font(12, bold=True), fill=(148, 163, 184))

    buffer = io.BytesIO()
    poster.convert("RGB").save(buffer, format="PNG", optimize=True)
    return data_url_from_bytes(buffer.getvalue(), "image/png")


# ─── Models ─────────────────────────────────────────────────────

class PosterGenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "auto"
    width: Optional[int] = 1080
    height: Optional[int] = 1080


class PosterGenerateResponse(BaseModel):
    success: bool
    image_url: str
    poster_url: Optional[str] = None
    design: dict
    message: str
    attachment_summary: Optional[str] = None
    provider: Optional[str] = None
    fallback_used: Optional[bool] = False
    variations: Optional[list[dict]] = None


# ─── Prompt Analysis Engine ─────────────────────────────────────

def analyze_prompt(prompt: str) -> dict:
    """Deep analyze the prompt to extract all design parameters."""
    p = prompt.lower().strip()

    # 1. Detect Industry/Theme
    theme_map = {
        'luxury': {'primary': '#ffd700', 'secondary': '#ffffff', 'accent': '#b8860b', 'bg': '#1a1a1a', 'mood': 'luxury', 'layout': 'minimal', 'font': 'serif'},
        'fashion': {'primary': '#ec4899', 'secondary': '#ffffff', 'accent': '#f472b6', 'bg': '#1a0015', 'mood': 'elegant', 'layout': 'split', 'font': 'display'},
        'tech': {'primary': '#00c8ff', 'secondary': '#ffffff', 'accent': '#64ffda', 'bg': '#0a192f', 'mood': 'modern', 'layout': 'center', 'font': 'sans-serif'},
        'startup': {'primary': '#6366f1', 'secondary': '#ffffff', 'accent': '#a5b4fc', 'bg': '#0f172a', 'mood': 'professional', 'layout': 'center', 'font': 'sans-serif'},
        'fitness': {'primary': '#ef4444', 'secondary': '#ffffff', 'accent': '#f97316', 'bg': '#0a0a0a', 'mood': 'bold', 'layout': 'dramatic', 'font': 'sans-serif'},
        'gym': {'primary': '#ef4444', 'secondary': '#ffffff', 'accent': '#f97316', 'bg': '#0a0a0a', 'mood': 'bold', 'layout': 'dramatic', 'font': 'sans-serif'},
        'food': {'primary': '#d4a574', 'secondary': '#fff8f0', 'accent': '#8b5c3a', 'bg': '#2c1810', 'mood': 'warm', 'layout': 'center', 'font': 'serif'},
        'restaurant': {'primary': '#ffd700', 'secondary': '#ffffff', 'accent': '#c9a227', 'bg': '#1a1a1a', 'mood': 'luxury', 'layout': 'center', 'font': 'serif'},
        'wedding': {'primary': '#d4a574', 'secondary': '#1a1a1a', 'accent': '#f5e6d3', 'bg': '#fff8f0', 'mood': 'romantic', 'layout': 'center', 'font': 'script'},
        'movie': {'primary': '#ffd700', 'secondary': '#ffffff', 'accent': '#b8860b', 'bg': '#0a0a0a', 'mood': 'dramatic', 'layout': 'dramatic', 'font': 'display'},
        'music': {'primary': '#a855f7', 'secondary': '#ffffff', 'accent': '#e879f9', 'bg': '#1a002a', 'mood': 'energetic', 'layout': 'center', 'font': 'display'},
        'sale': {'primary': '#ef4444', 'secondary': '#ffffff', 'accent': '#f97316', 'bg': '#1a0000', 'mood': 'urgent', 'layout': 'bold', 'font': 'sans-serif'},
        'discount': {'primary': '#ef4444', 'secondary': '#ffffff', 'accent': '#f97316', 'bg': '#1a0000', 'mood': 'urgent', 'layout': 'bold', 'font': 'sans-serif'},
        'party': {'primary': '#ff00ff', 'secondary': '#ffffff', 'accent': '#00ffff', 'bg': '#1a002a', 'mood': 'fun', 'layout': 'center', 'font': 'display'},
        'event': {'primary': '#a855f7', 'secondary': '#ffffff', 'accent': '#e879f9', 'bg': '#1a002a', 'mood': 'elegant', 'layout': 'center', 'font': 'serif'},
        'nature': {'primary': '#22c55e', 'secondary': '#ffffff', 'accent': '#86efac', 'bg': '#0f2419', 'mood': 'calm', 'layout': 'center', 'font': 'sans-serif'},
        'travel': {'primary': '#22c55e', 'secondary': '#ffffff', 'accent': '#86efac', 'bg': '#0f2419', 'mood': 'adventurous', 'layout': 'center', 'font': 'sans-serif'},
        'sports': {'primary': '#f97316', 'secondary': '#ffffff', 'accent': '#eab308', 'bg': '#0a0a0a', 'mood': 'bold', 'layout': 'dramatic', 'font': 'sans-serif'},
        'education': {'primary': '#f59e0b', 'secondary': '#ffffff', 'accent': '#fbbf24', 'bg': '#1e3a5f', 'mood': 'professional', 'layout': 'center', 'font': 'sans-serif'},
        'real estate': {'primary': '#22c55e', 'secondary': '#ffffff', 'accent': '#86efac', 'bg': '#0f1f0f', 'mood': 'professional', 'layout': 'split', 'font': 'sans-serif'},
        'beauty': {'primary': '#ff69b4', 'secondary': '#1a1a1a', 'accent': '#db2777', 'bg': '#fff0f5', 'mood': 'elegant', 'layout': 'center', 'font': 'script'},
        'spa': {'primary': '#38bdf8', 'secondary': '#ffffff', 'accent': '#bae6fd', 'bg': '#0a192f', 'mood': 'calm', 'layout': 'minimal', 'font': 'serif'},
        'coffee': {'primary': '#d4a574', 'secondary': '#f5e6d3', 'accent': '#8b5c3a', 'bg': '#2c1810', 'mood': 'warm', 'layout': 'center', 'font': 'serif'},
        'cafe': {'primary': '#d4a574', 'secondary': '#f5e6d3', 'accent': '#8b5c3a', 'bg': '#2c1810', 'mood': 'warm', 'layout': 'center', 'font': 'serif'},
        'minimal': {'primary': '#1a1a1a', 'secondary': '#ffffff', 'accent': '#666666', 'bg': '#ffffff', 'mood': 'clean', 'layout': 'minimal', 'font': 'sans-serif'},
        'modern': {'primary': '#6366f1', 'secondary': '#ffffff', 'accent': '#a5b4fc', 'bg': '#0f172a', 'mood': 'professional', 'layout': 'center', 'font': 'sans-serif'},
        'elegant': {'primary': '#ffd700', 'secondary': '#ffffff', 'accent': '#b8860b', 'bg': '#1a1a1a', 'mood': 'luxury', 'layout': 'minimal', 'font': 'serif'},
        'bold': {'primary': '#ef4444', 'secondary': '#ffffff', 'accent': '#f97316', 'bg': '#0a0a0a', 'mood': 'bold', 'layout': 'dramatic', 'font': 'sans-serif'},
    }

    theme = theme_map['tech']  # default
    for key, val in theme_map.items():
        if key in p:
            theme = val
            break

    # 2. Detect Colors
    color_map = {
        'red': '#ef4444', 'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#eab308',
        'purple': '#8b5cf6', 'pink': '#ec4899', 'orange': '#f97316', 'gold': '#ffd700',
        'cyan': '#06b6d4', 'navy': '#1e3a5f', 'black': '#1a1a1a', 'white': '#ffffff',
        'teal': '#14b8a6', 'coral': '#ff6b6b', 'lime': '#84cc16', 'silver': '#c0c0c0',
        'maroon': '#800000', 'indigo': '#4f46e5', 'violet': '#8b5cf6', 'magenta': '#ff00ff',
    }
    for color_name, hex_val in color_map.items():
        if color_name in p:
            theme['primary'] = hex_val
            break

    # 3. Extract Heading (quoted text)
    quote_match = re.search(r'["\'](.+?)["\']', prompt)
    heading = quote_match.group(1).upper() if quote_match else ''

    if not heading:
        # Generate heading from prompt
        words = prompt.split()
        if len(words) <= 4:
            heading = prompt.upper()
        else:
            heading = ' '.join(words[:3]).upper()

    # 4. Generate subtitle from prompt context
    subtitle = generate_subtitle(prompt, theme['mood'])

    # 5. Generate detailed image prompt for AI
    image_prompt = generate_image_prompt(prompt, theme)

    return {
        "heading": heading,
        "subtitle": subtitle,
        "image_prompt": image_prompt,
        "bg_color": theme['bg'],
        "primary_color": theme['primary'],
        "secondary_color": theme['secondary'],
        "accent_color": theme['accent'],
        "mood": theme['mood'],
        "layout": theme['layout'],
        "font": theme['font'],
    }


def generate_subtitle(prompt: str, mood: str) -> str:
    """Generate a context-aware subtitle."""
    p = prompt.lower()

    # Check for price/discount
    price_match = re.search(r'(\d+)%\s*(?:off|discount|sale)', p)
    if price_match:
        return f"UP TO {price_match.group(1)}% OFF"

    dollar_match = re.search(r'\$(\d+)', p)
    if dollar_match:
        return f"Starting at ${dollar_match.group(1)}"

    # Check for date
    date_match = re.search(r'(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})', p)
    if date_match:
        return f"{date_match.group(1)}/{date_match.group(2)}/{date_match.group(3)}"

    # Mood-based subtitles
    mood_subtitles = {
        'luxury': 'Exclusive Collection',
        'elegant': 'Timeless Sophistication',
        'bold': 'Make A Statement',
        'modern': 'The Future Is Here',
        'warm': 'Welcome',
        'calm': 'Find Your Peace',
        'romantic': 'Save The Date',
        'dramatic': 'Coming Soon',
        'fun': 'Let\'s Celebrate',
        'professional': 'Excellence Redefined',
        'urgent': 'Limited Time Only',
        'adventurous': 'Explore Now',
        'clean': 'Less Is More',
        'energetic': 'Feel The Energy',
    }
    return mood_subtitles.get(mood, 'Premium Quality')


def generate_image_prompt(prompt: str, theme: dict) -> str:
    """Generate a detailed image generation prompt."""
    mood = theme['mood']
    bg = theme['bg']

    style_map = {
        'luxury': 'luxurious, opulent, gold accents, premium quality, sophisticated',
        'elegant': 'elegant, refined, graceful, tasteful, upscale',
        'bold': 'bold, striking, powerful, impactful, dynamic',
        'modern': 'modern, sleek, contemporary, cutting-edge, futuristic',
        'warm': 'warm, inviting, cozy, comfortable, friendly',
        'calm': 'serene, peaceful, tranquil, zen, relaxing',
        'romantic': 'romantic, soft, dreamy, delicate, intimate',
        'dramatic': 'dramatic, cinematic, intense, powerful, epic',
        'fun': 'fun, playful, vibrant, colorful, lively',
        'professional': 'professional, corporate, clean, polished, business',
        'urgent': 'urgent, attention-grabbing, exciting, dynamic, sale',
        'adventurous': 'adventurous, exciting, dynamic, outdoor, exploration',
        'clean': 'minimalist, clean, simple, white space, modern',
        'energetic': 'energetic, vibrant, dynamic, exciting, powerful',
    }

    style_desc = style_map.get(mood, 'professional, high quality')

    # Build detailed image prompt
    image_prompt = f"{prompt}. {style_desc} style. Professional photography, high resolution, 8K quality, sharp details, perfect lighting."

    return image_prompt


# ─── Image Generation ──────────────────────────────────────────

def generate_image(prompt: str, width: int = 1024, height: int = 1024) -> dict:
    """Generate an image using configured production providers only."""
    failures: list[dict] = []
    for provider in get_image_provider_order():
        if provider == "openai" and settings.OPENAI_API_KEY:
            result = generate_image_openai(prompt, width, height)
            if result.get("success"):
                record_provider_health("openai", True)
                return result
            category = result.get("error_category", "unavailable")
            record_provider_health("openai", False, category)
            failures.append({"provider": "openai", "category": category})
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            result = generate_image_gemini(prompt, width, height)
            if result.get("success"):
                record_provider_health("gemini", True)
                return result
            category = result.get("error_category", "unavailable")
            record_provider_health("gemini", False, category)
            failures.append({"provider": "gemini", "category": category})
        elif provider == "stability" and getattr(settings, "STABILITY_API_KEY", ""):
            result = generate_image_stability(prompt, width, height)
            if result.get("success"):
                record_provider_health("stability", True)
                return result
            category = result.get("error_category", "unavailable")
            record_provider_health("stability", False, category)
            failures.append({"provider": "stability", "category": category})
        elif provider == "pollinations":
            result = generate_image_pollinations(prompt, width, height)
            if result.get("success"):
                record_provider_health("pollinations", True)
                return result
            category = result.get("error_category", "unavailable")
            record_provider_health("pollinations", False, category)
            failures.append({"provider": "pollinations", "category": category})

    return {"success": False, "error": "No production image provider returned an image", "provider_failures": failures}


def generate_image_openai(prompt: str, width: int, height: int) -> dict:
    """Generate image using OpenAI API."""
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return {"success": False, "error": "No API key"}

    # Determine size
    if width > height:
        size = "1536x1024"
    elif height > width:
        size = "1024x1536"
    else:
        size = "1024x1024"

    url = "https://api.openai.com/v1/images/generations"
    payload = json.dumps({
        "model": getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1"),
        "prompt": prompt,
        "n": 1,
        "size": size,
        "quality": "high"
    }).encode('utf-8')

    started_at = time.time()
    log_provider_attempt("openai", "request_started", started_at=started_at)
    try:
        req = urllib.request.Request(url, data=payload, headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        })
        ctx = build_ssl_context()
        with urllib.request.urlopen(req, timeout=get_image_provider_timeout(), context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'data' in result and len(result['data']) > 0:
                data = result['data'][0]
                if 'b64_json' in data:
                    log_provider_attempt("openai", "request_completed", http_status=response.status, mime_type="image/png", validation="valid_image_data", started_at=started_at)
                    return {"success": True, "url": f"data:image/png;base64,{data['b64_json']}", "source": f"openai:{getattr(settings, 'OPENAI_IMAGE_MODEL', 'gpt-image-1')}"}
                elif 'url' in data:
                    log_provider_attempt("openai", "request_completed", http_status=response.status, mime_type="image/url", validation="valid_image_url", started_at=started_at)
                    return {"success": True, "url": data['url'], "source": f"openai:{getattr(settings, 'OPENAI_IMAGE_MODEL', 'gpt-image-1')}", "mime_type": "image/png"}
    except Exception as e:
        category = categorize_provider_error(e)
        log_provider_attempt("openai", "request_failed", failure_category=category, error=e, started_at=started_at)
        print(f"OpenAI image request failed ({type(e).__name__})")

    return {"success": False, "error_category": category if 'category' in locals() else "invalid_response"}


def generate_image_gemini(prompt: str, width: int, height: int) -> dict:
    """Generate image using Gemini image models when GEMINI_API_KEY is configured."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {"success": False, "error": "No API key"}

    model = getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = json.dumps({
        "contents": [{
            "parts": [{
                "text": (
                    f"{prompt}\n\n"
                    f"Render as a complete image at approximately {width}x{height}. "
                    "Return image output, not text-only instructions."
                )
            }]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        }
    }).encode("utf-8")

    started_at = time.time()
    log_provider_attempt("gemini-image", "request_started", started_at=started_at)
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=get_image_provider_timeout(), context=build_ssl_context()) as response:
            result = json.loads(response.read().decode("utf-8"))
            parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            for part in parts:
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and inline_data.get("data"):
                    mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
                    log_provider_attempt("gemini-image", "request_completed", http_status=response.status, mime_type=mime_type, validation="valid_image_data", started_at=started_at)
                    return {
                        "success": True,
                        "url": f"data:{mime_type};base64,{inline_data['data']}",
                        "source": f"gemini:{model}",
                        "width": width,
                        "height": height,
                    }
    except Exception as e:
        category = categorize_provider_error(e)
        log_provider_attempt("gemini-image", "request_failed", failure_category=category, error=e, started_at=started_at)
        print(f"Gemini image request failed ({type(e).__name__})")

    return {"success": False, "error_category": category if 'category' in locals() else "invalid_response"}


def generate_image_stability(prompt: str, width: int, height: int) -> dict:
    """Generate image using Stability AI when STABILITY_API_KEY is configured."""
    api_key = getattr(settings, "STABILITY_API_KEY", "")
    if not api_key:
        return {"success": False, "error": "No API key"}

    boundary = f"----teckstudio-{uuid.uuid4().hex}"
    fields = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio_for_provider(width, height),
        "output_format": "png",
    }
    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(str(value).encode("utf-8"))
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    started_at = time.time()
    log_provider_attempt("stability", "request_started", started_at=started_at)
    try:
        req = urllib.request.Request(
            "https://api.stability.ai/v2beta/stable-image/generate/core",
            data=bytes(body),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Accept": "image/*",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "TeckStudio/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=get_image_provider_timeout(), context=build_ssl_context()) as response:
            content = response.read()
            content_type = response.headers.get("Content-Type", "image/png")
            if response.status in {200, 201} and content_type.startswith("image/"):
                encoded = base64.b64encode(content).decode("utf-8")
                log_provider_attempt("stability", "request_completed", http_status=response.status, mime_type=content_type, validation="valid_image_data", started_at=started_at)
                return {
                    "success": True,
                    "url": f"data:{content_type};base64,{encoded}",
                    "source": "stability:core",
                    "width": width,
                    "height": height,
                }
    except Exception as e:
        category = categorize_provider_error(e)
        log_provider_attempt("stability", "request_failed", failure_category=category, error=e, started_at=started_at)
        print(f"Stability image request failed ({type(e).__name__})")

    return {"success": False, "error_category": category if 'category' in locals() else "invalid_response"}


def build_poster_body_text(prompt: str, attachment_context: dict | None) -> str:
    attachment_context = attachment_context or {}
    document_summaries = attachment_context.get("document_summaries", [])
    if document_summaries:
        first_summary = document_summaries[0]["summary"]
        return truncate_text(first_summary, 220)

    prompt_sentence = re.split(r"[.!?]\s+", clean_text(prompt))
    if len(prompt_sentence) > 1:
        return truncate_text(" ".join(prompt_sentence[1:]), 220)

    return truncate_text(
        "Combine bold typography, balanced spacing, and a strong call to action for a polished professional poster.",
        220,
    )


def build_attachment_enhanced_prompt(prompt: str, design: dict, attachment_context: dict | None) -> str:
    attachment_context = attachment_context or {}
    parts = [
        f"Poster request: {prompt}",
        f"Style: {design.get('mood', 'professional')}",
        f"Tone: {design.get('theme_name', 'custom')}",
        f"Title: {design.get('heading', '')}",
        f"Subtitle: {design.get('subtitle', '')}",
    ]

    context_text = attachment_context.get("attachment_context", "")
    if context_text:
        parts.append("Reference context:")
        parts.append(context_text)

    parts.append(
        "Create a polished, production-ready poster with a clear title, subtitle, body copy, CTA, strong hierarchy, ample whitespace, and modern composition."
    )
    parts.append("Prioritize readable typography, elegant spacing, and a professional editorial layout.")
    return "\n".join(part for part in parts if part).strip()


def derive_prompt_title(prompt: str) -> str:
    """Create a concise prompt-derived poster label for metadata/local fallback only."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s-]", " ", prompt)
    words = [
        word.upper()
        for word in cleaned.split()
        if len(word) > 2 and word.lower() not in {
            "the", "and", "with", "for", "create", "poster", "image", "based", "user",
            "input", "invoke", "generation", "visual", "representation", "description",
        }
    ]
    if not words:
        return "CUSTOM POSTER"
    return " ".join(words[:4])


def extract_user_request_from_provider_prompt(prompt: str) -> str:
    match = re.search(r"User poster request:\s*(.+?)(?:\n[A-Z][A-Za-z /-]+:|\Z)", prompt, re.S)
    if match:
        return clean_text(match.group(1))
    return clean_text(prompt)


def pollinations_poster_prompt_candidates(prompt: str) -> list[str]:
    user_prompt = extract_user_request_from_provider_prompt(prompt)
    candidates = [
        (
            f"Finished professional poster artwork: {user_prompt}. "
            "Recognizable subjects, complete scene, dynamic composition, polished commercial illustration, no UI mockup, no prompt text."
        ),
        (
            f"Professional poster illustration: {user_prompt}. "
            "Clear main subjects, balanced composition, polished graphic design, clean negative space, no watermark."
        ),
    ]
    deduped: list[str] = []
    for candidate in candidates:
        value = truncate_text(candidate, 700)
        if value and value not in deduped:
            deduped.append(value)
    return deduped


def build_complete_poster_image_prompt(
    prompt: str,
    style: str,
    aspect_ratio: str,
    width: int,
    height: int,
    attachment_context: dict | None,
    negative_prompt: str = "",
    quality: str = "high",
) -> str:
    """Build a provider prompt that asks for one finished poster image, not a canvas template."""
    attachment_context = attachment_context or {}
    parts = [
        "Generate one complete finished poster image as the final output.",
        "The output must be a graphic poster image, not JSON, not UI, not a design template, not separated canvas objects.",
        f"User poster request: {prompt.strip()}",
        f"Style direction: {style or 'auto'}",
        f"Canvas/aspect: {width}x{height}, {aspect_ratio}",
        f"Quality: {quality or 'high'}",
        "Use the exact subject, action, mood, colors, typography, composition, and visual details requested by the user.",
        "Show recognizable subjects and scene details as actual visual artwork, not symbolic replacements.",
        "Integrate poster typography into the artwork only when appropriate to the user's request.",
        "Use balanced layout, strong hierarchy, clean margins, professional graphic design, and print-ready composition.",
        "Do not use generic movie-template titles, release-date filler, CTA button labels, platform branding, placeholder text, random buttons, unrelated startup templates, or repeated stock layouts.",
        "Avoid abstract circles replacing characters, geometric placeholders, prompt text printed as body copy, wireframes, diagrams, watermarks, and UI mockups.",
    ]
    context_text = attachment_context.get("attachment_context", "")
    if context_text:
        parts.extend([
            "Use these uploaded/reference details when relevant:",
            context_text,
        ])
    if negative_prompt.strip():
        parts.append(f"Negative prompt / avoid: {negative_prompt.strip()}")
    return "\n".join(part for part in parts if part).strip()


def generate_poster_artifact(
    prompt: str,
    width: int,
    height: int,
    style: str = "auto",
    aspect_ratio: str = "1:1",
    document_attachments: Optional[list[dict]] = None,
    image_attachments: Optional[list[dict]] = None,
    negative_prompt: str = "",
    quality: str = "high",
    output_count: int = 1,
) -> dict:
    document_attachments = document_attachments or []
    image_attachments = image_attachments or []
    attachment_context = build_attachment_context(document_attachments, image_attachments)

    image_prompt = build_complete_poster_image_prompt(
        prompt=prompt,
        style=style,
        aspect_ratio=aspect_ratio,
        width=width,
        height=height,
        attachment_context=attachment_context,
        negative_prompt=negative_prompt,
        quality=quality,
    )

    count = max(1, min(int(output_count or 1), 4))
    variations: list[dict] = []
    for index in range(count):
        provider_prompt = image_prompt if index == 0 else f"{image_prompt}\nVariation {index + 1}: keep the same request but change composition, color balance, and visual arrangement."
        image_result = generate_image(provider_prompt, width, height)
        image_url = image_result.get("url", "")
        if image_url:
            metadata = image_result_metadata(image_result, width, height)
            if metadata["fallback_used"] or not metadata["production_quality"]:
                continue
            variations.append({
                "index": index,
                "image_url": image_url,
                "poster_url": image_url,
                "provider": image_result.get("source", "unknown"),
                "seed": image_result.get("seed"),
                "source": metadata["source"],
                "mimeType": metadata["mime_type"],
                "fallbackUsed": metadata["fallback_used"],
                "productionQuality": metadata["production_quality"],
                "result": metadata["result"],
            })

    if not variations:
        return {
            "success": False,
            "image_url": "",
            "poster_url": "",
            "design": {
                "prompt": prompt,
                "image_prompt": image_prompt,
                "style": style,
                "aspect_ratio": aspect_ratio,
                "width": width,
                "height": height,
                "attachment_context": attachment_context,
            },
            "message": "No real AI image provider returned a production-quality poster image",
            "attachment_summary": attachment_context.get("attachment_context", ""),
            "provider": "none",
            "source": "none",
            "productionQuality": False,
            "fallbackUsed": False,
            "fallbackReason": "All configured real image providers failed or were unavailable",
            "providerFailures": image_result.get("provider_failures", []) if 'image_result' in locals() else [],
            "result": {
                "imageUrl": None,
                "imageData": None,
                "mimeType": None,
                "width": width,
                "height": height,
            },
            "fallback_used": False,
            "variations": [],
        }

    primary = variations[0]
    provider = primary.get("provider", "unknown")
    fallback_used = bool(primary.get("fallbackUsed"))
    production_quality = bool(primary.get("productionQuality"))
    fallback_reason = "All configured external image providers failed" if fallback_used else None
    design = {
        "prompt": prompt,
        "title": derive_prompt_title(prompt),
        "style": style,
        "aspect_ratio": aspect_ratio,
        "width": width,
        "height": height,
        "quality": quality,
        "negative_prompt": negative_prompt,
        "image_prompt": image_prompt,
        "attachment_context": attachment_context,
        "editable_as": "single_image_layer",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "provider": provider,
        "fallback_used": fallback_used,
        "source": primary.get("source", provider),
        "productionQuality": production_quality,
        "fallbackReason": fallback_reason,
    }

    return {
        "success": True,
        "image_url": primary["image_url"],
        "poster_url": primary["poster_url"],
        "design": design,
        "message": f"Poster image generated with {provider}",
        "attachment_summary": attachment_context.get("attachment_context", ""),
        "provider": provider,
        "source": primary.get("source", provider),
        "productionQuality": production_quality,
        "fallbackUsed": fallback_used,
        "fallbackReason": fallback_reason,
        "result": primary.get("result"),
        "fallback_used": fallback_used,
        "variations": variations,
    }


def generate_image_pollinations(prompt: str, width: int, height: int) -> dict:
    """Generate image using Pollinations AI API."""
    seed = random.randint(1, 999999)
    last_category = "invalid_response"
    for attempt, pollinations_prompt in enumerate(pollinations_poster_prompt_candidates(prompt), start=1):
        encoded = urllib.parse.quote(pollinations_prompt)
        attempt_seed = seed + attempt - 1
        url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&seed={attempt_seed}&nologo=true&model=flux"

        started_at = time.time()
        log_provider_attempt("pollinations", "request_started", started_at=started_at)
        try:
            ctx = build_ssl_context()
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            })
            with urllib.request.urlopen(req, timeout=get_image_provider_timeout(), context=ctx) as response:
                if response.status == 200:
                    content_type = response.headers.get('Content-Type', '')
                    if 'image' in content_type:
                        image_bytes = response.read()
                        decoded_width, decoded_height = validate_image_bytes(image_bytes, content_type)
                        image_data = data_url_from_bytes(image_bytes, content_type)
                        log_provider_attempt("pollinations", "request_completed", http_status=response.status, mime_type=content_type, validation="valid_image_data", started_at=started_at)
                        return {
                            "success": True,
                            "url": image_data,
                            "provider_url": url,
                            "source": "pollinations:flux",
                            "mime_type": content_type,
                            "seed": attempt_seed,
                            "width": decoded_width or width,
                            "height": decoded_height or height,
                        }
                    log_provider_attempt("pollinations", "request_failed", http_status=response.status, mime_type=content_type, validation="invalid_mime_type", failure_category="invalid_response", started_at=started_at)
        except Exception as e:
            last_category = categorize_provider_error(e)
            log_provider_attempt("pollinations", "request_failed", failure_category=last_category, error=e, started_at=started_at)
            print(f"Pollinations image attempt {attempt} failed ({type(e).__name__})")

    return {"success": False, "error_category": last_category}


def generate_image_picsum(prompt: str, width: int, height: int) -> dict:
    """Generate a themed placeholder locally using deterministic seed."""
    # Create seed from prompt for consistency
    seed = int(hashlib.md5(prompt.encode()).hexdigest()[:8], 16) % 999999
    return generate_local_placeholder_image(prompt, width, height, seed)


def generate_local_placeholder_image(prompt: str, width: int, height: int, seed: int) -> dict:
    """Create a deterministic prompt-specific SVG poster when external providers are unavailable."""
    user_prompt = extract_user_request_from_provider_prompt(prompt)
    title = html.escape(derive_prompt_title(user_prompt))
    lower_prompt = user_prompt.lower()
    is_stick_combat = "stick" in lower_prompt and any(word in lower_prompt for word in ("martial", "combat", "fight", "kick", "punch"))
    is_stick_basketball = "stick" in lower_prompt and any(word in lower_prompt for word in ("basketball", "dunk", "sports"))
    escaped_prompt = html.escape(clean_text(user_prompt)[:180])
    wrapped_prompt = wrap(escaped_prompt, width=max(18, width // 28))
    caption_lines = "".join(
        f'<text x="{int(width * 0.08)}" y="{int(height * 0.82) + index * 30}" fill="#475569" font-family="Arial, sans-serif" font-size="{max(16, width // 42)}">{line}</text>'
        for index, line in enumerate(wrapped_prompt[:3])
    )
    if is_stick_basketball:
        visual = f"""
        <g stroke="#111827" stroke-width="{max(8, width // 95)}" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <circle cx="{int(width * 0.46)}" cy="{int(height * 0.31)}" r="{int(width * 0.045)}"/>
          <line x1="{int(width * 0.46)}" y1="{int(height * 0.36)}" x2="{int(width * 0.52)}" y2="{int(height * 0.52)}"/>
          <line x1="{int(width * 0.49)}" y1="{int(height * 0.41)}" x2="{int(width * 0.64)}" y2="{int(height * 0.28)}"/>
          <line x1="{int(width * 0.49)}" y1="{int(height * 0.42)}" x2="{int(width * 0.35)}" y2="{int(height * 0.34)}"/>
          <line x1="{int(width * 0.52)}" y1="{int(height * 0.52)}" x2="{int(width * 0.39)}" y2="{int(height * 0.67)}"/>
          <line x1="{int(width * 0.52)}" y1="{int(height * 0.52)}" x2="{int(width * 0.67)}" y2="{int(height * 0.61)}"/>
        </g>
        <circle cx="{int(width * 0.68)}" cy="{int(height * 0.24)}" r="{int(width * 0.045)}" fill="#f97316" stroke="#111827" stroke-width="4"/>
        <g stroke="#111827" stroke-width="5" fill="none" opacity="0.7">
          <path d="M {int(width * 0.70)} {int(height * 0.18)} h {int(width * 0.14)} v {int(height * 0.10)} h -{int(width * 0.14)} z"/>
          <path d="M {int(width * 0.70)} {int(height * 0.28)} c {int(width * 0.04)} {int(height * 0.06)}, {int(width * 0.10)} {int(height * 0.06)}, {int(width * 0.14)} 0"/>
        </g>
        <g stroke="#f97316" stroke-width="{max(4, width // 160)}" stroke-linecap="round" opacity="0.85">
          <line x1="{int(width * 0.30)}" y1="{int(height * 0.33)}" x2="{int(width * 0.20)}" y2="{int(height * 0.27)}"/>
          <line x1="{int(width * 0.34)}" y1="{int(height * 0.48)}" x2="{int(width * 0.22)}" y2="{int(height * 0.48)}"/>
          <line x1="{int(width * 0.40)}" y1="{int(height * 0.62)}" x2="{int(width * 0.30)}" y2="{int(height * 0.70)}"/>
        </g>
        <ellipse cx="{int(width * 0.50)}" cy="{int(height * 0.72)}" rx="{int(width * 0.18)}" ry="{int(height * 0.035)}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" opacity="0.95"/>
        """
    elif is_stick_combat:
        visual = f"""
        <g stroke="#111827" stroke-width="{max(8, width // 100)}" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <circle cx="{int(width * 0.33)}" cy="{int(height * 0.38)}" r="{int(width * 0.045)}"/>
          <line x1="{int(width * 0.33)}" y1="{int(height * 0.43)}" x2="{int(width * 0.39)}" y2="{int(height * 0.55)}"/>
          <line x1="{int(width * 0.37)}" y1="{int(height * 0.47)}" x2="{int(width * 0.52)}" y2="{int(height * 0.43)}"/>
          <line x1="{int(width * 0.39)}" y1="{int(height * 0.55)}" x2="{int(width * 0.27)}" y2="{int(height * 0.68)}"/>
          <line x1="{int(width * 0.39)}" y1="{int(height * 0.55)}" x2="{int(width * 0.53)}" y2="{int(height * 0.62)}"/>
          <circle cx="{int(width * 0.67)}" cy="{int(height * 0.38)}" r="{int(width * 0.045)}"/>
          <line x1="{int(width * 0.67)}" y1="{int(height * 0.43)}" x2="{int(width * 0.60)}" y2="{int(height * 0.55)}"/>
          <line x1="{int(width * 0.62)}" y1="{int(height * 0.47)}" x2="{int(width * 0.49)}" y2="{int(height * 0.41)}"/>
          <line x1="{int(width * 0.60)}" y1="{int(height * 0.55)}" x2="{int(width * 0.48)}" y2="{int(height * 0.68)}"/>
          <line x1="{int(width * 0.60)}" y1="{int(height * 0.55)}" x2="{int(width * 0.74)}" y2="{int(height * 0.60)}"/>
        </g>
        <g stroke="#f97316" stroke-width="{max(4, width // 170)}" stroke-linecap="round" opacity="0.9">
          <line x1="{int(width * 0.48)}" y1="{int(height * 0.36)}" x2="{int(width * 0.40)}" y2="{int(height * 0.29)}"/>
          <line x1="{int(width * 0.52)}" y1="{int(height * 0.48)}" x2="{int(width * 0.64)}" y2="{int(height * 0.50)}"/>
          <line x1="{int(width * 0.50)}" y1="{int(height * 0.57)}" x2="{int(width * 0.41)}" y2="{int(height * 0.62)}"/>
        </g>
        <g fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" opacity="0.95">
          <ellipse cx="{int(width * 0.34)}" cy="{int(height * 0.71)}" rx="{int(width * 0.10)}" ry="{int(height * 0.028)}"/>
          <ellipse cx="{int(width * 0.63)}" cy="{int(height * 0.70)}" rx="{int(width * 0.11)}" ry="{int(height * 0.03)}"/>
        </g>
        """
    else:
        visual = f"""
        <circle cx="{int(width * 0.73)}" cy="{int(height * 0.33)}" r="{max(70, min(width, height) // 7)}" fill="#8b5cf6" opacity="0.20"/>
        <rect x="{int(width * 0.14)}" y="{int(height * 0.31)}" width="{int(width * 0.72)}" height="{int(height * 0.28)}" rx="36" fill="#ffffff" stroke="#111827" stroke-width="6"/>
        <path d="M {int(width * 0.18)} {int(height * 0.55)} C {int(width * 0.36)} {int(height * 0.38)}, {int(width * 0.56)} {int(height * 0.72)}, {int(width * 0.82)} {int(height * 0.42)}" fill="none" stroke="#8b5cf6" stroke-width="{max(8, width // 90)}" stroke-linecap="round"/>
        <circle cx="{int(width * 0.28)}" cy="{int(height * 0.42)}" r="{int(width * 0.045)}" fill="#f97316"/>
        <circle cx="{int(width * 0.58)}" cy="{int(height * 0.47)}" r="{int(width * 0.055)}" fill="#22c55e"/>
        """
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#111827" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="{width}" height="{height}" fill="url(#bg)"/>
      <rect x="{int(width * 0.06)}" y="{int(height * 0.06)}" width="{int(width * 0.88)}" height="{int(height * 0.88)}" rx="34" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
      <rect x="{int(width * 0.08)}" y="{int(height * 0.10)}" width="{int(width * 0.18)}" height="8" fill="url(#accent)"/>
      <text x="{int(width * 0.08)}" y="{int(height * 0.18)}" fill="#0f172a" font-family="Arial Black, Arial, sans-serif" font-size="{max(32, width // 13)}" font-weight="900">{title}</text>
      {visual}
      <rect x="{int(width * 0.08)}" y="{int(height * 0.75)}" width="{int(width * 0.84)}" height="2" fill="#e2e8f0"/>
      {caption_lines}
      <text x="{int(width * 0.08)}" y="{height - 42}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="16">local prompt-specific render · seed:{seed}</text>
    </svg>
    """.strip()
    encoded = base64.b64encode(svg.encode("utf-8")).decode("utf-8")

    return {
        "success": True,
        "url": f"data:image/svg+xml;base64,{encoded}",
        "source": "local-svg",
        "seed": seed,
    }


# ─── Poster Composition ─────────────────────────────────────────

def build_poster(design: dict, image_url: str, width: int, height: int) -> dict:
    """Build complete poster data for Fabric.js canvas."""
    bg = design['bg_color']
    primary = design['primary_color']
    secondary = design['secondary_color']
    accent = design['accent_color']
    heading = design['heading']
    subtitle = design['subtitle']
    layout = design['layout']

    elements = []

    # 1. Background
    elements.append({
        "type": "rect",
        "left": 0, "top": 0,
        "width": width, "height": height,
        "fill": bg,
        "selectable": False
    })

    # 2. AI Generated Image (main visual - 55% of poster)
    img_w = int(width * 0.88)
    img_h = int(height * 0.52)
    img_x = int((width - img_w) / 2)
    img_y = int(height * 0.04)

    elements.append({
        "type": "image",
        "left": img_x, "top": img_y,
        "width": img_w, "height": img_h,
        "src": image_url,
        "selectable": True,
        "rx": 20, "ry": 20
    })

    # 3. Gradient overlay for text readability
    elements.append({
        "type": "rect",
        "left": 0, "top": int(height * 0.46),
        "width": width, "height": int(height * 0.54),
        "fill": bg,
        "opacity": 0.90,
        "selectable": False
    })

    # 4. Accent line
    elements.append({
        "type": "rect",
        "left": int(width * 0.08), "top": int(height * 0.56),
        "width": int(width * 0.12), "height": 5,
        "fill": accent,
        "rx": 3, "ry": 3,
        "selectable": False
    })

    # 5. Main heading
    heading_size = min(int(width * 0.075), 72)
    elements.append({
        "type": "textbox",
        "left": int(width * 0.08), "top": int(height * 0.60),
        "width": int(width * 0.84),
        "text": heading,
        "fontSize": heading_size,
        "fontWeight": "bold",
        "fill": secondary,
        "fontFamily": "Outfit",
        "textAlign": "left",
        "lineHeight": 1.1,
        "selectable": True
    })

    # 6. Subtitle
    subtitle_size = min(int(width * 0.03), 24)
    elements.append({
        "type": "textbox",
        "left": int(width * 0.08), "top": int(height * 0.74),
        "width": int(width * 0.84),
        "text": subtitle,
        "fontSize": subtitle_size,
        "fill": primary,
        "fontFamily": "Outfit",
        "textAlign": "left",
        "selectable": True
    })

    # 7. CTA Button
    cta_w = int(width * 0.26)
    cta_h = 48
    cta_y = int(height * 0.84)

    elements.append({
        "type": "rect",
        "left": int(width * 0.08), "top": cta_y,
        "width": cta_w, "height": cta_h,
        "fill": accent,
        "rx": cta_h / 2, "ry": cta_h / 2,
        "selectable": False
    })
    elements.append({
        "type": "textbox",
        "left": int(width * 0.08), "top": cta_y + 13,
        "width": cta_w,
        "text": "LEARN MORE",
        "fontSize": 14, "fontWeight": "bold",
        "fill": "#ffffff",
        "fontFamily": "Outfit",
        "textAlign": "center",
        "selectable": False
    })

    # 8. Decorative elements
    elements.append({
        "type": "circle",
        "left": int(width * 0.82), "top": int(height * 0.02),
        "radius": int(width * 0.12),
        "fill": primary, "opacity": 0.06,
        "selectable": False
    })
    elements.append({
        "type": "circle",
        "left": int(width * 0.88), "top": int(height * 0.92),
        "radius": int(width * 0.05),
        "fill": accent, "opacity": 0.10,
        "selectable": False
    })

    # 9. Branding
    elements.append({
        "type": "textbox",
        "left": int(width * 0.08), "top": int(height * 0.94),
        "width": int(width * 0.3),
        "text": "TECKSTUDIO",
        "fontSize": 9,
        "fill": secondary, "opacity": 0.25,
        "fontFamily": "Outfit",
        "selectable": False
    })

    return {
        "background": bg,
        "width": width,
        "height": height,
        "elements": elements
    }


# ─── API Endpoint ───────────────────────────────────────────────

@router.post("/generate", response_model=PosterGenerateResponse)
async def generate_ai_poster(request: Request):
    """
    Generate a complete professional poster from a single prompt.

    Workflow:
    1. Analyze prompt → extract design parameters
    2. Generate AI image
    3. Compose professional poster
    4. Return complete editable poster
    """
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        prompt = str(form.get("prompt", "")).strip().strip('"')
        width = int(form.get("width") or 1080)
        height = int(form.get("height") or 1080)
        style = str(form.get("style") or "auto")
        aspect_ratio = str(form.get("aspect_ratio") or "1:1")
        negative_prompt = str(form.get("negative_prompt") or "")
        quality = str(form.get("quality") or "high")
        output_count = int(form.get("output_count") or 1)
    else:
        body = await request.json()
        req = PosterGenerateRequest(**body)
        prompt = req.prompt.strip()
        width = req.width
        height = req.height
        style = req.style
        aspect_ratio = "1:1"
        negative_prompt = ""
        quality = "high"
        output_count = 1

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    print("[AI Poster] Generating poster request")
    result = generate_poster_artifact(
        prompt=prompt,
        width=width,
        height=height,
        style=style,
        aspect_ratio=aspect_ratio,
        negative_prompt=negative_prompt,
        quality=quality,
        output_count=output_count,
    )
    if not result.get("success") or not result.get("image_url"):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AI_IMAGE_PROVIDERS_UNAVAILABLE",
                "message": result.get("message") or "Real AI poster generation is currently unavailable",
                "retryable": True,
            },
        )
    print("[AI Poster] Poster ready")
    return PosterGenerateResponse(
        success=True,
        image_url=result["image_url"],
        poster_url=result.get("poster_url"),
        design=result["design"],
        message=result["message"],
        attachment_summary=result.get("attachment_summary"),
        provider=result.get("provider"),
        fallback_used=result.get("fallback_used"),
        variations=result.get("variations"),
    )


@router.post("/analyze")
async def analyze_prompt_only(req: PosterGenerateRequest):
    """Analyze prompt without generating image."""
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    design = analyze_prompt(prompt)
    return {"success": True, "design": design}
