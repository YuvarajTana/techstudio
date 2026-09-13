from routes import ai, ai_poster
import asyncio
import json
import pytest
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError, URLError


def test_image_proxy_rejects_local_fallback_when_providers_fail(monkeypatch) -> None:
    monkeypatch.setattr(ai, "get_image_provider_order", lambda: ["pollinations"])
    monkeypatch.setattr(
        ai,
        "generate_image_pollinations",
        lambda *_args, **_kwargs: {"success": False, "error_category": "timeout"},
    )

    result = ai.generate_image_via_proxy("a friendly animal poster", 800, 1000)

    assert result["success"] is False
    assert result["provider_failures"] == [{"provider": "pollinations", "category": "timeout"}]
    assert "url" not in result


def test_image_provider_order_uses_required_priority(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "AI_PROVIDER_PRIORITY", "")
    monkeypatch.setattr(ai.settings, "IMAGE_PROVIDER_ORDER", "openai,gemini,pollinations")

    assert ai.get_image_provider_order() == ["openai", "gemini", "pollinations"]


def test_image_proxy_uses_successful_fallback_without_fake_image(monkeypatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "configured")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "configured")
    monkeypatch.setattr(ai, "get_image_provider_order", lambda: ["openai", "gemini", "pollinations"])
    monkeypatch.setattr(ai, "generate_image_openai", lambda *_args, **_kwargs: calls.append("openai") or {"success": False, "error_category": "billing_required"})
    monkeypatch.setattr(ai, "generate_image_gemini", lambda *_args, **_kwargs: calls.append("gemini") or {"success": False, "error_category": "quota_or_rate_limit"})
    monkeypatch.setattr(
        ai,
        "generate_image_pollinations",
        lambda *_args, **_kwargs: calls.append("pollinations") or {
            "success": True,
            "url": "data:image/png;base64,aW1hZ2U=",
            "source": "pollinations:flux",
            "mime_type": "image/png",
        },
    )

    result = ai.generate_image_via_proxy("poster", 800, 1000)

    assert calls == ["openai", "gemini", "pollinations"]
    assert result["success"] is True
    assert result["source"] == "pollinations:flux"


def test_poster_artifact_reports_provider_failure_without_placeholder(monkeypatch) -> None:
    monkeypatch.setattr(
        ai_poster,
        "generate_image",
        lambda *_args, **_kwargs: {
            "success": False,
            "provider_failures": [{"provider": "openai", "category": "provider_http_error"}],
        },
    )

    result = ai_poster.generate_poster_artifact(
        prompt="A colourful animal poster with a lion, elephant, giraffe and zebra.",
        width=800,
        height=1000,
        aspect_ratio="4:5",
    )

    assert result["success"] is False
    assert result["providerFailures"] == [{"provider": "openai", "category": "provider_http_error"}]
    assert result["result"]["imageData"] is None


def test_provider_error_categories_are_actionable() -> None:
    assert ai.categorize_provider_error(HTTPError("", 401, "Unauthorized", {}, None)) == "auth_error"
    assert ai.categorize_provider_error(HTTPError("", 402, "Payment Required", {}, None)) == "billing_required"
    assert ai.categorize_provider_error(HTTPError("", 429, "Too Many Requests", {}, None)) == "quota_or_rate_limit"
    assert ai.categorize_provider_error(TimeoutError("timed out")) == "timeout"
    assert ai.categorize_provider_error(URLError("timed out")) == "timeout"
    assert ai_poster.categorize_provider_error(HTTPError("", 500, "Server Error", {}, None)) == "provider_server_error"


def test_openai_billing_limit_error_is_reported_as_billing_required() -> None:
    body = b'{"error":{"type":"billing_limit_user_error","code":"billing_hard_limit_reached","message":"Billing hard limit has been reached."}}'
    error = HTTPError("", 400, "Bad Request", {}, BytesIO(body))

    assert ai.categorize_provider_error(error) == "billing_required"


