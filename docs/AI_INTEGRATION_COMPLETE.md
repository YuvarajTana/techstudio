# TECKSTUDIO AI Integration - Complete Documentation

## Overview

This document describes the complete AI integration in TECKSTUDIO, including reference poster analysis, enhanced image prompt generation, and all AI-powered features.

---

## Architecture

### Backend (Python + FastAPI)

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Service Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Gemini API     │    │  Fallback       │                │
│  │  Integration    │    │  Engine         │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      │                                      │
│                      ▼                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Endpoints                           │   │
│  │  • /api/ai/generate-poster                          │   │
│  │  • /api/ai/generate-reference-poster                │   │
│  │  • /api/ai/generate-image-prompt                    │   │
│  │  • /api/ai/chat                                     │   │
│  │  • /api/ai/cache/status                             │   │
│  │  • /api/ai/cache (DELETE)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Frontend (React + TypeScript)

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant Component                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Chat with AI   │    │  Poster         │                │
│  │  (Gemini)       │    │  Generator      │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           │                      ▼                          │
│           │              ┌─────────────────┐                │
│           │              │  Reference      │                │
│           │              │  Poster Input   │                │
│           │              └────────┬────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Enhanced Features                       │   │
│  │  • Enhanced Image Prompt Generator                   │   │
│  │  • Slogan & Copy Writer                              │   │
│  │  • Color Palette Generator                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### 1. Generate Poster

**Endpoint:** `POST /api/ai/generate-poster`

**Request:**
```json
{
    "prompt": "tech startup poster with blue colors",
    "style": "auto"
}
```

**Response:**
```json
{
    "heading": "INNOVATE",
    "subtitle": "The Future Starts Here",
    "bg_color": "#0a192f",
    "primary_color": "#00c8ff",
    "secondary_color": "#ffffff",
    "accent_color": "#64ffda",
    "elements": [],
    "theme_name": "tech",
    "layout": "grid"
}
```

### 2. Generate Reference Poster

**Endpoint:** `POST /api/ai/generate-reference-poster`

**Request:**
```json
{
    "prompt": "Create a luxury brand poster",
    "reference_description": "Dark background with gold accents, center-focused composition, bold sans-serif typography, dramatic lighting, minimalist luxury style",
    "style": "auto"
}
```

**Response:** Same as Generate Poster, but with style matching the reference.

### 3. Generate Enhanced Image Prompt

**Endpoint:** `POST /api/ai/generate-image-prompt`

**Request:**
```json
{
    "prompt": "A cinematic movie poster with dramatic lighting",
    "reference_description": "Dark background with gold accents",
    "style": "photorealistic",
    "aspect_ratio": "1:1"
}
```

**Response:**
```json
{
    "enhanced_prompt": "Photorealistic, ultra-detailed, professional photography style. Style: dark. Color palette: #ffd700. Subject: A cinematic movie poster with dramatic lighting. High resolution, sharp details, professional quality, 8K UHD",
    "style_analysis": "dark",
    "color_palette": ["#ffd700", "#1a1a1a"],
    "composition_notes": "Center Focused with dramatic lighting",
    "lighting_description": "Dramatic",
    "visual_elements": ["Dark background", "Main subject with dramatic lighting", "Typography in bold-sans-serif style", "Accent elements with #ffd700 highlights"]
}
```

### 4. AI Chat

**Endpoint:** `POST /api/ai/chat`

**Request:**
```json
{
    "message": "How do I create a modern tech poster?",
    "context": "poster_design"
}
```

**Response:**
```json
{
    "reply": "For a modern tech poster, consider using...",
    "suggestions": ["Try a bold layout with contrasting colors", "Add a clear call-to-action button"],
    "poster_data": null
}
```

### 5. Cache Status

**Endpoint:** `GET /api/ai/cache/status`

**Response:**
```json
{
    "cached_items": 5,
    "cache_ttl_hours": 1.0,
    "items": [
        {
            "key": "abc12345...",
            "cached_at": "2026-07-08T17:44:07",
            "response_length": 256
        }
    ]
}
```

### 6. Clear Cache

**Endpoint:** `DELETE /api/ai/cache`

**Response:**
```json
{
    "message": "Cache cleared successfully"
}
```

### 7. AI Health Check

**Endpoint:** `GET /api/ai/health`

**Response:**
```json
{
    "status": "ok",
    "gemini_configured": true,
    "cache_items": 5
}
```

---

## Reference Poster Analysis

The system analyzes reference poster descriptions to extract:

### Style Detection
- **Minimalist:** clean, simple, minimal
- **Modern:** contemporary, sleek
- **Vintage:** retro, classic, nostalgic
- **Luxury:** premium, elegant, exclusive
- **Neon:** cyberpunk, futuristic
- **Bold:** dramatic, dark
- **Artistic:** creative, abstract

