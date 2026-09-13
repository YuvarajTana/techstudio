from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from config import ENV_LOADED, ENV_OVERRIDE_ENABLED, ENV_PATH, key_fingerprint, settings
from auth import get_current_user
from database import ChatMessage, ChatSession, User, get_db
from persistence import generate_id, persist_generated_asset, persist_generation_job, persist_uploaded_asset, read_image_bytes
from routes.ai_poster import (
    generate_poster_artifact,
    get_provider_health_snapshot as get_poster_provider_health_snapshot,
)
import json
import os
import base64
import html
import io
import re
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import ssl
import socket
import uuid
from textwrap import wrap
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Cache for Gemini responses (in-memory cache with TTL)
_response_cache = {}
_cache_ttl = timedelta(hours=1)


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


def get_chat_provider_order() -> list[str]:
    configured = getattr(settings, "AI_CHAT_PROVIDER_PRIORITY", "gemini,openai,pollinations")
    providers = [provider.strip().lower() for provider in configured.split(",") if provider.strip()]
    return providers or ["gemini", "openai", "pollinations"]


def get_chat_model(provider: str, requested_model: str | None = None) -> str | None:
    """Resolve chat model from request/env without exposing provider-specific details to callers."""
    requested = clean_chat_text(requested_model or "", 120)
    if requested:
        return requested
    normalized = normalize_provider_name(provider.replace(":text", ""))
    if normalized == "openai":
        return (
            getattr(settings, "OPENAI_CHAT_MODEL", "")
            or getattr(settings, "OPENAI_MODEL", "")
            or "gpt-4o-mini"
        )
    if normalized == "gemini":
        return getattr(settings, "GEMINI_MODEL", "") or "gemini-2.0-flash"
    if normalized == "pollinations":
        return "pollinations-text"
    return None


def normalize_requested_chat_provider(provider: str | None) -> str:
    requested = (provider or "").strip().lower()
    if requested in {"", "auto", "default"}:
        return ""
    if requested in {"openai", "gemini", "pollinations", "pollinations:text"}:
        return "pollinations" if requested == "pollinations:text" else requested
    return ""


_provider_health: dict[str, dict[str, object]] = {}
_chat_provider_health: dict[str, dict[str, object]] = {}
_chat_provider_last_error: dict[str, str] = {}
CHAT_RETRYABLE_FAILURES = {
    "rate_limited",
    "quota_or_rate_limit",
    "timeout",
    "network_error",
    "network_or_ssl_error",
    "provider_5xx",
    "provider_server_error",
    "provider_unavailable",
}


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


def record_chat_provider_health(provider: str, available: bool, reason: str | None = None) -> None:
    _chat_provider_health[normalize_provider_name(provider.replace(":text", ""))] = {
        "available": available,
        "reason": None if available else reason,
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }


def record_last_chat_provider_error(provider: str, reason: str) -> None:
    _chat_provider_last_error[normalize_provider_name(provider.replace(":text", ""))] = reason


def clear_last_chat_provider_error(provider: str) -> None:
    _chat_provider_last_error.pop(normalize_provider_name(provider.replace(":text", "")), None)


def get_last_chat_provider_error(provider: str) -> str | None:
    return _chat_provider_last_error.get(normalize_provider_name(provider.replace(":text", "")))


def provider_configured(provider: str) -> bool:
    if provider == "openai":
        return bool(settings.OPENAI_API_KEY)
    if provider == "gemini":
        return bool(settings.GEMINI_API_KEY)
    if provider == "pollinations":
        return bool(getattr(settings, "ENABLE_POLLINATIONS_FALLBACK", True))
    if provider == "stability":
        return bool(getattr(settings, "STABILITY_API_KEY", ""))
    return False


def provider_key_fingerprint(provider: str) -> str | None:
    if provider == "openai":
        return key_fingerprint(settings.OPENAI_API_KEY)
    if provider == "gemini":
        return key_fingerprint(settings.GEMINI_API_KEY)
    return None


def merge_provider_health() -> dict[str, dict[str, object]]:
    merged: dict[str, dict[str, object]] = {}
    for source in (get_poster_provider_health_snapshot(), _provider_health):
        for provider, health in source.items():
            previous = merged.get(provider)
            if not previous or str(health.get("checked_at") or "") >= str(previous.get("checked_at") or ""):
                merged[provider] = health
    return merged


def provider_health_payload() -> dict[str, dict[str, object]]:
    merged = merge_provider_health()
    providers: dict[str, dict[str, object]] = {}
    for provider in ["openai", "gemini", "stability", "pollinations"]:
        configured = provider_configured(provider)
        health = merged.get(provider)
        chat_health = _chat_provider_health.get(provider)
        payload: dict[str, object] = {
            "configured": configured,
            "key_fingerprint": provider_key_fingerprint(provider),
        }
        if health:
            payload.update({
                "available": bool(health.get("available")),
                "image_available": bool(health.get("available")),
                "image_reason": health.get("reason"),
                "reason": health.get("reason"),
                "checked_at": health.get("checked_at"),
            })
        else:
            payload.update({
                "available": False,
                "image_available": False,
                "image_reason": "not_configured" if not configured else "not_checked",
                "reason": "not_configured" if not configured else "not_checked",
                "checked_at": None,
            })
        if chat_health:
            payload.update({
                "chat_available": bool(chat_health.get("available")),
                "chat_reason": chat_health.get("reason"),
                "chat_checked_at": chat_health.get("checked_at"),
            })
        else:
            payload.update({
                "chat_available": False,
                "chat_reason": "not_configured" if provider in {"openai", "gemini"} and not configured else "not_checked",
                "chat_checked_at": None,
            })
        providers[provider] = payload
    return providers


def ai_capabilities_payload() -> dict[str, bool]:
    """Report feature availability from validated provider health, not raw key presence."""
    providers = provider_health_payload()
    chat_available = any(
        bool(providers.get(provider, {}).get("chat_available"))
        for provider in get_chat_provider_order()
    )
    image_available = any(
        bool(providers.get(provider, {}).get("image_available"))
        for provider in get_image_provider_order()
    )
    return {
        "chat": chat_available,
        "promptEnhancement": chat_available,
        "posterPlanning": chat_available,
        "imageGeneration": image_available,
        "thumbnailGeneration": image_available,
    }


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


# ─── Request/Response Models ───────────────────────────────────

class PosterRequest(BaseModel):
    prompt: str
    style: Optional[str] = "auto"


class ReferencePosterRequest(BaseModel):
    prompt: str
    reference_description: Optional[str] = ""
    style: Optional[str] = "auto"


class PosterElement(BaseModel):
    type: str
    props: dict


class PosterResponse(BaseModel):
    heading: str
    subtitle: str
    bg_color: str
    primary_color: str
    secondary_color: str
    accent_color: str
    elements: List[PosterElement]
    theme_name: str
    layout: str


class PosterGenerationResponse(BaseModel):
    success: bool
    status: Optional[str] = "success"
    request_id: Optional[str] = None
    generation_id: Optional[str] = None
    mode: Optional[str] = "poster"
    asset_id: Optional[str] = None
    image_url: str
    poster_url: Optional[str] = None
    original_prompt: Optional[str] = None
    enhanced_prompt: Optional[str] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    project_id: Optional[str] = None
    provider_attempts: Optional[List[dict]] = None
    design: dict
    message: str
    attachment_summary: Optional[str] = None
    provider: Optional[str] = None
    source: Optional[str] = None
    productionQuality: Optional[bool] = False
    fallbackUsed: Optional[bool] = False
    fallbackReason: Optional[str] = None
    result: Optional[dict] = None
    fallback_used: Optional[bool] = False
    variations: Optional[List[dict]] = None
    uploaded_asset_ids: Optional[List[str]] = None


class PosterSpecCard(BaseModel):
    number: int
    title: str
    description: str
    icon: Optional[str] = "dot"


class PosterSpecCTA(BaseModel):
    text: str
    tag: Optional[str] = "TECHPOSTER STUDIO"


class PosterSpec(BaseModel):
    title: str
    subtitle: str
    description: str
    posterType: str = "numbered-cards"
    theme: str = "tech-blue"
    cards: List[PosterSpecCard]
    cta: PosterSpecCTA


class PosterSpecGenerateRequest(BaseModel):
    prompt: str
    posterType: Optional[str] = "numbered-cards"
    theme: Optional[str] = "tech-blue"
    style: Optional[str] = "professional"
    cardCount: Optional[int] = Field(default=7, ge=3, le=9)
    card_count: Optional[int] = Field(default=None, ge=3, le=9)


class PosterSpecGenerateResponse(BaseModel):
    success: bool
    posterSpec: PosterSpec
    source: str
    validation: dict
    rawText: Optional[str] = None


class ThumbnailGenerationResponse(BaseModel):
    success: bool
    status: Optional[str] = "success"
    request_id: Optional[str] = None
    generation_id: Optional[str] = None
    mode: Optional[str] = "thumbnail"
    asset_id: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    original_prompt: Optional[str] = None
    enhanced_prompt: Optional[str] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    project_id: Optional[str] = None
    provider_attempts: Optional[List[dict]] = None
    design: dict
    message: str
    provider: Optional[str] = None
    source: Optional[str] = None
    productionQuality: Optional[bool] = False
    fallbackUsed: Optional[bool] = False
    fallbackReason: Optional[str] = None
    result: Optional[dict] = None
    variations: Optional[List[dict]] = None
    uploaded_asset_ids: Optional[List[str]] = None


class ImagePromptRequest(BaseModel):
    prompt: str
    reference_description: Optional[str] = ""
    style: Optional[str] = "photorealistic"
    aspect_ratio: Optional[str] = "1:1"


class ImagePromptResponse(BaseModel):
    success: Optional[bool] = True
    status: Optional[str] = "completed"
    request_id: Optional[str] = None
    capability: Optional[str] = "prompt_enhancement"
    enhanced_prompt: str
    style_analysis: str
    color_palette: List[str]
    composition_notes: str
    lighting_description: str
    visual_elements: List[str]
    provider: Optional[str] = None
    source: Optional[str] = None
    fallbackUsed: Optional[bool] = False
    fallbackReason: Optional[str] = None
    provider_attempts: Optional[List[dict]] = None


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    request_id: Optional[str] = None
    message_id: Optional[str] = None
    stream: Optional[bool] = False
    context: Optional[str] = "poster_design"
    conversation_id: Optional[str] = None
    project_id: Optional[str] = None
    provider: Optional[str] = "auto"
    model: Optional[str] = None
    history: Optional[List[ChatHistoryItem]] = None


class ChatResponse(BaseModel):
    success: Optional[bool] = True
    status: Optional[str] = "completed"
    request_id: Optional[str] = None
    reply: str
    message: Optional[str] = None
    suggestions: List[str]
    poster_data: Optional[dict] = None
    provider: Optional[str] = None
    source: Optional[str] = None
    model: Optional[str] = None
    usage: Optional[dict] = None
    finish_reason: Optional[str] = None
    fallbackUsed: Optional[bool] = False
    conversation_id: Optional[str] = None
    user_message_id: Optional[str] = None
    assistant_message_id: Optional[str] = None
    provider_attempts: Optional[List[dict]] = None


@router.get("/provider-status")
async def provider_status():
    """Return non-secret AI provider configuration for diagnostics."""
    return {
        "image_provider_order": get_image_provider_order(),
        "chat_provider_order": get_chat_provider_order(),
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "openai_image_model": getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1"),
        "gemini_image_model": getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"),
        "stability_configured": bool(getattr(settings, "STABILITY_API_KEY", "")),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "local_fallback_enabled": False,
        "production_image_policy": "A failed provider chain returns a structured error and never inserts a local placeholder.",
        "capabilities": ai_capabilities_payload(),
        "providers": provider_health_payload(),
    }


