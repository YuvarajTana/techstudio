"""Owned creative media. Render snapshots keep private copies of their inputs."""

from __future__ import annotations

import hashlib
import json
import math
import re
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from config import BACKEND_DIR, resolve_runtime_path, settings
from database import GeneratedAsset, Project, UploadedAsset
from services.upload_service import prepare_uploaded_image, safe_filename

PRIVATE_ROOT = BACKEND_DIR.parent / ".local/creative-media"
SNAPSHOT_ROOT = BACKEND_DIR.parent / ".local/video-snapshots"
MAX_MEDIA_BYTES = 50 * 1024 * 1024
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"}
AUDIO_MIMES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
    "video/webm",
    "application/ogg",
}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def _owned_project(db, user_id, project_id):
    if (
        project_id
        and not db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    ):
        raise HTTPException(404, "Project not found.")


def _probe_audio(path: Path) -> dict:
    try:
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_streams",
                "-show_format",
                "-of",
                "json",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=True,
        )
        info = json.loads(probe.stdout)
        streams = info.get("streams", [])
        audio = [stream for stream in streams if stream.get("codec_type") == "audio"]
        if not audio or any(
            stream.get("codec_type") == "video"
            and not stream.get("disposition", {}).get("attached_pic")
            for stream in streams
        ):
            raise ValueError("Expected audio-only media")
        duration = float(
            info.get("format", {}).get("duration") or audio[0].get("duration") or 0
        )
        if not math.isfinite(duration) or duration <= 0 or duration > 600:
            raise ValueError("Audio duration must be at most ten minutes")
        if audio[0].get("codec_name") not in {
            "mp3",
            "aac",
            "opus",
            "vorbis",
            "flac",
            "pcm_s16le",
            "pcm_s24le",
            "pcm_s32le",
            "pcm_f32le",
            "pcm_u8",
            "pcm_s16be",
        }:
            raise ValueError("Unsupported audio codec")
        return {
            "duration_ms": round(duration * 1000),
            "codec": audio[0]["codec_name"],
            "sample_rate": int(audio[0].get("sample_rate", 0)),
            "channels": int(audio[0].get("channels", 0)),
        }
    except (OSError, ValueError, subprocess.SubprocessError, KeyError) as exc:
        raise HTTPException(
            422,
            "Choose valid MP3, WAV, M4A, AAC, OGG or audio WebM, up to ten minutes.",
        ) from exc


def _prepare(
    payload: bytes, filename: str, declared_type: str | None, kind: str | None = None
):
    if not payload:
        raise HTTPException(422, "The media file is empty.")
    if len(payload) > MAX_MEDIA_BYTES:
        raise HTTPException(413, "Media must be 50 MB or smaller.")
    extension = Path(filename).suffix.lower()
    if kind == "image" or (kind is None and extension not in AUDIO_EXTENSIONS):
        prepared = prepare_uploaded_image(payload, declared_type, filename)
        return (
            prepared.content,
            prepared.extension,
            prepared.mime_type,
            {
                **prepared.metadata,
                "kind": "image",
                "width": prepared.width,
                "height": prepared.height,
            },
        )
    if extension not in AUDIO_EXTENSIONS or (
        declared_type and declared_type.split(";")[0] not in AUDIO_MIMES
    ):
        raise HTTPException(415, "Choose MP3, WAV, M4A, AAC, OGG or audio WebM.")
    with tempfile.TemporaryDirectory(prefix="creative-audio-") as directory:
        original = Path(directory) / f"source{extension}"
        original.write_bytes(payload)
        metadata = _probe_audio(original)
        # Normalize browser/container-specific audio to seekable AAC for both Player and export.
        normalized = Path(directory) / "audio.m4a"
        try:
            subprocess.run(
                [
                    settings.FFMPEG_BINARY,
                    "-v",
                    "error",
                    "-y",
                    "-i",
                    str(original),
                    "-vn",
                    "-map",
                    "0:a:0",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-movflags",
                    "+faststart",
                    str(normalized),
                ],
                capture_output=True,
                timeout=90,
                check=True,
            )
            content = normalized.read_bytes()
        except (OSError, subprocess.SubprocessError) as exc:
            raise HTTPException(
                422, "The audio could not be normalized for playback."
            ) from exc
        metadata = {
            **metadata,
            **_probe_audio(normalized),
            "kind": "audio",
            "original_extension": extension,
            "normalized": True,
        }
        return content, ".m4a", "audio/mp4", metadata


def _private_file(asset_id, payload, extension):
    directory = PRIVATE_ROOT / asset_id
    directory.mkdir(parents=True, exist_ok=False)
    path = directory / f"original{extension}"
    path.write_bytes(payload)
    path.chmod(0o600)
    return path


