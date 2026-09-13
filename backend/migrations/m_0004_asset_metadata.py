from sqlalchemy import inspect, text


revision = "0004_asset_metadata"


def upgrade(engine):
    inspector = inspect(engine)
    if "assets" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("assets")}
    additions = {
        "source": "VARCHAR(100) NULL",
        "source_url": "VARCHAR(500) NULL",
        "license": "VARCHAR(100) NULL",
        "license_url": "VARCHAR(500) NULL",
        "attribution": "VARCHAR(500) NULL",
        "provider": "VARCHAR(100) NULL",
        "width": "INT NULL",
        "height": "INT NULL",
    }

    with engine.begin() as conn:
        for column_name, ddl in additions.items():
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE assets ADD COLUMN {column_name} {ddl}"))
