from __future__ import annotations

import json
from urllib.parse import quote

from sqlalchemy import text

revision = "0009_template_type_normalization_seed"

TYPE_ALIASES = {
    "poster": ["poster", "posters"],
    "instagram-post": ["instagram-post", "instagram-posts", "instagram"],
    "instagram-story": ["instagram-story", "instagram-stories", "story", "stories"],
    "youtube-thumbnail": ["youtube-thumbnail", "youtube-thumbnails", "youtube"],
    "linkedin-post": ["linkedin-post", "linkedin-posts", "linkedin"],
    "invitation": ["invitation", "invitations"],
    "flyer": ["flyer", "flyers"],
    "business-card": ["business-card", "business-cards"],
    "logo": ["logo", "logos"],
    "education": ["education", "education-template", "education-templates"],
}

TEMPLATE_SEEDS = [
    ("poster", 800, 1132, ["technology", "marketing", "events"], ["AI Summit Keynote Poster", "Product Launch Poster", "Community Music Night Poster"]),
    ("instagram-post", 1080, 1080, ["business", "fashion", "food"], ["Business Tips Instagram Post", "Summer Style Instagram Post", "Cafe Special Instagram Post"]),
    ("instagram-story", 1080, 1920, ["travel", "fitness", "holidays"], ["Island Travel Story", "Morning Workout Story", "Festival Countdown Story"]),
    ("youtube-thumbnail", 1280, 720, ["technology", "education", "fitness"], ["AI Tutorial Thumbnail", "Study Hacks Thumbnail", "Home Workout Thumbnail"]),
    ("linkedin-post", 1200, 627, ["business", "technology", "marketing"], ["Hiring Announcement LinkedIn Post", "SaaS Milestone LinkedIn Post", "Campaign Results LinkedIn Post"]),
    ("invitation", 1080, 1350, ["events", "holidays", "food"], ["Elegant Dinner Invitation", "Holiday Party Invitation", "Restaurant Opening Invitation"]),
    ("flyer", 800, 1132, ["fitness", "travel", "education"], ["Gym Membership Flyer", "Travel Deal Flyer", "Online Course Flyer"]),
    ("business-card", 1050, 600, ["business", "fashion", "technology"], ["Minimal Consultant Business Card", "Boutique Owner Business Card", "Tech Founder Business Card"]),
    ("logo", 800, 800, ["technology", "food", "fitness"], ["Neon Tech Logo Concept", "Artisan Cafe Logo Concept", "Active Gym Logo Concept"]),
    ("education", 1080, 1350, ["education", "business", "technology"], ["Classroom Announcement Template", "Workshop Agenda Template", "Coding Bootcamp Template"]),
]

TYPE_LABELS = {
    "poster": "Poster",
    "instagram-post": "Instagram Post",
    "instagram-story": "Instagram Story",
    "youtube-thumbnail": "YouTube Thumbnail",
    "linkedin-post": "LinkedIn Post",
    "invitation": "Invitation",
    "flyer": "Flyer",
    "business-card": "Business Card",
    "logo": "Logo",
    "education": "Education Template",
}

PALETTES = [
    ("#7c3aed", "#111827", "#f5f3ff"),
    ("#06b6d4", "#0f172a", "#ecfeff"),
    ("#f97316", "#1f2937", "#fff7ed"),
    ("#ec4899", "#18181b", "#fdf2f8"),
    ("#22c55e", "#052e16", "#f0fdf4"),
]


