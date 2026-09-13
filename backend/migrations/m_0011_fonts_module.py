from sqlalchemy import inspect, text


revision = "0011_fonts_module"


def upgrade(engine):
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if "font_assets" not in existing_tables:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE font_assets (
                    id VARCHAR(50) PRIMARY KEY,
                    user_id VARCHAR(50) NOT NULL,
                    family VARCHAR(150) NOT NULL,
                    display_name VARCHAR(150) NOT NULL,
                    category VARCHAR(80) NOT NULL,
                    source VARCHAR(30) NOT NULL DEFAULT 'uploaded',
                    filename VARCHAR(255) NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    file_size INTEGER NOT NULL,
                    storage_path VARCHAR(500) NOT NULL,
                    public_url VARCHAR(500) NOT NULL,
                    weights JSON NULL,
                    styles JSON NULL,
                    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
                    is_variable BOOLEAN NOT NULL DEFAULT FALSE,
                    licence VARCHAR(255) NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    CONSTRAINT fk_font_assets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            conn.execute(text("CREATE INDEX ix_font_assets_user_id ON font_assets (user_id)"))
            conn.execute(text("CREATE INDEX ix_font_assets_family ON font_assets (family)"))
