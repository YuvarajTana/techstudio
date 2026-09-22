from __future__ import annotations
import hashlib
import json
import re
import secrets
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy import or_
from config import settings, resolve_runtime_path
from database import LessonVideoSnapshot, LessonVideoWorker, VideoRenderJob
from services.lesson_spec import ROOT, compile_spec, spec_hash, captions_srt

ARTIFACT_ROOT = resolve_runtime_path(settings.LESSON_VIDEO_ROOT)


def runtime_info():
    try:
        value = json.loads((ROOT / ".local/video-runtime.json").read_text())
        if not re.fullmatch(r"[a-f0-9]{64}", value["bundleId"]):
            raise ValueError()
        return value
    except (OSError, ValueError, KeyError):
        raise HTTPException(
            503,
            "Renderer is not prepared. Run npm run video:prepare, then start the local worker.",
        )


def worker_secret():
    if settings.LESSON_VIDEO_WORKER_SECRET:
        return settings.LESSON_VIDEO_WORKER_SECRET
    try:
        return (ROOT / ".local/video-worker.key").read_text().strip()
    except OSError:
        return ""


def worker_health(db):
    cutoff = datetime.utcnow() - timedelta(seconds=30)
    worker = (
        db.query(LessonVideoWorker)
        .filter(LessonVideoWorker.heartbeat_at >= cutoff)
        .order_by(LessonVideoWorker.heartbeat_at.desc())
        .first()
    )
    return {
        "online": bool(worker),
        "heartbeat_at": worker.heartbeat_at.isoformat() + "Z" if worker else None,
    }


def job_directory(job, attempt=None):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,50}", job.id):
        raise HTTPException(400, "Invalid job identity.")
    attempt = job.attempt if attempt is None else attempt
    if not isinstance(attempt, int) or attempt < 1:
        raise HTTPException(409, "This job has not started rendering.")
    directory = ARTIFACT_ROOT / job.id / f"attempt-{attempt}"
    if not directory.resolve().is_relative_to(ARTIFACT_ROOT.resolve()):
        raise HTTPException(400, "Invalid output directory.")
    return directory


def artifact_path(job, kind):
    names = {
        "video": "video.mp4",
        "poster": "poster.png",
        "manifest": "manifest.json",
        "captions": "captions.srt",
        "transcript": "transcript.txt",
    }
    if kind not in names or job.status != "completed" or not job.output_path:
        raise HTTPException(404, "Artifact is unavailable.")
    output = job_directory(job) / names[kind]
    if not output.is_file() or not output.resolve().is_relative_to(
        job_directory(job).resolve()
    ):
        raise HTTPException(404, "Artifact is unavailable.")
    return output


def describe(job, db):
    snapshot = db.get(LessonVideoSnapshot, job.snapshot_id) if job.snapshot_id else None
    return {
        "job_id": job.id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "error": job.error_message,
        "file_name": job.file_name,
        "download_url": (
            f"/api/video/download/{job.id}"
            if job.status == "completed" and job.output_path
            else None
        ),
        "width": job.width,
        "height": job.height,
        "fps": job.fps,
        "total_frames": job.total_frames,
        "rendered_frames": job.rendered_frames,
        "duration_ms": round(job.total_frames / job.fps * 1000),
        "render_mode": job.render_mode,
        "snapshot_id": job.snapshot_id,
        "revision": snapshot.document_revision if snapshot else None,
        "created_at": job.created_at.isoformat() + "Z" if job.created_at else None,
        "completed_at": (
            job.completed_at.isoformat() + "Z" if job.completed_at else None
        ),
        "attempt": job.attempt,
    }


def cancel_job(db, job):
    if job.status not in {"queued", "processing"}:
        return
    job.cancel_requested = True
    job.status = "cancelled"
    job.stage = "Cancelled"
    job.completed_at = datetime.utcnow()
    db.commit()


def expire_leases(db, now):
    jobs = (
        db.query(VideoRenderJob)
        .filter(
            VideoRenderJob.render_mode == "remotion",
            VideoRenderJob.status == "processing",
            VideoRenderJob.lease_expires_at < now,
        )
        .with_for_update(skip_locked=True)
        .all()
    )
    for job in jobs:
        job.lease_token = None
        job.lease_expires_at = None
        if job.cancel_requested:
            job.status = "cancelled"
            job.stage = "Cancelled"
            job.completed_at = now
        elif job.attempt >= settings.LESSON_VIDEO_MAX_ATTEMPTS:
            job.status = "failed"
            job.stage = "Worker unavailable"
            job.error_message = (
                "Worker stopped responding and the retry limit was reached."
            )
            job.completed_at = now
        else:
            job.status = "queued"
            job.stage = "Recovering interrupted render"
            job.progress = 0
            job.rendered_frames = 0


