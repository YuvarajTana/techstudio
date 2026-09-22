"""Add reusable creative context and durable local generation work.

All existing rows remain valid. NULL request/idempotency fields distinguish
historical synchronous generation records from queued creative work.
"""

from sqlalchemy import inspect, text

from database import BrandCatalogItem, BrandCatalogMedia, LocalResourceLease

revision = "0021_creative_studio"

COLUMN_ADDITIONS = {
    "brand_kits": {
        "profile_json": "JSON NULL",
        "revision": "INT NOT NULL DEFAULT 1",
    },
    "projects": {
        "creative_context_json": "JSON NULL",
        "revision": "INT NOT NULL DEFAULT 1",
    },
    "lesson_video_snapshots": {
        "asset_manifest_json": "JSON NULL",
    },
    "design_versions": {
        "creative_context_json": "JSON NULL",
        "project_revision": "INT NULL",
    },
    "generation_jobs": {
        "request_json": "JSON NULL",
        "base_revision": "INT NULL",
        "stage": "VARCHAR(160) NULL",
        "result_json": "JSON NULL",
        "progress": "INT NOT NULL DEFAULT 0",
        "idempotency_key": "VARCHAR(128) NULL",
        "attempt": "INT NOT NULL DEFAULT 0",
        "cancel_requested": "BOOLEAN NOT NULL DEFAULT 0",
        "lease_owner": "VARCHAR(80) NULL",
        "lease_token": "VARCHAR(64) NULL",
        "lease_expires_at": "DATETIME NULL",
        "heartbeat_at": "DATETIME NULL",
        "completed_at": "DATETIME NULL",
    },
}

JOB_INDEXES = {
    "uq_generation_job_idempotency": (
        "CREATE UNIQUE INDEX uq_generation_job_idempotency "
        "ON generation_jobs (user_id, idempotency_key)"
    ),
    "ix_generation_job_queue": (
        "CREATE INDEX ix_generation_job_queue "
        "ON generation_jobs (status, lease_expires_at, created_at)"
    ),
}


def upgrade(engine):
    for table_name, additions in COLUMN_ADDITIONS.items():
        columns = {column["name"] for column in inspect(engine).get_columns(table_name)}
        with engine.begin() as connection:
            for name, definition in additions.items():
                if name not in columns:
                    connection.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {name} {definition}")
                    )

    for table in (
        BrandCatalogItem.__table__,
        BrandCatalogMedia.__table__,
        LocalResourceLease.__table__,
    ):
        table.create(engine, checkfirst=True)

    inspector = inspect(engine)
    indexes = {item["name"] for item in inspector.get_indexes("generation_jobs")}
    indexes.update(
        item["name"] for item in inspector.get_unique_constraints("generation_jobs")
    )
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT IGNORE INTO local_resource_leases (lease_key, updated_at) "
                "VALUES ('heavy-compute', CURRENT_TIMESTAMP)"
            )
        )
        for name, statement in JOB_INDEXES.items():
            if name not in indexes:
                connection.execute(text(statement))
