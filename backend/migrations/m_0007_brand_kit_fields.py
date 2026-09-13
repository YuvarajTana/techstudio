from sqlalchemy import inspect, text


revision = "0007_brand_kit_fields"


def _add_columns(engine, table_name: str, additions: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as conn:
        for column_name, ddl in additions.items():
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


def upgrade(engine):
    _add_columns(engine, "brand_kits", {
        "company_name": "VARCHAR(150) NULL",
        "description": "TEXT NULL",
        "industry": "VARCHAR(100) NULL",
        "website": "VARCHAR(255) NULL",
    })
    _add_columns(engine, "brand_colors", {
        "role": "VARCHAR(50) DEFAULT 'custom'",
        "description": "TEXT NULL",
        "is_primary": "BOOLEAN DEFAULT 0",
    })
    _add_columns(engine, "brand_fonts", {
        "role": "VARCHAR(50) DEFAULT 'body'",
        "style": "VARCHAR(50) NULL",
        "fallback": "VARCHAR(100) NULL",
    })
    _add_columns(engine, "brand_logos", {
        "role": "VARCHAR(50) DEFAULT 'primary'",
        "width": "INT NULL",
        "height": "INT NULL",
        "file_size": "INT NULL",
    })
