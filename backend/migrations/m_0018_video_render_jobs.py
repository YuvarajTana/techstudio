from sqlalchemy import inspect, text


revision = "0018_video_render_jobs"


def upgrade(engine):
    inspector = inspect(engine)
    if "video_render_jobs" in set(inspector.get_table_names()):
        return

    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE video_render_jobs (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                project_id VARCHAR(50) NOT NULL,
                format VARCHAR(10) NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'queued',
                progress INT NOT NULL DEFAULT 0,
                stage VARCHAR(160) NOT NULL DEFAULT 'Preparing project',
                width INT NOT NULL,
                height INT NOT NULL,
                fps INT NOT NULL,
                quality VARCHAR(20) NOT NULL,
                timeline_json JSON NOT NULL,
                output_path VARCHAR(500) NULL,
                file_name VARCHAR(255) NULL,
                mime_type VARCHAR(100) NULL,
                error_message TEXT NULL,
                cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                completed_at DATETIME NULL,
                INDEX ix_video_render_jobs_user_id (user_id),
                INDEX ix_video_render_jobs_project_id (project_id),
                INDEX ix_video_render_jobs_status (status),
                CONSTRAINT fk_video_render_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_video_render_jobs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        """))
