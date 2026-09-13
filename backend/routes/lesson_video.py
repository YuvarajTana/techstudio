import json
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from auth import get_current_user
from config import settings
from database import (
    get_db,
    Project,
    User,
    LessonVideoDocument,
    LessonVideoSnapshot,
    LessonVideoWorker,
    VideoRenderJob,
)
from services.lesson_spec import ROOT, validate_spec, compile_spec, spec_hash
from services import lesson_video_service as service

router = APIRouter(tags=["lesson-video"])


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateLesson(StrictModel):
    spec: dict[str, Any] | None = None


class SaveLesson(StrictModel):
    expected_revision: int = Field(ge=1, strict=True)
    spec: dict[str, Any]


class SubmitLesson(StrictModel):
    project_id: str = Field(max_length=50)
    expected_revision: int = Field(ge=1, strict=True)
    idempotency_key: str = Field(min_length=8, max_length=128)


def validated(value):
    try:
        return validate_spec(value)
    except ValueError as error:
        raise HTTPException(422, str(error))


def owned_project(db, user, project_id, lock=False):
    query = db.query(Project).filter(
        Project.id == project_id, Project.user_id == user.id
    )
    project = (query.with_for_update() if lock else query).first()
    if not project or project.design_type != "lesson-video":
        raise HTTPException(404, "Lesson video not found.")
    return project


