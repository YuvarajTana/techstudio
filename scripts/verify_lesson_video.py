#!/usr/bin/env python3
"""Verify lesson videos against the managed local database; leaves named demo lessons."""

import argparse
import concurrent.futures
import copy
import json
import os
from pathlib import Path
import secrets
import time
import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".local"
BASE = "http://127.0.0.1:5001"


def checked(response, expected=200):
    assert (
        response.status_code == expected
    ), f"{response.request.method} {response.request.url.path}: {response.status_code} {response.text[:700]}"
    return response.json()


def wait_job(client, job_id, timeout=300):
    deadline = time.monotonic() + timeout
    previous = None
    while time.monotonic() < deadline:
        result = checked(client.get(f"/api/video/render/{job_id}"))
        mark = (result["status"], result["stage"], result["progress"] // 10)
        if mark != previous:
            print(
                f"{result['status']}: {result['stage']} ({result['progress']}%)",
                flush=True,
            )
            previous = mark
        if result["status"] in {"completed", "failed", "cancelled"}:
            assert result["status"] == "completed", result
            return result
        time.sleep(1)
    raise AssertionError("Render did not complete within the verification window.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--submit-recovery", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--reopen", action="store_true")
    args = parser.parse_args()
    env = dotenv_values(ROOT / "backend/.env")
    assert env.get("DB_NAME") == "teckstudio_local" and env.get("DB_PORT") == "3307"
    account_path = RUNTIME / "demo-account.json"
    assert (
        account_path.exists()
    ), "Run scripts/verify_local.py once to create a local verification account."
    account = json.loads(account_path.read_text())
    example = json.loads((ROOT / "packages/lesson-video/src/example.json").read_text())
    state_path = RUNTIME / (
        "lesson-recovery.json"
        if args.resume or args.submit_recovery
        else "lesson-smoke.json"
    )
    with httpx.Client(base_url=BASE, timeout=60, trust_env=False) as client:
        login = checked(client.post("/api/auth/login", json=account))
        client.headers["Authorization"] = f"Bearer {login['token']}"
        if args.resume or args.reopen:
            state = json.loads(state_path.read_text())
            doc = checked(
                client.get(f"/api/projects/{state['project_id']}/lesson-video")
            )
            assert doc["revision"] == state["revision"]
            if args.resume:
                wait_job(client, state["job_id"])
                jobs = checked(
                    client.get(f"/api/projects/{state['project_id']}/video-renders")
                )["jobs"]
                job = next(j for j in jobs if j["job_id"] == state["job_id"])
                assert job["attempt"] >= 2, job
                print(
                    "PASS actual worker interruption and recovery to a new attempt",
                    flush=True,
                )
            else:
                print("PASS saved lesson reopens after stack restart", flush=True)
            return
        doc = checked(client.post("/api/lesson-videos", json={"spec": example}), 201)
        project_id = doc["project_id"]
        changed = copy.deepcopy(example)
        changed["title"] = "Teaching demo — Follow an API request"
        doc = checked(
            client.put(
                f"/api/projects/{project_id}/lesson-video",
                json={"expected_revision": 1, "spec": changed},
            )
        )
        assert doc["revision"] == 2
        checked(
            client.put(
                f"/api/projects/{project_id}/lesson-video",
                json={"expected_revision": 1, "spec": example},
            ),
            409,
        )
        request = {
            "project_id": project_id,
            "expected_revision": 2,
            "idempotency_key": secrets.token_hex(16),
        }
        if args.submit_recovery:
            job = checked(client.post("/api/video/render/remotion", json=request), 202)
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                status = checked(client.get(f"/api/video/render/{job['job_id']}"))
                if status["status"] == "processing":
                    break
                time.sleep(0.25)
            assert status["status"] == "processing"
            state_path.write_text(
                json.dumps(
                    {"project_id": project_id, "job_id": job["job_id"], "revision": 2}
                )
            )
            print(
                "Recovery job is actively rendering. Ready for a controlled worker interruption.",
                flush=True,
            )
            return

        # Exercise concurrent idempotency against real MySQL row locks.
        def enqueue(_):
            with httpx.Client(
                base_url=BASE, headers=dict(client.headers), timeout=60, trust_env=False
            ) as session:
                return checked(
                    session.post("/api/video/render/remotion", json=request), 202
                )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            jobs = list(pool.map(enqueue, range(2)))
        assert jobs[0]["job_id"] == jobs[1]["job_id"]
        job_id = jobs[0]["job_id"]
        print("PASS concurrent idempotent submission on MySQL", flush=True)
        checked(client.delete(f"/api/projects/{project_id}"), 409)
        wait_job(client, job_id)
        response = client.get(f"/api/video/download/{job_id}")
        assert response.status_code == 200
        (RUNTIME / "lesson-platform.mp4").write_bytes(response.content)
        manifest = checked(client.get(f"/api/video/render/{job_id}/artifacts/manifest"))
        assert manifest["plan"]["durationInFrames"] == 1620
        assert manifest["spec"]["title"] == changed["title"]
        assert (
            client.get(f"/api/video/render/{job_id}/artifacts/poster").status_code
            == 200
        )
        print("PASS real MP4, poster, manifest and authenticated download", flush=True)
        other_account = {
            "name": "Lesson isolation test",
            "email": f"lesson-{secrets.token_hex(5)}@example.test",
            "password": secrets.token_urlsafe(24),
        }
        other = checked(client.post("/api/auth/register", json=other_account))
        for path in [
            f"/api/projects/{project_id}/lesson-video",
            f"/api/projects/{project_id}/video-renders",
            f"/api/video/download/{job_id}",
            f"/api/video/render/{job_id}/artifacts/manifest",
        ]:
            checked(
                client.get(path, headers={"Authorization": f"Bearer {other['token']}"}),
                404,
            )
        print("PASS cross-account lesson and artifact isolation", flush=True)
        cancelled = checked(
            client.post(
                "/api/video/render/remotion",
                json={**request, "idempotency_key": secrets.token_hex(16)},
            ),
            202,
        )
        checked(client.delete(f"/api/video/render/{cancelled['job_id']}"))
        assert (
            checked(client.get(f"/api/video/render/{cancelled['job_id']}"))["status"]
            == "cancelled"
        )
        # Trash/restore a separate lesson so the completed demo keeps its render history.
        disposable = checked(
            client.post("/api/lesson-videos", json={"spec": example}), 201
        )
        checked(client.delete(f"/api/projects/{disposable['project_id']}"))
        trash = checked(client.get("/api/projects/trash"))["items"]
        item = next(t for t in trash if t["item_id"] == disposable["project_id"])
        checked(client.post(f"/api/projects/trash/{item['id']}/restore"))
        restored = checked(
            client.get(f"/api/projects/{disposable['project_id']}/lesson-video")
        )
        assert restored["spec"] == example
        print("PASS cancel and editable lesson trash/restore", flush=True)
        state = {
            "project_id": project_id,
            "job_id": job_id,
            "revision": 2,
            "route": f"http://127.0.0.1:5173/lesson-video/{project_id}",
            "checks": [
                "MySQL concurrent idempotency",
                "optimistic revisions",
                "real render",
                "owned downloads",
                "cross-account isolation",
                "cancel",
                "trash/restore",
            ],
        }
        state_path.write_text(json.dumps(state, indent=2))
        print(json.dumps(state, indent=2), flush=True)


if __name__ == "__main__":
    main()
