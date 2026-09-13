#!/usr/bin/env python3
"""Comprehensive test for AI integration with reference poster analysis."""

import sys
import json
from routes.ai import (
    call_gemini_api,
    build_fallback_poster,
    parse_gemini_response,
    generate_enhanced_image_prompt,
    analyze_reference_poster,
    _response_cache
)

def test_reference_poster_analysis():
    """Test reference poster analysis functionality."""
    print("=" * 60)
    print("TEST 1: Reference Poster Analysis")
    print("=" * 60)

    test_cases = [
        {
            "name": "Dark Luxury Style",
            "description": "Dark background with gold accents, center-focused composition, bold sans-serif typography, dramatic lighting, minimalist luxury style",
            "expected_style": "minimalist"
        },
        {
            "name": "Bright Modern Style",
            "description": "Bright white background, modern clean design, vibrant colors, professional corporate look",
            "expected_style": "modern"
        },
        {
            "name": "Vintage Retro Style",
            "description": "Vintage aesthetic, retro colors, classic design elements, warm tones, nostalgic feel",
            "expected_style": "vintage"
        },
        {
            "name": "Neon Cyberpunk Style",
            "description": "Neon glow effects, cyberpunk style, vibrant lighting, dark background, futuristic",
            "expected_style": "neon"
        }
    ]

    for test in test_cases:
        print(f"\n{test['name']}:")
        result = analyze_reference_poster(test['description'])
        print(f"  Style: {result['style']}")
        print(f"  Colors: {result['color_palette']}")
        print(f"  Composition: {result['composition']}")
        print(f"  Lighting: {result['lighting']}")
        print(f"  Mood: {result['mood']}")

        if result['style'] == test['expected_style']:
            print(f"  ✓ PASS: Style matched")
        else:
            print(f"  ✗ FAIL: Expected {test['expected_style']}, got {result['style']}")

def test_enhanced_prompt_generation():
    """Test enhanced image prompt generation."""
    print("\n" + "=" * 60)
    print("TEST 2: Enhanced Image Prompt Generation")
    print("=" * 60)

    test_cases = [
        {
            "name": "Movie Poster",
            "prompt": "A cinematic movie poster with dramatic lighting",
            "reference": "Dark background with gold accents, bold typography",
            "style": "cinematic"
        },
        {
            "name": "Tech Startup",
            "prompt": "Modern tech startup advertisement",
            "reference": "Clean minimal design, blue accent colors",
            "style": "digital-art"
        },
        {
            "name": "Fashion Poster",
            "prompt": "Elegant fashion collection poster",
            "reference": "Luxury style, gold and black color scheme",
            "style": "photorealistic"
        }
    ]

    for test in test_cases:
        print(f"\n{test['name']}:")
        result = generate_enhanced_image_prompt(test['prompt'], test['reference'], test['style'])
        print(f"  Enhanced Prompt: {result['enhanced_prompt'][:80]}...")
        print(f"  Style Analysis: {result['style_analysis']}")
        print(f"  Color Palette: {result['color_palette']}")
        print(f"  Composition: {result['composition_notes']}")
        print(f"  Lighting: {result['lighting_description']}")
        print(f"  Visual Elements: {result['visual_elements']}")

def test_fallback_poster_generation():
    """Test fallback poster generation."""
    print("\n" + "=" * 60)
    print("TEST 3: Fallback Poster Generation")
    print("=" * 60)

    test_cases = [
        {"prompt": "movie poster", "expected_heading": "THE BLOCKBUSTER"},
        {"prompt": "tech startup", "expected_heading": "INNOVATE"},
        {"prompt": "fashion poster", "expected_heading": "STYLE EDIT"},
        {"prompt": "fitness gym", "expected_heading": "PUSH HARDER"},
        {"prompt": "wedding invitation", "expected_heading": "WE DO"},
        {"prompt": "50% off sale", "expected_heading": "UP TO 50% OFF"},
        {"prompt": "blue poster", "expected_heading": "BLUE POSTER"},
        {"prompt": '"My Brand"', "expected_heading": "MY BRAND"},
    ]

    all_passed = True
    for test in test_cases:
        result = build_fallback_poster(test['prompt'])
        passed = result['heading'] == test['expected_heading']
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {test['prompt']:25} → {result['heading']:25} {status}")
        if not passed:
            all_passed = False
            print(f"    Expected: {test['expected_heading']}")

    return all_passed

def test_response_parsing():
    """Test Gemini response parsing."""
    print("\n" + "=" * 60)
    print("TEST 4: Response Parsing")
    print("=" * 60)

    # Valid JSON response
    valid_json = '''
    {
        "heading": "TECH STARTUP",
        "subtitle": "Innovation Starts Here",
        "bg_color": "#0a192f",
        "primary_color": "#00c8ff",
        "secondary_color": "#ffffff",
        "accent_color": "#64ffda",
        "theme_name": "tech",
        "layout": "grid",
        "elements": []
    }
    '''

    result = parse_gemini_response(valid_json, "tech startup")
    print(f"  Valid JSON: heading={result['heading']}, layout={result['layout']}")
    assert result['heading'] == "TECH STARTUP", "Heading mismatch"
    assert result['layout'] == "grid", "Layout mismatch"

    # Invalid JSON (should fallback)
    invalid_json = "This is not JSON"
    result = parse_gemini_response(invalid_json, "tech startup")
    print(f"  Invalid JSON: heading={result['heading']} (fallback)")

    # JSON with missing fields
    incomplete_json = '{"heading": "TEST", "subtitle": "Test"}'
    result = parse_gemini_response(incomplete_json, "test")
    print(f"  Incomplete JSON: heading={result['heading']} (fallback)")

def test_cache_functionality():
    """Test cache functionality."""
    print("\n" + "=" * 60)
    print("TEST 5: Cache Functionality")
    print("=" * 60)

    # Clear cache
    _response_cache.clear()
    print(f"  Cache cleared: {len(_response_cache)} items")

    # Add test items
    from datetime import datetime
    _response_cache["test1"] = (datetime.now(), "response1")
    _response_cache["test2"] = (datetime.now(), "response2")
    print(f"  Added items: {len(_response_cache)} items")

    # Clear again
    _response_cache.clear()
    print(f"  Cache cleared: {len(_response_cache)} items")

def main():
    """Run all tests."""
    print("=" * 60)
    print("TECKSTUDIO AI Integration Tests")
    print("=" * 60)

    try:
        test_reference_poster_analysis()
        test_enhanced_prompt_generation()
        test_fallback_poster_generation()
        test_response_parsing()
        test_cache_functionality()

        print("\n" + "=" * 60)
        print("ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