def persist_uploaded_local_asset(
    db: Session,
    user_id: str,
    project_id,
    payload: bytes,
    filename: str,
    mime_type,
    role: str,
):
    _owned_project(db, user_id, project_id)
    content, extension, mime, metadata = _prepare(payload, filename, mime_type)
    asset_id = f"ua_{uuid.uuid4().hex}"
    path = _private_file(asset_id, content, extension)
    metadata.update(
        sha256=hashlib.sha256(content).hexdigest(),
        original_filename=filename,
        provenance="user-upload",
        private=True,
    )
    record = UploadedAsset(
        id=asset_id,
        user_id=user_id,
        project_id=project_id,
        filename=safe_filename(filename, extension),
        mime_type=mime,
        file_size=len(content),
        storage_path=str(path),
        public_url=f"/api/creative/media/uploaded/{asset_id}/content",
        width=metadata.get("width"),
        height=metadata.get("height"),
        metadata_json=metadata,
        asset_role=role,
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        shutil.rmtree(path.parent, ignore_errors=True)
        raise


def persist_generated_local_asset(
    db: Session, user_id: str, project_id, path: Path | str, kind: str, metadata: dict
) -> GeneratedAsset:
    _owned_project(db, user_id, project_id)
    source = Path(path)
    if kind not in {"image", "audio"}:
        raise HTTPException(422, "Generated media must be image or audio.")
    # This entry point accepts only a trusted local provider output, never a client path.
    if source.stat().st_size > MAX_MEDIA_BYTES:
        raise HTTPException(413, "Generated media is too large.")
    content, extension, mime, measured = _prepare(
        source.read_bytes(), source.name, None, kind
    )
    asset_id = f"ga_{uuid.uuid4().hex}"
    target = _private_file(asset_id, content, extension)
    info = {
        **metadata,
        **measured,
        "sha256": hashlib.sha256(content).hexdigest(),
        "private": True,
    }
    record = GeneratedAsset(
        id=asset_id,
        user_id=user_id,
        project_id=project_id,
        asset_type=kind,
        original_prompt=str(metadata.get("prompt", "")),
        provider=metadata.get("provider"),
        model=metadata.get("model"),
        storage_path=str(target),
        public_url=f"/api/creative/media/generated/{asset_id}/content",
        mime_type=mime,
        width=measured.get("width"),
        height=measured.get("height"),
        generation_metadata=info,
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except Exception:
        db.rollback()
        shutil.rmtree(target.parent, ignore_errors=True)
        raise


def resolve_owned_asset(db: Session, user_id: str, source: str, asset_id: str):
    model = {"uploaded": UploadedAsset, "generated": GeneratedAsset}.get(source)
    if not model or not ID_RE.fullmatch(asset_id):
        raise HTTPException(404, "Media not found.")
    record = (
        db.query(model).filter(model.id == asset_id, model.user_id == user_id).first()
    )
    if not record:
        raise HTTPException(404, "Media not found.")
    if not record.storage_path:
        raise HTTPException(404, "Media file is unavailable.")
    path = Path(record.storage_path)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    path = path.resolve()
    allowed = [
        PRIVATE_ROOT.resolve(),
        resolve_runtime_path(settings.MEDIA_ROOT).resolve(),
    ]
    if not any(path.is_relative_to(root) for root in allowed) or not path.is_file():
        raise HTTPException(404, "Media file is unavailable.")
    metadata = dict(
        (record.metadata_json if source == "uploaded" else record.generation_metadata)
        or {}
    )
    kind = (
        "audio"
        if (record.mime_type or "").startswith("audio/")
        else "image" if (record.mime_type or "").startswith("image/") else None
    )
    if (
        not kind
        or record.mime_type
        not in {"image/png", "image/jpeg", "image/webp", *AUDIO_MIMES}
        or path.stat().st_size > MAX_MEDIA_BYTES
    ):
        raise HTTPException(422, "Media format is unsupported.")
    metadata.update(
        kind=kind,
        mime_type=record.mime_type,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        width=record.width,
        height=record.height,
    )
    if kind == "audio":
        metadata.update(_probe_audio(path))
    return record, path, metadata


def media_response(record, source: str, metadata=None):
    meta = (
        metadata
        if metadata is not None
        else (
            record.metadata_json or {}
            if source == "uploaded"
            else record.generation_metadata or {}
        )
    )
    return {
        "id": record.id,
        "source": source,
        "kind": "audio" if (record.mime_type or "").startswith("audio/") else "image",
        "project_id": record.project_id,
        "filename": (
            record.filename
            if source == "uploaded"
            else f"{record.id}{Path(record.storage_path or '').suffix}"
        ),
        "mime_type": record.mime_type,
        "width": record.width,
        "height": record.height,
        "duration_ms": meta.get("duration_ms"),
        "sha256": meta.get("sha256"),
        "role": record.asset_role if source == "uploaded" else record.asset_type,
        "content_url": f"/api/creative/media/{source}/{record.id}/content",
        "metadata": {
            key: value
            for key, value in meta.items()
            if key not in {"storage_path", "path", "storageKey"}
        },
        "created_at": record.created_at.isoformat(),
    }


def freeze_asset_manifest(
    db: Session, user_id: str, spec: dict, snapshot_id: str
) -> dict:
    if not ID_RE.fullmatch(snapshot_id):
        raise ValueError("Invalid snapshot identity.")
    assets = spec.get("assets", [])
    if not assets:
        return {}
    directory = SNAPSHOT_ROOT / snapshot_id / "assets"
    directory.mkdir(parents=True, exist_ok=False)
    manifest = {}
    try:
        for asset in assets:
            alias = asset["id"]
            if not ID_RE.fullmatch(alias) or alias in manifest:
                raise HTTPException(422, "Invalid or duplicate media alias.")
            record, source_path, metadata = resolve_owned_asset(
                db, user_id, asset["source"], asset["assetId"]
            )
            if asset["kind"] != metadata["kind"]:
                raise HTTPException(422, "Media kind does not match the saved asset.")
            target = directory / f"{alias}{source_path.suffix.lower()}"
            shutil.copyfile(source_path, target)
            target.chmod(0o600)
            copied_hash = hashlib.sha256(target.read_bytes()).hexdigest()
            if copied_hash != metadata["sha256"]:
                raise HTTPException(
                    409,
                    "Media changed while the snapshot was being saved. Retry rendering.",
                )
            manifest[alias] = {
                "path": str(target.resolve()),
                "sha256": copied_hash,
                "mime_type": record.mime_type,
                "kind": metadata["kind"],
                **(
                    {"duration_ms": metadata["duration_ms"]}
                    if metadata.get("duration_ms") is not None
                    else {}
                ),
            }
        return manifest
    except Exception:
        shutil.rmtree(directory.parent, ignore_errors=True)
        raise
