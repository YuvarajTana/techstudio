from sqlalchemy import inspect


revision = "0001_baseline"


def upgrade(engine):
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    required_tables = {
        "users",
        "auth_sessions",
        "projects",
        "brand_kits",
        "shared_designs",
        "assets",
        "generated_assets",
        "generation_jobs",
    }
    missing_tables = sorted(required_tables - existing_tables)
    if missing_tables:
        raise RuntimeError(
            "Cannot baseline database; missing required tables: "
            + ", ".join(missing_tables)
        )