### Color Detection
Extracts hex colors from descriptions:
- red → #ef4444
- blue → #3b82f6
- green → #22c55e
- gold → #ffd700
- etc.

### Composition Detection
- center-focused
- symmetrical
- asymmetric-left/right
- grid-layout
- split-composition
- diagonal-dynamic

### Lighting Detection
- dramatic-contrast
- bright-even
- soft-diffused
- neon-glow
- warm-toned
- cool-toned

---

## Enhanced Image Prompt Generation

The system generates highly detailed prompts for AI image generators:

### Prompt Structure
1. **Style Prefix:** Photorealistic, Digital Art, Cinematic, etc.
2. **Style Analysis:** Detected from reference
3. **Color Palette:** Extracted colors
4. **Subject:** User's request
5. **Quality Enhancers:** 8K UHD, ultra-detailed, etc.

### Example Output
```
Photorealistic, ultra-detailed, professional photography style. 
Style: dark. Color palette: #ffd700, #1a1a1a. 
Subject: A cinematic movie poster with dramatic lighting. 
High resolution, sharp details, professional quality, 8K UHD
```

---

## Frontend Features

### 1. Reference Poster Input
- Toggle to show/hide reference description input
- Textarea for describing reference poster's visual style
- Optional - system works without reference

### 2. Enhanced Image Prompt Section
- Input for describing what to generate
- Button to generate enhanced prompt
- Display of:
  - Enhanced prompt (copyable)
  - Style analysis
  - Color palette (visual swatches)
  - Composition notes
  - Lighting description
  - Visual elements tags
- "Copy" button for the enhanced prompt
- "Use for Image" button to transfer to image generator

### 3. AI Chat
- Real-time chat with AI assistant
- Quick suggestion buttons
- Context-aware responses

### 4. Poster Generator
- Local fallback analysis
- Backend AI integration
- Reference poster support

---

## Error Handling

### Backend Errors
- **400 Bad Request:** Empty prompt
- **429 Rate Limited:** Gemini API rate limit (retry with backoff)
- **500 Server Error:** Internal error

### Frontend Errors
- **Network Error:** Backend not available, uses local fallback
- **API Error:** Backend returned error, uses local fallback
- **Parse Error:** Invalid response, uses fallback

### Fallback System
When Gemini API is unavailable:
1. Local keyword analysis
2. Industry detection
3. Color extraction
4. Layout selection

---

## Caching System

### In-Memory Cache
- **TTL:** 1 hour
- **Key:** MD5 hash of prompt
- **Storage:** Dictionary in memory

### Cache Operations
- **Get:** Check cache before API call
- **Set:** Cache successful responses
- **Clear:** Manual cache invalidation
- **Status:** View cache statistics

---

## Testing

### Run Tests
```bash
cd backend
python3 test_full_integration.py
```

### Test Coverage
1. Reference Poster Analysis
2. Enhanced Image Prompt Generation
3. Fallback Poster Generation
4. Response Parsing
5. Cache Functionality

---

## Configuration

### Environment Variables (.env)
```bash
# Google Gemini AI
GEMINI_API_KEY=your_api_key_here

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=teckstudio

# JWT
JWT_SECRET=your_secret_key
```

### Backend Configuration (config.py)
```python
class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DB_HOST: str = "localhost"
    # ... other settings
```

---

## Usage Examples

### Example 1: Basic Poster Generation
```javascript
// Frontend
const response = await fetch('http://localhost:5001/api/ai/generate-poster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'tech startup poster' })
});
```

### Example 2: Reference Poster Analysis
```javascript
// Frontend
const response = await fetch('http://localhost:5001/api/ai/generate-reference-poster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: 'Create a luxury brand poster',
        reference_description: 'Dark background with gold accents, minimalist style'
    })
});
```

### Example 3: Enhanced Image Prompt
```javascript
// Frontend
const response = await fetch('http://localhost:5001/api/ai/generate-image-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: 'A cinematic movie poster',
        reference_description: 'Dark background with dramatic lighting',
        style: 'photorealistic'
    })
});
```

---

## Troubleshooting

### Issue: Gemini API not working
**Solution:** Check API key in .env file

### Issue: Backend not starting
**Solution:** Check if all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Issue: Frontend not connecting to backend
**Solution:** Check CORS settings in main.py

### Issue: Cache not clearing
**Solution:** Use DELETE /api/ai/cache endpoint

---

## Future Enhancements

1. **Persistent Cache:** Redis/SQLite for cache persistence
2. **Image Upload:** Direct image upload for reference analysis
3. **Batch Processing:** Multiple prompt generation
4. **Custom Models:** Support for other AI models
5. **Advanced Analytics:** Usage tracking and optimization

---

*Document Version: 1.0*
*Last Updated: July 8, 2026*