@router.get("/providers/status")
async def providers_status(current_user: User = Depends(get_current_user)):
    """Return protected, non-secret backend/provider diagnostics for local verification."""
    return {
        "backend_process": {
            "pid": os.getpid(),
            "port": settings.PORT,
            "cwd": os.getcwd(),
            "environment_loaded": ENV_LOADED,
            "environment_file": str(ENV_PATH),
            "environment_override_enabled": ENV_OVERRIDE_ENABLED,
            "image_provider_priority": get_image_provider_order(),
            "chat_provider_priority": get_chat_provider_order(),
            "provider_priority": get_image_provider_order(),
            "local_fallback_enabled": False,
        },
        "capabilities": ai_capabilities_payload(),
        "providers": provider_health_payload(),
    }


# ─── Cache Management ─────────────────────────────────────────

def get_cache_key(prompt: str) -> str:
    """Generate a cache key for the prompt."""
    return hashlib.md5(prompt.encode()).hexdigest()


def get_cached_response(prompt: str) -> Optional[str]:
    """Get cached response if available and not expired."""
    cache_key = get_cache_key(prompt)
    if cache_key in _response_cache:
        cached_time, cached_response = _response_cache[cache_key]
        if datetime.now() - cached_time < _cache_ttl:
            return cached_response
    return None


def cache_response(prompt: str, response: str):
    """Cache a response."""
    cache_key = get_cache_key(prompt)
    _response_cache[cache_key] = (datetime.now(), response)


# ─── Gemini API Integration ───────────────────────────────────

_last_gemini_error = ""


def get_last_gemini_error() -> str:
    return _last_gemini_error


def call_gemini_api(prompt: str, max_retries: int = 1, retry_delay: float = 1.0, model: str | None = None) -> str:
    """Call Google Gemini API to generate content with retry logic and caching."""
    model_name = model or get_chat_model("gemini") or "gemini-2.0-flash"
    cache_prompt = f"[model:{model_name}]\n{prompt}"
    # Check cache first
    cached = get_cached_response(cache_prompt)
    if cached:
        print(f"Gemini: Using cached response")
        return cached

    api_key = settings.GEMINI_API_KEY

    global _last_gemini_error
    _last_gemini_error = ""

    if not api_key:
        print("Gemini: No API key configured")
        _last_gemini_error = "Gemini API key is not configured"
        return ""

    return call_gemini_api_urllib(prompt, model_name)


