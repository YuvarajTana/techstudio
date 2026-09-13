from sqlalchemy import inspect, text


revision = "0013_processed_images"


def upgrade(engine):
    inspector = inspect(engine)
    if "processed_images" in set(inspector.get_table_names()):
        return
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE processed_images (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                operation VARCHAR(80) NOT NULL,
                provider VARCHAR(100) NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                original_storage_path VARCHAR(500) NOT NULL,
                processed_storage_path VARCHAR(500) NOT NULL,
                mask_storage_path VARCHAR(500) NULL,
                original_url VARCHAR(500) NOT NULL,
                processed_url VARCHAR(500) NOT NULL,
                mask_url VARCHAR(500) NULL,
                mime_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                metadata_json JSON NULL,
                created_at DATETIME NOT NULL,
                CONSTRAINT fk_processed_images_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("CREATE INDEX ix_processed_images_user_id ON processed_images (user_id)"))
        conn.execute(text("CREATE INDEX ix_processed_images_operation ON processed_images (operation)"))
