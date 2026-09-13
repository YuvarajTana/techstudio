#!/usr/bin/env python3
"""Focused tests for editable PosterSpec generation helpers."""

from routes.ai import (
    PosterSpecGenerateRequest,
    build_fallback_poster_spec,
    clamp_poster_spec_card_count,
    extract_json_object,
    normalize_poster_spec_payload,
    normalize_poster_spec_theme,
)
from routes import ai_poster


def test_theme_normalization() -> None:
    assert normalize_poster_spec_theme("purple-ai") == "purple-ai"
    assert normalize_poster_spec_theme("invalid") == "tech-blue"


def test_card_count_clamp() -> None:
    assert clamp_poster_spec_card_count(PosterSpecGenerateRequest(prompt="x", cardCount=3)) == 3
    assert clamp_poster_spec_card_count(PosterSpecGenerateRequest(prompt="x", cardCount=9)) == 9
    assert clamp_poster_spec_card_count(PosterSpecGenerateRequest(prompt="x", card_count=6)) == 6


def test_system_design_fallback_spec() -> None:
    spec = build_fallback_poster_spec(
        "System design basics for scalable web apps",
        "tech-blue",
        7,
    )
    assert spec.title == "System Design Basics"
    assert len(spec.cards) == 7
    assert spec.cards[0].number == 1
    assert spec.cards[-1].number == 7
    assert all(card.title and card.description for card in spec.cards)


def test_extract_markdown_json() -> None:
    payload = extract_json_object(
        """```json
        {"title":"Demo","cards":[]}
        ```"""
    )
    assert payload["title"] == "Demo"


def test_normalize_partial_provider_payload() -> None:
    spec = normalize_poster_spec_payload(
        {
            "title": "AI Engineer Roadmap",
            "subtitle": "From prompts to production",
            "description": "A clear learning poster.",
            "theme": "purple-ai",
            "cards": [
                {"number": 99, "title": "Prompting", "description": "Design explicit instructions.", "icon": "spark"}
            ],
            "cta": {"text": "Start now", "tag": "AI TEAM"},
        },
        "AI engineer roadmap",
        "purple-ai",
        5,
    )
    assert spec.title == "AI Engineer Roadmap"
    assert spec.theme == "purple-ai"
    assert len(spec.cards) == 5
    assert [card.number for card in spec.cards] == [1, 2, 3, 4, 5]
    assert spec.cards[0].title == "Prompting"
    assert spec.cta.text == "Start now"


def test_poster_artifact_rejects_local_placeholder(monkeypatch) -> None:
    monkeypatch.setattr(
        ai_poster,
        "generate_image",
        lambda *_args, **_kwargs: {
            "success": True,
            "url": "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            "source": "local-svg",
            "width": 800,
            "height": 1000,
        },
    )

    result = ai_poster.generate_poster_artifact(
        prompt="A colourful flat illustration poster featuring a lion, elephant, giraffe and zebra.",
        width=800,
        height=1000,
        aspect_ratio="4:5",
    )

    assert result["success"] is False
    assert result["image_url"] == ""
    assert result["provider"] == "none"
    assert result["fallbackReason"] == "All configured real image providers failed or were unavailable"


if __name__ == "__main__":
    test_theme_normalization()
    test_card_count_clamp()
    test_system_design_fallback_spec()
    test_extract_markdown_json()
    test_normalize_partial_provider_payload()
    print("PosterSpec tests passed.")