def call_gemini_api_urllib(prompt: str, model: str | None = None) -> str:
    """Fallback Gemini API call using urllib."""
    import urllib.request
    import urllib.error

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return ""

    model_name = model or get_chat_model("gemini") or "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model_name, safe='-_.')}:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        ctx = build_ssl_context()

        with urllib.request.urlopen(req, timeout=8, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'candidates' in result and result['candidates']:
                parts = result['candidates'][0].get('content', {}).get('parts', [])
                if parts:
                    text = parts[0].get('text', '')
                    cache_response(f"[model:{model_name}]\n{prompt}", text)
                    clear_last_chat_provider_error("gemini")
                    return text
    except urllib.error.HTTPError as e:
        global _last_gemini_error
        _last_gemini_error = f"Gemini HTTP {e.code}: {e.reason}"
        record_last_chat_provider_error("gemini", categorize_provider_error(e))
        print(f"Gemini urllib error: {_last_gemini_error}")
    except Exception as e:
        _last_gemini_error = f"Gemini request failed ({type(e).__name__})"
        record_last_chat_provider_error("gemini", categorize_provider_error(e))
        print(f"Gemini urllib error: {_last_gemini_error}")

    return ""


def sanitize_chat_history(history: Optional[List[ChatHistoryItem]], limit: int = 8) -> list[dict]:
    items: list[dict] = []
    for item in (history or [])[-limit:]:
        role = "assistant" if item.role in {"ai", "assistant"} else "user"
        content = clean_chat_text(item.content, 1200)
        if content:
            items.append({"role": role, "content": content})
    return items


def clean_chat_text(value: str, limit: int = 4000) -> str:
    cleaned = re.sub(r"\s+", " ", value or "").strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def build_chat_system_prompt(context: str = "poster_design") -> str:
    return (
        "You are TECKSTUDIO AI Chat, a concise senior design assistant inside a Canva-like editor. "
        "Answer the user's exact question directly. Be specific, practical, and relevant to graphic design, "
        "poster generation, image prompts, canvas editing, copywriting, color palettes, layout, typography, and branding. "
        "If the user asks a general question, answer it normally. Do not return generic fixed marketing text. "
        "Do not claim an image was generated from chat. Keep the answer complete but concise."
    )


def build_chat_prompt(message: str, context: str, history: Optional[List[ChatHistoryItem]]) -> str:
    history_lines = []
    for item in sanitize_chat_history(history):
        history_lines.append(f"{item['role']}: {item['content']}")
    history_text = "\n".join(history_lines) if history_lines else "No previous conversation."
    return f"""{build_chat_system_prompt(context)}

Conversation history:
{history_text}

Current user question:
{message}

Return a helpful answer to the current user question. If useful, include 2-4 short actionable suggestions."""


def call_openai_chat_api(message: str, context: str, history: Optional[List[ChatHistoryItem]], model: str | None = None) -> str:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return ""
    model_name = model or get_chat_model("openai") or "gpt-4o-mini"

    messages = [{"role": "system", "content": build_chat_system_prompt(context)}]
    messages.extend(sanitize_chat_history(history))
    messages.append({"role": "user", "content": message})

    payload = json.dumps({
        "model": model_name,
        "messages": messages,
        "temperature": 0.6,
        "max_tokens": 700,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        with urllib.request.urlopen(req, timeout=30, context=build_ssl_context()) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = clean_chat_text(result.get("choices", [{}])[0].get("message", {}).get("content", ""), 4000)
            if content:
                clear_last_chat_provider_error("openai")
            return content
    except Exception as exc:
        record_last_chat_provider_error("openai", categorize_provider_error(exc))
        print(f"OpenAI chat request failed ({type(exc).__name__})")
        return ""


def call_pollinations_chat_api(message: str, context: str, history: Optional[List[ChatHistoryItem]]) -> str:
    prompt = clean_chat_text(build_chat_prompt(message, context, history), 2800)
    url = f"https://text.pollinations.ai/{urllib.parse.quote(prompt)}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req, timeout=45, context=build_ssl_context()) as response:
            content_type = response.headers.get("Content-Type", "")
            text = response.read().decode("utf-8", errors="replace")
            if response.status == 200 and ("text/" in content_type or "application/json" in content_type) and text.strip():
                clear_last_chat_provider_error("pollinations")
                return clean_chat_text(text, 4000)
    except Exception as exc:
        record_last_chat_provider_error("pollinations", categorize_provider_error(exc))
        print(f"Pollinations chat request failed ({type(exc).__name__})")
    return ""


def build_contextual_chat_fallback(message: str) -> str:
    lowered = message.lower()
    if any(word in lowered for word in ["palette", "color", "colour"]):
        return "Use one dominant color, one supporting neutral, and one accent. For a poster, keep the accent for CTA text, highlights, or key motion details so the layout stays focused."
    if any(word in lowered for word in ["layout", "composition", "arrange"]):
        return "Start with one clear focal point, place the headline near the strongest visual area, and keep supporting details grouped in one secondary zone. Avoid spreading text evenly across the whole canvas."
    if any(word in lowered for word in ["prompt", "image", "generate"]):
        return "Write the prompt with subject, action, setting, style, lighting, composition, and negative constraints. Example: subject + action + environment + visual style + mood + framing + what to avoid."
    if any(word in lowered for word in ["poster", "design"]):
        return "For a stronger poster, define the main subject first, then add a clear headline, visual hierarchy, limited color palette, and one memorable focal image."
    return "I can help with that. Please share the specific design goal, audience, format, and any style preference, and I’ll give a focused recommendation."


def extract_chat_suggestions(reply: str) -> list[str]:
    suggestions: list[str] = []
    for line in reply.splitlines():
        cleaned = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip()
        if 18 <= len(cleaned) <= 140 and cleaned.lower() != reply.lower():
            suggestions.append(cleaned)
    if suggestions:
        return suggestions[:4]
    return [
        "Ask for a layout critique",
        "Request a stronger image prompt",
        "Ask for a color palette",
        "Ask for headline variations",
    ]


def provider_key_format_valid(provider: str) -> bool | None:
    """Return a coarse, non-secret key-format check for diagnostics."""
    if provider == "openai":
        key = (settings.OPENAI_API_KEY or "").strip()
        if not key:
            return None
        return key.startswith("sk-") and len(key) >= 24
    if provider == "gemini":
        key = (settings.GEMINI_API_KEY or "").strip()
        if not key:
            return None
        return len(key) >= 24 and not key.lower().startswith(("ya29.", "oauth"))
    if provider == "stability":
        key = (getattr(settings, "STABILITY_API_KEY", "") or "").strip()
        if not key:
            return None
        return len(key) >= 20
    return None


def build_ai_health_payload(request_id: str | None = None) -> dict:
    """Build a secret-safe AI diagnostics envelope from validated provider health."""
    providers = provider_health_payload()
    capabilities = ai_capabilities_payload()
    normalized_providers: dict[str, dict[str, object]] = {}
    warnings: list[str] = []

    for provider, payload in providers.items():
        image_reason = payload.get("image_reason") or payload.get("reason")
        chat_reason = payload.get("chat_reason")
        image_available = bool(payload.get("image_available"))
        chat_available = bool(payload.get("chat_available"))
        configured = bool(payload.get("configured"))
        reachable = image_available or chat_available
        normalized_providers[provider] = {
            "configured": configured,
            "keyFormatValid": provider_key_format_valid(provider),
            "reachable": reachable,
            "chatAvailable": chat_available,
            "imageAvailable": image_available,
            "chatReason": chat_reason,
            "imageReason": image_reason,
            "fingerprint": payload.get("key_fingerprint"),
            "models": {
                "chat": get_chat_model(provider),
                "image": getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1") if provider == "openai" else getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image") if provider == "gemini" else "flux" if provider == "pollinations" else None,
            },
        }
        if configured and not reachable:
            warnings.append(f"{provider} configured but unavailable: {image_reason or chat_reason or 'not_checked'}")

    any_capability = any(capabilities.values())
    core_ready = capabilities.get("chat") and capabilities.get("imageGeneration")
    status_value = "healthy" if core_ready else "degraded" if any_capability else "unavailable"

    return {
        "success": True,
        "requestId": request_id or str(uuid.uuid4()),
        "capability": "ai_diagnostics",
        "status": status_value,
        "defaultProvider": (get_image_provider_order() or ["openai"])[0],
        "imageProviderOrder": get_image_provider_order(),
        "chatProviderOrder": get_chat_provider_order(),
        "capabilities": capabilities,
        "providers": normalized_providers,
        "policy": {
            "localPlaceholderFallback": False,
            "fakeAiFallback": bool(getattr(settings, "ENABLE_FAKE_AI_FALLBACK", False)),
            "imageGenerationFailure": "structured_error_without_canvas_mutation",
        },
        "environment": {
            "loaded": ENV_LOADED,
            "overrideEnabled": ENV_OVERRIDE_ENABLED,
            "cacheItems": len(_response_cache),
        },
        "warnings": warnings,
        "error": None if any_capability else {
            "code": "AI_NOT_CONFIGURED",
            "message": "No validated AI provider capability is currently available.",
            "retryable": True,
        },
    }


def clean_thumbnail_text(value: str, limit: int = 300) -> str:
    cleaned = re.sub(r"\s+", " ", value or "").strip().strip('"').strip("'")
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def build_thumbnail_image_prompt(
    prompt: str,
    title: str,
    subtitle: str,
    platform: str,
    style: str,
    aspect_ratio: str,
    width: int,
    height: int,
    quality: str,
    reference_count: int,
    has_face: bool,
    has_logo: bool,
) -> str:
    parts = [
        "Create one finished, high-converting professional thumbnail image.",
        "The output must be a real visual thumbnail artwork, not JSON, not UI, not a wireframe, and not a generic template.",
        f"User thumbnail request: {clean_thumbnail_text(prompt, 700)}",
        f"Platform: {platform or 'youtube'}",
        f"Style: {style or 'bold and high contrast'}",
        f"Canvas: {width}x{height}, aspect ratio {aspect_ratio or '16:9'}",
        f"Quality: {quality or 'high'}",
        "Use a strong focal subject, readable title space, high contrast, small-screen clarity, bold composition, clean depth separation, and thumbnail-optimized visual hierarchy.",
        "Avoid tiny unreadable text, clutter, low contrast, watermark, blurry output, duplicated subject, random buttons, website UI, and empty backgrounds.",
    ]
    if title:
        parts.append(f"Include clear large title text if visually appropriate: {clean_thumbnail_text(title, 120)}")
    if subtitle:
        parts.append(f"Optional subtitle/supporting text: {clean_thumbnail_text(subtitle, 160)}")
    if reference_count:
        parts.append(f"Use {reference_count} uploaded reference image(s) as visual inspiration for subject, colors, or composition when relevant.")
    if has_face:
        parts.append("A face/photo was uploaded; preserve it as a key inspiration for expression, identity, or reaction framing when relevant.")
    if has_logo:
        parts.append("A logo was uploaded; incorporate brand/logo influence cleanly if relevant without making the layout crowded.")
    return "\n".join(parts)


def build_thumbnail_result_metadata(image_result: dict, width: int, height: int) -> dict:
    source = image_result.get("source", "unknown")
    image_value = image_result.get("url", "")
    if image_value.startswith("data:"):
        mime_type = image_value.split(";", 1)[0].replace("data:", "")
        image_data = image_value
        image_url = None
    else:
        mime_type = image_result.get("mime_type") or "image/jpeg"
        image_data = None
        image_url = image_value or None
    fallback_used = source in {"local", "local-svg"}
    return {
        "source": source,
        "fallbackUsed": fallback_used,
        "productionQuality": bool(image_value) and not fallback_used and mime_type.startswith("image/") and mime_type != "image/svg+xml",
        "fallbackReason": "All configured external image providers failed" if fallback_used else None,
        "result": {
            "imageUrl": image_url,
            "imageData": image_data,
            "mimeType": mime_type,
            "width": image_result.get("width", width),
            "height": image_result.get("height", height),
        },
    }


# ─── Fallback Poster Generation ───────────────────────────────

def build_fallback_poster(prompt: str) -> dict:
    """Build poster using smart keyword analysis when Gemini is unavailable."""
    p = prompt.lower().strip()

    industries = {
        'movie': {'bg': '#0a0a0a', 'primary': '#ffd700', 'secondary': '#fff', 'heading': 'THE BLOCKBUSTER', 'subtitle': 'Coming Soon', 'layout': 'center'},
        'film': {'bg': '#0a0a0a', 'primary': '#ffd700', 'secondary': '#fff', 'heading': 'NOW SHOWING', 'subtitle': 'In Theaters', 'layout': 'center'},
        'cinema': {'bg': '#0a0a0a', 'primary': '#ffd700', 'secondary': '#fff', 'heading': 'CINEMA NIGHT', 'subtitle': 'Now Playing', 'layout': 'center'},
        'fashion': {'bg': '#1a0015', 'primary': '#ec4899', 'secondary': '#fff', 'heading': 'STYLE EDIT', 'subtitle': 'New Collection', 'layout': 'split'},
        'beauty': {'bg': '#fff0f5', 'primary': '#ff69b4', 'secondary': '#1a1a1a', 'heading': 'BEAUTY GLOW', 'subtitle': 'Enhance Your Beauty', 'layout': 'center'},
        'fitness': {'bg': '#0a0a0a', 'primary': '#ef4444', 'secondary': '#fff', 'heading': 'PUSH HARDER', 'subtitle': '30 Day Challenge', 'layout': 'bold'},
        'gym': {'bg': '#0a0a0a', 'primary': '#ef4444', 'secondary': '#fff', 'heading': 'NO PAIN NO GAIN', 'subtitle': 'Join The Gym', 'layout': 'bold'},
        'music': {'bg': '#1a002a', 'primary': '#a855f7', 'secondary': '#fff', 'heading': 'LIVE IN CONCERT', 'subtitle': 'World Tour 2026', 'layout': 'center'},
        'concert': {'bg': '#1a002a', 'primary': '#a855f7', 'secondary': '#fff', 'heading': 'GET YOUR TICKETS', 'subtitle': 'Tonight', 'layout': 'center'},
        'food': {'bg': '#2c1810', 'primary': '#d4a574', 'secondary': '#fff8f0', 'heading': 'TASTE THE BEST', 'subtitle': "Chef's Special", 'layout': 'split'},
        'restaurant': {'bg': '#1a1a1a', 'primary': '#ffd700', 'secondary': '#fff', 'heading': 'FINE DINING', 'subtitle': 'Reserve Your Table', 'layout': 'center'},
        'cafe': {'bg': '#2c1810', 'primary': '#d4a574', 'secondary': '#f5e6d3', 'heading': 'FRESH BREWS', 'subtitle': 'Open Daily', 'layout': 'center'},
        'tech': {'bg': '#0a192f', 'primary': '#00c8ff', 'secondary': '#fff', 'heading': 'INNOVATE', 'subtitle': 'The Future Starts Here', 'layout': 'grid'},
        'startup': {'bg': '#0f172a', 'primary': '#6366f1', 'secondary': '#fff', 'heading': 'LAUNCH DAY', 'subtitle': 'From Idea To Impact', 'layout': 'center'},
        'nature': {'bg': '#0f2419', 'primary': '#22c55e', 'secondary': '#fff', 'heading': 'WILD & FREE', 'subtitle': 'Explore Nature', 'layout': 'center'},
        'wedding': {'bg': '#fff8f0', 'primary': '#d4a574', 'secondary': '#1a1a1a', 'heading': 'WE DO', 'subtitle': 'Save The Date', 'layout': 'minimal'},
        'luxury': {'bg': '#1a1a1a', 'primary': '#ffd700', 'secondary': '#fff', 'heading': 'OPULENCE', 'subtitle': 'Exclusive Collection', 'layout': 'minimal'},
        'sale': {'bg': '#1a0000', 'primary': '#ef4444', 'secondary': '#fff', 'heading': 'MEGA SALE', 'subtitle': 'UP TO 70% OFF', 'layout': 'bold'},
        'party': {'bg': '#1a002a', 'primary': '#ff00ff', 'secondary': '#fff', 'heading': 'PARTY TIME', 'subtitle': 'Tonight We Celebrate', 'layout': 'center'},
        'sports': {'bg': '#0a0a0a', 'primary': '#f97316', 'secondary': '#fff', 'heading': 'GAME ON', 'subtitle': 'Championship Series', 'layout': 'bold'},
        'yoga': {'bg': '#0a192f', 'primary': '#38bdf8', 'secondary': '#fff', 'heading': 'INNER PEACE', 'subtitle': 'Find Your Balance', 'layout': 'minimal'},
        'education': {'bg': '#1e3a5f', 'primary': '#f59e0b', 'secondary': '#fff', 'heading': 'EXCELLENCE', 'subtitle': 'Enroll Now', 'layout': 'center'},
        'property': {'bg': '#0f1f0f', 'primary': '#22c55e', 'secondary': '#fff', 'heading': 'DREAM HOME', 'subtitle': 'For Sale', 'layout': 'split'},
        'minimal': {'bg': '#ffffff', 'primary': '#1a1a1a', 'secondary': '#1a1a1a', 'heading': 'LESS IS MORE', 'subtitle': 'Simplicity Speaks', 'layout': 'minimal'},
    }

    color_map = {
        'red': '#ef4444', 'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#eab308',
        'purple': '#8b5cf6', 'pink': '#ec4899', 'orange': '#f97316', 'gold': '#ffd700',
        'cyan': '#06b6d4', 'navy': '#1e3a5f', 'black': '#1a1a1a', 'white': '#ffffff',
    }

    theme = industries['movie']
    for key, val in industries.items():
        if key in p:
            theme = val
            break

    for color_name, hex_val in color_map.items():
        if color_name in p:
            theme['primary'] = hex_val
            break

    quote_match = re.search(r'["\'](.+?)["\']', p)
    if quote_match:
        theme['heading'] = quote_match.group(1).upper()

    sub_match = re.search(r'subtitle[:\s]+["\']?(.+?)["\']?\s*$', p, re.I)
    if sub_match:
        theme['subtitle'] = sub_match.group(1)

    price_match = re.search(r'(\d+)%\s*(?:off|discount)', p)
    if price_match:
        theme['heading'] = f"UP TO {price_match.group(1)}% OFF"
        theme['subtitle'] = 'Limited Time Offer'

    dollar_match = re.search(r'\$(\d+)', p)
    if dollar_match:
        theme['subtitle'] = f"Starting At ${dollar_match.group(1)}"

    has_theme = any(k in p for k in industries)
    if not has_theme and not quote_match and len(p) > 2 and len(p) < 50:
        theme['heading'] = p.upper()

    return {
        'heading': theme['heading'],
        'subtitle': theme['subtitle'],
        'bg_color': theme['bg'],
        'primary_color': theme['primary'],
        'secondary_color': theme['secondary'],
        'accent_color': theme['primary'],
        'theme_name': 'custom',
        'layout': theme['layout'],
        'elements': []
    }


# ─── Response Parsing ──────────────────────────────────────────

def parse_gemini_response(response_text: str, prompt: str) -> dict:
    """Parse Gemini's response into a structured poster design."""
    try:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            data = json.loads(json_match.group())
            required = ['heading', 'subtitle', 'bg_color', 'primary_color']
            if all(k in data for k in required):
                for field in ['heading', 'subtitle', 'bg_color', 'primary_color', 'secondary_color', 'accent_color']:
                    if field in data and not isinstance(data[field], str):
                        data[field] = str(data[field])

                for color_field in ['bg_color', 'primary_color', 'secondary_color', 'accent_color']:
                    if color_field in data:
                        color_val = data[color_field]
                        if not color_val.startswith('#'):
                            data[color_field] = f'#{color_val}'
                        if len(data[color_field]) != 7:
                            data[color_field] = build_fallback_poster(prompt).get(color_field, '#000000')

                valid_layouts = ['center', 'split', 'bold', 'minimal', 'grid']
                if 'layout' in data and data['layout'] not in valid_layouts:
                    data['layout'] = 'center'

                return data
    except (json.JSONDecodeError, Exception) as e:
        print(f"Gemini: Parse error: {e}")

    return build_fallback_poster(prompt)


# ─── Reference Poster Analysis ─────────────────────────────────

def analyze_reference_poster(description: str) -> dict:
    """Analyze a reference poster description and extract visual elements."""
    analysis = {
        "style": "modern",
        "color_palette": ["#0a0a0a", "#ffffff", "#8b5cf6"],
        "composition": "center-focused",
        "typography": "bold-sans-serif",
        "lighting": "dramatic",
        "mood": "professional",
        "elements": []
    }

    desc_lower = description.lower()

    # Detect style (check more specific terms first)
    style_keywords = {
        'neon': 'neon', 'cyberpunk': 'neon', 'futuristic': 'neon',
        'vintage': 'vintage', 'retro': 'vintage', 'classic': 'vintage', 'nostalgic': 'vintage',
        'modern': 'modern', 'contemporary': 'modern', 'sleek': 'modern',
        'minimal': 'minimalist', 'clean': 'minimalist', 'simple': 'minimalist',
        'luxury': 'luxury', 'premium': 'luxury', 'elegant': 'luxury', 'exclusive': 'luxury',
        'bold': 'bold', 'dramatic': 'dramatic', 'dark': 'dark',
        'playful': 'playful', 'fun': 'playful', 'colorful': 'playful',
        'professional': 'professional', 'corporate': 'professional',
        'artistic': 'artistic', 'creative': 'artistic', 'abstract': 'artistic',
    }
    for keyword, style in style_keywords.items():
        if keyword in desc_lower:
            analysis["style"] = style
            break

    # Detect colors
    color_keywords = {
        'red': '#ef4444', 'blue': '#3b82f6', 'green': '#22c55e', 'yellow': '#eab308',
        'purple': '#8b5cf6', 'pink': '#ec4899', 'orange': '#f97316', 'gold': '#ffd700',
        'cyan': '#06b6d4', 'navy': '#1e3a5f', 'black': '#1a1a1a', 'white': '#ffffff',
        'teal': '#14b8a6', 'coral': '#ff6b6b', 'lime': '#84cc16',
    }
    detected_colors = []
    for color_name, hex_val in color_keywords.items():
        if color_name in desc_lower:
            detected_colors.append(hex_val)
    if detected_colors:
        analysis["color_palette"] = detected_colors[:5]

    # Detect composition
    composition_keywords = {
        'center': 'center-focused', 'symmetrical': 'symmetrical',
        'left': 'asymmetric-left', 'right': 'asymmetric-right',
        'grid': 'grid-layout', 'split': 'split-composition',
        'diagonal': 'diagonal-dynamic', 'vertical': 'vertical-stack',
    }
    for keyword, comp in composition_keywords.items():
        if keyword in desc_lower:
            analysis["composition"] = comp
            break

    # Detect lighting
    lighting_keywords = {
        'neon': 'neon-glow', 'bright': 'bright-even', 'soft': 'soft-diffused',
        'dramatic': 'dramatic-contrast', 'warm': 'warm-toned', 'cool': 'cool-toned',
        'gradient': 'gradient-lighting', 'spotlight': 'spotlight',
    }
    for keyword, light in lighting_keywords.items():
        if keyword in desc_lower:
            analysis["lighting"] = light
            break

    # Detect mood
    mood_keywords = {
        'happy': 'upbeat', 'exciting': 'energetic', 'calm': 'serene',
        'mysterious': 'mysterious', 'romantic': 'romantic', 'powerful': 'powerful',
        'elegant': 'sophisticated', 'fun': 'playful', 'serious': 'formal',
    }
    for keyword, mood in mood_keywords.items():
        if keyword in desc_lower:
            analysis["mood"] = mood
            break

    return analysis


def generate_enhanced_image_prompt(user_prompt: str, reference_description: str, style: str = "photorealistic") -> dict:
    """Generate an enhanced image generation prompt based on user request and reference analysis."""

    # Analyze reference if provided
    ref_analysis = analyze_reference_poster(reference_description) if reference_description else None

    # Build the enhanced prompt
    prompt_parts = []

    # Style prefix
    style_prefixes = {
        'photorealistic': 'Photorealistic, ultra-detailed, professional photography style',
        'digital-art': 'Digital art, vibrant colors, modern illustration style',
        'cinematic': 'Cinematic composition, dramatic lighting, movie poster style',
        'minimalist': 'Minimalist design, clean lines, simple and elegant',
        'vintage': 'Vintage aesthetic, retro colors, classic design elements',
        'neon': 'Neon glow effects, cyberpunk style, vibrant lighting',
    }
    prompt_parts.append(style_prefixes.get(style, style_prefixes['photorealistic']))

    # Add reference analysis insights
    if ref_analysis:
        prompt_parts.append(f"Style: {ref_analysis['style']}")
        prompt_parts.append(f"Color palette: {', '.join(ref_analysis['color_palette'][:3])}")
        prompt_parts.append(f"Composition: {ref_analysis['composition']}")
        prompt_parts.append(f"Lighting: {ref_analysis['lighting']}")
        prompt_parts.append(f"Mood: {ref_analysis['mood']}")

    # Add user's specific request
    prompt_parts.append(f"Subject: {user_prompt}")

    # Add quality enhancers
    prompt_parts.append("High resolution, sharp details, professional quality, 8K UHD")

    enhanced_prompt = ". ".join(prompt_parts)

    # Generate composition notes
    composition_notes = "Balanced composition with clear focal point"
    if ref_analysis:
        composition_notes = f"{ref_analysis['composition'].replace('-', ' ').title()} with {ref_analysis['lighting'].replace('-', ' ')} lighting"

    # Generate visual elements list
    visual_elements = ["Background", "Main subject", "Typography", "Accent elements"]
    if ref_analysis:
        visual_elements = [
            f"{ref_analysis['style'].title()} background",
            f"Main subject with {ref_analysis['lighting']} lighting",
            f"Typography in {ref_analysis['typography']} style",
            f"Accent elements with {ref_analysis['color_palette'][0] if ref_analysis['color_palette'] else '#8b5cf6'} highlights"
        ]

    return {
        "enhanced_prompt": enhanced_prompt,
        "style_analysis": ref_analysis["style"] if ref_analysis else style,
        "color_palette": ref_analysis["color_palette"] if ref_analysis else ["#0a0a0a", "#ffffff", "#8b5cf6"],
        "composition_notes": composition_notes,
        "lighting_description": ref_analysis["lighting"].replace('-', ' ').title() if ref_analysis else "Natural lighting",
        "visual_elements": visual_elements
    }


# ─── Image Generation via Backend Proxy ────────────────────────

class ImageGenerateRequest(BaseModel):
    request_id: Optional[str] = None
    prompt: str
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    aspect_ratio: Optional[str] = "1:1"
    style: Optional[str] = "auto"
    variations: Optional[int] = 1
    enhance_prompt: Optional[bool] = True
    seed: Optional[int] = None
    model: Optional[str] = "flux"
    project_id: Optional[str] = None


def stable_conversation_id(value: Optional[str]) -> str:
    if value and len(value) <= 80:
        return value
    source = value or f"chat:{time.time()}:{uuid.uuid4()}"
    return f"chat_{hashlib.sha256(source.encode('utf-8')).hexdigest()[:32]}"


def save_chat_exchange(
    db: Session,
    *,
    user: User,
    conversation_id: str,
    project_id: Optional[str],
    user_message: str,
    assistant_reply: str,
    provider: str,
    user_message_id: Optional[str] = None,
    assistant_message_id: Optional[str] = None,
) -> tuple[str, str]:
    session = db.query(ChatSession).filter(
        ChatSession.id == conversation_id,
        ChatSession.user_id == user.id,
    ).first()
    if not session:
        session = ChatSession(
            id=conversation_id,
            user_id=user.id,
            project_id=project_id,
            title=user_message[:180],
            provider=provider,
        )
        db.add(session)
    session.updated_at = datetime.utcnow()
    session.provider = provider
    user_message_id = user_message_id or generate_id("msg")
    assistant_message_id = assistant_message_id or generate_id("msg")
    db.add(ChatMessage(
        id=user_message_id,
        session_id=conversation_id,
        user_id=user.id,
        project_id=project_id,
        role="user",
        content=user_message,
        provider=provider,
    ))
    db.add(ChatMessage(
        id=assistant_message_id,
        session_id=conversation_id,
        user_id=user.id,
        project_id=project_id,
        role="assistant",
        content=assistant_reply,
        provider=provider,
    ))
    db.commit()
    return user_message_id, assistant_message_id


def generate_image_url(prompt: str, width: int = 1024, height: int = 1024, seed: int = None) -> str:
    """Generate image URL using free APIs as proxy."""
    import random

    if seed is None:
        seed = random.randint(1, 999999)

    # Try Pollinations with different approach
    encoded_prompt = urllib.parse.quote(prompt)
    pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"

    # Also prepare alternative URLs (fallback)
    picsum_url = f"https://picsum.photos/{width}/{height}?random={seed}"

    return pollinations_url


def generate_image_via_proxy(prompt: str, width: int = 1024, height: int = 1024) -> dict:
    """Generate an image through configured production providers only."""
    import random
    seed = random.randint(1, 999999)
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
            result = generate_image_pollinations(prompt, width, height, seed)
            if result.get("success"):
                record_provider_health("pollinations", True)
                return result
            category = result.get("error_category", "unavailable")
            record_provider_health("pollinations", False, category)
            failures.append({"provider": "pollinations", "category": category})

    return {"success": False, "error": "No production image provider returned an image", "provider_failures": failures}


def pollinations_prompt_candidates(prompt: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", prompt).strip()
    user_request_match = re.search(
        r"User thumbnail request:\s*(.*?)(?:\s+Platform:|\s+Style:|\s+Canvas:|$)",
        cleaned,
        flags=re.IGNORECASE,
    )
    if user_request_match:
        user_request = user_request_match.group(1).strip()
        compact = (
            "Professional YouTube thumbnail artwork, bold high-contrast composition, "
            f"{user_request}, readable title space, polished digital design, no watermark, no UI mockup."
        )
    else:
        user_request = cleaned
        compact = (
            f"High-quality generated image: {user_request}. "
            "Clear main subject, polished composition, sharp details, clean lighting, no watermark, no UI mockup."
        )
    candidates = [cleaned, compact]
    deduped: list[str] = []
    for candidate in candidates:
        value = candidate[:697].rstrip() + "..." if len(candidate) > 700 else candidate
        if value and value not in deduped:
            deduped.append(value)
    return deduped


def generate_image_pollinations(prompt: str, width: int, height: int, seed: int) -> dict:
    """Generate image using Pollinations AI API."""
    last_category = "invalid_response"
    for attempt, pollinations_prompt in enumerate(pollinations_prompt_candidates(prompt), start=1):
        encoded = urllib.parse.quote(pollinations_prompt)
        attempt_seed = seed + attempt - 1
        url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&seed={attempt_seed}&nologo=true&model=flux"

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
                        if not image_bytes:
                            raise ValueError("Provider returned an empty image")
                        if not content_type.startswith("image/"):
                            raise ValueError(f"Provider returned invalid content type: {content_type}")
                        decoded_width, decoded_height = width, height
                        try:
                            from PIL import Image
                            with Image.open(io.BytesIO(image_bytes)) as image:
                                image.verify()
                                decoded_width, decoded_height = image.size
                        except Exception as exc:
                            print(f"Pollinations image decode warning: {exc}")
                        return {
                            "success": True,
                            "url": f"data:{content_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}",
                            "provider_url": url,
                            "seed": attempt_seed,
                            "width": decoded_width,
                            "height": decoded_height,
                            "source": "pollinations:flux",
                            "mime_type": content_type,
                            "http_status": response.status,
                        }
        except Exception as e:
            last_category = categorize_provider_error(e)
            last_status = e.code if isinstance(e, urllib.error.HTTPError) else None
            print(f"Pollinations attempt {attempt} failed ({type(e).__name__})")

    return {"success": False, "error_category": last_category, "http_status": locals().get("last_status")}


def normalize_image_result_to_dimensions(image_result: dict, target_width: int, target_height: int) -> dict:
    """Validate image bytes and return a high-quality center-cropped PNG at target dimensions."""
    source = image_result.get("url") or image_result.get("image_url")
    if not source:
        raise ValueError("Image provider did not return an image source")
    mime_type, image_bytes = read_image_bytes(source)
    if not mime_type.startswith("image/"):
        raise ValueError(f"Provider returned invalid image MIME type: {mime_type}")
    try:
        from PIL import Image, ImageOps
    except Exception as exc:
        raise ValueError("Pillow is required to validate and normalize generated images") from exc

    with Image.open(io.BytesIO(image_bytes)) as image:
        image.load()
        if image.width <= 0 or image.height <= 0:
            raise ValueError("Provider returned an image with invalid dimensions")
        normalized = ImageOps.fit(
            image.convert("RGB"),
            (target_width, target_height),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        output = io.BytesIO()
        normalized.save(output, format="PNG", optimize=True)

    normalized_url = "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("utf-8")
    updated = dict(image_result)
    updated.update({
        "url": normalized_url,
        "width": target_width,
        "height": target_height,
        "mime_type": "image/png",
        "normalized": True,
    })
    return updated


def generate_local_placeholder_image(prompt: str, width: int, height: int, seed: int) -> dict:
    """Generate a local placeholder image when external services are unavailable."""
    escaped_prompt = html.escape(prompt[:180])
    wrapped_prompt = wrap(escaped_prompt, width=max(16, width // 22))
    text_lines = "".join(
        f'<text x="48" y="{160 + index * 34}" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="24">{line}</text>'
        for index, line in enumerate(wrapped_prompt[:6])
    )
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#111827"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect width="{width}" height="{height}" fill="url(#bg)"/>
      <circle cx="{int(width * 0.8)}" cy="{int(height * 0.2)}" r="{max(48, min(width, height) // 8)}" fill="#6366f1" opacity="0.25"/>
      <rect x="{int(width * 0.08)}" y="{int(height * 0.58)}" width="{int(width * 0.84)}" height="{int(height * 0.32)}" rx="24" fill="#09090b" opacity="0.92"/>
      <rect x="0" y="{int(height * 0.68)}" width="{width}" height="{int(height * 0.18)}" fill="url(#accent)" opacity="0.18"/>
      <text x="48" y="104" fill="#ffffff" font-family="Arial, sans-serif" font-size="{max(22, width // 18)}" font-weight="700">AI IMAGE PREVIEW</text>
      {text_lines}
      <text x="48" y="{height - 36}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18">seed:{seed}</text>
    </svg>
    """.strip()
    encoded = base64.b64encode(svg.encode("utf-8")).decode("utf-8")

    return {
        "success": True,
        "url": f"data:image/svg+xml;base64,{encoded}",
        "seed": seed,
        "width": width,
        "height": height,
        "source": "local",
    }


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
                    return {"success": True, "url": f"data:image/png;base64,{data['b64_json']}", "source": f"openai:{getattr(settings, 'OPENAI_IMAGE_MODEL', 'gpt-image-1')}", "http_status": response.status}
                elif 'url' in data:
                    return {"success": True, "url": data['url'], "source": f"openai:{getattr(settings, 'OPENAI_IMAGE_MODEL', 'gpt-image-1')}", "http_status": response.status}
    except Exception as e:
        category = categorize_provider_error(e)
        print(f"OpenAI error ({type(e).__name__})")
        return {"success": False, "error_category": category, "http_status": e.code if isinstance(e, urllib.error.HTTPError) else None}

    return {"success": False, "error_category": "invalid_response"}


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

    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=get_image_provider_timeout(), context=build_ssl_context()) as response:
            result = json.loads(response.read().decode("utf-8"))
            parts = result.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            for part in parts:
                inline_data = part.get("inlineData") or part.get("inline_data")
                if inline_data and inline_data.get("data"):
                    mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
                    return {
                        "success": True,
                        "url": f"data:{mime_type};base64,{inline_data['data']}",
                        "source": f"gemini:{model}",
                        "width": width,
                        "height": height,
                        "http_status": response.status,
                    }
    except Exception as e:
        category = categorize_provider_error(e)
        print(f"Gemini image error ({type(e).__name__})")
        return {"success": False, "error_category": category, "http_status": e.code if isinstance(e, urllib.error.HTTPError) else None}

    return {"success": False, "error_category": "invalid_response"}


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
                return {
                    "success": True,
                    "url": f"data:{content_type};base64,{encoded}",
                    "source": "stability:core",
                    "width": width,
                    "height": height,
                }
    except Exception as e:
        category = categorize_provider_error(e)
        print(f"Stability error ({type(e).__name__})")
        return {"success": False, "error_category": category}

    return {"success": False, "error_category": "invalid_response"}


def is_valid_attachment(filename: str, allowed_extensions: set[str]) -> bool:
    extension = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    return extension in allowed_extensions


def read_upload_content(upload: UploadFile) -> bytes:
    content = upload.file.read()
    upload.file.seek(0)
    return content


def build_uploaded_attachment_payload(
    documents: List[UploadFile],
    images: List[UploadFile],
) -> tuple[list[dict], list[dict]]:
    document_items: list[dict] = []
    image_items: list[dict] = []

    for upload in documents:
        if not is_valid_attachment(upload.filename or "", {".pdf", ".docx", ".txt"}):
            raise HTTPException(status_code=400, detail=f"Unsupported document type: {upload.filename}")
        content = read_upload_content(upload)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Document too large: {upload.filename}")
        document_items.append({
            "name": upload.filename,
            "content": content,
        })

    for upload in images:
        if not is_valid_attachment(upload.filename or "", {".png", ".jpg", ".jpeg", ".webp"}):
            raise HTTPException(status_code=400, detail=f"Unsupported image type: {upload.filename}")
        content = read_upload_content(upload)
        if len(content) > 12 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Image too large: {upload.filename}")
        content_type = upload.content_type or "image/png"
        image_items.append({
            "name": upload.filename,
            "content": content,
            "content_type": content_type,
            "data_url": f"data:{content_type};base64,{base64.b64encode(content).decode('utf-8')}",
        })

    return document_items, image_items


POSTER_SPEC_THEMES = {
    "tech-blue",
    "purple-ai",
    "minimal-light",
    "corporate-navy",
    "black-gold",
    "green-growth",
    "orange-energy",
    "neon-future",
}


def clamp_poster_spec_card_count(req: PosterSpecGenerateRequest) -> int:
    requested = req.card_count if req.card_count is not None else req.cardCount
    try:
        value = int(requested or 7)
    except (TypeError, ValueError):
        value = 7
    return max(3, min(9, value))


def normalize_poster_spec_theme(theme: Optional[str]) -> str:
    value = (theme or "tech-blue").strip().lower()
    return value if value in POSTER_SPEC_THEMES else "tech-blue"


def poster_spec_to_dict(spec: PosterSpec) -> dict:
    if hasattr(spec, "model_dump"):
        return spec.model_dump()
    return spec.dict()


def build_poster_spec_prompt(prompt: str, theme: str, style: str, card_count: int) -> str:
    return f"""You are a senior technical poster content strategist.

Create structured content for an editable numbered technical cards poster.

User prompt:
{prompt}

Return ONLY strict JSON. No markdown, no explanation.
Schema:
{{
  "title": "short poster title",
  "subtitle": "one concise supporting line",
  "description": "one sentence describing the poster value",
  "posterType": "numbered-cards",
  "theme": "{theme}",
  "cards": [
    {{
      "number": 1,
      "title": "short card heading",
      "description": "one practical sentence, max 120 characters",
      "icon": "one of: chip, cloud, database, shield, chart, code, spark"
    }}
  ],
  "cta": {{
    "text": "short call to action",
    "tag": "short footer tag"
  }}
}}

Rules:
- Use exactly {card_count} cards numbered 1 through {card_count}.
- Keep all text editable and poster-ready.
- Focus on technical clarity, hierarchy, and demo-quality copy.
- Match style: {style or "professional"}.
- Use theme: {theme}.
- Do not include image URLs, HTML, markdown fences, or extra keys."""


def extract_json_object(raw_text: str) -> dict:
    cleaned = (raw_text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("AI response did not contain a JSON object")
    return json.loads(cleaned[start:end + 1])


def normalize_poster_spec_payload(payload: dict, prompt: str, theme: str, card_count: int) -> PosterSpec:
    if not isinstance(payload, dict):
        raise ValueError("PosterSpec payload must be an object")

    cards_payload = payload.get("cards")
    if not isinstance(cards_payload, list):
        cards_payload = []

    cards: list[dict] = []
    for index, item in enumerate(cards_payload[:card_count]):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or f"Step {index + 1}").strip()[:80]
        description = str(item.get("description") or "Add a clear, practical supporting point.").strip()[:160]
        icon = str(item.get("icon") or "dot").strip()[:24]
        cards.append({
            "number": index + 1,
            "title": title,
            "description": description,
            "icon": icon,
        })

    if len(cards) < card_count:
        fallback = build_fallback_poster_spec(prompt, theme, card_count)
        fallback_cards = poster_spec_to_dict(fallback)["cards"]
        cards.extend(fallback_cards[len(cards):card_count])

    cta_payload = payload.get("cta") if isinstance(payload.get("cta"), dict) else {}
    title = str(payload.get("title") or fallback_poster_spec_title(prompt)).strip()[:72]
    subtitle = str(payload.get("subtitle") or "A practical visual guide for technical teams.").strip()[:120]
    description = str(payload.get("description") or "Use this poster to explain the workflow clearly and quickly.").strip()[:180]

    return PosterSpec(
        title=title,
        subtitle=subtitle,
        description=description,
        posterType="numbered-cards",
        theme=normalize_poster_spec_theme(payload.get("theme") or theme),
        cards=[PosterSpecCard(**card) for card in cards[:card_count]],
        cta=PosterSpecCTA(
            text=str(cta_payload.get("text") or "Start building").strip()[:60],
            tag=str(cta_payload.get("tag") or "TECHPOSTER STUDIO").strip()[:40],
        ),
    )


def fallback_poster_spec_title(prompt: str) -> str:
    lowered = prompt.lower()
    if any(term in lowered for term in ["system design", "architecture", "scalable"]):
        return "System Design Basics"
    if any(term in lowered for term in ["ai engineer", "generative ai", "machine learning", "rag", "agent"]):
        return "AI Engineer Roadmap"
    if "python" in lowered:
        return "Python Cheat Sheet"
    if any(term in lowered for term in ["cloud", "aws", "azure", "gcp", "devops"]):
        return "Cloud Architecture Basics"
    if any(term in lowered for term in ["security", "auth", "jwt", "privacy"]):
        return "Security Checklist"
    return "Technical Poster Guide"


def fallback_card_templates(prompt: str) -> list[dict]:
    lowered = prompt.lower()
    if any(term in lowered for term in ["system design", "architecture", "scalable"]):
        return [
            {"title": "Requirements", "description": "Start with users, traffic, latency, scale, and core product constraints.", "icon": "chart"},
            {"title": "API Contract", "description": "Define clear request and response shapes before choosing internals.", "icon": "code"},
            {"title": "Data Model", "description": "Map entities, relationships, indexes, and consistency expectations.", "icon": "database"},
            {"title": "Storage", "description": "Choose SQL, NoSQL, object storage, or search based on access patterns.", "icon": "database"},
            {"title": "Caching", "description": "Cache hot reads near users and define invalidation rules early.", "icon": "spark"},
            {"title": "Scaling", "description": "Use queues, partitioning, replicas, and stateless services where needed.", "icon": "cloud"},
            {"title": "Observability", "description": "Track metrics, logs, traces, SLOs, and failure budgets from day one.", "icon": "chart"},
            {"title": "Security", "description": "Protect data with auth, authorization, encryption, and audit trails.", "icon": "shield"},
            {"title": "Trade-offs", "description": "Document cost, complexity, reliability, and operational risk decisions.", "icon": "spark"},
        ]
    if any(term in lowered for term in ["ai engineer", "generative ai", "machine learning", "rag", "agent"]):
        return [
            {"title": "Foundations", "description": "Learn Python, data handling, APIs, statistics, and software design basics.", "icon": "code"},
            {"title": "Prompting", "description": "Control instructions, examples, constraints, and output schemas.", "icon": "spark"},
            {"title": "Data", "description": "Prepare clean datasets, metadata, embeddings, and evaluation samples.", "icon": "database"},
            {"title": "RAG", "description": "Retrieve trusted context, rerank it, and cite the most relevant sources.", "icon": "database"},
            {"title": "Agents", "description": "Give models tools, memory, guardrails, and explicit task boundaries.", "icon": "chip"},
            {"title": "Evaluation", "description": "Measure quality, safety, latency, cost, and regression behavior.", "icon": "chart"},
            {"title": "Deployment", "description": "Ship monitored services with retries, rate limits, and fallbacks.", "icon": "cloud"},
            {"title": "Security", "description": "Avoid prompt leaks, secret exposure, unsafe tool use, and data misuse.", "icon": "shield"},
            {"title": "Optimization", "description": "Reduce cost with caching, batching, routing, and smaller models.", "icon": "spark"},
        ]
    if "python" in lowered:
        return [
            {"title": "Syntax", "description": "Use clean variables, functions, classes, and readable control flow.", "icon": "code"},
            {"title": "Collections", "description": "Master lists, dictionaries, sets, tuples, and comprehensions.", "icon": "database"},
            {"title": "Functions", "description": "Keep logic small, typed, reusable, and easy to test.", "icon": "code"},
            {"title": "Files & APIs", "description": "Read files, parse JSON, call APIs, and handle errors safely.", "icon": "cloud"},
            {"title": "Testing", "description": "Use focused unit tests and fixtures to catch regressions.", "icon": "chart"},
            {"title": "Packages", "description": "Manage dependencies with virtual environments and pinned versions.", "icon": "chip"},
            {"title": "Automation", "description": "Build scripts for repetitive data, backend, and tooling tasks.", "icon": "spark"},
            {"title": "Debugging", "description": "Inspect stack traces, logs, inputs, and edge cases methodically.", "icon": "shield"},
            {"title": "Production", "description": "Add logging, validation, retries, and secure configuration.", "icon": "cloud"},
        ]
    if any(term in lowered for term in ["cloud", "aws", "azure", "gcp", "devops"]):
        return [
            {"title": "Compute", "description": "Run workloads with containers, functions, VMs, or managed platforms.", "icon": "chip"},
            {"title": "Network", "description": "Design routing, DNS, load balancing, and private connectivity.", "icon": "cloud"},
            {"title": "Storage", "description": "Pick object, block, file, or database storage by access pattern.", "icon": "database"},
            {"title": "Database", "description": "Plan backups, replication, indexes, migrations, and retention.", "icon": "database"},
            {"title": "Security", "description": "Use least privilege, secrets management, encryption, and audits.", "icon": "shield"},
            {"title": "Scaling", "description": "Autoscale around traffic, queues, and service-level targets.", "icon": "chart"},
            {"title": "Monitoring", "description": "Collect metrics, logs, traces, alerts, and incident runbooks.", "icon": "chart"},
            {"title": "Cost", "description": "Track spend, rightsizing, reserved capacity, and idle resources.", "icon": "spark"},
            {"title": "Delivery", "description": "Automate builds, tests, deployments, rollback, and infrastructure.", "icon": "code"},
        ]
    return [
        {"title": "Goal", "description": "Define the outcome, audience, and one clear message.", "icon": "chart"},
        {"title": "Context", "description": "Explain why the topic matters and where it fits.", "icon": "spark"},
        {"title": "Workflow", "description": "Break the process into visible steps and decision points.", "icon": "code"},
        {"title": "Components", "description": "Show the main parts, responsibilities, and boundaries.", "icon": "chip"},
        {"title": "Data", "description": "Clarify inputs, outputs, storage, and validation rules.", "icon": "database"},
        {"title": "Risks", "description": "Call out failure cases, constraints, and safeguards.", "icon": "shield"},
        {"title": "Action", "description": "End with a specific next step the viewer can take.", "icon": "spark"},
        {"title": "Metrics", "description": "Measure success using quality, speed, cost, and reliability signals.", "icon": "chart"},
        {"title": "Iteration", "description": "Improve the system using feedback and production evidence.", "icon": "cloud"},
    ]


def build_fallback_poster_spec(prompt: str, theme: str, card_count: int) -> PosterSpec:
    title = fallback_poster_spec_title(prompt)
    cards = fallback_card_templates(prompt)[:card_count]
    return PosterSpec(
        title=title,
        subtitle="A numbered technical cards poster for fast learning.",
        description=f"Structured from the prompt: {clean_chat_text(prompt, 120)}",
        posterType="numbered-cards",
        theme=theme,
        cards=[PosterSpecCard(number=index + 1, **card) for index, card in enumerate(cards)],
        cta=PosterSpecCTA(text="Turn ideas into systems", tag="TECHPOSTER STUDIO"),
    )


# ─── API Endpoints ─────────────────────────────────────────────


@router.post("/generate-poster-spec", response_model=PosterSpecGenerateResponse)
async def generate_poster_spec(
    req: PosterSpecGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate validated editable poster content for the Fabric PosterSpec renderer."""
    del current_user
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    card_count = clamp_poster_spec_card_count(req)
    theme = normalize_poster_spec_theme(req.theme)
    style = (req.style or "professional").strip() or "professional"
    validation = {
        "schema": "PosterSpec/v1",
        "posterType": "numbered-cards",
        "requestedCardCount": card_count,
        "theme": theme,
        "providerAttempted": bool(settings.GEMINI_API_KEY),
        "fallbackUsed": False,
    }

    raw_text = ""
    provider_error = ""
    if settings.GEMINI_API_KEY:
        raw_text = call_gemini_api(build_poster_spec_prompt(prompt, theme, style, card_count))
        provider_error = get_last_gemini_error()

    if raw_text:
        try:
            poster_spec = normalize_poster_spec_payload(extract_json_object(raw_text), prompt, theme, card_count)
            validation["cardCount"] = len(poster_spec.cards)
            validation["providerValidJson"] = True
            return PosterSpecGenerateResponse(
                success=True,
                posterSpec=poster_spec,
                source="gemini:poster-spec",
                validation=validation,
                rawText=None,
            )
        except Exception as exc:
            validation["providerValidJson"] = False
            validation["fallbackUsed"] = True
            validation["fallbackReason"] = f"Invalid provider PosterSpec: {exc}"
            if provider_error:
                validation["providerError"] = provider_error

    poster_spec = build_fallback_poster_spec(prompt, theme, card_count)
    validation["cardCount"] = len(poster_spec.cards)
    validation["fallbackUsed"] = True
    if provider_error:
        validation["providerError"] = provider_error
        validation.setdefault("fallbackReason", provider_error)
    else:
        validation.setdefault("fallbackReason", "Gemini is not configured or returned no usable PosterSpec")
    return PosterSpecGenerateResponse(
        success=True,
        posterSpec=poster_spec,
        source="local:validated-poster-spec",
        validation=validation,
        rawText=None,
    )


@router.post("/generate-poster-template", response_model=PosterResponse)
async def generate_poster_template(req: PosterRequest):
    """Legacy JSON template endpoint. The main /generate-poster route returns a generated poster image."""
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    gemini_response = call_gemini_api(
        f"""You are a professional poster designer AI. Analyze this request and return a JSON poster design.

User request: "{prompt}"

Return ONLY a JSON object with these fields:
{{
    "heading": "Main title text (uppercase, short)",
    "subtitle": "Secondary text",
    "bg_color": "hex color for background",
    "primary_color": "hex color for main accent",
    "secondary_color": "hex color for text on dark bg",
    "accent_color": "hex color for highlights",
    "theme_name": "detected theme",
    "layout": "center/split/bold/minimal/grid",
    "elements": []
}}

Rules:
- Detect the industry/theme from the prompt
- Choose appropriate colors for that industry
- If user specifies colors in prompt, use them
- If user puts text in quotes, use that as heading
- Keep heading short (2-4 words max)
- Return ONLY valid JSON, no explanation"""
    )

    if gemini_response:
        poster_data = parse_gemini_response(gemini_response, prompt)
    else:
        poster_data = build_fallback_poster(prompt)

    return PosterResponse(**poster_data)


@router.post("/generate-reference-poster", response_model=PosterResponse)
async def generate_reference_poster(req: ReferencePosterRequest):
    """Generate a poster design based on user prompt and reference poster description."""
    prompt = req.prompt.strip()
    reference = req.reference_description.strip() if req.reference_description else ""

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Build a comprehensive prompt for Gemini that includes reference analysis
    full_prompt = f"""You are a professional poster designer AI. Create a poster design based on the user's request and reference description.

User's request: "{prompt}"
Reference poster description: "{reference if reference else 'No reference provided'}"

Analyze the reference poster's visual style, composition, typography, color palette, layout, lighting, and overall design language. Then create a new poster that:
1. Matches the visual quality and style of the reference
2. Incorporates the user's specific requirements
3. Maintains professional design principles

Return ONLY a JSON object with these fields:
{{
    "heading": "Main title text (uppercase, short)",
    "subtitle": "Secondary text",
    "bg_color": "hex color for background (matching reference style)",
    "primary_color": "hex color for main accent",
    "secondary_color": "hex color for text",
    "accent_color": "hex color for highlights",
    "theme_name": "detected theme",
    "layout": "center/split/bold/minimal/grid",
    "elements": []
}}

Rules:
- If reference is provided, match its visual style and color palette
- Detect the industry/theme from the prompt
- Choose appropriate colors that complement the reference
- If user specifies colors, prioritize those
- Keep heading short (2-4 words max)
- Return ONLY valid JSON, no explanation"""

    gemini_response = call_gemini_api(full_prompt)

    if gemini_response:
        poster_data = parse_gemini_response(gemini_response, prompt)
    else:
        poster_data = build_fallback_poster(prompt)

    return PosterResponse(**poster_data)


@router.post("/posters/generate", response_model=PosterGenerationResponse)
@router.post("/generate-poster-image", response_model=PosterGenerationResponse)
@router.post("/generate-poster", response_model=PosterGenerationResponse)
async def generate_poster_with_attachments(
    request: Request,
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    style: str = Form("auto"),
    width: int = Form(1080),
    height: int = Form(1350),
    aspect_ratio: str = Form("4:5"),
    quality: str = Form("high"),
    output_count: int = Form(1),
    request_id: str = Form(""),
    enhance_prompt: bool = Form(True),
    documents: List[UploadFile] = File(default=[]),
    images: List[UploadFile] = File(default=[]),
    uploaded_files: List[UploadFile] = File(default=[]),
    reference_images: List[UploadFile] = File(default=[]),
    logo: List[UploadFile] = File(default=[]),
    project_id: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a complete poster image from prompt plus uploaded attachments."""
    prompt_text = prompt.strip()
    client_request_id = clean_thumbnail_text(request_id, 120) or str(uuid.uuid4())
    if not prompt_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    all_documents = [*documents, *uploaded_files]
    all_images = [*images, *reference_images, *logo]
    document_items, image_items = build_uploaded_attachment_payload(all_documents, all_images)
    persisted_uploads: list[str] = []
    for item in document_items:
        try:
            upload_record = persist_uploaded_asset(
                db,
                base_url=str(request.base_url),
                user_id=current_user.id,
                project_id=project_id or None,
                filename=item.get("name") or "document",
                content=item.get("content") or b"",
                mime_type="application/octet-stream",
            )
            persisted_uploads.append(upload_record.id)
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Uploaded document persistence failed: {exc}") from exc
    for item in image_items:
        try:
            upload_record = persist_uploaded_asset(
                db,
                base_url=str(request.base_url),
                user_id=current_user.id,
                project_id=project_id or None,
                filename=item.get("name") or "image",
                content=item.get("content") or b"",
                mime_type=item.get("content_type") or "image/png",
            )
            persisted_uploads.append(upload_record.id)
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Uploaded image persistence failed: {exc}") from exc
    result = await run_in_threadpool(
        generate_poster_artifact,
        prompt=prompt_text,
        width=width,
        height=height,
        style=style,
        aspect_ratio=aspect_ratio,
        document_attachments=document_items,
        image_attachments=image_items,
        negative_prompt=negative_prompt,
        quality=quality,
        output_count=output_count,
    )
    if not result.get("success") or not (result.get("poster_url") or result.get("image_url")):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "AI_IMAGE_PROVIDERS_UNAVAILABLE",
                "message": result.get("message") or "Real AI poster generation is currently unavailable",
                "retryable": True,
                "request_id": client_request_id,
                "mode": "poster",
                "status": "failed",
                "providerAttempts": result.get("providerFailures") or result.get("provider_failures") or [],
                "providerFailures": result.get("providerFailures") or result.get("provider_failures") or [],
            },
        )

    try:
        persisted = persist_generated_asset(
            db,
            base_url=str(request.base_url),
            asset_type="poster",
            image_source=result.get("poster_url") or result.get("image_url"),
            original_prompt=prompt_text,
            enhanced_prompt=result.get("design", {}).get("image_prompt"),
            provider=result.get("provider") or result.get("source"),
            model=getattr(settings, "OPENAI_IMAGE_MODEL", None),
            width=width,
            height=height,
            fallback_used=bool(result.get("fallbackUsed") or result.get("fallback_used")),
            user_id=current_user.id,
            project_id=project_id or None,
            metadata={**result, "request_id": client_request_id, "original_prompt": prompt_text},
        )
        persist_generation_job(
            db,
            job_type="poster",
            status="completed",
            user_id=current_user.id,
            project_id=project_id or None,
            asset_id=persisted.id,
            provider=result.get("provider") or result.get("source"),
            metadata={"prompt": prompt_text, "request_id": client_request_id, "source": result.get("source"), "fallbackUsed": result.get("fallbackUsed")},
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Poster generated but persistence failed: {exc}") from exc

    provider_attempts = result.get("providerFailures") or result.get("provider_failures") or []
    result["status"] = "success"
    result["request_id"] = client_request_id
    result["generation_id"] = persisted.id
    result["mode"] = "poster"
    result["asset_id"] = persisted.id
    result["image_url"] = persisted.public_url
    result["poster_url"] = persisted.public_url
    result["original_prompt"] = prompt_text
    result["enhanced_prompt"] = result.get("design", {}).get("image_prompt") or prompt_text
    result["mime_type"] = persisted.mime_type
    result["width"] = persisted.width
    result["height"] = persisted.height
    result["aspect_ratio"] = aspect_ratio
    result["project_id"] = project_id or None
    result["provider_attempts"] = provider_attempts
    result.setdefault("result", {})
    result["result"]["assetId"] = persisted.id
    result["result"]["generationId"] = persisted.id
    result["result"]["requestId"] = client_request_id
    result["result"]["imageUrl"] = persisted.public_url
    result["result"]["mimeType"] = persisted.mime_type
    result["result"]["width"] = persisted.width
    result["result"]["height"] = persisted.height
    result["uploaded_asset_ids"] = persisted_uploads
    return PosterGenerationResponse(**result)


@router.post("/generate-image-prompt", response_model=ImagePromptResponse)
async def generate_image_prompt(req: ImagePromptRequest):
    """Generate an enhanced image generation prompt based on user request and reference."""
    prompt = req.prompt.strip()
    reference = req.reference_description.strip() if req.reference_description else ""
    request_id = str(uuid.uuid4())
    provider_attempts: list[dict] = []

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    enhancement_prompt = f"""You are an expert AI image prompt engineer. Analyze the user's request and reference description to create a highly detailed, context-aware image generation prompt.

User's request: "{prompt}"
Reference poster description: "{reference if reference else 'No reference provided'}"
Style: {req.style}
Aspect ratio: {req.aspect_ratio}

Create a detailed image generation prompt that:
1. Analyzes the reference poster's visual style, composition, typography, color palette, layout, lighting, and overall design language
2. Generates a prompt that would recreate a poster with similar visual quality
3. Incorporates the user's specific requirements

Return ONLY a JSON object with these fields:
{{
    "enhanced_prompt": "The detailed image generation prompt (200-400 words)",
    "style_analysis": "Brief analysis of the reference style",
    "color_palette": ["hex1", "hex2", "hex3", "hex4", "hex5"],
    "composition_notes": "Description of the composition",
    "lighting_description": "Description of the lighting",
    "visual_elements": ["element1", "element2", "element3", "element4"]
}}

Rules:
- Be extremely detailed in the enhanced_prompt
- Include specific artistic terms (lighting, composition, color theory)
- Match the reference poster's visual quality
- Include technical quality terms (8K, ultra-detailed, etc.)
- Return ONLY valid JSON, no explanation"""

    provider_calls = {
        "gemini": lambda: call_gemini_api(enhancement_prompt),
        "openai": lambda: call_openai_chat_api(enhancement_prompt, "prompt_enhancement", []),
        "pollinations": lambda: call_pollinations_chat_api(enhancement_prompt, "prompt_enhancement", []),
        "pollinations:text": lambda: call_pollinations_chat_api(enhancement_prompt, "prompt_enhancement", []),
    }

    for configured_source in get_chat_provider_order():
        source = "pollinations:text" if configured_source == "pollinations" else configured_source
        provider_call = provider_calls.get(source) or provider_calls.get(configured_source)
        if provider_call is None:
            continue
        if configured_source in {"openai", "gemini"} and not provider_configured(configured_source):
            provider_attempts.append({"provider": source, "status": "missing_api_key", "retryable": False})
            record_chat_provider_health(configured_source, False, "missing_api_key")
            continue
        try:
            clear_last_chat_provider_error(configured_source)
            raw_response = await run_in_threadpool(provider_call)
        except Exception as exc:
            failure = categorize_provider_error(exc)
            provider_attempts.append({"provider": source, "status": failure, "retryable": failure in CHAT_RETRYABLE_FAILURES})
            record_chat_provider_health(configured_source, False, failure)
            continue

        if raw_response:
            try:
                json_match = re.search(r'\{[\s\S]*\}', raw_response)
                if not json_match:
                    raise ValueError("Provider response did not include a JSON object")
                data = json.loads(json_match.group())
                required = ['enhanced_prompt', 'style_analysis', 'color_palette']
                if not all(k in data for k in required):
                    raise ValueError("Provider response missed required enhancement fields")
                record_chat_provider_health(configured_source, True)
                return ImagePromptResponse(
                    **data,
                    success=True,
                    status="completed",
                    request_id=request_id,
                    capability="prompt_enhancement",
                    provider=source,
                    source=source,
                    fallbackUsed=False,
                    provider_attempts=provider_attempts,
                )
            except (json.JSONDecodeError, Exception) as exc:
                provider_attempts.append({"provider": source, "status": "structured_output_parse_failed", "retryable": True})
                record_chat_provider_health(configured_source, False, "structured_output_parse_failed")
                print(f"AI prompt enhancement parse error ({type(exc).__name__})")
                continue

        failure = get_last_chat_provider_error(configured_source) or "empty_response"
        provider_attempts.append({"provider": source, "status": failure, "retryable": failure in CHAT_RETRYABLE_FAILURES})
        record_chat_provider_health(configured_source, False, failure)

    # Deterministic local draft is allowed only as a transparent, non-AI fallback.
    result = generate_enhanced_image_prompt(prompt, reference, req.style)
    return ImagePromptResponse(
        **result,
        success=False,
        status="fallback",
        request_id=request_id,
        capability="prompt_enhancement",
        provider="local",
        source="local:prompt-enhancement",
        fallbackUsed=True,
        fallbackReason="No configured text AI provider returned a valid prompt-enhancement JSON response.",
        provider_attempts=provider_attempts,
    )


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chat with AI assistant about design."""
    prompt = req.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    request_id = clean_thumbnail_text(req.request_id or "", 120) or str(uuid.uuid4())
    context = req.context or "poster_design"
    conversation_id = stable_conversation_id(req.conversation_id)

    client_message_id = clean_thumbnail_text(req.message_id or "", 120) or generate_id("msg")
    assistant_message_id = generate_id("msg")
    requested_provider = normalize_requested_chat_provider(req.provider)
    provider_order = get_chat_provider_order()
    if requested_provider:
        provider_order = [requested_provider]
    provider_calls = {
        "gemini": lambda model=None: call_gemini_api(build_chat_prompt(prompt, context, req.history), model=model),
        "openai": lambda model=None: call_openai_chat_api(prompt, context, req.history, model=model),
        "pollinations": lambda: call_pollinations_chat_api(prompt, context, req.history),
        "pollinations:text": lambda: call_pollinations_chat_api(prompt, context, req.history),
    }
    provider_attempts: list[dict] = []

    for configured_source in provider_order:
        provider_call = provider_calls.get(configured_source)
        if not provider_call:
            continue
        source = "pollinations:text" if configured_source == "pollinations" else configured_source
        model_name = get_chat_model(source, req.model if requested_provider and configured_source == requested_provider else None)
        if configured_source in {"openai", "gemini"} and not provider_configured(configured_source):
            provider_attempts.append({"provider": source, "model": model_name, "status": "missing_api_key", "retryable": False})
            record_chat_provider_health(configured_source, False, "missing_api_key")
            continue
        try:
            clear_last_chat_provider_error(configured_source)
            if configured_source in {"openai", "gemini"}:
                reply = await run_in_threadpool(provider_call, model_name)
            else:
                reply = await run_in_threadpool(provider_call)
        except Exception as exc:
            failure = categorize_provider_error(exc)
            provider_attempts.append({"provider": source, "model": model_name, "status": failure, "retryable": failure in CHAT_RETRYABLE_FAILURES})
            record_chat_provider_health(configured_source, False, failure)
            continue
        if reply and reply.strip():
            record_chat_provider_health(configured_source, True)
            try:
                save_chat_exchange(
                    db,
                    user=current_user,
                    conversation_id=conversation_id,
                    project_id=req.project_id,
                    user_message=prompt,
                    assistant_reply=reply,
                    provider=source,
                    user_message_id=client_message_id,
                    assistant_message_id=assistant_message_id,
                )
            except Exception as exc:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Chat response generated but persistence failed: {exc}") from exc
            return ChatResponse(
                success=True,
                status="completed",
                request_id=request_id,
                reply=reply,
                message=reply,
                suggestions=extract_chat_suggestions(reply),
                poster_data=None,
                provider=source,
                source=source,
                model=model_name,
                usage={},
                finish_reason="stop",
                fallbackUsed=False,
                conversation_id=conversation_id,
                user_message_id=client_message_id,
                assistant_message_id=assistant_message_id,
                provider_attempts=provider_attempts,
            )
        failure = get_last_chat_provider_error(configured_source) or "empty_response"
        provider_attempts.append({"provider": source, "model": model_name, "status": failure, "retryable": failure in CHAT_RETRYABLE_FAILURES})
        record_chat_provider_health(configured_source, False, failure)

    raise HTTPException(
        status_code=503,
        detail={
            "code": "AI_CHAT_PROVIDERS_UNAVAILABLE",
            "message": "No configured AI chat provider returned a response. Please retry after provider access is restored.",
            "retryable": True,
            "request_id": request_id,
            "status": "failed",
            "provider": requested_provider or "auto",
            "model": req.model,
            "conversation_id": conversation_id,
            "user_message_id": client_message_id,
            "providerAttempts": provider_attempts,
            "provider_attempts": provider_attempts,
        },
    )


@router.get("/chat/{conversation_id}")
async def get_chat_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stable_id = stable_conversation_id(conversation_id)
    session = db.query(ChatSession).filter(
        ChatSession.id == stable_id,
        ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        return {"conversation_id": stable_id, "messages": []}
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == stable_id,
        ChatMessage.user_id == current_user.id,
    ).order_by(ChatMessage.created_at.asc()).all()
    return {
        "conversation_id": stable_id,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "provider": message.provider,
                "created_at": message.created_at.isoformat() if message.created_at else "",
            }
            for message in messages
        ],
    }


@router.post("/images/generate")
@router.post("/generate-image")
async def generate_image(
    req: ImageGenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an image URL via backend proxy to avoid CORS and Turnstile issues."""
    prompt = req.prompt.strip()
    client_request_id = clean_thumbnail_text(req.request_id or "", 120) or str(uuid.uuid4())
    safe_width = max(320, min(int(req.width or 1024), 1920))
    safe_height = max(320, min(int(req.height or 1024), 1920))
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    result = await run_in_threadpool(generate_image_via_proxy, prompt, safe_width, safe_height)
    if not result.get("success") or not result.get("url"):
        provider_failures = result.get("provider_failures") or []
        raise HTTPException(status_code=503, detail={
            "code": "AI_IMAGE_PROVIDERS_UNAVAILABLE",
            "message": result.get("error") or "No real AI image provider returned an image.",
            "retryable": True,
            "request_id": client_request_id,
            "mode": "image",
            "status": "failed",
            "providerAttempts": provider_failures,
            "providerFailures": provider_failures,
        })
    result = await run_in_threadpool(normalize_image_result_to_dimensions, result, safe_width, safe_height)
    result_metadata = build_thumbnail_result_metadata(result, safe_width, safe_height)
    if result_metadata["fallbackUsed"] or not result_metadata["productionQuality"]:
        raise HTTPException(status_code=503, detail={
            "code": "AI_IMAGE_PROVIDERS_UNAVAILABLE",
            "message": "No real AI image provider returned a production-quality image.",
            "retryable": True,
            "request_id": client_request_id,
            "mode": "image",
            "status": "failed",
            "providerAttempts": result.get("provider_failures") or [],
            "providerFailures": result.get("provider_failures") or [],
        })
    try:
        persisted = persist_generated_asset(
            db,
            base_url=str(request.base_url),
            asset_type="image",
            image_source=result["url"],
            original_prompt=prompt,
            enhanced_prompt=prompt,
            provider=result.get("source"),
            model=req.model,
            width=safe_width,
            height=safe_height,
            fallback_used=False,
            user_id=current_user.id,
            project_id=req.project_id,
            metadata={**result, "request_id": client_request_id, "original_prompt": prompt},
        )
        persist_generation_job(
            db,
            job_type="image",
            status="completed",
            user_id=current_user.id,
            project_id=req.project_id,
            asset_id=persisted.id,
            provider=result.get("source"),
            metadata={"prompt": prompt, "request_id": client_request_id, "source": result.get("source")},
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Image generated but persistence failed: {exc}") from exc
    result["success"] = True
    result["status"] = "success"
    result["request_id"] = client_request_id
    result["generation_id"] = persisted.id
    result["mode"] = "image"
    result["asset_id"] = persisted.id
    result["url"] = persisted.public_url
    result["image_url"] = persisted.public_url
    result["original_prompt"] = prompt
    result["enhanced_prompt"] = prompt
    result["mime_type"] = persisted.mime_type
    result["width"] = persisted.width
    result["height"] = persisted.height
    result["aspect_ratio"] = req.aspect_ratio
    result["project_id"] = req.project_id
    result["productionQuality"] = True
    result["fallbackUsed"] = False
    result["provider_attempts"] = result.get("provider_failures") or []
    result["result"] = {
        "assetId": persisted.id,
        "generationId": persisted.id,
        "requestId": client_request_id,
        "imageUrl": persisted.public_url,
        "mimeType": persisted.mime_type,
        "width": persisted.width,
        "height": persisted.height,
    }
    return result


@router.post("/thumbnails/generate", response_model=ThumbnailGenerationResponse)
@router.post("/generate-thumbnail", response_model=ThumbnailGenerationResponse)
async def generate_thumbnail(
    request: Request,
    prompt: str = Form(...),
    title: str = Form(""),
    subtitle: str = Form(""),
    platform: str = Form("youtube"),
    style: str = Form("bold"),
    aspect_ratio: str = Form("16:9"),
    width: int = Form(1280),
    height: int = Form(720),
    quality: str = Form("high"),
    output_count: int = Form(1),
    request_id: str = Form(""),
    enhance_prompt: bool = Form(True),
    reference_images: List[UploadFile] = File(default=[]),
    face_image: List[UploadFile] = File(default=[]),
    logo: List[UploadFile] = File(default=[]),
    project_id: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a complete AI thumbnail image from prompt, settings, and optional uploaded references."""
    prompt_text = clean_thumbnail_text(prompt, 900)
    client_request_id = clean_thumbnail_text(request_id, 120) or str(uuid.uuid4())
    if not prompt_text:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    safe_width = max(320, min(int(width or 1280), 1920))
    safe_height = max(320, min(int(height or 720), 1920))
    if safe_width <= safe_height and (platform or "").lower() == "youtube":
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "status": "failed",
                "request_id": client_request_id,
                "mode": "thumbnail",
                "error_code": "INVALID_THUMBNAIL_DIMENSIONS",
                "message": "YouTube thumbnails must use landscape dimensions such as 1280×720.",
            },
        )
    if (aspect_ratio or "16:9") == "16:9" and safe_width * 9 != safe_height * 16:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "status": "failed",
                "request_id": client_request_id,
                "mode": "thumbnail",
                "error_code": "INVALID_ASPECT_RATIO",
                "message": f"16:9 thumbnails require matching landscape dimensions; received {safe_width}×{safe_height}.",
            },
        )

    all_images = [*reference_images, *face_image, *logo]
    for upload in all_images:
        if upload and upload.filename and not is_valid_attachment(upload.filename, {".png", ".jpg", ".jpeg", ".webp"}):
            raise HTTPException(status_code=400, detail=f"Unsupported image type: {upload.filename}")
    persisted_uploads: list[str] = []
    for upload in all_images:
        if not upload or not upload.filename:
            continue
        content = read_upload_content(upload)
        if len(content) > 12 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Image too large: {upload.filename}")
        try:
            upload_record = persist_uploaded_asset(
                db,
                base_url=str(request.base_url),
                user_id=current_user.id,
                project_id=project_id or None,
                filename=upload.filename,
                content=content,
                mime_type=upload.content_type or "image/png",
            )
            persisted_uploads.append(upload_record.id)
        except Exception as exc:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Uploaded image persistence failed: {exc}") from exc

    count = max(1, min(int(output_count or 1), 4))
    enhanced_prompt = build_thumbnail_image_prompt(
        prompt=prompt_text,
        title=title,
        subtitle=subtitle,
        platform=platform,
        style=style,
        aspect_ratio=aspect_ratio,
        width=safe_width,
        height=safe_height,
        quality=quality,
        reference_count=len(reference_images or []),
        has_face=bool(face_image),
        has_logo=bool(logo),
    ) if enhance_prompt else prompt_text

    variations: list[dict] = []
    provider_attempts: list[dict] = []
    for index in range(count):
        provider_prompt = enhanced_prompt if index == 0 else f"{enhanced_prompt}\nVariation {index + 1}: keep the same subject but change the layout, focal framing, colors, and visual energy."
        image_result = await run_in_threadpool(generate_image_via_proxy, provider_prompt, safe_width, safe_height)
        if image_result.get("provider_failures"):
            provider_attempts = image_result.get("provider_failures", [])
        image_value = image_result.get("url", "")
        if image_value:
            try:
                image_result = await run_in_threadpool(normalize_image_result_to_dimensions, image_result, safe_width, safe_height)
            except Exception as exc:
                provider_attempts.append({"provider": image_result.get("source", "unknown"), "category": "invalid_image_dimensions"})
                print(f"Thumbnail image normalization failed ({type(exc).__name__})")
                continue
            image_value = image_result.get("url", "")
            metadata = build_thumbnail_result_metadata(image_result, safe_width, safe_height)
            if metadata["fallbackUsed"] or not metadata["productionQuality"]:
                continue
            variations.append({
                "index": index,
                "image_url": image_value,
                "thumbnail_url": image_value,
                "provider": image_result.get("source", "unknown"),
                "source": metadata["source"],
                "fallbackUsed": metadata["fallbackUsed"],
                "productionQuality": metadata["productionQuality"],
                "fallbackReason": metadata["fallbackReason"],
                "result": metadata["result"],
                "seed": image_result.get("seed"),
            })

    if not variations:
        attempts = provider_attempts or (image_result.get("provider_failures", []) if 'image_result' in locals() else [])
        raise HTTPException(status_code=503, detail={
            "success": False,
            "status": "failed",
            "request_id": client_request_id,
            "mode": "thumbnail",
            "error_code": "NO_IMAGE_PROVIDER_AVAILABLE",
            "code": "AI_IMAGE_PROVIDERS_UNAVAILABLE",
            "message": "No real AI image provider returned a production-quality thumbnail.",
            "retryable": True,
            "provider_attempts": attempts,
            "providerFailures": attempts,
        })

    primary = variations[0]
    fallback_used = bool(primary.get("fallbackUsed"))
    production_quality = bool(primary.get("productionQuality"))
    fallback_reason = primary.get("fallbackReason")
    design = {
        "prompt": prompt_text,
        "title": clean_thumbnail_text(title, 120),
        "subtitle": clean_thumbnail_text(subtitle, 160),
        "platform": platform,
        "style": style,
        "aspect_ratio": aspect_ratio,
        "width": safe_width,
        "height": safe_height,
        "quality": quality,
        "enhanced_prompt": enhanced_prompt,
        "editable_as": "single_image_layer",
        "provider": primary.get("provider"),
        "source": primary.get("source"),
        "request_id": client_request_id,
        "productionQuality": production_quality,
        "fallbackUsed": fallback_used,
        "fallbackReason": fallback_reason,
    }
    try:
        persisted = persist_generated_asset(
            db,
            base_url=str(request.base_url),
            asset_type="thumbnail",
            image_source=primary["image_url"],
            original_prompt=prompt_text,
            enhanced_prompt=enhanced_prompt,
            provider=primary.get("provider"),
            model="flux",
            width=safe_width,
            height=safe_height,
            fallback_used=False,
            user_id=current_user.id,
            project_id=project_id or None,
            metadata={
                "design": design,
                "provider": primary.get("provider"),
                "source": primary.get("source"),
                "seed": primary.get("seed"),
                "request_id": client_request_id,
                "uploaded_asset_ids": persisted_uploads,
            },
        )
        persist_generation_job(
            db,
            job_type="thumbnail",
            status="completed",
            user_id=current_user.id,
            project_id=project_id or None,
            asset_id=persisted.id,
            provider=primary.get("provider"),
            metadata={"prompt": prompt_text, "request_id": client_request_id, "source": primary.get("source"), "fallbackUsed": primary.get("fallbackUsed")},
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Thumbnail generated but persistence failed: {exc}") from exc
    primary["asset_id"] = persisted.id
    primary["generation_id"] = persisted.id
    primary["request_id"] = client_request_id
    primary["image_url"] = persisted.public_url
    primary["thumbnail_url"] = persisted.public_url
    primary.setdefault("result", {})
    primary["result"]["assetId"] = persisted.id
    primary["result"]["generationId"] = persisted.id
    primary["result"]["requestId"] = client_request_id
    primary["result"]["imageUrl"] = persisted.public_url
    primary["result"]["mimeType"] = persisted.mime_type
    primary["result"]["width"] = safe_width
    primary["result"]["height"] = safe_height
    primary["uploaded_asset_ids"] = persisted_uploads

    return ThumbnailGenerationResponse(
        success=True,
        status="success",
        request_id=client_request_id,
        generation_id=persisted.id,
        mode="thumbnail",
        asset_id=primary.get("asset_id"),
        image_url=primary["image_url"],
        thumbnail_url=primary["thumbnail_url"],
        original_prompt=prompt_text,
        enhanced_prompt=enhanced_prompt,
        mime_type=persisted.mime_type,
        width=safe_width,
        height=safe_height,
        aspect_ratio=aspect_ratio,
        project_id=project_id or None,
        provider_attempts=provider_attempts,
        design=design,
        message=f"Thumbnail generated with {primary.get('provider', 'AI provider')}",
        provider=primary.get("provider"),
        source=primary.get("source"),
        productionQuality=production_quality,
        fallbackUsed=fallback_used,
        fallbackReason=fallback_reason,
        result=primary.get("result"),
        variations=variations,
        uploaded_asset_ids=persisted_uploads,
    )


@router.get("/cache/status")
async def get_cache_status(_current_user: User = Depends(get_current_user)):
    """Get cache status for debugging."""
    return {
        "cached_items": len(_response_cache),
        "cache_ttl_hours": _cache_ttl.total_seconds() / 3600,
        "items": [
            {
                "key": key[:8] + "...",
                "cached_at": str(cached_time),
                "response_length": len(cached_response)
            }
            for key, (cached_time, cached_response) in list(_response_cache.items())[:10]
        ]
    }


@router.delete("/cache")
async def clear_cache(_current_user: User = Depends(get_current_user)):
    """Clear the response cache."""
    _response_cache.clear()
    return {"message": "Cache cleared successfully"}


@router.get("/health")
async def ai_health_check(_current_user: User = Depends(get_current_user)):
    """Authenticated, secret-safe AI diagnostics endpoint."""
    return build_ai_health_payload()
