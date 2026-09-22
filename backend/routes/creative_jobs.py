import json
import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from auth import get_current_user
from database import GenerationJob, Project, User, get_db
from routes.lesson_video import worker_auth, document, validated, validate_media
from routes.projects import persist_project_data_version, to_project_response
from services.creative_context import prepare_context
from services import local_generation as service, local_resource
from services.lesson_spec import compile_spec

router = APIRouter(prefix="/api/creative", tags=["creative-jobs"])
internal = APIRouter(
    prefix="/api/internal/local-resource",
    tags=["local-resource"],
    dependencies=[Depends(worker_auth)],
)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JobCreate(Strict):
    project_id: str = Field(min_length=1, max_length=50)
    expected_revision: int = Field(ge=1, strict=True)
    kind: Literal["poster-draft", "video-draft", "image", "speech", "transcribe"]
    idempotency_key: str = Field(min_length=8, max_length=128)
    input: dict[str, Any]


class Revision(Strict):
    expected_revision: int = Field(ge=1, strict=True)


class Apply(Revision):
    data: str | None = Field(default=None, max_length=10 * 1024 * 1024)
    spec: dict[str, Any] | None = None
    creative_context: dict[str, Any] | None = None


class ResourceRequest(Strict):
    owner: str = Field(min_length=1, max_length=80)
    lease_key: Literal["heavy-compute"] = "heavy-compute"


class ResourceToken(ResourceRequest):
    token: str = Field(min_length=1, max_length=64)


