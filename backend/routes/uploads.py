from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import UploadedAsset, User, get_db
from schemas.uploads import UploadedImageListResponse, UploadedImageRenameRequest, UploadedImageResponse
from services.upload_service import (
    MAX_UPLOAD_BYTES,
    delete_uploaded_image_files,
    ensure_owned_project,
    persist_uploaded_image,
    prepare_uploaded_image,
    safe_filename,
)


router = APIRouter(prefix="/api/uploads/images", tags=["uploads"])


def _response(record: UploadedAsset) -> UploadedImageResponse:
    return UploadedImageResponse(
        id=record.id,
        projectId=record.project_id,
        filename=record.filename,
        mimeType=record.mime_type,
        fileSize=record.file_size,
        width=record.width or 0,
        height=record.height or 0,
        url=record.public_url,
        thumbnailUrl=record.thumbnail_url or record.public_url,
        metadata=record.metadata_json or {},
        assetRole=record.asset_role or "upload",
        createdAt=record.created_at,
        updatedAt=record.updated_at or record.created_at,
    )


def _owned_asset(db: Session, user: User, asset_id: str) -> UploadedAsset:
    record = db.query(UploadedAsset).filter(
        UploadedAsset.id == asset_id,
        UploadedAsset.user_id == user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Uploaded image not found.")
    return record


@router.post("", response_model=UploadedImageResponse, status_code=201)
async def upload_image(
    image: UploadFile = File(...),
    project_id: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    owned_project_id = ensure_owned_project(db, current_user, project_id)
    payload = await image.read(MAX_UPLOAD_BYTES + 1)
    prepared = prepare_uploaded_image(payload, image.content_type, image.filename)
    record = persist_uploaded_image(
        db,
        user=current_user,
        project_id=owned_project_id,
        original_filename=image.filename,
        prepared=prepared,
    )
    return _response(record)


@router.get("", response_model=UploadedImageListResponse)
def list_uploaded_images(
    search: str = Query(default="", max_length=120),
    project_id: Optional[str] = Query(default=None),
    limit: int = Query(default=48, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(UploadedAsset).filter(
        UploadedAsset.user_id == current_user.id,
        UploadedAsset.asset_role == "upload",
    )
    if project_id:
        ensure_owned_project(db, current_user, project_id)
        query = query.filter(UploadedAsset.project_id == project_id)
    if search.strip():
        query = query.filter(func.lower(UploadedAsset.filename).contains(search.strip().lower()))
    total = query.count()
    records = query.order_by(UploadedAsset.created_at.desc()).offset(offset).limit(limit).all()
    return UploadedImageListResponse(items=[_response(record) for record in records], total=total, limit=limit, offset=offset)


@router.get("/{asset_id}", response_model=UploadedImageResponse)
def get_uploaded_image(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _response(_owned_asset(db, current_user, asset_id))


@router.patch("/{asset_id}", response_model=UploadedImageResponse)
def rename_uploaded_image(
    asset_id: str,
    request: UploadedImageRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _owned_asset(db, current_user, asset_id)
    extension = Path(record.filename).suffix or ".png"
    record.filename = safe_filename(request.filename, extension)
    db.commit()
    db.refresh(record)
    return _response(record)


@router.delete("/{asset_id}", status_code=204)
def delete_uploaded_image(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = _owned_asset(db, current_user, asset_id)
    storage_path = Path(record.storage_path)
    db.delete(record)
    db.commit()
    if storage_path.exists():
        delete_uploaded_image_files(record)
