from __future__ import annotations

import base64
import io
import json
import platform
import re
import ssl
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

import certifi
from fastapi import HTTPException
from PIL import Image

from config import settings


def _ocr_prompt(language: str) -> str:
    return (
        "Perform OCR on this design image. Return JSON only with keys text, language, and items. "
        "Each item must contain text, confidence (0..1), readingOrder, box {x,y,width,height} normalized "
        "to 0..1, polygon as normalized [x,y] points, and style {fontFamilyGuess,fontSizeRatio,fontWeight,"
        "fontStyle,textAlign,color,stroke,strokeWidth,backgroundColor,letterSpacing,lineHeight,rotation}. "
        "Estimate the visible text colour and preserve reading order, multiline text and rotation. "
        f"Requested language: {language}."
    )


def _extract_json(value: str) -> dict[str, Any]:
    candidate = value.strip()
    candidate = re.sub(r"^```(?:json)?\s*", "", candidate, flags=re.IGNORECASE)
    candidate = re.sub(r"\s*```$", "", candidate)
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("OCR provider returned no JSON object.")
    return json.loads(candidate[start:end + 1])


def _normalize_item(item: dict[str, Any], index: int) -> dict[str, Any] | None:
    text = str(item.get("text") or "").strip()
    if not text:
        return None
    box = item.get("box") or item.get("bbox") or {}
    if isinstance(box, list) and len(box) >= 4:
        box = {"x": box[0], "y": box[1], "width": box[2], "height": box[3]}
    if not isinstance(box, dict):
        box = {}

    def bounded(name: str, fallback: float) -> float:
        try:
            return max(0.0, min(1.0, float(box.get(name, fallback))))
        except (TypeError, ValueError):
            return fallback

    style = item.get("style") if isinstance(item.get("style"), dict) else {}
    polygon = item.get("polygon")
    if not isinstance(polygon, list) or len(polygon) < 3:
        x = bounded("x", 0.05)
        y = bounded("y", min(0.9, index * 0.08 + 0.05))
        width = max(0.01, bounded("width", 0.9))
        height = max(0.01, bounded("height", 0.06))
        polygon = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]
    normalized_polygon = []
    for point in polygon:
        if not isinstance(point, list) or len(point) < 2:
            continue
        try:
            normalized_polygon.append([
                max(0.0, min(1.0, float(point[0]))),
                max(0.0, min(1.0, float(point[1]))),
            ])
        except (TypeError, ValueError):
            continue

    return {
        "id": str(item.get("id") or f"ocr_{index + 1}"),
        "text": text,
        "confidence": max(0.0, min(1.0, float(item.get("confidence") or 0.75))),
        "box": {
            "x": bounded("x", 0.05),
            "y": bounded("y", min(0.9, index * 0.08 + 0.05)),
            "width": max(0.01, bounded("width", 0.9)),
            "height": max(0.01, bounded("height", 0.06)),
        },
        "polygon": normalized_polygon,
        "readingOrder": int(item.get("readingOrder") or index),
        "style": {
            "fontFamilyGuess": str(style.get("fontFamilyGuess") or "Inter"),
            "fontSizeRatio": max(0.01, min(0.5, float(style.get("fontSizeRatio") or 0.045))),
            "fontWeight": str(style.get("fontWeight") or "normal"),
            "fontStyle": str(style.get("fontStyle") or "normal"),
            "textAlign": str(style.get("textAlign") or "left"),
            "color": str(style.get("color") or "#ffffff"),
            "stroke": style.get("stroke"),
            "strokeWidth": max(0.0, float(style.get("strokeWidth") or 0)),
            "backgroundColor": style.get("backgroundColor"),
            "letterSpacing": float(style.get("letterSpacing") or 0),
            "lineHeight": max(0.5, min(3.0, float(style.get("lineHeight") or 1.2))),
            "rotation": float(style.get("rotation") or 0),
        },
    }


def parse_ocr_response(value: str) -> dict[str, Any]:
    payload = _extract_json(value)
    raw_items = payload.get("items") if isinstance(payload.get("items"), list) else []
    items = [normalized for index, item in enumerate(raw_items) if isinstance(item, dict) and (normalized := _normalize_item(item, index))]
    return {
        "text": str(payload.get("text") or "\n".join(item["text"] for item in items)).strip(),
        "items": items,
        "language": str(payload.get("language") or "und"),
    }


def _extract_with_gemini(payload: bytes, mime_type: str, language: str) -> dict[str, Any]:
    import google.generativeai as genai

    model_name = settings.OCR_MODEL or settings.GEMINI_MODEL
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(
        [
            _ocr_prompt(language),
            {"mime_type": mime_type, "data": base64.b64encode(payload).decode("ascii")},
        ],
        request_options={"timeout": settings.AI_IMAGE_TIMEOUT_SECONDS},
    )
    return {
        **parse_ocr_response(response.text or ""),
        "provider": "gemini",
        "model": model_name,
    }


