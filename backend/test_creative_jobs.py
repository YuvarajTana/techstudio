import copy
import hashlib
import json
from types import SimpleNamespace
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from database import (
    GenerationJob,
    Project,
    LocalResourceLease,
    LessonVideoSnapshot,
    DesignVersion,
)
from routes import creative_jobs
from services import local_generation, local_resource
from services.lesson_spec import validate_spec, compile_spec, captions_srt, spec_hash
from test_lesson_video import context

VIDEO = {
    "schema": "creative-video/v2",
    "id": "test-video",
    "title": "A new concept",
    "locale": "en",
    "purpose": "explainer",
    "output": {"preset": "portrait-1080p", "fps": 30},
    "brand": {
        "name": "Example",
        "tagline": "Learn together",
        "primaryColor": "#102030",
        "accentColor": "#ff8800",
    },
    "assets": [],
    "scenes": [
        {
            "id": "opening",
            "type": "title",
            "title": "A new concept",
            "subtitle": "A clear example",
            "durationFrames": 450,
        }
    ],
}


@pytest.fixture
def creative(context, monkeypatch, tmp_path):
    client, session, identity = context
    client.app.include_router(creative_jobs.router)
    client.app.include_router(creative_jobs.internal)
    monkeypatch.setattr(local_generation, "SessionLocal", session)
    monkeypatch.setattr(local_generation, "WORK_ROOT", tmp_path)
    monkeypatch.setattr(local_generation, "worker_heartbeat", lambda _owner: None)
    return client, session, identity


