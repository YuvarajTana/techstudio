from sqlalchemy import inspect, text


revision = "0019_video_render_frames"


def upgrade(engine):
    inspector = inspect(engine)
    if "video_render_jobs" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("video_render_jobs")}
    statements = []
    if "render_mode" not in columns:
        statements.append(
            "ALTER TABLE video_render_jobs ADD COLUMN render_mode VARCHAR(30) NOT NULL DEFAULT 'frame_sequence'"
        )
    if "total_frames" not in columns:
        statements.append(
            "ALTER TABLE video_render_jobs ADD COLUMN total_frames INT NOT NULL DEFAULT 0"
        )
    if "rendered_frames" not in columns:
        statements.append(
            "ALTER TABLE video_render_jobs ADD COLUMN rendered_frames INT NOT NULL DEFAULT 0"
        )
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
