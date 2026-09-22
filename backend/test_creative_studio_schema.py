"""Model and restart-safe migration checks without starting a database server."""

from contextlib import contextmanager

from sqlalchemy.dialects import mysql
from sqlalchemy.orm import configure_mappers
from sqlalchemy.schema import CreateTable, Table

from database import (
    BrandCatalogItem,
    BrandCatalogMedia,
    BrandKit,
    GenerationJob,
    LocalResourceLease,
    LessonVideoSnapshot,
    Project,
)
from migrations import m_0021_creative_studio as migration


def test_mysql_schema_preserves_legacy_rows_and_checks_catalog_media():
    configure_mappers()
    for model, json_name in (
        (Project, "creative_context_json"),
        (BrandKit, "profile_json"),
    ):
        assert model.__table__.c[json_name].nullable
        assert str(model.__table__.c.revision.server_default.arg) == "1"
    for name in (
        "request_json",
        "base_revision",
        "result_json",
        "idempotency_key",
        "lease_token",
    ):
        assert GenerationJob.__table__.c[name].nullable
    for name in ("progress", "attempt", "cancel_requested"):
        assert str(GenerationJob.__table__.c[name].server_default.arg) == "0"
    media_ddl = str(
        CreateTable(BrandCatalogMedia.__table__).compile(dialect=mysql.dialect())
    )
    assert "ck_brand_catalog_media_one_asset" in media_ddl
    assert "uploaded_asset_id IS NOT NULL AND generated_asset_id IS NULL" in media_ddl
    assert "uploaded_asset_id IS NULL AND generated_asset_id IS NOT NULL" in media_ddl
    assert media_ddl.count("ON DELETE RESTRICT") == 2
    catalog_ddl = str(
        CreateTable(BrandCatalogItem.__table__).compile(dialect=mysql.dialect())
    )
    assert "kind IN ('product', 'service')" in catalog_ddl
    assert "cta_url VARCHAR(2048)" in catalog_ddl
    job_ddl = str(CreateTable(GenerationJob.__table__).compile(dialect=mysql.dialect()))
    assert "UNIQUE (user_id, idempotency_key)" in job_ddl
    assert list(LocalResourceLease.__table__.primary_key.columns.keys()) == [
        "lease_key"
    ]
    assert LessonVideoSnapshot.__table__.c.asset_manifest_json.nullable


class MigrationHarness:
    def __init__(self):
        self.columns = {table: {"id"} for table in migration.COLUMN_ADDITIONS}
        self.indexes = set()
        self.statements = []
        self.created_tables = set()

    @contextmanager
    def begin(self):
        yield self

    def execute(self, statement):
        sql = str(statement)
        self.statements.append(sql)
        words = sql.split()
        if words[:2] == ["INSERT", "IGNORE"]:
            return
        if words[:2] == ["ALTER", "TABLE"]:
            assert words[3:5] == ["ADD", "COLUMN"]
            assert words[5] not in self.columns[words[2]]
            self.columns[words[2]].add(words[5])
        else:
            assert words[0] == "CREATE"
            index_name = words[words.index("INDEX") + 1]
            assert index_name not in self.indexes
            self.indexes.add(index_name)

    def get_columns(self, table):
        return [{"name": name} for name in self.columns[table]]

    def get_indexes(self, table):
        assert table == "generation_jobs"
        return [{"name": name} for name in self.indexes]

    def get_unique_constraints(self, table):
        assert table == "generation_jobs"
        return []


def _install_harness(monkeypatch, state):
    monkeypatch.setattr(migration, "inspect", lambda engine: state)

    def create(table, engine, checkfirst=False):
        assert engine is state
        assert checkfirst
        state.created_tables.add(table.name)

    monkeypatch.setattr(Table, "create", create)


def test_migration_is_additive_and_safe_to_run_twice(monkeypatch):
    state = MigrationHarness()
    _install_harness(monkeypatch, state)
    migration.upgrade(state)
    expected_count = (
        sum(len(columns) for columns in migration.COLUMN_ADDITIONS.values())
        + len(migration.JOB_INDEXES)
        + 1
    )
    assert len(state.statements) == expected_count
    assert state.created_tables == {
        "brand_catalog_items",
        "brand_catalog_media",
        "local_resource_leases",
    }
    migration.upgrade(state)
    assert len(state.statements) == expected_count + 1


def test_migration_resumes_after_partial_mysql_ddl(monkeypatch):
    state = MigrationHarness()
    state.columns["projects"].update(migration.COLUMN_ADDITIONS["projects"])
    state.columns["generation_jobs"].add("request_json")
    state.indexes.add("uq_generation_job_idempotency")
    _install_harness(monkeypatch, state)
    migration.upgrade(state)
    assert not any(sql.startswith("ALTER TABLE projects") for sql in state.statements)
    assert not any("ADD COLUMN request_json" in sql for sql in state.statements)
    assert not any(sql.startswith("CREATE UNIQUE INDEX") for sql in state.statements)
    assert state.indexes == set(migration.JOB_INDEXES)
