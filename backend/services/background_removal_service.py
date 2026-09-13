import io
import os
from typing import Optional

from PIL import Image


def remove_background_with_provider(payload: bytes) -> Optional[Image.Image]:
    """Use the configured production provider, returning None for the local fallback."""
    api_key = os.getenv("REMOVE_BG_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        import httpx

        response = httpx.post(
            "https://api.remove.bg/v1.0/removebg",
            headers={"X-Api-Key": api_key},
            files={"image_file": ("image.png", payload, "application/octet-stream")},
            data={"size": "auto", "format": "png"},
            timeout=120.0,
        )
        response.raise_for_status()
        if not response.headers.get("content-type", "").startswith("image/") or not response.content:
            return None
        result = Image.open(io.BytesIO(response.content)).convert("RGBA")
        result.load()
        return result
    except Exception:
        return None
