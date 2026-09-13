from sqlalchemy import inspect, text


revision = "0014_uploaded_image_metadata"


def upgrade(engine):
    inspector = inspect(engine)
    if "uploaded_assets" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("uploaded_assets")}
    additions = {
        "width": "INTEGER NULL",
        "height": "INTEGER NULL",
        "thumbnail_storage_path": "VARCHAR(500) NULL",
        "thumbnail_url": "VARCHAR(500) NULL",
        "metadata_json": "JSON NULL",
        "updated_at": "DATETIME NULL",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE uploaded_assets ADD COLUMN {name} {definition}"))
