from __future__ import annotations

import json

from sqlalchemy import inspect, text

revision = "0010_template_canvas_json_normalization"

DEFAULT_VIEWPORT_TRANSFORM = [1, 0, 0, 1, 0, 0]
TEXT_TYPES = {"text", "i-text", "textbox"}


def _normalize_viewport_transform(value):
    if not isinstance(value, list) or len(value) < 6:
        return DEFAULT_VIEWPORT_TRANSFORM.copy()
    try:
        parsed = [float(item) for item in value[:6]]
    except (TypeError, ValueError):
        return DEFAULT_VIEWPORT_TRANSFORM.copy()
    return parsed if all(item == item for item in parsed) else DEFAULT_VIEWPORT_TRANSFORM.copy()


def _normalize_canvas_json(raw):
    if not raw:
        return raw
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return raw
    if not isinstance(parsed, dict):
        return raw
    objects = parsed.get("objects")
    if not isinstance(objects, list):
        return raw
    parsed["viewportTransform"] = _normalize_viewport_transform(parsed.get("viewportTransform"))
    for index, item in enumerate(objects):
        if not isinstance(item, dict):
            continue
        object_type = str(item.get("type") or "").lower()
        if object_type in TEXT_TYPES and not isinstance(item.get("styles"), dict):
            item["styles"] = {}
        if object_type and not item.get("name"):
            item["name"] = f"{object_type[:1].upper()}{object_type[1:]} {index + 1}"
    return json.dumps(parsed, separators=(",", ":"))


def _backfill_table(engine, table_name, max_data_length=60000):
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if "id" not in columns or "data" not in columns:
        return
    with engine.begin() as conn:
        rows = conn.execute(text(f"SELECT id, data FROM {table_name} WHERE data IS NOT NULL AND data != ''")).fetchall()
        for row in rows:
            normalized = _normalize_canvas_json(row[1])
            if normalized != row[1] and len(normalized) <= max_data_length:
                conn.execute(text(f"UPDATE {table_name} SET data = :data WHERE id = :id"), {"id": row[0], "data": normalized})


def upgrade(engine):
    _backfill_table(engine, "templates")
    _backfill_table(engine, "projects")
    _backfill_table(engine, "design_versions")
