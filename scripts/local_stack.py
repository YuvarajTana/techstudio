#!/usr/bin/env python3
"""Own a loopback-only development stack without touching system MySQL data."""
from __future__ import annotations

import argparse
import errno
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".local"
DATA = RUNTIME / "mysql"
SOCKET = RUNTIME / "mysql.sock"
STATE = RUNTIME / "stack.json"
LAUNCHER_PID = RUNTIME / "launcher.pid"
STOP_REQUEST = RUNTIME / "stop.request"
DB_PORT, API_PORT, WEB_PORT = 3307, 5001, 5173


def secure_write(path: Path, contents: str) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        stream.write(contents)
    path.chmod(0o600)


def require(binary: str) -> str:
    resolved = shutil.which(binary)
    if not resolved:
        raise RuntimeError(f"Missing {binary}; see docs/LOCAL_SETUP.md")
    return resolved


def mysql_command() -> list[str]:
    return [require("mysqld"), "--no-defaults", f"--datadir={DATA}",
            f"--socket={SOCKET}", f"--pid-file={RUNTIME / 'mysql.pid'}",
            f"--log-error={RUNTIME / 'mysql.log'}", "--mysqlx=0",
            "--bind-address=127.0.0.1", f"--port={DB_PORT}"]


def stop(process: subprocess.Popen) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=30)
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"Process {process.pid} did not stop; inspect .local logs before retrying.")


