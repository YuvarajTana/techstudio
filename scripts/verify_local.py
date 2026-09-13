#!/usr/bin/env python3
"""Smoke-test the running local API. Creates only its own clearly named fixtures.

Never calls an AI or third-party provider. Leaves one editable demo project and
private local login file, plus an encoding fixture and results under .local.
"""
from __future__ import annotations

import io
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

import httpx
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".local"
BASE = "http://127.0.0.1:5001"


def checked(response: httpx.Response, expected: int = 200):
    if response.status_code != expected:
        raise AssertionError(f"{response.request.method} {response.request.url.path}: expected {expected}, got {response.status_code}; {response.text[:400]}")
    return response.json() if response.content else None


def main() -> None:
    assert (RUNTIME / "stack.json").exists(), "Use the managed local stack for this smoke check."
    from dotenv import dotenv_values
    environment = dotenv_values(ROOT / "backend/.env")
    assert environment.get("DB_NAME") == "teckstudio_local" and environment.get("DB_PORT") == "3307", "Smoke checks are restricted to teckstudio_local on port 3307."
    account_file = RUNTIME / "demo-account.json"
    account = json.loads(account_file.read_text()) if account_file.exists() else {
        "name": "Local Teaching Demo", "email": f"teacher-{secrets.token_hex(4)}@example.test",
        "password": secrets.token_urlsafe(24),
    }
    passed = []

    def passed_check(label):
        passed.append(label)
        print(f"PASS {label}", flush=True)

    with httpx.Client(base_url=BASE, timeout=60, trust_env=False) as client:
        checked(client.get("/health"))
        assert checked(client.get("/api/health/database"))["database"] == "connected"
        passed_check("API and database health")
        endpoint = "/api/auth/login" if account_file.exists() else "/api/auth/register"
        session = checked(client.post(endpoint, json=account))
        if not account_file.exists():
            descriptor = os.open(account_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w") as stream:
                json.dump(account, stream, indent=2)
        client.headers["Authorization"] = f"Bearer {session['token']}"
        assert checked(client.get("/api/auth/me"))["email"] == account["email"]
        passed_check("registration/login and authenticated profile")

        objects = [
            {"type": "textbox", "left": 70, "top": 70, "width": 940, "text": "WHERE DOES A REQUEST GO?", "fontSize": 54, "fontFamily": "Arial", "fontWeight": "bold", "fill": "#f7fafc"},
            {"type": "textbox", "left": 70, "top": 175, "width": 920, "text": "Outcome: trace a request through an API and database.", "fontSize": 28, "fontFamily": "Arial", "fill": "#b4c8d3"},
        ]
        for index, (title, body) in enumerate([
            ("01  CLIENT", "Sends GET /courses"), ("02  API SERVICE", "Validates input and reads data"),
            ("03  DATABASE", "Returns matching records"), ("04  RESPONSE", "Client receives the course list"),
        ]):
            top = 280 + index * 195
            objects.extend([
                {"type": "rect", "left": 70, "top": top, "width": 940, "height": 160, "rx": 18, "ry": 18, "fill": "#182e3b", "stroke": "#4fbc9b", "strokeWidth": 2},
                {"type": "textbox", "left": 105, "top": top + 24, "width": 860, "text": title, "fontSize": 30, "fontFamily": "Arial", "fontWeight": "bold", "fill": "#8ce3c0"},
                {"type": "textbox", "left": 105, "top": top + 76, "width": 860, "text": body, "fontSize": 28, "fontFamily": "Arial", "fill": "#edf4fa"},
            ])
        objects.append({"type": "textbox", "left": 70, "top": 1120, "width": 930, "text": "PRACTICE\nWhat changes when the database is unavailable?\n\nIllustrative example; /courses is not a TECKSTUDIO endpoint.", "fontSize": 27, "fontFamily": "Arial", "fill": "#c7bbeb"})
        canvas = {"version": "5.3.0", "width": 1080, "height": 1350, "background": "#0b1824", "objects": objects}
        project = checked(client.post("/api/projects", json={"name": "Local smoke demo — Request lifecycle", "width": 1080, "height": 1350, "data": json.dumps(canvas)}))
        project_id = project["id"]
        checked(client.put(f"/api/projects/{project_id}", json={"name": "Teaching starter — Request lifecycle", "data": json.dumps(canvas)}))
        assert json.loads(checked(client.get(f"/api/projects/{project_id}"))["data"]) == canvas
        passed_check("project create, save and exact JSON reload")

        assert checked(client.get("/api/templates", params={"limit": 2})).get("templates") is not None
        assert checked(client.get("/api/assets", params={"limit": 2}))
        kit = checked(client.post("/api/brand-kits", json={"name": f"Smoke palette {project_id}"}), 201)
        assert kit["id"]
        passed_check("template/assets reads and brand-kit create")

        picture = Image.new("RGB", (1080, 1350), "#152433")
        ImageDraw.Draw(picture).rectangle((150, 300, 930, 1000), outline="#8ce3c0", width=8)
        png = io.BytesIO()
        picture.save(png, format="PNG")
        upload = checked(client.post("/api/uploads/images", files={"image": ("local-smoke.png", png.getvalue(), "image/png")}), 201)
        assert upload
        passed_check("real image upload")

        with httpx.Client(base_url=BASE, trust_env=False) as anonymous:
            assert anonymous.get(f"/api/projects/{project_id}").status_code in {401, 403}
        passed_check("unauthenticated project read rejected")
        # Exercise the same multipart frame-job contract used by the browser.
        timeline = {"durationMs": 500, "tracks": [{"id": "poster", "type": "poster", "clips": [{"id": "clip", "pageId": "page", "startMs": 0, "durationMs": 500, "visible": True}]}], "transitions": []}
        job = checked(client.post("/api/video/render/frames", data={"project_id": project_id, "format": "mp4", "width": 1080, "height": 1350, "fps": 24, "quality": "draft", "total_frames": 12, "timeline_json": json.dumps(timeline)}), 202)
        job_id = job["job_id"]
        checked(client.post(f"/api/video/render/{job_id}/frames", data={"start_index": 0}, files=[("frames", (f"frame-{index:06d}.png", png.getvalue(), "image/png")) for index in range(12)]))
        checked(client.post(f"/api/video/render/{job_id}/finalize"))
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            status = checked(client.get(f"/api/video/render/{job_id}"))
            if status["status"] in {"completed", "failed", "cancelled"}:
                break
            time.sleep(1)
        assert status["status"] == "completed", status
        video = client.get(status["download_url"])
        video.raise_for_status()
        output = RUNTIME / "smoke-render.mp4"
        output.write_bytes(video.content)
        probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(output)], text=True))
        stream = next(item for item in probe["streams"] if item["codec_type"] == "video")
        assert (stream["width"], stream["height"]) == (1080, 1350)
        assert stream["codec_name"] == "h264" and int(stream["nb_frames"]) == 12
        passed_check("12-frame upload, FFmpeg H.264 encode and authenticated download")
        checked(client.post("/api/auth/logout"))
        assert client.get("/api/auth/me").status_code == 401
        passed_check("logout revokes the session")
        (RUNTIME / "smoke-results.json").write_text(json.dumps({"passed": passed, "project_id": project_id, "render_job_id": job_id, "video_probe": {key: stream[key] for key in ("codec_name", "width", "height", "nb_frames")}}, indent=2))
    print("Private demo credentials: .local/demo-account.json; results: .local/smoke-results.json")


def reopen() -> None:
    account = json.loads((RUNTIME / "demo-account.json").read_text())
    results = json.loads((RUNTIME / "smoke-results.json").read_text())
    with httpx.Client(base_url=BASE, timeout=30, trust_env=False) as client:
        session = checked(client.post("/api/auth/login", json=account))
        client.headers["Authorization"] = f"Bearer {session['token']}"
        project = checked(client.get(f"/api/projects/{results['project_id']}"))
        assert project["name"] == "Teaching starter — Request lifecycle"
        assert json.loads(project["data"])["objects"][0]["text"] == "WHERE DOES A REQUEST GO?"
        checked(client.post("/api/auth/logout"))
    print("PASS saved demo project survives a full local-stack restart")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reopen", action="store_true", help="Check the existing smoke fixture after restarting; creates no new project.")
    if parser.parse_args().reopen:
        reopen()
    else:
        main()
