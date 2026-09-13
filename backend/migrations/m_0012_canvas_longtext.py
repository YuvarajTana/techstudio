from sqlalchemy import inspect, text


revision = "0012_canvas_longtext"


def _column_type(engine, table_name: str, column_name: str) -> str:
    inspector = inspect(engine)
    for column in inspector.get_columns(table_name):
        if column["name"] == column_name:
            return str(column["type"]).lower()
    return ""


def upgrade(engine):
    if engine.dialect.name != "mysql":
        return

    table_columns = (
        ("projects", "data", "NULL"),
        ("design_versions", "data", "NOT NULL"),
        ("templates", "data", "NULL"),
    )

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table_name, column_name, nullable in table_columns:
            if table_name not in existing_tables:
                continue
            if "longtext" in _column_type(engine, table_name, column_name):
                continue
            conn.execute(text(
                f"ALTER TABLE `{table_name}` MODIFY `{column_name}` LONGTEXT {nullable}"
            ))