def owned_project(db, user_id, project_id):
    project = (
        db.query(Project)
        .filter_by(id=project_id, user_id=user_id)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if not project:
        raise HTTPException(404, "Project not found.")
    if project.design_type in {"lesson-video", "creative-video"}:
        project.revision = document(db, project).revision
    return project


def owned_job(db, user_id, job_id, lock=False):
    query = db.query(GenerationJob).filter(
        GenerationJob.id == job_id,
        GenerationJob.user_id == user_id,
        GenerationJob.request_json.is_not(None),
    )
    job = (query.with_for_update().populate_existing() if lock else query).first()
    if not job:
        raise HTTPException(404, "Generation job not found.")
    return job


def check_revision(project, revision):
    if project.revision != revision:
        raise HTTPException(
            409,
            "This project changed in another session. Save or reload before continuing.",
        )


@router.get("/readiness")
def readiness(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    value = service.readiness()
    value["jobs"] = {
        status: db.query(GenerationJob)
        .filter(
            GenerationJob.user_id == user.id,
            GenerationJob.request_json.is_not(None),
            GenerationJob.status == status,
        )
        .count()
        for status in ("queued", "processing")
    }
    return value


@router.post("/jobs", status_code=202)
def create(
    req: JobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user.id, req.project_id)
    existing = (
        db.query(GenerationJob)
        .filter_by(user_id=user.id, idempotency_key=req.idempotency_key)
        .with_for_update()
        .populate_existing()
        .first()
    )
    if existing:
        if (
            existing.project_id != req.project_id
            or existing.job_type != req.kind
            or existing.base_revision != req.expected_revision
            or (existing.request_json or {}).get("input") != req.input
        ):
            raise HTTPException(
                409, "This idempotency key was used for a different request."
            )
        return service.describe(existing)
    check_revision(project, req.expected_revision)
    if req.kind == "video-draft" and project.design_type != "creative-video":
        raise HTTPException(422, "Create a Creative Video project for a video draft.")
    if req.kind == "poster-draft" and project.design_type in {
        "lesson-video",
        "creative-video",
    }:
        raise HTTPException(422, "Create a poster project for a poster draft.")
    inputs = service.validate_input(db, user.id, req.kind, req.input)
    if (
        req.kind in {"poster-draft", "video-draft"}
        and len(json.dumps({"input": inputs, "context": project.creative_context_json}))
        > 28000
    ):
        raise HTTPException(
            422, "Shorten the brief or select fewer catalog items for local drafting."
        )
    job = GenerationJob(
        id=str(uuid.uuid4()),
        user_id=user.id,
        project_id=project.id,
        job_type=req.kind,
        provider="local",
        status="queued",
        stage="Waiting for local generation",
        progress=0,
        base_revision=project.revision,
        idempotency_key=req.idempotency_key,
        request_json={
            "input": inputs,
            "creative_context": project.creative_context_json,
        },
        attempt=0,
        cancel_requested=False,
    )
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(GenerationJob)
            .filter_by(user_id=user.id, idempotency_key=req.idempotency_key)
            .first()
        )
        if not existing:
            raise
        if (
            existing.project_id != req.project_id
            or existing.job_type != req.kind
            or existing.base_revision != req.expected_revision
            or (existing.request_json or {}).get("input") != req.input
        ):
            raise HTTPException(
                409, "This idempotency key was used for a different request."
            )
        return service.describe(existing)
    return service.describe(job)


@router.get("/jobs")
def history(
    project_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_project(db, user.id, project_id)
    query = db.query(GenerationJob).filter(
        GenerationJob.project_id == project_id,
        GenerationJob.user_id == user.id,
        GenerationJob.request_json.is_not(None),
    )
    total = query.count()
    jobs = (
        query.order_by(GenerationJob.created_at.desc(), GenerationJob.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {"items": [service.describe(job) for job in jobs], "total": total}


@router.get("/jobs/{job_id}")
def read(
    job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return service.describe(owned_job(db, user.id, job_id))


@router.delete("/jobs/{job_id}")
def cancel(
    job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    job = owned_job(db, user.id, job_id, True)
    if job.status in {"queued", "processing"}:
        job.cancel_requested, job.status, job.stage = True, "cancelled", "Cancelled"
        job.completed_at = datetime.utcnow()
        db.commit()
    return service.describe(job)


@router.post("/jobs/{job_id}/retry", status_code=202)
def retry(
    job_id: str,
    req: Revision,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    previous = owned_job(db, user.id, job_id)
    project = owned_project(db, user.id, previous.project_id)
    job = owned_job(db, user.id, job_id, True)
    check_revision(project, req.expected_revision)
    if job.status not in {"failed", "cancelled"}:
        raise HTTPException(409, "Only a failed or cancelled job can be retried.")
    service.validate_input(db, user.id, job.job_type, job.request_json["input"])
    job.status, job.stage, job.error, job.completed_at = (
        "queued",
        "Waiting to retry locally",
        None,
        None,
    )
    job.cancel_requested, job.attempt, job.progress = False, 0, 0
    job.lease_token = job.lease_owner = job.lease_expires_at = None
    job.base_revision = project.revision
    job.request_json = {
        **job.request_json,
        "creative_context": project.creative_context_json,
    }
    db.commit()
    return service.describe(job)


@router.post("/jobs/{job_id}/apply")
def apply(
    job_id: str,
    req: Apply,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    previous = owned_job(db, user.id, job_id)
    project = owned_project(db, user.id, previous.project_id)
    job = owned_job(db, user.id, job_id, True)
    check_revision(project, req.expected_revision)
    if job.status != "completed" or not job.result_json:
        raise HTTPException(
            409, "Wait for a completed result before reviewing and applying it."
        )
    if job.base_revision != req.expected_revision:
        raise HTTPException(
            409,
            "This draft was based on an older project revision. Copy desired changes into your current draft or regenerate.",
        )
    if (req.data is None) == (req.spec is None):
        raise HTTPException(
            422, "Apply either reviewed canvas data or a reviewed video spec."
        )
    if req.creative_context is not None:
        project.creative_context_json = prepare_context(
            db, user.id, req.creative_context, project.creative_context_json
        )
    project.revision += 1
    if req.spec is not None:
        if project.design_type != "creative-video":
            raise HTTPException(422, "This project is not a Creative Video.")
        spec = validated(req.spec)
        if spec["schema"] != "creative-video/v2":
            raise HTTPException(422, "Apply a creative-video/v2 document.")
        validate_media(db, user.id, spec)
        doc = document(db, project)
        doc.spec_json, doc.revision, doc.schema_version = (
            spec,
            project.revision,
            spec["schema"],
        )
        plan = compile_spec(spec)
        project.name, project.width, project.height = (
            spec["title"],
            plan["width"],
            plan["height"],
        )
    else:
        if project.design_type in {"lesson-video", "creative-video"}:
            raise HTTPException(
                422, "Apply reviewed video content through the video workspace."
            )
        try:
            data = json.loads(req.data)
            if not isinstance(data, dict) or not isinstance(data.get("objects"), list):
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(
                422, "Reviewed canvas data must contain a Fabric objects array."
            )
        persist_project_data_version(db, project, req.data)
    project.updated_at = datetime.utcnow()
    job.metadata_json = {
        **(job.metadata_json or {}),
        "applied_revision": project.revision,
    }
    db.commit()
    return {
        "project": to_project_response(project).model_dump(),
        "revision": project.revision,
        "job": service.describe(job),
    }


@internal.post("/claim")
def claim_resource(req: ResourceRequest, db: Session = Depends(get_db)):
    result = local_resource.acquire(db, req.owner, req.lease_key)
    db.commit()
    return result


@internal.post("/renew")
def renew_resource(req: ResourceToken, db: Session = Depends(get_db)):
    result = local_resource.renew(db, req.owner, req.token, req.lease_key)
    db.commit()
    return result


@internal.delete("/release")
def release_resource(req: ResourceToken, db: Session = Depends(get_db)):
    local_resource.release(db, req.owner, req.token, req.lease_key)
    db.commit()
    return {"ok": True}
