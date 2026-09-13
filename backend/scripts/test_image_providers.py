#!/usr/bin/env python3
"""Safe local smoke test for configured image providers.

This script intentionally never prints API keys, auth headers, provider URLs, or image data.
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

PROMPT = (
    "Create a simple professional 16:9 zoo thumbnail with silhouettes of a giraffe, "
    "elephant, and monkey on a pastel background."
)
WIDTH = 1280
HEIGHT = 720


def safe_result(provider: str, configured: bool, call):
    started = time.perf_counter()
    record = {
        "provider": provider,
        "configured": configured,
        "success": False,
        "source": None,
        "mime_type": None,
        "width": None,
        "height": None,
        "error_category": "not_configured" if not configured else None,
        "elapsed_ms": None,
    }
    if not configured:
        return record
    try:
        result = call()
        record.update({
            "success": bool(result.get("success")),
            "source": result.get("source"),
            "mime_type": result.get("mime_type"),
            "width": result.get("width"),
            "height": result.get("height"),
            "error_category": result.get("error_category") or result.get("error"),
        })
        if result.get("success") and result.get("url"):
            try:
                normalized = ai.normalize_image_result_to_dimensions(result, WIDTH, HEIGHT)
                record.update({
                    "mime_type": normalized.get("mime_type"),
                    "width": normalized.get("width"),
                    "height": normalized.get("height"),
                    "normalized_to_requested_size": True,
                })
            except Exception as exc:  # pragma: no cover - diagnostic path
                record.update({
                    "success": False,
                    "error_category": "invalid_image_response",
                    "decode_error_type": type(exc).__name__,
                })
    except Exception as exc:  # pragma: no cover - diagnostic path
        record.update({
            "success": False,
            "error_category": ai.categorize_provider_error(exc),
            "exception_type": type(exc).__name__,
        })
    finally:
        record["elapsed_ms"] = round((time.perf_counter() - started) * 1000)
    return record


def main() -> int:
    report = {
        "environment": {
            "file": str(ENV_PATH),
            "loaded": ENV_LOADED,
            "provider_priority": ai.get_image_provider_order(),
        },
        "key_fingerprints": {
            "openai": key_fingerprint(settings.OPENAI_API_KEY),
            "gemini": key_fingerprint(settings.GEMINI_API_KEY),
        },
        "results": [],
    }
    report["results"].append(safe_result(
        "openai",
        bool(settings.OPENAI_API_KEY),
        lambda: ai.generate_image_openai(PROMPT, WIDTH, HEIGHT),
    ))
    report["results"].append(safe_result(
        "gemini",
        bool(settings.GEMINI_API_KEY),
        lambda: ai.generate_image_gemini(PROMPT, WIDTH, HEIGHT),
    ))
    report["results"].append(safe_result(
        "pollinations",
        bool(getattr(settings, "ENABLE_POLLINATIONS_FALLBACK", True)),
        lambda: ai.generate_image_pollinations(PROMPT, WIDTH, HEIGHT, seed=910271),
    ))
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if any(item.get("success") for item in report["results"]) else 2


if __name__ == "__main__":
    raise SystemExit(main())
