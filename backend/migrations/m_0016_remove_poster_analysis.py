from sqlalchemy import inspect, text


revision = "0016_remove_poster_analysis"


def upgrade(engine):
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "poster_analysis_jobs" in tables:
            connection.execute(text("DROP TABLE poster_analysis_jobs"))

        if "uploaded_assets" in tables:
            columns = {column["name"] for column in inspector.get_columns("uploaded_assets")}
            if "asset_role" in columns:
                connection.execute(text("ALTER TABLE uploaded_assets DROP COLUMN asset_role"))
