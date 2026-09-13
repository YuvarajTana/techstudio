#!/usr/bin/env python3
"""Test script for AI integration improvements."""

import sys
import time
from routes.ai import call_gemini_api, build_fallback_poster, parse_gemini_response, _response_cache

def test_gemini_api():
    """Test Gemini API with retry logic."""
    print("Testing Gemini API with retry logic...")
    
    # Test with a simple prompt
    test_prompt = "Create a tech startup poster with blue colors"
    print(f"Prompt: {test_prompt}")
    
    start_time = time.time()
    result = call_gemini_api(test_prompt)
    elapsed = time.time() - start_time
    
    if result:
        print(f"✓ SUCCESS: Got response ({len(result)} chars) in {elapsed:.2f}s")
        print(f"  Preview: {result[:100]}...")
    else:
        print(f"✗ FAILED: No response after {elapsed:.2f}s")
        print("  This is expected if API key is invalid or rate limited")
    
    return result

def test_caching():
    """Test response caching."""
    print("\nTesting response caching...")
    
    # First call
    test_prompt = "Create a wedding poster"
    print(f"First call with: {test_prompt}")
    result1 = call_gemini_api(test_prompt)
    cache_size_1 = len(_response_cache)
    
    # Second call (should use cache)
    print(f"Second call with same prompt...")
    start_time = time.time()
    result2 = call_gemini_api(test_prompt)
    elapsed = time.time() - start_time
    
    cache_size_2 = len(_response_cache)
    
    print(f"Cache size before: {cache_size_1}, after: {cache_size_2}")
    print(f"Second call took: {elapsed:.3f}s")
    
    if elapsed < 0.1:  # Should be very fast from cache
        print("✓ Caching is working correctly")
    else:
        print("✗ Caching may not be working as expected")

def test_fallback_system():
    """Test fallback poster generation."""
    print("\nTesting fallback poster generation...")
    
    test_cases = [
        "tech startup poster",
        "wedding invitation",
        "fitness gym poster",
        "food restaurant menu",
        "sale discount poster",
        "custom text: Hello World",
        "blue color poster",
        "movie film poster",
    ]
    
    for prompt in test_cases:
        result = build_fallback_poster(prompt)
        print(f"  {prompt[:30]:30} → heading: {result['heading']}, layout: {result['layout']}")

def test_response_parsing():
    """Test Gemini response parsing."""
    print("\nTesting response parsing...")
    
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
    
    # Invalid JSON (should fallback)
    invalid_json = "This is not JSON"
    result = parse_gemini_response(invalid_json, "tech startup")
    print(f"  Invalid JSON: heading={result['heading']} (fallback)")

def test_cache_management():
    """Test cache management endpoints."""
    print("\nTesting cache management...")
    
    # Add some items to cache
    _response_cache["test_key"] = (time.time(), "test response")
    _response_cache["test_key2"] = (time.time(), "test response 2")
    
    print(f"  Cache items before clear: {len(_response_cache)}")
    
    # Note: We can't directly test the endpoints without running the server
    # But we can test the cache operations
    _response_cache.clear()
    print(f"  Cache items after clear: {len(_response_cache)}")

if __name__ == "__main__":
    print("=" * 60)
    print("TECKSTUDIO AI Integration Tests")
    print("=" * 60)
    
    try:
        test_gemini_api()
        test_caching()
        test_fallback_system()
        test_response_parsing()
        test_cache_management()
        
        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
