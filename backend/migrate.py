from __future__ import annotations

import importlib
import pkgutil
from datetime import datetime

from sqlalchemy import text

from database import engine
import migrations


def _ensure_migration_table() -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                revision VARCHAR(100) PRIMARY KEY,
                applied_at DATETIME NOT NULL
            )
        """))


def _applied_revisions() -> set[str]:
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT revision FROM schema_migrations")).fetchall()
    return {row[0] for row in rows}


def _migration_modules():
    modules = []
    for module in pkgutil.iter_modules(migrations.__path__):
        if module.name.startswith("_"):
            continue
        modules.append(importlib.import_module(f"migrations.{module.name}"))
    return sorted(modules, key=lambda item: item.revision)


def run_migrations() -> list[str]:
    """Run unapplied migrations without deleting or resetting existing data."""
    _ensure_migration_table()
    applied = _applied_revisions()
    applied_now: list[str] = []

    for migration in _migration_modules():
        if migration.revision in applied:
            continue
        migration.upgrade(engine)
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO schema_migrations (revision, applied_at) VALUES (:revision, :applied_at)"),
                {"revision": migration.revision, "applied_at": datetime.utcnow()},
            )
        applied_now.append(migration.revision)

    return applied_now


if __name__ == "__main__":
    revisions = run_migrations()
    if revisions:
        print("Applied migrations: " + ", ".join(revisions))
    else:
        print("No pending migrations.")
