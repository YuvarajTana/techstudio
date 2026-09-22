from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from auth import get_current_user
from database import GeneratedAsset, UploadedAsset, User, get_db
from services.creative_media_service import (
    MAX_MEDIA_BYTES,
    media_response,
    persist_uploaded_local_asset,
    resolve_owned_asset,
)

router = APIRouter(prefix="/api/creative/media", tags=["creative-media"])


@router.post("", status_code=201)
async def upload(
    file: UploadFile = File(...),
    role: str = Form("creative"),
    project_id: str | None = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if role not in {
        "creative",
        "hero",
        "logo",
        "reference",
        "narration",
        "music",
        "gallery",
    }:
        raise HTTPException(422, "Choose a supported media role.")
    payload = await file.read(MAX_MEDIA_BYTES + 1)
    record = await run_in_threadpool(
        persist_uploaded_local_asset,
        db,
        user.id,
        project_id,
        payload,
        file.filename or "media",
        file.content_type,
        role,
    )
    return media_response(record, "uploaded")


@router.get("")
def list_media(
    source: Literal["uploaded", "generated"] | None = None,
    kind: Literal["image", "audio"] | None = None,
    project_id: str | None = None,
    limit: int = Query(48, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = []
    for label, model in [("uploaded", UploadedAsset), ("generated", GeneratedAsset)]:
        if source and source != label:
            continue
        query = db.query(model).filter(
            model.user_id == user.id, model.mime_type.is_not(None)
        )
        if project_id:
            query = query.filter(model.project_id == project_id)
        if kind:
            query = query.filter(model.mime_type.like(f"{kind}/%"))
        else:
            query = query.filter(
                model.mime_type.like("image/%") | model.mime_type.like("audio/%")
            )
        records.extend(
            (row, label)
            for row in query.order_by(model.created_at.desc())
            .limit(offset + limit)
            .all()
        )
    records.sort(key=lambda entry: entry[0].created_at, reverse=True)
    selected = records[offset : offset + limit]
    return {
        "items": [media_response(row, label) for row, label in selected],
        "has_more": len(records) > offset + limit or len(selected) == limit,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{source}/{asset_id}/content")
def content(
    source: str,
    asset_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record, path, _ = resolve_owned_asset(db, user.id, source, asset_id)
    return FileResponse(
        path,
        media_type=record.mime_type,
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/{source}/{asset_id}")
def metadata(
    source: str,
    asset_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record, _, meta = resolve_owned_asset(db, user.id, source, asset_id)
    return media_response(record, source, meta)