def _slugify(value: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "template"


def _thumbnail(title: str, template_type: str, palette_index: int) -> str:
    accent, dark, light = PALETTES[palette_index % len(PALETTES)]
    safe_title = title.replace("&", "and")
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="{dark}"/>
          <stop offset="0.55" stop-color="#27272a"/>
          <stop offset="1" stop-color="{accent}"/>
        </linearGradient>
      </defs>
      <rect width="960" height="720" rx="44" fill="url(#bg)"/>
      <circle cx="770" cy="150" r="118" fill="{light}" opacity="0.14"/>
      <circle cx="150" cy="600" r="160" fill="{accent}" opacity="0.2"/>
      <rect x="82" y="82" width="796" height="556" rx="34" fill="#ffffff" opacity="0.08" stroke="#ffffff" stroke-opacity="0.24"/>
      <text x="106" y="152" fill="{light}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="3">{TYPE_LABELS[template_type].upper()}</text>
      <text x="106" y="334" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="64" font-weight="900">{safe_title[:27]}</text>
      <text x="106" y="396" fill="{light}" font-family="Inter, Arial, sans-serif" font-size="30" opacity="0.82">Editable TECKSTUDIO template</text>
      <rect x="106" y="486" width="250" height="56" rx="28" fill="{accent}"/>
      <text x="138" y="523" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800">Use Template</text>
    </svg>
    """
    return "data:image/svg+xml;utf8," + quote(" ".join(svg.split()))


def _canvas(title: str, template_type: str, width: int, height: int, category_id: str, palette_index: int) -> str:
    accent, dark, light = PALETTES[palette_index % len(PALETTES)]
    scale = max(width, height) / 1000
    objects = [
        {"type": "rect", "version": "5.3.0", "originX": "left", "originY": "top", "left": 0, "top": 0, "width": width, "height": height, "fill": dark, "stroke": None, "strokeWidth": 0, "opacity": 1, "visible": True, "selectable": False, "evented": False},
        {"type": "circle", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.58, "top": height * 0.08, "radius": min(width, height) * 0.18, "fill": accent, "opacity": 0.28, "visible": True},
        {"type": "rect", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.08, "top": height * 0.12, "width": width * 0.84, "height": height * 0.72, "rx": 28 * scale, "ry": 28 * scale, "fill": "rgba(255,255,255,0.08)", "stroke": "rgba(255,255,255,0.2)", "strokeWidth": max(1, int(2 * scale)), "visible": True},
        {"type": "textbox", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.12, "top": height * 0.2, "width": width * 0.76, "height": height * 0.22, "fill": "#ffffff", "fontFamily": "Inter", "fontWeight": "900", "fontSize": max(34, int(width * 0.062)), "text": title, "textAlign": "left", "visible": True, "styles": {}},
        {"type": "textbox", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.12, "top": height * 0.52, "width": width * 0.72, "height": height * 0.12, "fill": light, "fontFamily": "Inter", "fontWeight": "700", "fontSize": max(18, int(width * 0.028)), "text": f"{TYPE_LABELS[template_type]} · {category_id.title()}", "textAlign": "left", "visible": True, "styles": {}},
        {"type": "rect", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.12, "top": height * 0.72, "width": width * 0.3, "height": max(44, height * 0.055), "rx": 999, "ry": 999, "fill": accent, "visible": True},
        {"type": "textbox", "version": "5.3.0", "originX": "left", "originY": "top", "left": width * 0.15, "top": height * 0.735, "width": width * 0.24, "height": 48, "fill": "#ffffff", "fontFamily": "Inter", "fontWeight": "800", "fontSize": max(16, int(width * 0.022)), "text": "Customize", "textAlign": "center", "visible": True, "styles": {}},
    ]
    return json.dumps({"version": "5.3.0", "width": width, "height": height, "background": dark, "objects": objects})


def _seed_templates(engine) -> None:
    with engine.begin() as conn:
        for canonical, aliases in TYPE_ALIASES.items():
            for alias in aliases:
                conn.execute(
                    text("UPDATE templates SET template_type = :canonical WHERE LOWER(template_type) = :alias"),
                    {"canonical": canonical, "alias": alias},
                )

        seed_index = 0
        for template_type, width, height, categories, titles in TEMPLATE_SEEDS:
            for title, category_id in zip(titles, categories):
                seed_index += 1
                slug = _slugify(title)
                template_id = f"tmpl_seed_{slug.replace('-', '_')[:32]}"
                thumbnail = _thumbnail(title, template_type, seed_index)
                canvas_data = _canvas(title, template_type, width, height, category_id, seed_index)
                tags = json.dumps([template_type, TYPE_LABELS[template_type], category_id, title])
                existing = conn.execute(text("SELECT id FROM templates WHERE id = :id OR slug = :slug"), {"id": template_id, "slug": slug}).first()
                values = {
                    "id": template_id,
                    "name": title,
                    "slug": slug,
                    "description": f"Editable {TYPE_LABELS[template_type].lower()} for {category_id} designs.",
                    "category_id": category_id,
                    "template_type": template_type,
                    "data": canvas_data,
                    "thumbnail_url": thumbnail,
                    "preview_url": thumbnail,
                    "width": width,
                    "height": height,
                    "tags": tags,
                    "is_premium": 1 if seed_index % 7 == 0 else 0,
                    "is_featured": 1 if seed_index % 5 == 0 else 0,
                    "sort_weight": 1000 - seed_index,
                    "status": "published",
                }
                if existing:
                    conn.execute(
                        text("""
                            UPDATE templates
                            SET name = :name, slug = :slug, description = :description,
                                category_id = :category_id, template_type = :template_type,
                                data = :data, thumbnail_url = :thumbnail_url, preview_url = :preview_url,
                                width = :width, height = :height, tags = :tags,
                                is_premium = :is_premium, is_featured = :is_featured,
                                sort_weight = :sort_weight, status = :status
                            WHERE id = :id OR slug = :slug
                        """),
                        values,
                    )
                else:
                    conn.execute(
                        text("""
                            INSERT INTO templates (
                                id, name, slug, description, category_id, template_type, data,
                                thumbnail_url, preview_url, width, height, tags, is_premium,
                                is_featured, sort_weight, status
                            ) VALUES (
                                :id, :name, :slug, :description, :category_id, :template_type, :data,
                                :thumbnail_url, :preview_url, :width, :height, :tags, :is_premium,
                                :is_featured, :sort_weight, :status
                            )
                        """),
                        values,
                    )


def upgrade(engine):
    _seed_templates(engine)
