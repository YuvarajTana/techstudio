from sqlalchemy import inspect, text


revision = "0006_asset_local_storage_path"


def upgrade(engine):
    inspector = inspect(engine)
    if "assets" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("assets")}
    with engine.begin() as conn:
        if "local_storage_path" not in columns:
            conn.execute(text("ALTER TABLE assets ADD COLUMN local_storage_path VARCHAR(500) NULL"))
        conn.execute(text("""
            UPDATE assets
            SET local_storage_path = COALESCE(
                local_storage_path,
                CASE
                    WHEN user_id IS NULL THEN CONCAT('local://teckstudio/assets/', id)
                    ELSE NULL
                END
            )
            WHERE local_storage_path IS NULL
        """))
