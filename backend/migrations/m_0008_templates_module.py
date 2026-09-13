from __future__ import annotations

import re

from sqlalchemy import inspect, text

revision = "0008_templates_module"

TEMPLATE_COLUMNS = {
    "slug": "VARCHAR(160) NULL",
    "subcategory_id": "VARCHAR(50) NULL",
    "template_type": "VARCHAR(80) NULL",
    "thumbnail_url": "TEXT NULL",
    "preview_url": "TEXT NULL",
    "is_featured": "BOOLEAN DEFAULT 0",
    "sort_weight": "INT DEFAULT 0",
    "status": "VARCHAR(30) DEFAULT 'published'",
    "metadata_json": "JSON NULL",
    "created_by": "VARCHAR(50) NULL",
}

REQUESTED_CATEGORIES = [
    ("business", "Business", "briefcase", "from-blue-600 to-indigo-600", "Templates", 101),
    ("marketing", "Marketing", "megaphone", "from-orange-500 to-red-500", "Templates", 102),
    ("holidays", "Holidays", "sparkles", "from-rose-500 to-pink-600", "Templates", 103),
    ("education", "Education", "graduation-cap", "from-blue-500 to-indigo-600", "Templates", 104),
    ("technology", "Technology", "cpu", "from-cyan-600 to-blue-700", "Templates", 105),
    ("food", "Food", "utensils", "from-amber-700 to-orange-700", "Templates", 106),
    ("fashion", "Fashion", "heart", "from-pink-500 to-rose-500", "Templates", 107),
    ("fitness", "Fitness", "dumbbell", "from-red-600 to-red-800", "Templates", 108),
    ("travel", "Travel", "plane", "from-sky-500 to-cyan-600", "Templates", 109),
    ("events", "Events", "calendar", "from-violet-500 to-purple-600", "Templates", 110),
]

REQUESTED_SUBCATEGORIES = {
    "business": ["Startup", "Corporate", "Sales", "Real Estate"],
    "marketing": ["Product Launch", "Social Media", "Advertisement", "Campaign"],
    "holidays": ["Seasonal", "Festival", "Greeting", "Sale"],
    "education": ["Classroom", "Course", "Worksheet", "Announcement"],
    "technology": ["AI", "Software", "Cybersecurity", "Gadgets"],
    "food": ["Restaurant", "Cafe", "Menu", "Recipe"],
    "fashion": ["Retail", "Lookbook", "Beauty", "Accessories"],
    "fitness": ["Gym", "Yoga", "Sports", "Wellness"],
    "travel": ["Destination", "Hotel", "Adventure", "Guide"],
    "events": ["Conference", "Invitation", "Flyer", "Celebration"],
}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "template"


def _add_columns(engine, table_name: str, additions: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as conn:
        for column_name, ddl in additions.items():
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


def _create_tables(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS template_subcategories (
                id VARCHAR(50) PRIMARY KEY,
                category_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) NOT NULL,
                sort_order INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (category_id, slug),
                FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS template_favourites (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                template_id VARCHAR(50) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, template_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS template_usage (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                template_id VARCHAR(50) NOT NULL,
                project_id VARCHAR(50) NULL,
                action VARCHAR(50) DEFAULT 'use',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        """))


def _category_exists(conn, category_id: str) -> bool:
    return conn.execute(text("SELECT id FROM categories WHERE id = :id"), {"id": category_id}).first() is not None


def _seed_categories(engine) -> None:
    with engine.begin() as conn:
        for category_id, name, icon, color, group_name, sort_order in REQUESTED_CATEGORIES:
            if _category_exists(conn, category_id):
                conn.execute(
                    text("""
                        UPDATE categories
                        SET name = :name, slug = :slug, icon = :icon, color = :color,
                            group_name = :group_name, sort_order = :sort_order
                        WHERE id = :id
                    """),
                    {
                        "id": category_id,
                        "name": name,
                        "slug": category_id,
                        "icon": icon,
                        "color": color,
                        "group_name": group_name,
                        "sort_order": sort_order,
                    },
                )
            else:
                conn.execute(
                    text("""
                        INSERT INTO categories (id, name, slug, icon, color, group_name, sort_order)
                        VALUES (:id, :name, :slug, :icon, :color, :group_name, :sort_order)
                    """),
                    {
                        "id": category_id,
                        "name": name,
                        "slug": category_id,
                        "icon": icon,
                        "color": color,
                        "group_name": group_name,
                        "sort_order": sort_order,
                    },
                )

        for category_id, names in REQUESTED_SUBCATEGORIES.items():
            for index, name in enumerate(names, start=1):
                slug = _slugify(name)
                subcategory_id = f"{category_id}-{slug}"
                exists = conn.execute(
                    text("SELECT id FROM template_subcategories WHERE id = :id"),
                    {"id": subcategory_id},
                ).first()
                if exists:
                    conn.execute(
                        text("""
                            UPDATE template_subcategories
                            SET name = :name, slug = :slug, sort_order = :sort_order
                            WHERE id = :id
                        """),
                        {"id": subcategory_id, "name": name, "slug": slug, "sort_order": index},
                    )
                else:
                    conn.execute(
                        text("""
                            INSERT INTO template_subcategories (id, category_id, name, slug, sort_order)
                            VALUES (:id, :category_id, :name, :slug, :sort_order)
                        """),
                        {
                            "id": subcategory_id,
                            "category_id": category_id,
                            "name": name,
                            "slug": slug,
                            "sort_order": index,
                        },
                    )


def _backfill_templates(engine) -> None:
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT id, name, slug FROM templates")).fetchall()
        used_slugs: set[str] = set()
        for row in rows:
            template_id = row[0]
            name = row[1] or template_id
            current_slug = row[2]
            base = _slugify(current_slug or name)
            slug = base
            suffix = 2
            while slug in used_slugs:
                slug = f"{base}-{suffix}"
                suffix += 1
            used_slugs.add(slug)
            conn.execute(text("UPDATE templates SET slug = :slug WHERE id = :id"), {"slug": slug, "id": template_id})

        conn.execute(text("UPDATE templates SET status = 'published' WHERE status IS NULL OR status = ''"))
        conn.execute(text("UPDATE templates SET template_type = 'poster' WHERE template_type IS NULL OR template_type = ''"))
        conn.execute(text("UPDATE templates SET category_id = 'marketing' WHERE category_id IS NULL OR category_id = ''"))
        conn.execute(text("UPDATE templates SET thumbnail_url = thumbnail WHERE thumbnail_url IS NULL AND thumbnail IS NOT NULL"))


def upgrade(engine):
    _add_columns(engine, "templates", TEMPLATE_COLUMNS)
    _create_tables(engine)
    _seed_categories(engine)
    _backfill_templates(engine)