def claim_job(db):
    now = datetime.utcnow()
    expire_leases(db, now)
    job = (
        db.query(VideoRenderJob)
        .filter(
            VideoRenderJob.render_mode == "remotion",
            VideoRenderJob.status == "queued",
            VideoRenderJob.cancel_requested.is_(False),
        )
        .order_by(VideoRenderJob.created_at)
        .with_for_update(skip_locked=True)
        .first()
    )
    if not job:
        db.commit()
        return None
    job.attempt += 1
    job.lease_token = secrets.token_hex(24)
    job.lease_expires_at = now + timedelta(seconds=settings.LESSON_VIDEO_LEASE_SECONDS)
    job.heartbeat_at = now
    job.status = "processing"
    job.stage = "Preparing lesson"
    job.progress = 0
    job.rendered_frames = 0
    snapshot = db.get(LessonVideoSnapshot, job.snapshot_id)
    if not snapshot:
        raise HTTPException(409, "Saved render snapshot is missing.")
    payload = {
        "job_id": job.id,
        "attempt": job.attempt,
        "lease_token": job.lease_token,
        "spec": snapshot.spec_json,
        "plan": snapshot.plan_json,
        "asset_manifest": snapshot.asset_manifest_json or {},
        "bundle_id": snapshot.bundle_id,
        "output_directory": str(job_directory(job)),
        "timeout_seconds": settings.VIDEO_RENDER_TIMEOUT_SECONDS,
    }
    db.commit()
    return payload


def leased_job(db, job_id, token, attempt):
    job = (
        db.query(VideoRenderJob)
        .filter(VideoRenderJob.id == job_id, VideoRenderJob.render_mode == "remotion")
        .with_for_update()
        .first()
    )
    if not job:
        raise HTTPException(404, "Render job no longer exists.")
    if (
        job.status != "processing"
        or job.cancel_requested
        or job.attempt != attempt
        or not secrets.compare_digest(job.lease_token or "", token)
        or not job.lease_expires_at
        or job.lease_expires_at <= datetime.utcnow()
    ):
        raise HTTPException(409, "Render lease is no longer active.")
    return job


def verify_output(job, snapshot):
    directory = job_directory(job)
    files = [directory / name for name in ("video.mp4", "poster.png", "manifest.json")]
    if any(
        not p.is_file() or not p.resolve().is_relative_to(directory.resolve())
        for p in files
    ):
        raise ValueError("Renderer did not produce all expected artifacts.")
    manifest = json.loads(files[2].read_text())
    if (
        manifest.get("bundleId") != snapshot.bundle_id
        or manifest.get("plan") != snapshot.plan_json
        or spec_hash(manifest.get("spec")) != snapshot.spec_hash
    ):
        raise ValueError("Output does not match the saved render snapshot.")
    for file, key in zip(files[:2], ("videoSha256", "posterSha256")):
        checksum = hashlib.sha256()
        with file.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                checksum.update(chunk)
        if checksum.hexdigest() != manifest.get(key):
            raise ValueError("Output checksum does not match the manifest.")
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
            str(files[0]),
        ],
        capture_output=True,
        text=True,
        timeout=30,
        check=True,
    )
    info = json.loads(result.stdout)
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), {})
    if snapshot.spec_json.get("schema") == "creative-video/v2":
        requires_audio = bool(snapshot.spec_json.get("soundtrack")) or any(
            (s.get("narration") or {}).get("assetId")
            for s in snapshot.spec_json["scenes"]
        )
        if (
            manifest.get("schema") != "creative-video-render/v2"
            or manifest.get("hasAudio") != requires_audio
            or manifest.get("assetHashes")
            != {
                alias: asset["sha256"]
                for alias, asset in (snapshot.asset_manifest_json or {}).items()
            }
        ):
            raise ValueError(
                "Output assets or audio declaration differ from the frozen creative."
            )
        if any(
            not (directory / name).is_file()
            or not (directory / name).resolve().is_relative_to(directory.resolve())
            for name in ("captions.srt", "transcript.txt")
        ):
            raise ValueError("Renderer did not produce the creative text artifacts.")
        transcript = "\n\n".join(
            (scene.get("narration") or {}).get("text", "")
            for scene in snapshot.spec_json["scenes"]
            if (scene.get("narration") or {}).get("text")
        )
        if (directory / "captions.srt").read_text() != captions_srt(
            snapshot.spec_json
        ) or (directory / "transcript.txt").read_text() != transcript:
            raise ValueError(
                "Rendered captions or transcript differ from the approved snapshot."
            )
        if requires_audio and not any(
            s.get("codec_type") == "audio" and s.get("codec_name") == "aac"
            for s in info["streams"]
        ):
            raise ValueError(
                "Rendered video is missing the requested AAC audio stream."
            )
    if (
        video.get("codec_name") != "h264"
        or video.get("width") != job.width
        or video.get("height") != job.height
        or int(video.get("nb_frames", 0)) != job.total_frames
        or video.get("avg_frame_rate") != "30/1"
    ):
        raise ValueError("Encoded video metadata does not match the requested lesson.")
    if (
        abs(float(info["format"]["duration"]) - job.total_frames / job.fps)
        > 1 / job.fps
    ):
        raise ValueError("Encoded video duration differs from the lesson.")
    return files[0]


def cleanup_orphans(db):
    """Keep completed outputs; remove abandoned attempts only after a grace period."""
    if not ARTIFACT_ROOT.is_dir():
        return
    cutoff = datetime.utcnow().timestamp() - 600
    for folder in ARTIFACT_ROOT.iterdir():
        if (
            not folder.is_dir()
            or folder.is_symlink()
            or folder.stat().st_mtime >= cutoff
        ):
            continue
        job = db.get(VideoRenderJob, folder.name)
        if not job:
            shutil.rmtree(folder)
        else:
            for attempt in folder.iterdir():
                if (
                    attempt.is_dir()
                    and not attempt.is_symlink()
                    and attempt.name != f"attempt-{job.attempt}"
                    and attempt.stat().st_mtime < cutoff
                ):
                    shutil.rmtree(attempt)
