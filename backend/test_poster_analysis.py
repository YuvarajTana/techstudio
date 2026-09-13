import io

from PIL import Image, ImageDraw

from services import poster_analysis_service
from services import ocr_service
from services.poster_analysis_service import analyze_poster_image, create_text_region_patch


def _poster_bytes() -> bytes:
    image = Image.new("RGB", (400, 300), "#6E22FF")
    draw = ImageDraw.Draw(image)
    draw.rectangle((80, 60, 320, 110), fill="#FFFFFF")
    draw.rectangle((130, 220, 270, 265), fill="#FACC15")
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _ocr_result():
    return {
        "text": "SUMMER SALE",
        "language": "en",
        "items": [{
            "id": "heading",
            "text": "SUMMER SALE",
            "confidence": 0.97,
            "readingOrder": 0,
            "box": {"x": 0.2, "y": 0.2, "width": 0.6, "height": 1 / 6},
            "polygon": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.3667], [0.2, 0.3667]],
            "style": {
                "fontFamilyGuess": "Montserrat",
                "fontSizeRatio": 0.12,
                "fontWeight": "700",
                "textAlign": "center",
                "color": "#FFFFFF",
            },
        }],
    }


def test_quick_analysis_preserves_original_pixels_and_editable_metadata(monkeypatch):
    monkeypatch.setattr(poster_analysis_service, "extract_text_layout", lambda *_args, **_kwargs: _ocr_result())

    original = Image.open(io.BytesIO(_poster_bytes())).convert("RGBA")
    result = analyze_poster_image(_poster_bytes(), "image/png", "quick")

    assert len(result.text_blocks) == 1
    assert result.text_blocks[0]["text"] == "SUMMER SALE"
    assert result.text_blocks[0]["role"] == "heading"
    assert result.text_blocks[0]["style"]["fill"] == "#FFFFFF"
    assert result.clean_background.tobytes() == original.tobytes()
    assert result.regions == []


def test_full_analysis_extracts_palette_but_does_not_convert_graphics(monkeypatch):
    monkeypatch.setattr(poster_analysis_service, "extract_text_layout", lambda *_args, **_kwargs: _ocr_result())

    result = analyze_poster_image(_poster_bytes(), "image/png", "full")

    assert any(item["color"].upper() == "#6E22FF" for item in result.palette)
    assert result.regions == []
    assert "Backgrounds, photos, graphics, icons, and decorative elements remain the original image." in result.warnings
    assert "Only a user-selected text region receives a local clean patch when that region is edited." in result.warnings


def test_analysis_handles_image_with_no_text(monkeypatch):
    monkeypatch.setattr(
        poster_analysis_service,
        "extract_text_layout",
        lambda *_args, **_kwargs: {"text": "", "language": "und", "items": []},
    )

    result = analyze_poster_image(_poster_bytes(), "image/png", "full")

    assert result.text_blocks == []
    assert result.clean_background.size == (400, 300)
    assert "No readable text was detected." in result.warnings


def test_local_text_patch_changes_only_selected_crop():
    original = Image.open(io.BytesIO(_poster_bytes())).convert("RGBA")
    block = {
        "id": "heading",
        "text": "SUMMER SALE",
        "bounding_box": {"x": 80, "y": 60, "width": 240, "height": 50},
        "normalized_bounding_box": {"x": 0.2, "y": 0.2, "width": 0.6, "height": 1 / 6},
        "polygon": [[80, 60], [320, 60], [320, 110], [80, 110]],
    }

    patch = create_text_region_patch(_poster_bytes(), block)
    composited = original.copy()
    source_box = patch.source_box
    composited.alpha_composite(patch.image, (source_box["x"], source_box["y"]))

    outside = (20, 20)
    assert composited.getpixel(outside) == original.getpixel(outside)
    assert composited.getpixel((200, 85)) != original.getpixel((200, 85))
    assert patch.normalized_text_box == block["normalized_bounding_box"]


def test_adjacent_ocr_words_on_same_baseline_are_merged(monkeypatch):
    ocr = _ocr_result()
    first = {**ocr["items"][0], "id": "first", "text": "PYTHON", "box": {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.08}}
    second = {**ocr["items"][0], "id": "second", "text": "APIS", "readingOrder": 1, "box": {"x": 0.32, "y": 0.102, "width": 0.15, "height": 0.08}}
    monkeypatch.setattr(
        poster_analysis_service,
        "extract_text_layout",
        lambda *_args, **_kwargs: {**ocr, "items": [first, second]},
    )

    result = analyze_poster_image(_poster_bytes(), "image/png", "quick")

    assert len(result.text_blocks) == 1
    assert result.text_blocks[0]["text"] == "PYTHON APIS"


def test_ocr_falls_back_to_openai_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(ocr_service.settings, "OCR_PROVIDER", "gemini")
    monkeypatch.setattr(ocr_service.settings, "OCR_FALLBACK_PROVIDER", "openai")
    monkeypatch.setattr(ocr_service.settings, "GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setattr(ocr_service.settings, "OPENAI_API_KEY", "openai-test-key")
    monkeypatch.setattr(
        ocr_service,
        "_extract_with_gemini",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(RuntimeError("quota")),
    )
    monkeypatch.setattr(
        ocr_service,
        "_extract_with_openai",
        lambda *_args, **_kwargs: {**_ocr_result(), "provider": "openai", "model": "gpt-4o-mini"},
    )

    result = ocr_service.extract_text_layout(_poster_bytes(), "image/png")

    assert result["provider"] == "openai"
    assert result["items"][0]["text"] == "SUMMER SALE"


def test_ocr_reports_missing_provider_configuration(monkeypatch):
    monkeypatch.setattr(ocr_service.settings, "OCR_PROVIDER", "gemini")
    monkeypatch.setattr(ocr_service.settings, "OCR_FALLBACK_PROVIDER", "openai")
    monkeypatch.setattr(ocr_service.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(ocr_service.settings, "OPENAI_API_KEY", "")

    try:
        ocr_service.extract_text_layout(_poster_bytes(), "image/png")
    except Exception as error:
        assert error.status_code == 503
        assert "OCR is not configured" in error.detail
    else:
        raise AssertionError("Expected missing OCR configuration to fail.")


def test_ocr_uses_local_provider_without_cloud_keys(monkeypatch):
    monkeypatch.setattr(ocr_service.settings, "OCR_PROVIDER", "apple-vision")
    monkeypatch.setattr(ocr_service.settings, "OCR_FALLBACK_PROVIDER", "gemini,openai")
    monkeypatch.setattr(ocr_service.settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(ocr_service.settings, "OPENAI_API_KEY", "")
    monkeypatch.setattr(
        ocr_service,
        "_extract_with_apple_vision",
        lambda *_args, **_kwargs: {**_ocr_result(), "provider": "apple-vision", "model": "VNRecognizeTextRequest"},
    )

    result = ocr_service.extract_text_layout(_poster_bytes(), "image/png")

    assert result["provider"] == "apple-vision"
    assert result["items"][0]["text"] == "SUMMER SALE"
