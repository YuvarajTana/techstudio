from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import PosterAnalysisJob, SessionLocal, UploadedAsset, User, get_db
from schemas.editable_imports import (
    PosterAnalysisFinalizeRequest,
    PosterAnalysisJobResponse,
    PosterAnalysisRequest,
    PosterAnalysisRetryRequest,
    PosterRegionConvertRequest,
)
from services.poster_analysis_service import (
    PosterAnalysisCancelled,
    analyze_poster_image,
    create_text_region_patch,
)
from services.upload_service import persist_generated_png


router = APIRouter(prefix="/api/image-edit", tags=["editable-import"])


def _asset_payload(record: UploadedAsset) -> dict:
    return {
        "asset_id": record.id,
        "url": record.public_url,
        "width": record.width or 0,
        "height": record.height or 0,
    }


def _job_payload(job: PosterAnalysisJob) -> dict:
    payload = {
        "job_id": job.id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "error": job.error_message,
    }
    if job.status == "completed":
        payload["result"] = job.result_json
    return payload


def _create_job(
    db: Session,
    *,
    user_id: str,
    asset_id: str,
    project_id: str | None,
    mode: str,
    language: str,
) -> PosterAnalysisJob:
    job = PosterAnalysisJob(
        id=f"paj_{uuid.uuid4().hex}",
        user_id=user_id,
        asset_id=asset_id,
        project_id=project_id,
        mode=mode,
        language=language,
        status="queued",
        stage="Preparing image",
        progress=0,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _process_job(job_id: str) -> None:
    db = SessionLocal()
    job = db.query(PosterAnalysisJob).filter(PosterAnalysisJob.id == job_id).first()
    try:
        if not job:
            return
        record = db.query(UploadedAsset).filter(UploadedAsset.id == job.asset_id).first()
        user = db.query(User).filter(User.id == job.user_id).first()
        if not record or not user:
            raise HTTPException(status_code=404, detail="The source poster is no longer available.")
        path = Path(record.storage_path)
        if not path.is_file():
            raise HTTPException(status_code=410, detail="The source poster file is no longer available.")

        def update(stage: str, progress: int) -> None:
            db.refresh(job)
            if job.cancel_requested:
                raise PosterAnalysisCancelled()
            job.status = "processing"
            job.stage = stage
            job.progress = progress
            job.updated_at = datetime.utcnow()
            db.commit()

        def cancelled() -> bool:
            db.refresh(job)
            return bool(job.cancel_requested)

        artifacts = analyze_poster_image(
            path.read_bytes(),
            record.mime_type,
            job.mode,
            job.language,
            update,
            cancelled,
        )
        update("Saving editable-region metadata", 88)
        regions = []
        for region in artifacts.regions:
            mask_asset = persist_generated_png(
                db,
                user=user,
                project_id=job.project_id,
                filename=f"{region.payload['id']}-mask.png",
                image=region.mask,
                metadata={
                    "derivedFromAssetId": record.id,
                    "posterAnalysisJobId": job.id,
                    "posterAssetKind": "colour-region-mask",
                    "regionId": region.payload["id"],
                },
            )
            regions.append({
                **region.payload,
                "mask_asset_id": mask_asset.id,
                "mask_url": mask_asset.public_url,
            })
        update("Saving project", 96)
        result = {
            "job_id": job.id,
            "status": "completed",
            "mode": job.mode,
            "source": _asset_payload(record),
            "clean_background": _asset_payload(record),
            "text_blocks": artifacts.text_blocks,
            "palette": artifacts.palette,
            "colour_regions": regions,
            "warnings": artifacts.warnings,
        }
        job.status = "completed"
        job.stage = "Completed"
        job.progress = 100
        job.result_json = result
        job.error_message = None
        job.completed_at = datetime.utcnow()
        job.updated_at = datetime.utcnow()
        db.commit()
    except PosterAnalysisCancelled:
        if job:
            job.status = "cancelled"
            job.stage = "Cancelled"
            job.error_message = "Poster conversion was cancelled."
            job.updated_at = datetime.utcnow()
            db.commit()
    except HTTPException as error:
        if job:
            job.status = "failed"
            job.stage = "Failed"
            job.error_message = str(error.detail)
            job.updated_at = datetime.utcnow()
            db.commit()
    except Exception:
        db.rollback()
        if job:
            job.status = "failed"
            job.stage = "Failed"
            job.error_message = "Poster analysis failed. Please retry or use a simpler image."
            job.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


@router.post("/analyze", response_model=PosterAnalysisJobResponse, status_code=202)
def start_poster_analysis(
    request: PosterAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(UploadedAsset).filter(
        UploadedAsset.id == request.asset_id,
        UploadedAsset.user_id == current_user.id,
        UploadedAsset.asset_role == "upload",
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Uploaded poster not found.")
    existing = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.user_id == current_user.id,
        PosterAnalysisJob.asset_id == record.id,
        PosterAnalysisJob.status.in_(["queued", "processing"]),
    ).first()
    if existing:
        return _job_payload(existing)
    job = _create_job(
        db,
        user_id=current_user.id,
        asset_id=record.id,
        project_id=record.project_id,
        mode=request.mode,
        language=request.language,
    )
    background_tasks.add_task(_process_job, job.id)
    return _job_payload(job)


@router.get("/jobs/{job_id}", response_model=PosterAnalysisJobResponse)
def get_poster_analysis(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.id == job_id,
        PosterAnalysisJob.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Poster analysis job not found.")
    return _job_payload(job)


@router.delete("/jobs/{job_id}", response_model=PosterAnalysisJobResponse, status_code=202)
def cancel_poster_analysis(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.id == job_id,
        PosterAnalysisJob.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Poster analysis job not found.")
    if job.status in {"queued", "processing"}:
        job.cancel_requested = True
        job.stage = "Cancelling"
        db.commit()
    return _job_payload(job)


@router.post("/make-editable")
def finalize_poster_analysis(
    request: PosterAnalysisFinalizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.id == request.job_id,
        PosterAnalysisJob.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Editable import job not found.")
    if job.status != "completed" or not job.result_json:
        raise HTTPException(status_code=409, detail="Editable import analysis is not complete.")
    result = dict(job.result_json)
    result["text_blocks"] = request.text_blocks
    job.result_json = result
    job.stage = "Finalised"
    job.updated_at = datetime.utcnow()
    db.commit()
    return result


@router.post("/regions/convert")
def convert_poster_text_region(
    request: PosterRegionConvertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.id == request.job_id,
        PosterAnalysisJob.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Editable import job not found.")
    if job.status != "completed" or not job.result_json:
        raise HTTPException(status_code=409, detail="Editable import analysis is not complete.")
    blocks = job.result_json.get("text_blocks") or []
    block = next((item for item in blocks if str(item.get("id")) == request.block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Detected text region not found.")
    record = db.query(UploadedAsset).filter(
        UploadedAsset.id == job.asset_id,
        UploadedAsset.user_id == current_user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="The source poster is no longer available.")
    path = Path(record.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=410, detail="The source poster file is no longer available.")
    patch = create_text_region_patch(path.read_bytes(), block)
    patch_asset = persist_generated_png(
        db,
        user=current_user,
        project_id=job.project_id,
        filename=f"{request.block_id}-clean-patch.png",
        image=patch.image,
        metadata={
            "derivedFromAssetId": record.id,
            "posterAnalysisJobId": job.id,
            "posterAssetKind": "text-clean-patch",
            "blockId": request.block_id,
            "sourceBox": patch.source_box,
            "normalizedBox": patch.normalized_box,
        },
    )
    return {
        "job_id": job.id,
        "block_id": request.block_id,
        "asset": _asset_payload(patch_asset),
        "source_box": patch.source_box,
        "normalized_box": patch.normalized_box,
        "text_box": patch.text_box,
        "normalized_text_box": patch.normalized_text_box,
    }


@router.post("/retry-cleanup", response_model=PosterAnalysisJobResponse, status_code=202)
def retry_poster_cleanup(
    request: PosterAnalysisRetryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source_job = db.query(PosterAnalysisJob).filter(
        PosterAnalysisJob.id == request.job_id,
        PosterAnalysisJob.user_id == current_user.id,
    ).first()
    if not source_job:
        raise HTTPException(status_code=404, detail="Editable import job not found.")
    job = _create_job(
        db,
        user_id=current_user.id,
        asset_id=source_job.asset_id,
        project_id=source_job.project_id,
        mode=source_job.mode,
        language=source_job.language,
    )
    background_tasks.add_task(_process_job, job.id)
    return _job_payload(job)
