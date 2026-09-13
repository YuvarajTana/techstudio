from sqlalchemy import inspect, text


revision = "0002_asset_ownership"


def upgrade(engine):
    inspector = inspect(engine)
    if "assets" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("assets")}
    with engine.begin() as conn:
        if "user_id" not in columns:
            conn.execute(text("ALTER TABLE assets ADD COLUMN user_id VARCHAR(50) NULL"))

        indexes = {index["name"] for index in inspector.get_indexes("assets")}
        if "ix_assets_user_id" not in indexes:
            conn.execute(text("CREATE INDEX ix_assets_user_id ON assets (user_id)"))