def _extract_with_openai(payload: bytes, mime_type: str, language: str) -> dict[str, Any]:
    model_name = settings.OPENAI_CHAT_MODEL or settings.OPENAI_MODEL
    data_url = f"data:{mime_type};base64,{base64.b64encode(payload).decode('ascii')}"
    request_payload = json.dumps({
        "model": model_name,
        "input": [{
            "role": "user",
            "content": [
                {"type": "input_text", "text": _ocr_prompt(language)},
                {"type": "input_image", "image_url": data_url, "detail": "high"},
            ],
        }],
        "temperature": 0,
        "max_output_tokens": 4000,
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=request_payload,
        headers={
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(
        request,
        timeout=settings.AI_IMAGE_TIMEOUT_SECONDS,
        context=ssl.create_default_context(cafile=certifi.where()),
    ) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    output_text = ""
    for output_item in response_payload.get("output", []):
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content", []):
            if isinstance(content_item, dict) and content_item.get("type") == "output_text":
                output_text += str(content_item.get("text") or "")
    return {
        **parse_ocr_response(output_text),
        "provider": "openai",
        "model": model_name,
    }


def _estimate_text_colour(image: Image.Image, box: dict[str, Any]) -> str:
    left = max(0, round(float(box["x"]) * image.width))
    top = max(0, round(float(box["y"]) * image.height))
    right = min(image.width, round((float(box["x"]) + float(box["width"])) * image.width))
    bottom = min(image.height, round((float(box["y"]) + float(box["height"])) * image.height))
    if right <= left or bottom <= top:
        return "#ffffff"
    crop = image.crop((left, top, right, bottom)).convert("RGB")
    crop.thumbnail((160, 160), Image.Resampling.LANCZOS)
    colours = crop.quantize(colors=8).convert("RGB").getcolors(maxcolors=256) or []
    ranked = sorted(colours, reverse=True)
    if not ranked:
        return "#ffffff"
    background = ranked[0][1]
    candidates = [
        (count, colour)
        for count, colour in ranked[1:]
        if sum((colour[channel] - background[channel]) ** 2 for channel in range(3)) >= 3600
    ]
    if candidates:
        colour = max(candidates)[1]
    else:
        luminance = 0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2]
        colour = (255, 255, 255) if luminance < 128 else (0, 0, 0)
    return f"#{colour[0]:02x}{colour[1]:02x}{colour[2]:02x}"


def _apply_local_style_estimates(payload: bytes, result: dict[str, Any]) -> dict[str, Any]:
    image = Image.open(io.BytesIO(payload)).convert("RGB")
    for item in result.get("items", []):
        box = item.get("box") or {}
        style = item.setdefault("style", {})
        style["color"] = _estimate_text_colour(image, box)
        style["fontSizeRatio"] = max(0.01, min(0.5, float(box.get("height") or 0.06) * 0.78))
        style["fontWeight"] = "700" if float(box.get("height") or 0) >= 0.07 else "normal"
        centre = float(box.get("x") or 0) + float(box.get("width") or 0) / 2
        style["textAlign"] = "center" if 0.38 <= centre <= 0.62 else "left"
    return result


def _extract_with_apple_vision(payload: bytes, mime_type: str, language: str) -> dict[str, Any]:
    if platform.system() != "Darwin":
        raise RuntimeError("Apple Vision OCR is only available on macOS.")
    source_path = Path(__file__).resolve().parent.parent / "scripts" / "vision_ocr.m"
    binary_path = Path(tempfile.gettempdir()) / "teckstudio-vision-ocr"
    if not source_path.exists():
        raise RuntimeError("Apple Vision OCR source is missing.")
    if not binary_path.exists() or binary_path.stat().st_mtime < source_path.stat().st_mtime:
        cache_path = Path(tempfile.gettempdir()) / "teckstudio-clang-cache"
        cache_path.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "/usr/bin/clang",
                "-fobjc-arc",
                "-framework", "Foundation",
                "-framework", "AppKit",
                "-framework", "Vision",
                str(source_path),
                "-o", str(binary_path),
            ],
            capture_output=True,
            text=True,
            timeout=60,
            check=True,
            env={"CLANG_MODULE_CACHE_PATH": str(cache_path)},
        )
    suffix = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(mime_type, ".img")
    with tempfile.NamedTemporaryFile(suffix=suffix) as image_file:
        image_file.write(payload)
        image_file.flush()
        completed = subprocess.run(
            [str(binary_path), image_file.name, language],
            capture_output=True,
            text=True,
            timeout=max(15, settings.AI_IMAGE_TIMEOUT_SECONDS),
            check=True,
        )
    parsed = parse_ocr_response(completed.stdout)
    return {
        **_apply_local_style_estimates(payload, parsed),
        "provider": "apple-vision",
        "model": "VNRecognizeTextRequest",
    }


def _configured_providers() -> list[str]:
    providers = []
    for value in (settings.OCR_PROVIDER, settings.OCR_FALLBACK_PROVIDER):
        providers.extend(provider.strip().lower() for provider in value.split(","))
    return list(dict.fromkeys(provider for provider in providers if provider))


def extract_text_layout(payload: bytes, mime_type: str, language: str = "auto") -> dict[str, Any]:
    configured = False
    last_error: Exception | None = None
    for provider in _configured_providers():
        if provider in {"apple-vision", "vision", "local"}:
            configured = True
            try:
                return _extract_with_apple_vision(payload, mime_type, language)
            except Exception as error:
                last_error = error
        elif provider == "gemini" and settings.GEMINI_API_KEY.strip():
            configured = True
            try:
                return _extract_with_gemini(payload, mime_type, language)
            except Exception as error:
                last_error = error
        elif provider == "openai" and settings.OPENAI_API_KEY.strip():
            configured = True
            try:
                return _extract_with_openai(payload, mime_type, language)
            except Exception as error:
                last_error = error

    if not configured:
        raise HTTPException(
            status_code=503,
            detail="OCR is not configured. Enable local OCR or set a Gemini/OpenAI API key.",
        )
    raise HTTPException(
        status_code=502,
        detail="OCR providers failed. Verify model access or quota and retry.",
    ) from last_error