def wait_for(probe, processes: list[subprocess.Popen], label: str, timeout: int = 180) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for process in processes:
            if process.poll() is not None:
                raise RuntimeError(f"A service exited while waiting for {label}; inspect .local/*.log")
        try:
            if probe():
                return
        except (OSError, ValueError):
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Timed out waiting for {label}; inspect .local/*.log")


def http_ready(url: str) -> bool:
    with urlopen(url, timeout=2) as response:
        return response.status == 200 and (not url.endswith("/api/health/lesson-video") or bool(json.loads(response.read()).get("online")))


def socket_ready() -> bool:
    with socket.socket(socket.AF_UNIX) as client:
        client.settimeout(1)
        client.connect(str(SOCKET))
        return True


def check_ports() -> None:
    for port in (DB_PORT, API_PORT, WEB_PORT):
        with socket.socket() as probe:
            try:
                probe.bind(("127.0.0.1", port))
            except OSError as error:
                if error.errno in {errno.EACCES, errno.EPERM}:
                    raise RuntimeError(f"Permission denied binding local port {port}; run the launcher with local-network permission.") from error
                raise RuntimeError(f"Port {port} is occupied. Stop that service or use the manual setup in docs/LOCAL_SETUP.md.") from error


def initialize() -> None:
    RUNTIME.mkdir(exist_ok=True, mode=0o700)
    RUNTIME.chmod(0o700)
    if STATE.exists():
        if not (ROOT / "backend/.env").exists():
            raise RuntimeError("Local state exists but backend/.env is missing. Restore it from your backup; setup will not replace credentials.")
        print("Local database already initialized; existing configuration preserved.")
        return
    if (ROOT / "backend/.env").exists() or DATA.exists():
        raise RuntimeError("Existing backend/.env or .local/mysql found. Use docs/LOCAL_SETUP.md manual setup; no existing data was changed.")
    check_ports()
    app_password, root_password, jwt_secret = (secrets.token_hex(32) for _ in range(3))
    # Save recovery credentials before initializing; never print them.
    secure_write(RUNTIME / "mysql-admin.cnf", f"[client]\nuser=root\npassword={root_password}\nsocket={SOCKET}\n")
    with (RUNTIME / "mysql-init.log").open("a") as log:
        subprocess.run([*mysql_command(), "--initialize-insecure"], check=True, stdout=log, stderr=log)
        # No TCP listener until root and application credentials have been set.
        process = subprocess.Popen([*mysql_command(), "--skip-networking"], stdout=log, stderr=log)
        try:
            wait_for(socket_ready, [process], "MySQL initialization")
            sql = (
                "CREATE DATABASE teckstudio_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n"
                f"CREATE USER 'teckstudio'@'127.0.0.1' IDENTIFIED BY '{app_password}';\n"
                f"CREATE USER 'teckstudio'@'localhost' IDENTIFIED BY '{app_password}';\n"
                "GRANT ALL PRIVILEGES ON teckstudio_local.* TO 'teckstudio'@'127.0.0.1';\n"
                "GRANT ALL PRIVILEGES ON teckstudio_local.* TO 'teckstudio'@'localhost';\n"
                f"ALTER USER 'root'@'localhost' IDENTIFIED BY '{root_password}';\n"
            )
            subprocess.run([require("mysql"), "--no-defaults", "--protocol=SOCKET", f"--socket={SOCKET}", "-u", "root"],
                           input=sql, text=True, check=True, stdout=log, stderr=log)
        finally:
            stop(process)
    sample = (ROOT / "backend/.env.example").read_text()
    overrides = {"DB_HOST": "127.0.0.1", "DB_PORT": str(DB_PORT), "DB_USER": "teckstudio",
                 "DB_PASSWORD": app_password, "DB_NAME": "teckstudio_local", "JWT_SECRET": jwt_secret,
                 "HOST": "127.0.0.1", "ENABLE_POLLINATIONS_FALLBACK": "false"}
    lines = [f"{line.split('=', 1)[0]}={overrides[line.split('=', 1)[0]]}"
             if '=' in line and line.split('=', 1)[0] in overrides else line
             for line in sample.splitlines()]
    secure_write(ROOT / "backend/.env", "\n".join(lines) + "\n")
    if not (ROOT / "frontend/.env.local").exists():
        secure_write(ROOT / "frontend/.env.local", "VITE_API_BASE_URL=http://127.0.0.1:5001\n")
    secure_write(STATE, json.dumps({"database": "teckstudio_local", "port": DB_PORT}) + "\n")
    print("Created isolated local MySQL data, database user, and environment files.")


def frontend_command() -> list[str]:
    package = subprocess.check_output([require("node"), "-p", "require.resolve('vite/package.json', {paths: [process.argv[1]]})", str(ROOT / "frontend")], text=True).strip()
    return [require("node"), str(Path(package).parent / "bin/vite.js"), "--host", "127.0.0.1", "--port", str(WEB_PORT), "--strictPort"]


def start() -> None:
    if not STATE.exists():
        raise RuntimeError("Run ./scripts/setup_local.sh first.")
    check_ports()
    STOP_REQUEST.unlink(missing_ok=True)
    secure_write(LAUNCHER_PID, f"{os.getpid()}\n")
    processes: list[subprocess.Popen] = []
    logs = []

    def interrupt(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    try:
        for name, command, directory, url in [
            ("mysql", mysql_command(), ROOT, None),
            ("backend", [str(ROOT / ".venv/bin/python"), "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(API_PORT)], ROOT / "backend", f"http://127.0.0.1:{API_PORT}/health"),
            ("frontend", frontend_command(), ROOT / "frontend", f"http://127.0.0.1:{WEB_PORT}/"),
            ("renderer", [require("node"), "--import", "tsx", "renderer/src/worker.ts"], ROOT, f"http://127.0.0.1:{API_PORT}/api/health/lesson-video"),
        ]:
            log = (RUNTIME / f"{name}-process.log").open("a")
            logs.append(log)
            processes.append(subprocess.Popen(command, cwd=directory, stdout=log, stderr=log))
            wait_for((lambda: http_ready(url)) if url else socket_ready, processes, name)
            print(f"{name} ready", flush=True)
        print(f"\nTECKSTUDIO: http://127.0.0.1:{WEB_PORT}\nAPI docs: http://127.0.0.1:{API_PORT}/docs\nVisual guide: http://127.0.0.1:{WEB_PORT}/guide.html\nPress Ctrl+C to stop all four services; data is preserved.", flush=True)
        while True:
            if STOP_REQUEST.exists():
                print("Stopping local services…", flush=True)
                break
            if any(process.poll() is not None for process in processes):
                raise RuntimeError("A service exited. Inspect .local/*-process.log")
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping local services…", flush=True)
    finally:
        for process in reversed(processes):
            stop(process)
        for log in logs:
            log.close()
        LAUNCHER_PID.unlink(missing_ok=True)
        STOP_REQUEST.unlink(missing_ok=True)


def request_stop() -> None:
    if not LAUNCHER_PID.exists():
        print("No managed launcher is running.")
        return
    secure_write(STOP_REQUEST, "stop\n")
    deadline = time.monotonic() + 45
    while LAUNCHER_PID.exists() and time.monotonic() < deadline:
        time.sleep(0.5)
    if LAUNCHER_PID.exists():
        raise RuntimeError("Stop requested but launcher has not confirmed shutdown. Inspect .local logs; no unrelated process was killed.")
    print("Local services stopped. Projects and media are preserved.")


def status() -> None:
    for name, url in [("frontend", f"http://127.0.0.1:{WEB_PORT}/"), ("backend", f"http://127.0.0.1:{API_PORT}/health"), ("database", f"http://127.0.0.1:{API_PORT}/api/health/database"), ("renderer", f"http://127.0.0.1:{API_PORT}/api/health/lesson-video")]:
        try:
            print(f"{name}: {'ready' if http_ready(url) else 'not ready'}")
        except OSError:
            print(f"{name}: not ready")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("init", "start", "stop", "status"))
    args = parser.parse_args()
    try:
        {"init": initialize, "start": start, "stop": request_stop, "status": status}[args.command]()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