def document(db, project):
    result = (
        db.query(LessonVideoDocument)
        .filter(LessonVideoDocument.project_id == project.id)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not result:
        raise HTTPException(404, "Lesson document is missing.")
    return result


def document_response(project, doc):
    return {
        "project_id": project.id,
        "document_id": doc.id,
        "name": project.name,
        "revision": doc.revision,
        "spec": doc.spec_json,
    }


@router.get("/api/health/lesson-video")
def health(db: Session = Depends(get_db)):
    return service.worker_health(db)


@router.post("/api/lesson-videos", status_code=201)
def create(
    req: CreateLesson,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = validated(
        req.spec
        if req.spec is not None
        else json.loads((ROOT / "packages/lesson-video/src/example.json").read_text())
    )
    project = Project(
        id=str(uuid.uuid4()),
        user_id=user.id,
        name=spec["title"],
        design_type="lesson-video",
        width=1920,
        height=1080,
        background_color="#f7f6f1",
    )
    db.add(project)
    db.flush()
    doc = LessonVideoDocument(
        id=str(uuid.uuid4()), project_id=project.id, spec_json=spec, revision=1
    )
    db.add(doc)
    db.commit()
    return document_response(project, doc)


@router.get("/api/projects/{project_id}/lesson-video")
def read(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user, project_id)
    return document_response(project, document(db, project))


@router.put("/api/projects/{project_id}/lesson-video")
def save(
    project_id: str,
    req: SaveLesson,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = validated(req.spec)
    project = owned_project(db, user, project_id, True)
    doc = document(db, project)
    if doc.revision != req.expected_revision:
        raise HTTPException(
            409,
            "This lesson changed in another session. Export your local draft, then reload the saved version.",
        )
    doc.spec_json = spec
    doc.revision += 1
    project.name = spec["title"]
    project.updated_at = datetime.utcnow()
    db.commit()
    return document_response(project, doc)


@router.post("/api/video/render/remotion", status_code=202)
def submit(
    req: SubmitLesson,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user, req.project_id, True)
    existing = (
        db.query(VideoRenderJob)
        .filter(
            VideoRenderJob.user_id == user.id,
            VideoRenderJob.project_id == project.id,
            VideoRenderJob.idempotency_key == req.idempotency_key,
        )
        .with_for_update()
        .populate_existing()
        .first()
    )
    if existing:
        snapshot = (
            db.query(LessonVideoSnapshot)
            .filter(LessonVideoSnapshot.id == existing.snapshot_id)
            .with_for_update()
            .first()
        )
        if not snapshot or snapshot.document_revision != req.expected_revision:
            raise HTTPException(
                409,
                "This idempotency key was already used for a different lesson revision.",
            )
        return service.describe(existing, db)
    doc = document(db, project)
    if doc.revision != req.expected_revision:
        raise HTTPException(
            409, "Save or reload the latest lesson revision before rendering."
        )
    spec = validated(doc.spec_json)
    plan = compile_spec(spec)
    runtime = service.runtime_info()
    snapshot = LessonVideoSnapshot(
        id=str(uuid.uuid4()),
        project_id=project.id,
        document_revision=doc.revision,
        spec_json=spec,
        plan_json=plan,
        spec_hash=spec_hash(spec),
        bundle_id=runtime["bundleId"],
    )
    db.add(snapshot)
    db.flush()
    job = VideoRenderJob(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        format="mp4",
        status="queued",
        stage="Waiting for local renderer",
        progress=0,
        width=1920,
        height=1080,
        fps=30,
        quality="standard",
        render_mode="remotion",
        total_frames=plan["durationInFrames"],
        rendered_frames=0,
        timeline_json={"durationMs": round(plan["durationInFrames"] / 30 * 1000)},
        snapshot_id=snapshot.id,
        idempotency_key=req.idempotency_key,
        attempt=0,
    )
    db.add(job)
    db.commit()
    return service.describe(job, db)


@router.get("/api/projects/{project_id}/video-renders")
def history(
    project_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_project(db, user, project_id)
    jobs = (
        db.query(VideoRenderJob)
        .filter(
            VideoRenderJob.project_id == project_id,
            VideoRenderJob.user_id == user.id,
            VideoRenderJob.render_mode == "remotion",
        )
        .order_by(VideoRenderJob.created_at.desc(), VideoRenderJob.id.desc())
        .offset(offset)
        .limit(limit + 1)
        .all()
    )
    return {
        "jobs": [service.describe(j, db) for j in jobs[:limit]],
        "has_more": len(jobs) > limit,
        "worker": service.worker_health(db),
    }


@router.get("/api/video/render/{job_id}/artifacts/{kind}")
def artifact(
    job_id: str,
    kind: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(VideoRenderJob)
        .filter(
            VideoRenderJob.id == job_id,
            VideoRenderJob.user_id == user.id,
            VideoRenderJob.render_mode == "remotion",
        )
        .first()
    )
    if not job:
        raise HTTPException(404, "Render not found.")
    path = service.artifact_path(job, kind)
    return FileResponse(
        path,
        filename=f"lesson-{job.id}-{path.name}",
        media_type={
            "poster": "image/png",
            "manifest": "application/json",
            "video": "video/mp4",
        }[kind],
    )


def worker_auth(x_teckstudio_worker: str = Header(default="")):
    expected = service.worker_secret()
    if not expected or not secrets.compare_digest(expected, x_teckstudio_worker):
        raise HTTPException(401, "Worker credential is required.")


internal = APIRouter(
    prefix="/api/internal/lesson-video",
    tags=["lesson-video-worker"],
    dependencies=[Depends(worker_auth)],
)


class WorkerHeartbeat(StrictModel):
    worker_id: str = Field(min_length=1, max_length=80)
    bundle_id: str = Field(pattern=r"^[a-f0-9]{64}$")


class LeaseUpdate(StrictModel):
    lease_token: str = Field(min_length=1, max_length=64)
    attempt: int = Field(ge=1, strict=True)
    progress: int = Field(default=0, ge=0, le=99)
    rendered_frames: int = Field(default=0, ge=0)
    stage: str = Field(default="Preparing lesson", max_length=160)
    error: str | None = Field(default=None, max_length=2000)


@internal.post("/heartbeat")
def worker_heartbeat(req: WorkerHeartbeat, db: Session = Depends(get_db)):
    worker = db.get(LessonVideoWorker, req.worker_id)
    if not worker:
        worker = LessonVideoWorker(id=req.worker_id)
        db.add(worker)
    worker.bundle_id = req.bundle_id
    worker.heartbeat_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@internal.post("/claim")
def claim(db: Session = Depends(get_db)):
    result = service.claim_job(db)
    service.cleanup_orphans(db)
    return {"job": result}


@internal.post("/jobs/{job_id}/progress")
def progress(job_id: str, req: LeaseUpdate, db: Session = Depends(get_db)):
    job = service.leased_job(db, job_id, req.lease_token, req.attempt)
    job.progress = max(job.progress, req.progress)
    job.rendered_frames = min(
        job.total_frames, max(job.rendered_frames, req.rendered_frames)
    )
    job.stage = req.stage
    job.heartbeat_at = datetime.utcnow()
    job.lease_expires_at = job.heartbeat_at + timedelta(
        seconds=settings.LESSON_VIDEO_LEASE_SECONDS
    )
    db.commit()
    return {"ok": True}


@internal.post("/jobs/{job_id}/complete")
def complete(job_id: str, req: LeaseUpdate, db: Session = Depends(get_db)):
    job = service.leased_job(db, job_id, req.lease_token, req.attempt)
    snapshot = db.get(LessonVideoSnapshot, job.snapshot_id)
    try:
        output = service.verify_output(job, snapshot)
    except (OSError, ValueError, KeyError, StopIteration) as error:
        raise HTTPException(422, str(error))
    job.output_path = str(output)
    job.file_name = f"lesson-{job.id}.mp4"
    job.mime_type = "video/mp4"
    job.status = "completed"
    job.progress = 100
    job.rendered_frames = job.total_frames
    job.stage = "Ready to download"
    job.completed_at = datetime.utcnow()
    job.lease_expires_at = None
    db.commit()
    return {"ok": True}


@internal.post("/jobs/{job_id}/fail")
def fail(job_id: str, req: LeaseUpdate, db: Session = Depends(get_db)):
    job = service.leased_job(db, job_id, req.lease_token, req.attempt)
    job.status = "failed"
    job.stage = "Render failed"
    job.error_message = req.error or "Renderer exited before completing the lesson."
    job.completed_at = datetime.utcnow()
    job.lease_expires_at = None
    db.commit()
    return {"ok": True}
