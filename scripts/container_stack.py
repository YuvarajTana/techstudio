#!/usr/bin/env python3
"""Run TECKSTUDIO's app services inside one container (see Dockerfile).

The API serves the built frontend on $PORT. The Remotion render worker and the
local generation worker run beside it and reach the API over loopback, which
the workers require and the API enforces for /api/internal/*. MySQL runs in its
own container. If any service exits, everything stops and the container exits
non-zero, so Docker's restart policy brings the whole set back together.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
PORT = int(os.environ.get("PORT", "8080"))
API = f"http://127.0.0.1:{PORT}"


def log(message: str) -> None:
    print(f"[teckstudio] {message}", flush=True)


def wait_for_database(timeout: int = 180) -> None:
    host, port = os.environ.get("DB_HOST", "db"), int(os.environ.get("DB_PORT", "3306"))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                return
        except OSError:
            time.sleep(1)
    raise RuntimeError(f"Database {host}:{port} did not accept connections within {timeout}s.")


def ready(path: str, field: str | None = None) -> bool:
    try:
        with urlopen(API + path, timeout=3) as response:
            if response.status != 200:
                return False
            return True if field is None else bool(json.loads(response.read()).get(field))
    except (OSError, ValueError):
        return False


def main() -> int:
    for name in ("JWT_SECRET", "LESSON_VIDEO_WORKER_SECRET", "DB_PASSWORD"):
        if not os.environ.get(name):
            log(f"{name} is not set. Start with ./scripts/demo.sh, or see docs/DEPLOY.md.")
            return 2
    wait_for_database()
    worker_env = {**os.environ, "TECKSTUDIO_API_URL": API}
    services = [
        ("api", [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", str(PORT), "--no-access-log"], ROOT / "backend", ("/health", None)),
        ("video worker", ["node", "--import", "tsx", "renderer/src/worker.ts"], ROOT, ("/api/health/lesson-video", "online")),
        ("generation worker", [sys.executable, str(ROOT / "backend/local_generation_worker.py")], ROOT, ("/api/health/local-generation", "online")),
    ]
    processes: list[tuple[str, subprocess.Popen]] = []
    stopping = False

    def stop(_signum=None, _frame=None):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        for name, command, cwd, (path, field) in services:
            processes.append((name, subprocess.Popen(command, cwd=cwd, env=worker_env)))
            # First start can rebuild the video bundle after an upgrade; allow a few minutes.
            deadline = time.monotonic() + 300
            while not ready(path, field):
                if stopping:
                    return 0
                if any(process.poll() is not None for _, process in processes):
                    raise RuntimeError(f"{name} exited during startup; see the log above.")
                if time.monotonic() > deadline:
                    raise RuntimeError(f"{name} did not become ready within 5 minutes.")
                time.sleep(1)
            log(f"{name} ready")
        log(f"TECKSTUDIO is running on port {PORT}.")
        while not stopping:
            for name, process in processes:
                if process.poll() is not None:
                    raise RuntimeError(f"{name} exited with code {process.returncode}.")
            time.sleep(1)
        return 0
    except RuntimeError as error:
        log(str(error))
        return 1
    finally:
        for name, process in reversed(processes):
            if process.poll() is None:
                process.terminate()
        for name, process in reversed(processes):
            try:
                process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    sys.exit(main())
