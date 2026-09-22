import asyncio
import pytest
from fastapi import HTTPException
from services import (
    ai_policy,
    background_removal_service,
    ocr_service,
    local_generation,
)
from routes import ai, ai_poster, elements


def test_local_policy_blocks_all_cloud_dispatch_even_with_keys(monkeypatch):
    def network(*args, **kwargs):
        pytest.fail("Local mode attempted an external inference call")

    monkeypatch.setattr(ai.urllib.request, "urlopen", network)
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "test-not-a-live-key")
    monkeypatch.setenv("AI_EXECUTION_MODE", "cloud")
    assert ai_policy.local_only()
    for call in [
        lambda: ai.generate_image_via_proxy("hello"),
        lambda: ai_poster.generate_image("hello"),
        lambda: ai.call_gemini_api("hello"),
        lambda: ai.call_openai_chat_api("hello", "poster", []),
        lambda: ocr_service._extract_with_openai(b"x", "image/png", "en"),
    ]:
        with pytest.raises(HTTPException) as error:
            call()
        assert error.value.status_code == 503
    with pytest.raises(HTTPException):
        asyncio.run(
            elements.generate_ai_element(
                elements.AIElementGenerateRequest(prompt="house"), None, None, None
            )
        )
    monkeypatch.setenv("REMOVE_BG_API_KEY", "test-not-a-live-key")
    assert background_removal_service.remove_background_with_provider(b"x") is None
    monkeypatch.setattr(ocr_service.settings, "OCR_PROVIDER", "gemini,apple-vision")
    assert ocr_service._configured_providers() == ["apple-vision"]


def test_local_child_environment_does_not_inherit_keys_or_proxies(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-not-a-live-key")
    monkeypatch.setenv("HTTPS_PROXY", "https://example.test")
    monkeypatch.setenv("LOCAL_AI_STORAGE", "/tmp/local-models")
    env = local_generation.runtime_environment()
    assert "OPENAI_API_KEY" not in env and "HTTPS_PROXY" not in env
    assert env["HF_HUB_OFFLINE"] == "1"
    assert env["LOCAL_AI_STORAGE"] == "/tmp/local-models"
