from __future__ import annotations

import base64
from html import escape


STICKER_SPECS = [
    ("trending", "Trending", "TREND", "#7c3aed", "#ec4899", True),
    ("featured", "Featured", "FEATURED", "#2563eb", "#06b6d4", True),
    ("social-media", "Social Media", "SOCIAL", "#db2777", "#f43f5e", True),
    ("emojis", "Emojis", "SMILE", "#f59e0b", "#facc15", True),
    ("reactions", "Reactions", "WOW", "#ea580c", "#fb7185", False),
    ("arrows", "Arrows", "GO", "#0891b2", "#22d3ee", False),
    ("labels", "Labels", "LABEL", "#4f46e5", "#a78bfa", False),
    ("badges", "Badges", "PRO", "#b45309", "#fbbf24", True),
    ("sale", "Sale", "SALE", "#dc2626", "#fb7185", True),
    ("marketing", "Marketing", "BOOST", "#7c3aed", "#c084fc", False),
    ("business", "Business", "BIZ", "#1d4ed8", "#60a5fa", False),
    ("celebration", "Celebration", "YAY", "#db2777", "#fbbf24", True),
    ("birthday", "Birthday", "B-DAY", "#9333ea", "#f472b6", False),
    ("festival", "Festival", "FEST", "#c2410c", "#f59e0b", False),
    ("love", "Love", "LOVE", "#be123c", "#fb7185", True),
    ("food", "Food", "YUM", "#16a34a", "#f59e0b", False),
    ("travel", "Travel", "TRIP", "#0284c7", "#38bdf8", False),
    ("nature", "Nature", "GROW", "#15803d", "#4ade80", False),
    ("technology", "Technology", "TECH", "#4338ca", "#22d3ee", True),
    ("education", "Education", "LEARN", "#1d4ed8", "#a78bfa", False),
    ("fitness", "Fitness", "MOVE", "#047857", "#34d399", False),
    ("fashion", "Fashion", "STYLE", "#a21caf", "#f0abfc", False),
    ("music", "Music", "PLAY", "#6d28d9", "#c084fc", False),
    ("gaming", "Gaming", "GG", "#0f766e", "#2dd4bf", False),
    ("weather", "Weather", "SUN", "#0369a1", "#facc15", False),
    ("hand-drawn", "Hand Drawn", "INK", "#334155", "#94a3b8", False),
    ("doodles", "Doodles", "DOODLE", "#7e22ce", "#fb7185", False),
    ("abstract", "Abstract", "FORM", "#5b21b6", "#06b6d4", False),
    ("shapes", "Shapes", "SHAPE", "#1d4ed8", "#8b5cf6", False),
    ("speech-bubbles", "Speech Bubbles", "HELLO", "#0f766e", "#22d3ee", False),
    ("decorative", "Decorative", "SPARK", "#a16207", "#fde047", True),
    ("frames", "Frames", "FRAME", "#374151", "#a78bfa", False),
    ("icons", "Icons", "CHECK", "#166534", "#4ade80", False),
]


def _svg_data_url(label: str, primary: str, accent: str, index: int) -> str:
    safe_label = escape(label[:10])
    rotation = (-6, 4, -3, 7)[index % 4]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{primary}"/>
      <stop offset="1" stop-color="{accent}"/>
    </linearGradient>
    <filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="14" flood-opacity=".28"/></filter>
  </defs>
  <g transform="rotate({rotation} 256 256)" filter="url(#s)">
    <path d="M86 115 Q86 72 129 72 H383 Q426 72 426 115 V362 Q426 405 383 405 H310 L256 454 L202 405 H129 Q86 405 86 362 Z" fill="url(#g)" stroke="#fff" stroke-width="20" stroke-linejoin="round"/>
    <circle cx="146" cy="140" r="18" fill="#fff" opacity=".9"/>
    <path d="M365 116 l10 24 24 10-24 10-10 24-10-24-24-10 24-10z" fill="#fff" opacity=".92"/>
    <text x="256" y="285" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="900" letter-spacing="2">{safe_label}</text>
  </g>
</svg>"""
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def build_sticker_catalog() -> list[dict]:
    items = []
    for index, (category, category_label, label, primary, accent, featured) in enumerate(STICKER_SPECS):
        source = _svg_data_url(label, primary, accent, index)
        items.append({
            "id": f"sticker_{category.replace('-', '_')}_01",
            "name": f"{category_label} {label.title()}",
            "category": category,
            "category_label": category_label,
            "tags": [category, category_label.lower(), label.lower(), "sticker", "graphic"],
            "thumbnail_url": source,
            "source_url": source,
            "file_type": "svg",
            "width": 512,
            "height": 512,
            "is_premium": False,
            "is_featured": featured,
            "created_at": "2026-07-18T00:00:00",
        })
    return items


STICKER_CATALOG = build_sticker_catalog()
