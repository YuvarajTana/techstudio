"""Add lesson documents and durable renderer leases without changing legacy jobs."""

from sqlalchemy import inspect, text
from database import LessonVideoDocument, LessonVideoSnapshot, LessonVideoWorker

revision = "0020_lesson_videos"


def upgrade(engine):
    for table in (
        LessonVideoDocument.__table__,
        LessonVideoSnapshot.__table__,
        LessonVideoWorker.__table__,
    ):
        table.create(engine, checkfirst=True)
    columns = {c["name"] for c in inspect(engine).get_columns("video_render_jobs")}
    additions = {
        "snapshot_id": "VARCHAR(50) NULL",
        "idempotency_key": "VARCHAR(128) NULL",
        "attempt": "INT NOT NULL DEFAULT 0",
        "lease_token": "VARCHAR(64) NULL",
        "lease_expires_at": "DATETIME NULL",
        "heartbeat_at": "DATETIME NULL",
    }
    with engine.begin() as conn:
        for name, definition in additions.items():
            if name not in columns:
                conn.execute(
                    text(
                        f"ALTER TABLE video_render_jobs ADD COLUMN {name} {definition}"
                    )
                )
        indexes = {i["name"] for i in inspect(engine).get_indexes("video_render_jobs")}
        unique = {
            i["name"]
            for i in inspect(engine).get_unique_constraints("video_render_jobs")
        }
        if "uq_video_render_idempotency" not in indexes | unique:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX uq_video_render_idempotency ON video_render_jobs (user_id, project_id, idempotency_key)"
                )
            )
        if "ix_lesson_video_queue" not in indexes:
            conn.execute(
                text(
                    "CREATE INDEX ix_lesson_video_queue ON video_render_jobs (render_mode, status, lease_expires_at, created_at)"
                )
            )
