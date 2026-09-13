from sqlalchemy import inspect, text


revision = "0005_asset_dam_fields"


def upgrade(engine):
    inspector = inspect(engine)
    if "assets" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("assets")}
    additions = {
        "title": "VARCHAR(200) NULL",
        "description": "TEXT NULL",
        "image_url": "TEXT NULL",
        "thumbnail_url": "TEXT NULL",
        "mime_type": "VARCHAR(100) NULL",
        "orientation": "VARCHAR(30) NULL",
        "source_asset_id": "VARCHAR(200) NULL",
        "source_page_url": "VARCHAR(500) NULL",
        "author_name": "VARCHAR(200) NULL",
        "author_url": "VARCHAR(500) NULL",
        "license_name": "VARCHAR(100) NULL",
        "attribution_required": "BOOLEAN DEFAULT 0",
        "attribution_text": "VARCHAR(500) NULL",
        "commercial_use_allowed": "BOOLEAN DEFAULT 1",
        "modification_allowed": "BOOLEAN DEFAULT 1",
        "is_active": "BOOLEAN DEFAULT 1",
        "updated_at": "DATETIME NULL",
    }

    with engine.begin() as conn:
        for column_name, ddl in additions.items():
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {column_name} {ddl}"))
