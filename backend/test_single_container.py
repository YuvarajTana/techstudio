"""The Docker image's single-port mode: the API serves the built frontend, and
worker routes answer only callers on the same machine (see Dockerfile)."""
import os
import subprocess
import sys
import textwrap
from pathlib import Path

BACKEND = Path(__file__).resolve().parent

CHECKS = textwrap.dedent(
    """
    from fastapi.testclient import TestClient
    import main

    outside = TestClient(main.app)                       # client host "testclient"
    worker = TestClient(main.app, client=("127.0.0.1", 50000))

    # The app shell and its hashed assets come from FRONTEND_DIST.
    page = outside.get("/design?template=ds-pcs-diwali")
    assert page.status_code == 200 and "app-shell" in page.text, page.text
    assert page.headers["cache-control"] == "no-cache"
    asset = outside.get("/assets/app-123.js")
    assert asset.status_code == 200 and "immutable" in asset.headers["cache-control"]
    assert outside.get("/editor/abc").text == page.text, "client routes fall back to index.html"
    assert outside.get("/../main.py").text == page.text, "no path escapes the build folder"

    # API routes still win; unknown API paths are real 404s, not the app shell.
    assert outside.get("/health").json()["status"] == "ok"
    missing = outside.get("/api/does-not-exist")
    assert missing.status_code == 404 and "app-shell" not in missing.text
    assert outside.get("/openapi.json").status_code == 200

    # Worker routes: hidden from outside callers even with the right secret.
    headers = {"X-Teckstudio-Worker": "wrong"}
    assert outside.post("/api/internal/lesson-video/heartbeat", json={}, headers=headers).status_code == 404
    assert worker.post("/api/internal/lesson-video/heartbeat", json={}, headers=headers).status_code in {401, 403, 422}
    print("ok")
    """
)


def test_single_port_app_and_loopback_only_worker_routes(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html><body>app-shell</body></html>")
    (dist / "assets/app-123.js").write_text("console.log('app')")
    env = {
        **os.environ,
        "FRONTEND_DIST": str(dist),
        "INTERNAL_API_LOOPBACK_ONLY": "true",
        "JWT_SECRET": "x" * 40,
        "APP_ENV": "production",
    }
    result = subprocess.run([sys.executable, "-c", CHECKS], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
    assert result.returncode == 0 and result.stdout.strip().endswith("ok"), result.stdout + result.stderr