def poster(client):
    response = client.post(
        "/api/projects",
        json={
            "name": "Poster",
            "design_type": "poster",
            "data": '{"objects":[]}',
            "creative_context": {"brief": "A service poster"},
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def submit(client, project, kind="poster-draft", key="creative-job-1"):
    return client.post(
        "/api/creative/jobs",
        json={
            "project_id": project["id"],
            "expected_revision": project["revision"],
            "kind": kind,
            "idempotency_key": key,
            "input": {"prompt": "A useful service", "family": "service"},
        },
    )


def test_project_cas_and_reviewed_apply(creative):
    client, session, _ = creative
    project = poster(client)
    assert (
        client.put(
            f"/api/projects/{project['id']}", json={"data": '{"objects":[]}'}
        ).status_code
        == 409
    )
    job = submit(client, project).json()
    assert (
        client.post(
            f"/api/creative/jobs/{job['job_id']}/apply",
            json={"expected_revision": 1, "data": '{"objects":[]}'},
        ).status_code
        == 409
    )
    with session() as db:
        row = db.get(GenerationJob, job["job_id"])
        row.status, row.result_json = "completed", {"poster": {"headline": "Review me"}}
        db.commit()
    applied = client.post(
        f"/api/creative/jobs/{job['job_id']}/apply",
        json={
            "expected_revision": 1,
            "data": '{"objects":[{"type":"textbox","text":"Approved"}]}',
        },
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["revision"] == 2
    with session() as db:
        assert "Approved" in db.get(Project, project["id"]).data
        version = (
            db.query(DesignVersion)
            .filter_by(project_id=project["id"])
            .order_by(DesignVersion.version_number.desc())
            .first()
        )
        assert version.project_revision == 2
        assert version.creative_context_json["brief"] == "A service poster"
    assert (
        client.put(
            f"/api/projects/{project['id']}",
            json={"expected_revision": 1, "name": "Stale"},
        ).status_code
        == 409
    )


def test_jobs_idempotency_ownership_cancel_and_trash(creative):
    client, session, identity = creative
    project = poster(client)
    first = submit(client, project)
    assert first.status_code == 202, first.text
    assert submit(client, project).json()["job_id"] == first.json()["job_id"]
    assert submit(client, {**project, "revision": 2}).status_code == 409
    assert client.delete(f"/api/projects/{project['id']}").status_code == 409
    identity["id"] = "other"
    assert client.get(f"/api/creative/jobs/{first.json()['job_id']}").status_code == 404
    identity["id"] = "owner"
    assert (
        client.delete(f"/api/creative/jobs/{first.json()['job_id']}").json()["status"]
        == "cancelled"
    )
    assert client.delete(f"/api/projects/{project['id']}").status_code == 200
    trash = client.get("/api/projects/trash").json()["items"][0]
    restored = client.post(f"/api/projects/trash/{trash['id']}/restore")
    assert restored.json()["creative_context"]["brief"] == "A service poster"


def test_resource_fencing_and_generation_recovery(creative):
    client, session, _ = creative
    project = poster(client)
    job = submit(client, project).json()
    with session() as db:
        lease = local_generation.claim(db, "worker-one")
        assert lease
    headers = {"X-Teckstudio-Worker": "test-worker-secret"}
    assert (
        client.post(
            "/api/internal/local-resource/claim",
            headers=headers,
            json={"owner": "renderer", "lease_key": "heavy-compute"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/internal/local-resource/renew",
            headers=headers,
            json={
                "owner": "worker-one",
                "token": "wrong",
                "lease_key": "heavy-compute",
            },
        ).status_code
        == 409
    )
    with session() as db:
        db.get(GenerationJob, job["job_id"]).lease_expires_at = (
            datetime.utcnow() - timedelta(seconds=1)
        )
        db.get(LocalResourceLease, "heavy-compute").expires_at = (
            datetime.utcnow() - timedelta(seconds=1)
        )
        db.commit()
        second = local_generation.claim(db, "worker-two")
        assert second["attempt"] == 2
        with pytest.raises(HTTPException):
            local_generation.leased(db, lease)
        db.rollback()
    assert (
        client.post(
            "/api/internal/local-resource/claim", json={"owner": "unauthorized"}
        ).status_code
        == 401
    )


def test_local_worker_finishes_draft_without_applying(creative, monkeypatch):
    client, session, _ = creative
    project = poster(client)
    job = submit(client, project).json()
    result = {
        "schema": "creative-poster/v1",
        "family": "service",
        "headline": "A service",
        "subheadline": "Built for you",
        "body": "Description",
        "cta": "Learn more",
        "contact": "",
        "services": ["Design"],
        "imagePrompt": "A bright workspace",
    }
    monkeypatch.setattr(
        local_generation,
        "run_runtime",
        lambda *args: {"data": result, "model": "local-test"},
    )
    with session() as db:
        lease = local_generation.claim(db, "test-worker")
    local_generation.execute(lease)
    finished = client.get(f"/api/creative/jobs/{job['job_id']}").json()
    assert finished["status"] == "completed", finished
    assert finished["result"]["poster"]["headline"] == "A service"
    with session() as db:
        assert db.get(Project, project["id"]).data == '{"objects":[]}'
        assert db.get(LocalResourceLease, "heavy-compute").owner is None


def test_shutdown_requeues_and_invalid_model_result_is_bounded(creative, monkeypatch):
    client, session, _ = creative
    job = submit(client, poster(client)).json()
    with session() as db:
        first = local_generation.claim(db, "worker-one")

    def stop(*args):
        raise local_generation.WorkerStopping()

    monkeypatch.setattr(local_generation, "run_runtime", stop)
    local_generation.execute(first)
    assert (
        client.get(f"/api/creative/jobs/{job['job_id']}").json()["status"] == "queued"
    )
    calls = []

    def invalid(*args):
        calls.append(args)
        return {"data": {"untrusted": "not a poster"}}

    monkeypatch.setattr(local_generation, "run_runtime", invalid)
    with session() as db:
        second = local_generation.claim(db, "worker-two")
    local_generation.execute(second)
    assert len(calls) == 2
    assert (
        client.get(f"/api/creative/jobs/{job['job_id']}").json()["status"] == "failed"
    )


def test_creative_video_version_format_and_narration_gate(creative):
    client, session, _ = creative
    response = client.post(
        "/api/creative-videos",
        json={"spec": VIDEO, "creative_context": {"brief": "A new concept"}},
    )
    assert response.status_code == 201, response.text
    doc = response.json()
    assert doc["schema_version"] == "creative-video/v2"
    spec = copy.deepcopy(VIDEO)
    spec["scenes"][0]["narration"] = {"text": "An approved script still needs audio."}
    saved = client.put(
        f"/api/projects/{doc['project_id']}/creative-video",
        json={"expected_revision": 1, "spec": spec},
    )
    assert saved.status_code == 200, saved.text
    blocked = client.post(
        "/api/video/render/remotion",
        json={
            "project_id": doc["project_id"],
            "expected_revision": 2,
            "idempotency_key": "narration-missing",
        },
    )
    assert blocked.status_code == 422
    saved = client.put(
        f"/api/projects/{doc['project_id']}/creative-video",
        json={"expected_revision": 2, "spec": VIDEO},
    )
    rendered = client.post(
        "/api/video/render/remotion",
        json={
            "project_id": doc["project_id"],
            "expected_revision": 3,
            "idempotency_key": "silent-portrait",
        },
    )
    assert rendered.status_code == 202, rendered.text
    assert (rendered.json()["width"], rendered.json()["height"]) == (1080, 1920)
    with session() as db:
        snapshot = db.get(LessonVideoSnapshot, rendered.json()["snapshot_id"])
        assert snapshot.asset_manifest_json == {}
        assert db.get(Project, doc["project_id"]).design_type == "creative-video"


def test_creative_validation_rejects_invalid_timing_and_refs():
    assert compile_spec(validate_spec(VIDEO))["durationInFrames"] == 450
    for alter in [
        lambda s: s["scenes"][0].update(durationFrames=449),
        lambda s: s["brand"].update(logoAssetId="missing"),
        lambda s: s["scenes"][0].update(
            captions=[{"startFrame": 440, "endFrame": 500, "text": "Too late"}]
        ),
    ]:
        spec = copy.deepcopy(VIDEO)
        alter(spec)
        with pytest.raises(ValueError):
            validate_spec(spec)


def test_narration_uses_owned_probed_duration_and_exact_script(
    creative, monkeypatch, tmp_path
):
    from services import creative_media_service

    client, _, _ = creative
    spec = copy.deepcopy(VIDEO)
    text = "This is the reviewed script."
    digest = hashlib.sha256(text.encode()).hexdigest()
    spec["assets"] = [
        {
            "id": "voice",
            "kind": "audio",
            "source": "generated",
            "assetId": "owned-audio",
        }
    ]
    spec["scenes"][0]["narration"] = {
        "text": text,
        "assetId": "voice",
        "durationFrames": 31,
        "approvedTextHash": digest,
    }
    metadata = {"kind": "audio", "duration_ms": 1001, "scriptHash": digest}
    monkeypatch.setattr(
        creative_media_service,
        "resolve_owned_asset",
        lambda *args: (None, tmp_path / "audio.m4a", metadata),
    )
    assert client.post("/api/creative-videos", json={"spec": spec}).status_code == 201
    spec["scenes"][0]["narration"]["durationFrames"] = 30
    assert client.post("/api/creative-videos", json={"spec": spec}).status_code == 422
    spec["scenes"][0]["narration"]["durationFrames"] = 31
    metadata["scriptHash"] = "0" * 64
    assert client.post("/api/creative-videos", json={"spec": spec}).status_code == 422


def test_output_checks_frozen_assets_and_exact_text_artifacts(monkeypatch, tmp_path):
    from services import lesson_video_service

    spec = copy.deepcopy(VIDEO)
    spec["scenes"][0]["captions"] = [
        {"startFrame": 1, "endFrame": 32, "text": "A reviewed caption"}
    ]
    (tmp_path / "video.mp4").write_bytes(b"test-video")
    (tmp_path / "poster.png").write_bytes(b"test-poster")
    (tmp_path / "captions.srt").write_text(captions_srt(spec))
    (tmp_path / "transcript.txt").write_text("")
    plan = compile_spec(spec)
    manifest = {
        "schema": "creative-video-render/v2",
        "bundleId": "a" * 64,
        "plan": plan,
        "spec": spec,
        "assetHashes": {},
        "hasAudio": False,
        "videoSha256": hashlib.sha256(b"test-video").hexdigest(),
        "posterSha256": hashlib.sha256(b"test-poster").hexdigest(),
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest))
    monkeypatch.setattr(lesson_video_service, "job_directory", lambda *args: tmp_path)
    monkeypatch.setattr(
        lesson_video_service.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(
            stdout=json.dumps(
                {
                    "streams": [
                        {
                            "codec_type": "video",
                            "codec_name": "h264",
                            "width": 1080,
                            "height": 1920,
                            "nb_frames": "450",
                            "avg_frame_rate": "30/1",
                        }
                    ],
                    "format": {"duration": "15"},
                }
            )
        ),
    )
    job = SimpleNamespace(width=1080, height=1920, total_frames=450, fps=30)
    snapshot = SimpleNamespace(
        bundle_id="a" * 64,
        plan_json=plan,
        spec_hash=spec_hash(spec),
        spec_json=spec,
        asset_manifest_json={},
    )
    assert lesson_video_service.verify_output(job, snapshot) == tmp_path / "video.mp4"
    assert "00:00:00,033 --> 00:00:01,067" in captions_srt(spec)
    (tmp_path / "transcript.txt").write_text("Unapproved content")
    with pytest.raises(ValueError, match="captions or transcript"):
        lesson_video_service.verify_output(job, snapshot)


def test_readiness_reports_disk_gate_and_worker_separately(monkeypatch, tmp_path):
    executable = tmp_path / "runtime.py"
    executable.write_text("")
    monkeypatch.setattr(local_generation, "RUNTIME", executable)
    monkeypatch.setattr(
        local_generation,
        "worker_health",
        lambda: {"online": False, "heartbeat_at": None},
    )
    monkeypatch.setattr(
        local_generation.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(
            stdout=json.dumps(
                {
                    "capabilities": {
                        "text": {"ready": True, "reason": "Installed", "model": "local"}
                    },
                    "storage": {
                        "free_bytes": 100,
                        "required_free_bytes": 200,
                        "sufficient": False,
                        "secret": "omit",
                    },
                }
            )
        ),
    )
    result = local_generation.readiness()
    assert result["capabilities"]["text"]["ready"]
    assert not result["worker"]["online"]
    assert result["storage"] == {
        "free_bytes": 100,
        "required_free_bytes": 200,
        "sufficient": False,
    }
