#!/usr/bin/env python3
"""Safe smoke tests for configured AI chat and image providers.

No API keys, bearer tokens, provider URLs, prompts with secrets, or image data are printed.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import ENV_LOADED, ENV_PATH, key_fingerprint, settings  # noqa: E402
from routes import ai  # noqa: E402

CHAT_PROMPT = "Explain AI image generation in three short, simple points."
IMAGE_PROMPT = (
    "Create a professional 16:9 YouTube thumbnail showing an owl, fox, and raccoon "
    "under a starry night sky with deep blue and purple colors."
)
WIDTH = 1280
HEIGHT = 720
RETRYABLE = {"rate_limited", "quota_or_rate_limit", "timeout", "network_error", "network_or_ssl_error", "provider_5xx", "provider_server_error", "provider_unavailable"}


def elapsed_ms(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


def category_retryable(category: str | None) -> bool:
    return bool(category in RETRYABLE)


def chat_model(provider: str) -> str | None:
    if provider == "openai":
        return getattr(settings, "OPENAI_CHAT_MODEL", "gpt-4o-mini")
    if provider == "gemini":
        return "gemini-1.5-flash"
    if provider == "pollinations":
        return "pollinations:text"
    return None


def image_model(provider: str) -> str | None:
    if provider == "openai":
        return getattr(settings, "OPENAI_IMAGE_MODEL", "gpt-image-1")
    if provider == "gemini":
        return getattr(settings, "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    if provider == "pollinations":
        return "flux"
    return None


def chat_result(provider: str, configured: bool, call):
    started = time.perf_counter()
    record = {
        "provider": provider,
        "capability": "chat",
        "model": chat_model(provider),
        "configured": configured,
        "success": False,
        "http_status": None,
        "response_chars": 0,
        "error_category": "missing_api_key" if not configured else None,
        "retryable": False,
        "elapsed_ms": None,
    }
    if not configured:
        record["elapsed_ms"] = elapsed_ms(started)
        return record
    try:
        ai.clear_last_chat_provider_error(provider)
        content = call()
        category = None if content and content.strip() else ai.get_last_chat_provider_error(provider) or "empty_response"
        record.update({
            "success": bool(content and content.strip()),
            "response_chars": len(content.strip()) if content else 0,
            "error_category": category,
            "retryable": category_retryable(category),
        })
    except Exception as exc:  # pragma: no cover - smoke diagnostic path
        category = ai.categorize_provider_error(exc)
        record.update({
            "success": False,
            "http_status": getattr(exc, "code", None),
            "error_category": category,
            "retryable": category_retryable(category),
            "exception_type": type(exc).__name__,
        })
    finally:
        record["elapsed_ms"] = elapsed_ms(started)
    return record


def image_result(provider: str, configured: bool, call):
    started = time.perf_counter()
    record = {
        "provider": provider,
        "capability": "image",
        "model": image_model(provider),
        "configured": configured,
        "success": False,
        "http_status": None,
        "source": None,
        "mime_type": None,
        "width": None,
        "height": None,
        "normalized_to_requested_size": False,
        "error_category": "missing_api_key" if not configured else None,
        "retryable": False,
        "elapsed_ms": None,
    }
    if not configured:
        record["elapsed_ms"] = elapsed_ms(started)
        return record
    try:
        result = call()
        category = result.get("error_category") or result.get("error")
        record.update({
            "success": bool(result.get("success")),
            "http_status": result.get("http_status"),
            "source": result.get("source"),
            "mime_type": result.get("mime_type"),
            "width": result.get("width"),
            "height": result.get("height"),
            "error_category": category,
            "retryable": category_retryable(category),
        })
        if result.get("success") and result.get("url"):
            normalized = ai.normalize_image_result_to_dimensions(result, WIDTH, HEIGHT)
            record.update({
                "success": bool(normalized.get("success")),
                "mime_type": normalized.get("mime_type"),
                "width": normalized.get("width"),
                "height": normalized.get("height"),
                "normalized_to_requested_size": normalized.get("width") == WIDTH and normalized.get("height") == HEIGHT,
                "error_category": None,
                "retryable": False,
            })
    except Exception as exc:  # pragma: no cover - smoke diagnostic path
        category = ai.categorize_provider_error(exc)
        record.update({
            "success": False,
            "http_status": getattr(exc, "code", None),
            "error_category": category,
            "retryable": category_retryable(category),
            "exception_type": type(exc).__name__,
        })
    finally:
        record["elapsed_ms"] = elapsed_ms(started)
    return record


def main() -> int:
    report = {
        "environment": {
            "file": str(ENV_PATH),
            "loaded": ENV_LOADED,
            "chat_provider_priority": ai.get_chat_provider_order(),
            "image_provider_priority": ai.get_image_provider_order(),
            "prompt_dimensions": {"width": WIDTH, "height": HEIGHT, "aspect_ratio": "16:9"},
        },
        "key_fingerprints": {
            "openai": key_fingerprint(settings.OPENAI_API_KEY),
            "gemini": key_fingerprint(settings.GEMINI_API_KEY),
        },
        "results": [],
    }
    history = None
    report["results"].extend([
        chat_result("openai", bool(settings.OPENAI_API_KEY), lambda: ai.call_openai_chat_api(CHAT_PROMPT, "poster_design", history)),
        image_result("openai", bool(settings.OPENAI_API_KEY), lambda: ai.generate_image_openai(IMAGE_PROMPT, WIDTH, HEIGHT)),
        chat_result("gemini", bool(settings.GEMINI_API_KEY), lambda: ai.call_gemini_api(ai.build_chat_prompt(CHAT_PROMPT, "poster_design", history))),
        image_result("gemini", bool(settings.GEMINI_API_KEY), lambda: ai.generate_image_gemini(IMAGE_PROMPT, WIDTH, HEIGHT)),
        chat_result("pollinations", bool(getattr(settings, "ENABLE_POLLINATIONS_FALLBACK", True)), lambda: ai.call_pollinations_chat_api(CHAT_PROMPT, "poster_design", history)),
        image_result("pollinations", bool(getattr(settings, "ENABLE_POLLINATIONS_FALLBACK", True)), lambda: ai.generate_image_pollinations(IMAGE_PROMPT, WIDTH, HEIGHT, seed=910271)),
    ])
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if any(item.get("success") for item in report["results"]) else 2


if __name__ == "__main__":
    raise SystemExit(main())