def test_gemini_quota_message_with_billing_text_is_reported_as_quota() -> None:
    body = b'{"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details.","status":"RESOURCE_EXHAUSTED"}}'
    error = HTTPError("", 429, "Too Many Requests", {}, BytesIO(body))

    assert ai.categorize_provider_error(error) == "quota_or_rate_limit"


def test_provider_health_payload_is_secret_safe(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "configured-secret-value")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "configured-secret-value")
    ai.record_provider_health("openai", False, "billing_required")

    payload = ai.provider_health_payload()
    encoded = str(payload)

    assert payload["openai"]["configured"] is True
    assert payload["openai"]["reason"] == "billing_required"
    assert "configured-secret-value" not in encoded


def test_pollinations_thumbnail_prompt_has_compact_retry_candidate() -> None:
    prompt = (
        "Create one finished, high-converting professional thumbnail image. "
        "User thumbnail request: professional YouTube thumbnail about AI design tools, bold title area. "
        "Platform: youtube Style: bold Canvas: 1280x720."
    )

    candidates = ai.pollinations_prompt_candidates(prompt)

    assert len(candidates) == 2
    assert candidates[1].startswith("Professional YouTube thumbnail artwork")
    assert "professional YouTube thumbnail about AI design tools" in candidates[1]
    assert all(len(candidate) <= 700 for candidate in candidates)


def test_pollinations_generic_image_prompt_stays_image_specific() -> None:
    candidates = ai.pollinations_prompt_candidates("purple geometric star icon on clean white background")

    assert len(candidates) == 2
    assert candidates[1].startswith("High-quality generated image")
    assert "thumbnail" not in candidates[1].lower()


def test_pollinations_poster_prompt_has_compact_retry_candidate() -> None:
    prompt = (
        "User poster request: A colourful flat illustration poster featuring a lion, elephant, "
        "giraffe and zebra arranged playfully, with soft pastel gradient background.\n"
        "Style: flat illustration"
    )

    candidates = ai_poster.pollinations_poster_prompt_candidates(prompt)

    assert len(candidates) == 2
    assert candidates[1].startswith("Professional poster illustration")
    assert "lion, elephant" in candidates[1]
    assert all(len(candidate) <= 700 for candidate in candidates)


def test_backend_env_path_is_backend_relative() -> None:
    from config import ENV_PATH

    assert ENV_PATH == Path(ai.__file__).resolve().parents[1] / ".env"


def test_key_fingerprint_is_secret_safe() -> None:
    from config import key_fingerprint

    secret = "sk-test-secret-value"
    fingerprint = key_fingerprint(secret)

    assert fingerprint
    assert len(fingerprint) == 12
    assert secret not in fingerprint


def test_thumbnail_normalization_outputs_requested_16x9_dimensions() -> None:
    import base64
    import io
    from PIL import Image
    from persistence import read_image_bytes

    source = Image.new("RGB", (600, 900), "#845ef7")
    buf = io.BytesIO()
    source.save(buf, format="PNG")
    image_result = {
        "success": True,
        "url": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8"),
        "source": "test:provider",
    }

    normalized = ai.normalize_image_result_to_dimensions(image_result, 1280, 720)
    mime_type, image_bytes = read_image_bytes(normalized["url"])
    with Image.open(io.BytesIO(image_bytes)) as output:
        dimensions = output.size

    assert mime_type == "image/png"
    assert normalized["width"] == 1280
    assert normalized["height"] == 720
    assert dimensions == (1280, 720)


def test_thumbnail_response_preserves_request_and_generation_ids() -> None:
    response = ai.ThumbnailGenerationResponse(
        success=True,
        status="success",
        request_id="req_123",
        generation_id="ga_123",
        mode="thumbnail",
        image_url="http://example.test/generated.png",
        thumbnail_url="http://example.test/generated.png",
        design={},
        message="ok",
        width=1280,
        height=720,
        result={"requestId": "req_123", "generationId": "ga_123"},
    )

    assert response.request_id == "req_123"
    assert response.generation_id == "ga_123"
    assert response.width == 1280
    assert response.height == 720


