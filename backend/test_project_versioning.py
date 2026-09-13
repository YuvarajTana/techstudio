from datetime import datetime, timedelta
from types import SimpleNamespace

from routes.projects import AUTOSAVE_VERSION_COALESCE_SECONDS, _should_coalesce_autosave


def test_autosave_versions_coalesce_only_inside_window():
    now = datetime.utcnow()
    recent_autosave = SimpleNamespace(
        name="Autosave",
        created_at=now - timedelta(seconds=AUTOSAVE_VERSION_COALESCE_SECONDS - 1),
    )
    old_autosave = SimpleNamespace(
        name="Autosave",
        created_at=now - timedelta(seconds=AUTOSAVE_VERSION_COALESCE_SECONDS + 1),
    )
    initial_version = SimpleNamespace(name="Initial version", created_at=now)

    assert _should_coalesce_autosave(recent_autosave, now) is True
    assert _should_coalesce_autosave(old_autosave, now) is False
    assert _should_coalesce_autosave(initial_version, now) is False
    assert _should_coalesce_autosave(None, now) is False
