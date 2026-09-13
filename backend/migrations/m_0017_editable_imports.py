from sqlalchemy import inspect, text


revision = "0017_editable_imports"


def upgrade(engine):
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "uploaded_assets" in tables:
        columns = {column["name"] for column in inspector.get_columns("uploaded_assets")}
        with engine.begin() as connection:
            if "asset_role" not in columns:
                connection.execute(text(
                    "ALTER TABLE uploaded_assets ADD COLUMN asset_role VARCHAR(50) NOT NULL DEFAULT 'upload'"
                ))
        inspector = inspect(engine)
        indexes = {index["name"] for index in inspector.get_indexes("uploaded_assets")}
        if "ix_uploaded_assets_asset_role" not in indexes:
            with engine.begin() as connection:
                connection.execute(text(
                    "CREATE INDEX ix_uploaded_assets_asset_role ON uploaded_assets (asset_role)"
                ))

    inspector = inspect(engine)
    if "poster_analysis_jobs" in set(inspector.get_table_names()):
        return

    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE poster_analysis_jobs (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                asset_id VARCHAR(50) NOT NULL,
                project_id VARCHAR(50) NULL,
                mode VARCHAR(20) NOT NULL DEFAULT 'quick',
                language VARCHAR(40) NOT NULL DEFAULT 'auto',
                status VARCHAR(30) NOT NULL DEFAULT 'queued',
                stage VARCHAR(100) NOT NULL DEFAULT 'Preparing image',
                progress INT NOT NULL DEFAULT 0,
                result_json JSON NULL,
                error_message TEXT NULL,
                cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                completed_at DATETIME NULL,
                INDEX ix_poster_analysis_jobs_user_id (user_id),
                INDEX ix_poster_analysis_jobs_asset_id (asset_id),
                INDEX ix_poster_analysis_jobs_status (status),
                CONSTRAINT fk_poster_analysis_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_poster_analysis_jobs_asset FOREIGN KEY (asset_id) REFERENCES uploaded_assets(id) ON DELETE CASCADE,
                CONSTRAINT fk_poster_analysis_jobs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        """))