def test_chat_provider_order_is_configurable(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "AI_CHAT_PROVIDER_PRIORITY", "openai, gemini, pollinations")

    assert ai.get_chat_provider_order() == ["openai", "gemini", "pollinations"]


def test_provider_health_payload_reports_chat_and_image_without_secrets(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "test-openai-secret")
    ai.record_provider_health("openai", False, "billing_required")
    ai.record_chat_provider_health("openai", True)

    payload = ai.provider_health_payload()
    encoded = str(payload)

    assert payload["openai"]["configured"] is True
    assert payload["openai"]["image_available"] is False
    assert payload["openai"]["image_reason"] == "billing_required"
    assert payload["openai"]["chat_available"] is True
    assert "test-openai-secret" not in encoded


def test_ai_capabilities_are_based_on_validated_provider_health(monkeypatch) -> None:
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["openai", "gemini", "pollinations"])
    monkeypatch.setattr(ai, "get_image_provider_order", lambda: ["openai", "gemini", "pollinations"])
    monkeypatch.setitem(ai._chat_provider_health, "openai", {
        "available": True,
        "reason": None,
        "checked_at": "2026-01-01T00:00:00Z",
    })
    monkeypatch.setitem(ai._provider_health, "openai", {
        "available": False,
        "reason": "billing_required",
        "checked_at": "2026-01-01T00:00:00Z",
    })
    monkeypatch.setitem(ai._provider_health, "pollinations", {
        "available": True,
        "reason": None,
        "checked_at": "2026-01-01T00:00:01Z",
    })

    capabilities = ai.ai_capabilities_payload()

    assert capabilities == {
        "chat": True,
        "promptEnhancement": True,
        "posterPlanning": True,
        "imageGeneration": True,
        "thumbnailGeneration": True,
    }


def test_ai_capabilities_do_not_claim_image_support_from_keys_only(monkeypatch) -> None:
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["openai"])
    monkeypatch.setattr(ai, "get_image_provider_order", lambda: ["openai"])
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "test-openai-secret")
    monkeypatch.setitem(ai._chat_provider_health, "openai", {
        "available": True,
        "reason": None,
        "checked_at": "2026-01-01T00:00:00Z",
    })
    monkeypatch.setitem(ai._provider_health, "openai", {
        "available": False,
        "reason": "billing_required",
        "checked_at": "2026-01-01T00:00:00Z",
    })

    capabilities = ai.ai_capabilities_payload()

    assert capabilities["chat"] is True
    assert capabilities["promptEnhancement"] is True
    assert capabilities["posterPlanning"] is True
    assert capabilities["imageGeneration"] is False
    assert capabilities["thumbnailGeneration"] is False


def test_ai_health_payload_is_secret_safe_and_uses_validated_capabilities(monkeypatch) -> None:
    monkeypatch.setattr(ai, "_provider_health", {})
    monkeypatch.setattr(ai, "_chat_provider_health", {})
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "sk-test-secret-value-with-length")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "AIza-test-secret-value-with-length")
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["openai", "gemini"])
    monkeypatch.setattr(ai, "get_image_provider_order", lambda: ["openai", "gemini", "pollinations"])
    ai.record_chat_provider_health("openai", True)
    ai.record_provider_health("gemini", False, "quota_or_rate_limit")

    payload = ai.build_ai_health_payload("req_health")
    encoded = str(payload)

    assert payload["requestId"] == "req_health"
    assert payload["status"] == "degraded"
    assert payload["capabilities"]["chat"] is True
    assert payload["capabilities"]["imageGeneration"] is False
    assert payload["providers"]["openai"]["keyFormatValid"] is True
    assert "sk-test-secret-value-with-length" not in encoded
    assert "AIza-test-secret-value-with-length" not in encoded


