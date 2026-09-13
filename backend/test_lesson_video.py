import copy
import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database import (
    Base,
    User,
    Project,
    VideoRenderJob,
    LessonVideoDocument,
    LessonVideoSnapshot,
    get_db,
)
from auth import get_current_user
from routes import lesson_video, projects, video_render
from services.lesson_spec import ROOT, validate_spec, compile_spec
from services import lesson_video_service as service

EXAMPLE = json.loads((ROOT / "packages/lesson-video/src/example.json").read_text())


@pytest.fixture
def context():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)
    with session() as db:
        db.add_all(
            [
                User(
                    id="owner",
                    name="Owner",
                    email="owner@example.test",
                    password_hash="unused",
                ),
                User(
                    id="other",
                    name="Other",
                    email="other@example.test",
                    password_hash="unused",
                ),
            ]
        )
        db.commit()
    app = FastAPI()
    app.include_router(lesson_video.router)
    app.include_router(lesson_video.internal)
    app.include_router(projects.router)
    app.include_router(video_render.router)
    identity = {"id": "owner"}

    def db_dependency():
        with session() as db:
            yield db

    def user_dependency():
        with session() as db:
            return db.get(User, identity["id"])

    app.dependency_overrides[get_db] = db_dependency
    app.dependency_overrides[get_current_user] = user_dependency
    with patch.object(
        service, "runtime_info", return_value={"bundleId": "a" * 64}
    ), patch.object(service, "worker_secret", return_value="test-worker-secret"):
        yield TestClient(app), session, identity
    engine.dispose()


def create(client):
    result = client.post("/api/lesson-videos", json={"spec": EXAMPLE})
    assert result.status_code == 201, result.text
    return result.json()


def submit(client, doc, key="submission-1"):
    return client.post(
        "/api/video/render/remotion",
        json={
            "project_id": doc["project_id"],
            "expected_revision": doc["revision"],
            "idempotency_key": key,
        },
    )


def test_shared_contract_and_timing():
    assert compile_spec(validate_spec(EXAMPLE))["durationInFrames"] == 1620
    assert [s["startFrame"] for s in compile_spec(EXAMPLE)["scenes"]] == [
        0,
        180,
        600,
        1050,
        1350,
    ]


@pytest.mark.parametrize(
    "variant",
    [
        "reference",
        "duplicate",
        "reveal",
        "order",
        "unknown",
        "format",
        "nan",
        "oversize",
    ],
)
def test_invalid_specs(variant):
    spec = copy.deepcopy(EXAMPLE)
    if variant == "reference":
        spec["scenes"][1]["edges"][0]["to"] = "missing"
    if variant == "duplicate":
        spec["scenes"][1]["id"] = spec["scenes"][0]["id"]
    if variant == "reveal":
        spec["scenes"][3]["revealAtFrame"] = 300
    if variant == "order":
        spec["scenes"][1]["steps"][1]["atFrame"] = 0
    if variant == "unknown":
        spec["scenes"][0]["code"] = "arbitrary-code"
    if variant == "format":
        spec["output"]["preset"] = "4k"
    if variant == "nan":
        spec["scenes"][0]["durationFrames"] = float("nan")
    if variant == "oversize":
        spec["title"] = "x" * (1024 * 1024)
    with pytest.raises(ValueError):
        validate_spec(spec)


def test_revisions_and_immutable_snapshot(context):
    client, session, _ = context
    doc = create(client)
    job = submit(client, doc).json()
    assert job["status"] == "queued"
    changed = copy.deepcopy(EXAMPLE)
    changed["title"] = "Revised lesson"
    saved = client.put(
        f"/api/projects/{doc['project_id']}/lesson-video",
        json={"expected_revision": 1, "spec": changed},
    )
    assert saved.status_code == 200
    assert saved.json()["revision"] == 2
    assert (
        client.put(
            f"/api/projects/{doc['project_id']}/lesson-video",
            json={"expected_revision": 1, "spec": EXAMPLE},
        ).status_code
        == 409
    )
    with session() as db:
        snapshot = db.get(LessonVideoSnapshot, job["snapshot_id"])
        assert snapshot.spec_json["title"] == EXAMPLE["title"]
    assert submit(client, doc, "submission-stale").status_code == 409


