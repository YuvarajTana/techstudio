from sqlalchemy import inspect, text


revision = "0003_trash_restore"


def upgrade(engine):
    inspector = inspect(engine)
    if "deleted_items" in inspector.get_table_names():
        return

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS deleted_items (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                item_type VARCHAR(50) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                metadata_json JSON NULL,
                created_at DATETIME NULL,
                CONSTRAINT fk_deleted_items_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
        """))