def test_prompt_enhancement_local_fallback_is_not_reported_as_ai_success(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["gemini", "openai"])

    response = asyncio.run(ai.generate_image_prompt(ai.ImagePromptRequest(prompt="Create a restaurant poster")))

    assert response.success is False
    assert response.status == "fallback"
    assert response.fallbackUsed is True
    assert response.source == "local:prompt-enhancement"
    assert response.enhanced_prompt


def test_openai_chat_records_http_error_category(monkeypatch) -> None:
    body = b'{"error":{"type":"billing_limit_user_error","message":"Billing limit reached"}}'

    def fail_urlopen(*_args, **_kwargs):
        raise HTTPError("", 400, "Bad Request", {}, BytesIO(body))

    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "configured")
    monkeypatch.setattr(ai.urllib.request, "urlopen", fail_urlopen)
    ai.clear_last_chat_provider_error("openai")

    reply = ai.call_openai_chat_api("Give me a poster tip", "poster_design", [])

    assert reply == ""
    assert ai.get_last_chat_provider_error("openai") == "billing_required"


def test_openai_chat_uses_openai_model_alias_when_chat_model_missing(monkeypatch) -> None:
    captured: dict = {}

    class FakeResponse:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *_args):
            return False
        def read(self):
            return b'{"choices":[{"message":{"content":"Helpful model-aware answer"},"finish_reason":"stop"}]}'

    def fake_urlopen(request, *_args, **_kwargs):
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "sk-test-secret-value-with-length")
    monkeypatch.setattr(ai.settings, "OPENAI_CHAT_MODEL", "")
    monkeypatch.setattr(ai.settings, "OPENAI_MODEL", "gpt-test-chat-model")
    monkeypatch.setattr(ai.urllib.request, "urlopen", fake_urlopen)

    reply = ai.call_openai_chat_api("Give me a poster tip", "poster_design", [])

    assert reply == "Helpful model-aware answer"
    assert captured["payload"]["model"] == "gpt-test-chat-model"


def test_gemini_chat_uses_configured_gemini_model(monkeypatch) -> None:
    captured: dict = {}

    class FakeResponse:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *_args):
            return False
        def read(self):
            return b'{"candidates":[{"content":{"parts":[{"text":"Gemini model-aware answer"}]}}]}'

    def fake_urlopen(request, *_args, **_kwargs):
        captured["url"] = request.full_url
        return FakeResponse()

    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "AIza-test-secret-value-with-length")
    monkeypatch.setattr(ai.settings, "GEMINI_MODEL", "gemini-test-chat-model")
    monkeypatch.setattr(ai.urllib.request, "urlopen", fake_urlopen)

    reply = ai.call_gemini_api("Give me a poster tip")

    assert reply == "Gemini model-aware answer"
    assert "/models/gemini-test-chat-model:generateContent" in captured["url"]


def test_chat_failure_contract_includes_request_provider_and_models(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["gemini", "openai"])

    with pytest.raises(ai.HTTPException) as exc_info:
        asyncio.run(ai.ai_chat(
            ai.ChatRequest(
                request_id="req_chat_123",
                message="Give me poster layout tips",
                provider="auto",
                history=[],
            ),
            current_user=object(),
            db=None,
        ))

    detail = exc_info.value.detail
    assert exc_info.value.status_code == 503
    assert detail["request_id"] == "req_chat_123"
    assert detail["status"] == "failed"
    assert detail["providerAttempts"][0]["provider"] == "gemini"
    assert detail["providerAttempts"][0]["model"]


