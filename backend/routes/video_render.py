from __future__ import annotations

import json
import shutil
import uuid
from io import BytesIO
from math import ceil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from auth import get_current_user
from config import settings
from database import Project, User, VideoRenderJob, get_db
from schemas.video_render import VideoRenderCreated, VideoRenderStatusResponse
from services.video_render_service import (
    FORMAT_CODECS,
    RENDER_ROOT,
    SUPPORTED_VIDEO_COMPOSITIONS,
    VideoRenderValidationError,
    cleanup_expired_render_files,
    parse_timeline_json,
    request_cancel,
    start_frame_render_thread,
    start_render_thread,
    validate_render_request,
)


router = APIRouter(prefix="/api/video", tags=["video"])
MAX_SCENE_BYTES = 25 * 1024 * 1024
MAX_FRAME_BYTES = 12 * 1024 * 1024
MAX_AUDIO_BYTES = 50 * 1024 * 1024
MAX_EXPORT_AUDIO_FILES = 24
MAX_RENDER_FRAMES = 36_000
FRAME_SEQUENCE_EXTENSION = ".jpg"
FRAME_JPEG_QUALITY = 88
AUDIO_EXTENSIONS_BY_TYPE = {
    "audio/aac": ".aac",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/m4a": ".m4a",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
    "application/octet-stream": ".audio",
}


def _owned_project(db: Session, user: User, project_id: str) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


def _owned_job(db: Session, user: User, job_id: str) -> VideoRenderJob:
    job = db.query(VideoRenderJob).filter(
        VideoRenderJob.id == job_id,
        VideoRenderJob.user_id == user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Video render job not found.")
    return job


def _ffmpeg_available() -> bool:
    binary = settings.FFMPEG_BINARY
    if Path(binary).is_absolute():
        return Path(binary).is_file()
    return shutil.which(binary) is not None


def _status_response(job: VideoRenderJob) -> VideoRenderStatusResponse:
    duration_ms = None
    if isinstance(job.timeline_json, dict):
        duration_ms = int(job.timeline_json.get("durationMs") or 0) or None
    download_url = (
        f"/api/video/download/{job.id}"
        if job.status == "completed" and job.output_path
        else None
    )
    return VideoRenderStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=max(0, min(int(job.progress or 0), 100)),
        stage=job.stage,
        error=job.error_message,
        file_name=job.file_name,
        download_url=download_url,
        duration_ms=duration_ms,
        width=job.width,
        height=job.height,
        fps=job.fps,
        total_frames=job.total_frames,
        rendered_frames=job.rendered_frames,
    )


async def _persist_scene(upload: UploadFile, destination: Path) -> None:
    if upload.content_type not in {"image/png", "image/x-png", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Every render scene must be a PNG image.")
    payload = await upload.read(MAX_SCENE_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="A render scene is empty.")
    if len(payload) > MAX_SCENE_BYTES:
        raise HTTPException(status_code=413, detail="A render scene exceeds the 25 MB limit.")
    destination.write_bytes(payload)
    try:
        with Image.open(destination) as image:
            image.verify()
        with Image.open(destination) as image:
            if image.format != "PNG":
                raise HTTPException(status_code=415, detail="Every render scene must be a valid PNG image.")
            width, height = image.size
            if image.size not in SUPPORTED_VIDEO_COMPOSITIONS:
                raise HTTPException(
                    status_code=400,
                    detail="Every render scene must already be composed at 1080 × 1350 or 1080 × 1920.",
                )
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="A render scene is not a valid image.") from error


async def _persist_frame(
    upload: UploadFile,
    destination: Path,
    expected_width: int,
    expected_height: int,
) -> None:
    if upload.content_type not in {"image/png", "image/x-png", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Every animation frame must be a PNG image.")
    payload = await upload.read(MAX_FRAME_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="An animation frame is empty.")
    if len(payload) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="An animation frame exceeds the 12 MB limit.")
    try:
        with Image.open(BytesIO(payload)) as image:
            image.verify()
        with Image.open(BytesIO(payload)) as image:
            if image.format != "PNG":
                raise HTTPException(status_code=415, detail="Every animation frame must be a valid PNG image.")
            if image.size != (expected_width, expected_height):
                raise HTTPException(
                    status_code=400,
                    detail="Animation frame dimensions do not match the export settings.",
                )
            if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
                flattened = Image.new("RGB", image.size, (0, 0, 0))
                flattened.paste(image.convert("RGBA"), mask=image.convert("RGBA").getchannel("A"))
                frame_image = flattened
            else:
                frame_image = image.convert("RGB")
            frame_image.save(
                destination,
                format="JPEG",
                quality=FRAME_JPEG_QUALITY,
                optimize=True,
                progressive=False,
            )
    except (UnidentifiedImageError, OSError) as error:
        raise HTTPException(status_code=400, detail="An animation frame is not a valid image.") from error