def test_idempotency_and_ownership(context):
    client, session, identity = context
    doc = create(client)
    first = submit(client, doc)
    assert first.status_code == 202
    second = submit(client, doc)
    assert second.json()["job_id"] == first.json()["job_id"]
    conflict = {**doc, "revision": 2}
    assert submit(client, conflict).status_code == 409
    with session() as db:
        assert db.query(VideoRenderJob).count() == 1
    identity["id"] = "other"
    assert (
        client.get(f"/api/projects/{doc['project_id']}/lesson-video").status_code == 404
    )
    assert (
        client.get(f"/api/projects/{doc['project_id']}/video-renders").status_code
        == 404
    )
    assert (
        client.delete(f"/api/video/render/{first.json()['job_id']}").status_code == 404
    )
    assert (
        client.get(f"/api/video/download/{first.json()['job_id']}").status_code == 404
    )
    assert (
        client.get(
            f"/api/video/render/{first.json()['job_id']}/artifacts/manifest"
        ).status_code
        == 404
    )


def test_claim_cancel_and_stale_worker(context):
    client, session, _ = context
    doc = create(client)
    job = submit(client, doc).json()
    assert client.post("/api/internal/lesson-video/claim").status_code == 401
    headers = {"X-Teckstudio-Worker": "test-worker-secret"}
    claim = client.post("/api/internal/lesson-video/claim", headers=headers).json()[
        "job"
    ]
    assert claim["attempt"] == 1
    update = {
        "lease_token": claim["lease_token"],
        "attempt": 1,
        "progress": 10,
        "rendered_frames": 20,
        "stage": "Rendering",
    }
    assert (
        client.post(
            f"/api/internal/lesson-video/jobs/{job['job_id']}/progress",
            headers=headers,
            json=update,
        ).status_code
        == 200
    )
    assert (
        client.delete(f"/api/video/render/{job['job_id']}").json()["status"]
        == "cancelled"
    )
    assert (
        client.post(
            f"/api/internal/lesson-video/jobs/{job['job_id']}/complete",
            headers=headers,
            json=update,
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/internal/lesson-video/jobs/{job['job_id']}/progress",
            headers=headers,
            json=update,
        ).status_code
        == 409
    )


def test_expired_attempt_retries_and_rejects_previous_token(context):
    client, session, _ = context
    doc = create(client)
    job = submit(client, doc).json()
    with session() as db:
        first = service.claim_job(db)
        row = db.get(VideoRenderJob, job["job_id"])
        row.lease_expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
        service.expire_leases(db, datetime.utcnow())
        db.commit()
        second = service.claim_job(db)
        assert second["attempt"] == 2 and second["lease_token"] != first["lease_token"]
        with pytest.raises(Exception) as exc:
            service.leased_job(db, row.id, first["lease_token"], 1)
        assert exc.value.status_code == 409
        row.lease_expires_at = datetime.utcnow() - timedelta(seconds=1)
        db.commit()
        service.expire_leases(db, datetime.utcnow())
        db.commit()
        assert row.status == "failed"


def test_trash_restore_and_active_render_guard(context):
    client, _, _ = context
    doc = create(client)
    job = submit(client, doc).json()
    assert client.delete(f"/api/projects/{doc['project_id']}").status_code == 409
    client.delete(f"/api/video/render/{job['job_id']}")
    deleted = client.delete(f"/api/projects/{doc['project_id']}")
    assert deleted.status_code == 200, deleted.text
    trash = client.get("/api/projects/trash").json()["items"][0]
    restored = client.post(f"/api/projects/trash/{trash['id']}/restore")
    assert restored.status_code == 200, restored.text
    result = client.get(f"/api/projects/{doc['project_id']}/lesson-video").json()
    assert result["spec"] == EXAMPLE
    assert result["revision"] == 1


def test_successful_completion_uses_verified_output(context, tmp_path):
    client, session, _ = context
    doc = create(client)
    job = submit(client, doc).json()
    headers = {"X-Teckstudio-Worker": "test-worker-secret"}
    claim = client.post("/api/internal/lesson-video/claim", headers=headers).json()[
        "job"
    ]
    output = tmp_path / "video.mp4"
    output.write_bytes(b"verified-by-separate-render-test")
    with patch.object(service, "verify_output", return_value=output):
        result = client.post(
            f"/api/internal/lesson-video/jobs/{job['job_id']}/complete",
            headers=headers,
            json={"lease_token": claim["lease_token"], "attempt": 1},
        )
        assert result.status_code == 200, result.text
    with session() as db:
        row = db.get(VideoRenderJob, job["job_id"])
        assert row.status == "completed"
        assert row.progress == 100
        assert row.rendered_frames == 1620