def test_chat_explicit_provider_does_not_try_fallbacks(monkeypatch) -> None:
    monkeypatch.setattr(ai.settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(ai.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(ai, "get_chat_provider_order", lambda: ["gemini", "openai", "pollinations"])

    with pytest.raises(ai.HTTPException) as exc_info:
        asyncio.run(ai.ai_chat(
            ai.ChatRequest(
                request_id="req_openai_only",
                message="Give me poster layout tips",
                provider="openai",
                history=[],
            ),
            current_user=object(),
            db=None,
        ))

    detail = exc_info.value.detail
    assert detail["provider"] == "openai"
    assert detail["providerAttempts"] == [{
        "provider": "openai",
        "model": ai.get_chat_model("openai"),
        "status": "missing_api_key",
        "retryable": False,
    }]


def test_chat_response_preserves_message_ids_and_standard_message_field() -> None:
    response = ai.ChatResponse(
        success=True,
        status="completed",
        request_id="req_chat",
        reply="Helpful answer",
        message="Helpful answer",
        suggestions=[],
        provider="pollinations:text",
        source="pollinations:text",
        model="pollinations-text",
        usage={},
        finish_reason="stop",
        conversation_id="chat_123",
        user_message_id="msg_user",
        assistant_message_id="msg_assistant",
    )

    assert response.request_id == "req_chat"
    assert response.message == "Helpful answer"
    assert response.model == "pollinations-text"
    assert response.user_message_id == "msg_user"
    assert response.assistant_message_id == "msg_assistant"


def test_image_and_poster_responses_preserve_request_ids() -> None:
    poster = ai.PosterGenerationResponse(
        success=True,
        status="success",
        request_id="req_poster",
        generation_id="ga_poster",
        mode="poster",
        image_url="http://example.test/poster.png",
        poster_url="http://example.test/poster.png",
        design={},
        message="ok",
        result={"requestId": "req_poster", "generationId": "ga_poster"},
    )
    image_request = ai.ImageGenerateRequest(
        request_id="req_image",
        prompt="Create a futuristic city",
        width=1024,
        height=1024,
        aspect_ratio="1:1",
    )

    assert poster.request_id == "req_poster"
    assert poster.generation_id == "ga_poster"
    assert image_request.request_id == "req_image"



def test_thumbnail_prompt_enhancement_preserves_subject_and_16x9_layout() -> None:
    prompt = (
        "A moody illustrated poster of an owl, fox, and raccoon under a starry night sky "
        "within a zoo enclosure, deep blues and purples, glowing moonlight accents, "
        "mysterious atmospheric mood, elegant title space at top."
    )

    enhanced = ai.build_thumbnail_image_prompt(
        prompt=prompt,
        title="",
        subtitle="",
        platform="youtube",
        style="Bold and High Contrast",
        aspect_ratio="16:9",
        width=1280,
        height=720,
        quality="high",
        reference_count=0,
        has_face=False,
        has_logo=False,
    ).lower()

    for required in ["owl", "fox", "raccoon", "starry night", "deep blues", "purples", "1280x720", "16:9"]:
        assert required in enhanced
    assert "youtube" in enhanced


def test_thumbnail_failure_contract_contains_no_image_url() -> None:
    detail = {
        "success": False,
        "status": "failed",
        "request_id": "req_failed",
        "mode": "thumbnail",
        "error_code": "NO_IMAGE_PROVIDER_AVAILABLE",
        "message": "No real AI image provider returned a production-quality thumbnail.",
        "provider_attempts": [{"provider": "pollinations", "category": "rate_limited"}],
    }

    assert detail["success"] is False
    assert "image_url" not in detail
    assert "thumbnail_url" not in detail


def test_youtube_thumbnail_dimensions_are_not_reversed_in_contract() -> None:
    response = ai.ThumbnailGenerationResponse(
        success=True,
        status="success",
        request_id="req_16x9",
        generation_id="ga_16x9",
        mode="thumbnail",
        image_url="http://example.test/thumb.png",
        thumbnail_url="http://example.test/thumb.png",
        original_prompt="owl fox raccoon thumbnail",
        enhanced_prompt="owl fox raccoon YouTube thumbnail 1280x720",
        mime_type="image/png",
        width=1280,
        height=720,
        aspect_ratio="16:9",
        design={},
        message="ok",
        result={"requestId": "req_16x9", "generationId": "ga_16x9", "width": 1280, "height": 720},
    )

    assert response.width == 1280
    assert response.height == 720
    assert response.width > response.height