def _safe_audio_extension(upload: UploadFile) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix in {".aac", ".m4a", ".mp3", ".ogg", ".wav", ".webm"}:
        return suffix
    return AUDIO_EXTENSIONS_BY_TYPE.get(upload.content_type or "", ".audio")


async def _persist_audio(upload: UploadFile, destination: Path) -> None:
    if upload.content_type not in AUDIO_EXTENSIONS_BY_TYPE:
        raise HTTPException(status_code=415, detail="Every export audio file must be MP3, WAV, M4A, AAC, OGG, or WebM audio.")
    payload = await upload.read(MAX_AUDIO_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="An export audio file is empty.")
    if len(payload) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="An export audio file exceeds the 50 MB limit.")
    destination.write_bytes(payload)


def _visible_clip_count(timeline: dict) -> int:
    tracks = timeline.get("tracks") if isinstance(timeline.get("tracks"), list) else []
    poster_track = next((track for track in tracks if track.get("type") == "poster"), {})
    clips = poster_track.get("clips") if isinstance(poster_track.get("clips"), list) else []
    return len([clip for clip in clips if clip.get("visible", True)])


def _reject_duplicate_job(db: Session, user: User, project: Project) -> None:
    active_job = db.query(VideoRenderJob).filter(
        VideoRenderJob.user_id == user.id,
        VideoRenderJob.project_id == project.id,
        VideoRenderJob.status.in_(["queued", "processing"]),
        VideoRenderJob.cancel_requested.is_(False),
    ).first()
    if active_job:
        raise HTTPException(status_code=409, detail="A video export is already running for this project.")


@router.post("/render/frames", response_model=VideoRenderCreated, status_code=202)
async def create_frame_video_render(
    project_id: Annotated[str, Form()],
    format: Annotated[str, Form()],
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
    fps: Annotated[int, Form()],
    quality: Annotated[str, Form()],
    total_frames: Annotated[int, Form()],
    timeline_json: Annotated[str | None, Form()] = None,
    include_audio: Annotated[bool, Form()] = False,
    audio_file_ids: Annotated[str, Form()] = "[]",
    timeline_file: Annotated[UploadFile | None, File()] = None,
    audio_files: Annotated[list[UploadFile] | None, File()] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print(
        "[EXPORT] route entered",
        {
            "project_id": project_id,
            "format": format,
            "width": width,
            "height": height,
            "fps": fps,
            "quality": quality,
            "total_frames": total_frames,
            "include_audio": include_audio,
            "has_timeline_file": timeline_file is not None,
            "audio_files": len(audio_files or []),
        },
    )
    project = _owned_project(db, current_user, project_id)
    if not _ffmpeg_available():
      raise HTTPException(status_code=503, detail="Video rendering is unavailable because FFmpeg is not configured.")
    if (width, height) not in SUPPORTED_VIDEO_COMPOSITIONS:
        raise HTTPException(status_code=400, detail="Video export must use 1080 × 1350 canvas or 1080 × 1920 reel composition.")
    try:
        timeline_payload = timeline_json
        if timeline_file is not None:
            timeline_payload = (await timeline_file.read()).decode("utf-8")
        if not timeline_payload:
            raise VideoRenderValidationError("Timeline JSON is required.")
        timeline = parse_timeline_json(timeline_payload)
        _, duration_ms = validate_render_request(
            timeline,
            _visible_clip_count(timeline),
            format,
            width,
            height,
            fps,
            quality,
        )
    except VideoRenderValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    expected_frames = max(ceil(duration_ms * fps / 1000), 1)
    if total_frames != expected_frames:
        raise HTTPException(status_code=400, detail="Frame count does not match timeline duration and FPS.")
    if total_frames > MAX_RENDER_FRAMES:
        raise HTTPException(status_code=400, detail=f"Video export supports up to {MAX_RENDER_FRAMES} frames.")
    _reject_duplicate_job(db, current_user, project)
    print(f"[VIDEO EXPORT FPS] project_id={project.id} fps={fps} duration_ms={duration_ms} total_frames={total_frames}")
    cleanup_expired_render_files(update_database=False)
    job_id = f"video_{uuid.uuid4().hex}"
    job_directory = RENDER_ROOT / job_id
    job_directory.mkdir(parents=True, exist_ok=False)
    try:
        pending_audio_files = list(audio_files or [])
        audio_ids = json.loads(audio_file_ids or "[]")
        if pending_audio_files:
            if not isinstance(audio_ids, list) or len(audio_ids) != len(pending_audio_files):
                raise HTTPException(status_code=400, detail="Audio file metadata does not match uploaded audio files.")
            audio_clips = timeline.get("audioClips") if isinstance(timeline.get("audioClips"), list) else []
            upload_map: dict[str, Path] = {}
            for index, (clip_id, upload) in enumerate(zip(audio_ids, pending_audio_files)):
                safe_clip_id = str(clip_id or "").strip()
                if not safe_clip_id:
                    raise HTTPException(status_code=400, detail="Audio file metadata contains an empty clip id.")
                destination = job_directory / f"audio-{index:03d}-{uuid.uuid4().hex}{_safe_audio_extension(upload)}"
                await _persist_audio(upload, destination)
                upload_map[safe_clip_id] = destination
            for clip in audio_clips:
                if isinstance(clip, dict) and str(clip.get("id") or "") in upload_map:
                    clip["assetUrl"] = str(upload_map[str(clip.get("id") or "")])
            if isinstance(timeline.get("audio"), dict):
                clip = timeline["audio"]
                if str(clip.get("id") or "") in upload_map:
                    clip["assetUrl"] = str(upload_map[str(clip.get("id") or "")])
    except HTTPException:
        shutil.rmtree(job_directory, ignore_errors=True)
        raise
    except json.JSONDecodeError as error:
        shutil.rmtree(job_directory, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Audio file metadata is invalid.") from error
    job = VideoRenderJob(
        id=job_id,
        user_id=current_user.id,
        project_id=project.id,
        format=format,
        status="queued",
        progress=1,
        stage="Loading project",
        width=width,
        height=height,
        fps=fps,
        quality=quality,
        render_mode="frame_sequence",
        total_frames=total_frames,
        rendered_frames=0,
        timeline_json=timeline,
    )
    db.add(job)
    db.commit()
    return VideoRenderCreated(job_id=job.id, status="queued")


@router.post("/render/{job_id}/frames", response_model=VideoRenderStatusResponse)
async def upload_video_frames(
    job_id: str,
    start_index: Annotated[int, Form()],
    frames: Annotated[list[UploadFile], File()],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _owned_job(db, current_user, job_id)
    if job.render_mode != "frame_sequence":
        raise HTTPException(status_code=409, detail="This render job does not accept animation frames.")
    if job.cancel_requested or job.status == "cancelled":
        raise HTTPException(status_code=409, detail="This render job was cancelled.")
    if job.status in {"completed", "failed"}:
        raise HTTPException(status_code=409, detail="This render job no longer accepts frames.")
    if not frames or len(frames) > 12:
        raise HTTPException(status_code=400, detail="Upload between 1 and 12 animation frames per batch.")
    if start_index != job.rendered_frames:
        raise HTTPException(status_code=409, detail="Animation frames must be uploaded in sequential order.")
    if start_index + len(frames) > job.total_frames:
        raise HTTPException(status_code=400, detail="Animation frame batch exceeds the expected frame count.")
    job_directory = RENDER_ROOT / job.id
    written_paths: list[Path] = []
    try:
        for offset, frame in enumerate(frames):
            frame_path = job_directory / f"frame-{start_index + offset:06d}{FRAME_SEQUENCE_EXTENSION}"
            await _persist_frame(frame, frame_path, job.width, job.height)
            written_paths.append(frame_path)
    except Exception:
        for frame_path in written_paths:
            frame_path.unlink(missing_ok=True)
        raise
    job.rendered_frames = start_index + len(frames)
    job.status = "processing"
    job.progress = min(5 + round((job.rendered_frames / max(job.total_frames, 1)) * 65), 70)
    job.stage = f"Rendering frames {job.rendered_frames} of {job.total_frames}"
    db.commit()
    db.refresh(job)
    return _status_response(job)


@router.post("/render/{job_id}/finalize", response_model=VideoRenderStatusResponse)
def finalize_frame_video_render(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _owned_job(db, current_user, job_id)
    if job.render_mode != "frame_sequence":
        raise HTTPException(status_code=409, detail="This render job is not a frame-sequence export.")
    if job.cancel_requested:
        raise HTTPException(status_code=409, detail="This render job was cancelled.")
    if job.rendered_frames != job.total_frames:
        raise HTTPException(
            status_code=409,
            detail=f"Only {job.rendered_frames} of {job.total_frames} animation frames were uploaded.",
        )
    frame_count = (
        len(list((RENDER_ROOT / job.id).glob("frame-*.png")))
        + len(list((RENDER_ROOT / job.id).glob("frame-*.jpg")))
    )
    if frame_count != job.total_frames:
        raise HTTPException(status_code=409, detail="One or more animation frame files are missing.")
    project = _owned_project(db, current_user, job.project_id)
    job.status = "processing"
    job.progress = 70
    job.stage = "Applying transitions"
    db.commit()
    start_frame_render_thread(job.id, project.name)
    db.refresh(job)
    return _status_response(job)


@router.post("/render", response_model=VideoRenderCreated, status_code=202)
async def create_video_render(
    project_id: Annotated[str, Form()],
    format: Annotated[str, Form()],
    width: Annotated[int, Form()],
    height: Annotated[int, Form()],
    fps: Annotated[int, Form()],
    quality: Annotated[str, Form()],
    timeline_json: Annotated[str, Form()],
    scenes: Annotated[list[UploadFile], File()],
    include_audio: Annotated[bool, Form()] = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(db, current_user, project_id)
    if not _ffmpeg_available():
      raise HTTPException(status_code=503, detail="Video rendering is unavailable because FFmpeg is not configured.")
    if (width, height) not in SUPPORTED_VIDEO_COMPOSITIONS:
        raise HTTPException(status_code=400, detail="Video export must use 1080 × 1350 canvas or 1080 × 1920 reel composition.")
    try:
        timeline = parse_timeline_json(timeline_json)
        _, duration_ms = validate_render_request(timeline, len(scenes), format, width, height, fps, quality)
    except VideoRenderValidationError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    _reject_duplicate_job(db, current_user, project)
    print(f"[VIDEO EXPORT FPS] project_id={project.id} fps={fps} duration_ms={duration_ms} scenes={len(scenes)}")

    cleanup_expired_render_files(update_database=False)
    job_id = f"video_{uuid.uuid4().hex}"
    job_directory = RENDER_ROOT / job_id
    job_directory.mkdir(parents=True, exist_ok=False)
    scene_paths: list[Path] = []
    try:
        for index, scene in enumerate(scenes):
            destination = job_directory / f"scene-{index + 1:03d}.png"
            await _persist_scene(scene, destination)
            scene_paths.append(destination)
    except Exception:
        shutil.rmtree(job_directory, ignore_errors=True)
        raise

    job = VideoRenderJob(
        id=job_id,
        user_id=current_user.id,
        project_id=project.id,
        format=format,
        status="queued",
        progress=0,
        stage="Queued for rendering",
        width=width,
        height=height,
        fps=fps,
        quality=quality,
        timeline_json=timeline,
    )
    db.add(job)
    db.commit()
    start_render_thread(job.id, scene_paths, project.name)
    return VideoRenderCreated(job_id=job.id, status="queued")


@router.get("/render/{job_id}", response_model=VideoRenderStatusResponse)
def get_video_render(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _status_response(_owned_job(db, current_user, job_id))


@router.delete("/render/{job_id}", response_model=VideoRenderStatusResponse)
def cancel_video_render(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _owned_job(db, current_user, job_id)
    if job.status in {"completed", "failed", "cancelled"}:
        return _status_response(job)
    if job.render_mode == "remotion":
        from services.lesson_video_service import cancel_job
        job = db.query(VideoRenderJob).filter(VideoRenderJob.id == job_id).with_for_update().populate_existing().first()
        cancel_job(db, job)
        return _status_response(job)
    request_cancel(job.id)
    db.rollback()
    return _status_response(_owned_job(db, current_user, job_id))


@router.get("/download/{job_id}")
def download_video_render(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _owned_job(db, current_user, job_id)
    if job.status != "completed" or not job.output_path:
        raise HTTPException(status_code=409, detail="The rendered video is not ready.")
    if job.render_mode == "remotion":
        from services.lesson_video_service import artifact_path
        return FileResponse(artifact_path(job, "video"), media_type="video/mp4", filename=job.file_name)
    output_path = Path(job.output_path).resolve()
    render_root = RENDER_ROOT.resolve()
    if render_root not in output_path.parents or not output_path.is_file():
        raise HTTPException(status_code=404, detail="The rendered video file is unavailable.")
    expected_mime = FORMAT_CODECS.get(job.format, ("", "application/octet-stream", ""))[1]
    return FileResponse(
        path=output_path,
        media_type=job.mime_type or expected_mime,
        filename=job.file_name or output_path.name,
    )
