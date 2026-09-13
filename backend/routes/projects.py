from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Optional, List
from database import get_db, Project, User, DesignVersion, DeletedItem, LessonVideoDocument, LessonVideoSnapshot, VideoRenderJob
from auth import get_current_user
from datetime import datetime
import random
import string

router = APIRouter(prefix="/api/projects", tags=["projects"])
AUTOSAVE_VERSION_COALESCE_SECONDS = 60


class ProjectCreate(BaseModel):
    id: Optional[str] = None
    name: str
    data: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    design_type: Optional[str] = None
    generated_asset_id: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    data: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    design_type: Optional[str] = None
    generated_asset_id: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    data: Optional[str]
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    design_type: Optional[str] = None
    generated_asset_id: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None
    createdAt: str
    updatedAt: str


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]


class DeletedProjectResponse(BaseModel):
    id: str
    item_id: str
    name: str
    data: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    design_type: Optional[str] = None
    generated_asset_id: Optional[str] = None
    prompt: Optional[str] = None
    provider: Optional[str] = None
    deletedAt: str


class DeletedProjectListResponse(BaseModel):
    items: List[DeletedProjectResponse]


def generate_project_id():
    return "proj_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def generate_version_id():
    return "ver_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def generate_deleted_item_id():
    return "del_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def _should_coalesce_autosave(latest_version: DesignVersion | None, now: datetime) -> bool:
    if not latest_version or latest_version.name != "Autosave" or not latest_version.created_at:
        return False
    elapsed = (now - latest_version.created_at).total_seconds()
    return 0 <= elapsed < AUTOSAVE_VERSION_COALESCE_SECONDS


def persist_project_data_version(db: Session, project: Project, data: str, now: datetime | None = None) -> None:
    now = now or datetime.utcnow()
    project.data = data
    latest_version = db.query(DesignVersion).filter(
        DesignVersion.project_id == project.id
    ).order_by(DesignVersion.version_number.desc()).first()

    if latest_version and latest_version.data == data:
        return

    if _should_coalesce_autosave(latest_version, now):
        latest_version.data = data
        latest_version.created_at = now
        return

    db.add(DesignVersion(
        id=generate_version_id(),
        project_id=project.id,
        version_number=(latest_version.version_number + 1) if latest_version else 1,
        name="Autosave",
        data=data,
    ))


def to_project_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        data=project.data,
        width=project.width,
        height=project.height,
        background_color=project.background_color,
        design_type=project.design_type,
        generated_asset_id=project.generated_asset_id,
        prompt=project.prompt,
        provider=project.provider,
        createdAt=project.created_at.isoformat() if project.created_at else "",
        updatedAt=project.updated_at.isoformat() if project.updated_at else "",
    )


def deleted_project_metadata(project: Project) -> dict[str, Any]:
    return {
        "name": project.name,
        "data": project.data,
        "thumbnail": project.thumbnail,
        "width": project.width,
        "height": project.height,
        "background_color": project.background_color,
        "design_type": project.design_type,
        "generated_asset_id": project.generated_asset_id,
        "prompt": project.prompt,
        "provider": project.provider,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }


def to_deleted_project_response(item: DeletedItem) -> DeletedProjectResponse:
    metadata = item.metadata_json or {}
    return DeletedProjectResponse(
        id=item.id,
        item_id=item.item_id,
        name=metadata.get("name") or "Untitled Design",
        data=metadata.get("data"),
        width=metadata.get("width"),
        height=metadata.get("height"),
        background_color=metadata.get("background_color"),
        design_type=metadata.get("design_type"),
        generated_asset_id=metadata.get("generated_asset_id"),
        prompt=metadata.get("prompt"),
        provider=metadata.get("provider"),
        deletedAt=item.created_at.isoformat() if item.created_at else "",
    )


@router.get("", response_model=ProjectListResponse)
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).order_by(Project.updated_at.desc()).all()
    
    return ProjectListResponse(projects=[to_project_response(p) for p in projects])


@router.post("", response_model=ProjectResponse)
def create_project(
    req: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project_id = req.id or generate_project_id()
    
    # Check if ID already exists
    existing = db.query(Project).filter(Project.id == project_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project ID already exists")
    
    project = Project(
        id=project_id,
        name=req.name,
        user_id=current_user.id,
        data=req.data,
        width=req.width or 800,
        height=req.height or 800,
        background_color=req.background_color or "#000000",
        design_type=req.design_type,
        generated_asset_id=req.generated_asset_id,
        prompt=req.prompt,
        provider=req.provider,
    )
    db.add(project)
    if req.data:
        db.add(DesignVersion(
            id=generate_version_id(),
            project_id=project_id,
            version_number=1,
            name="Initial version",
            data=req.data,
        ))
    db.commit()
    db.refresh(project)
    
    return to_project_response(project)


@router.get("/trash", response_model=DeletedProjectListResponse)
def list_deleted_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_items = db.query(DeletedItem).filter(
        DeletedItem.user_id == current_user.id,
        DeletedItem.item_type == "project"
    ).order_by(DeletedItem.created_at.desc()).all()
    return DeletedProjectListResponse(items=[to_deleted_project_response(item) for item in deleted_items])


@router.post("/trash/{deleted_item_id}/restore", response_model=ProjectResponse)
def restore_deleted_project(
    deleted_item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_item = db.query(DeletedItem).filter(
        DeletedItem.id == deleted_item_id,
        DeletedItem.user_id == current_user.id,
        DeletedItem.item_type == "project"
    ).first()
    if not deleted_item:
        raise HTTPException(status_code=404, detail="Deleted project not found")

    existing_project = db.query(Project).filter(
        Project.id == deleted_item.item_id,
        Project.user_id == current_user.id
    ).first()
    if existing_project:
        raise HTTPException(status_code=409, detail="A project with this ID already exists")

    metadata = deleted_item.metadata_json or {}
    project = Project(
        id=deleted_item.item_id,
        name=metadata.get("name") or "Restored Design",
        user_id=current_user.id,
        data=metadata.get("data"),
        thumbnail=metadata.get("thumbnail"),
        width=metadata.get("width") or 800,
        height=metadata.get("height") or 800,
        background_color=metadata.get("background_color") or "#000000",
        design_type=metadata.get("design_type"),
        generated_asset_id=metadata.get("generated_asset_id"),
        prompt=metadata.get("prompt"),
        provider=metadata.get("provider"),
        updated_at=datetime.utcnow(),
    )
    db.add(project)
    db.flush()
    if project.design_type == "lesson-video" and metadata.get("lesson_video"):
        from services.lesson_spec import validate_spec
        import uuid
        lesson = metadata["lesson_video"]
        db.add(LessonVideoDocument(id=str(uuid.uuid4()), project_id=project.id, spec_json=validate_spec(lesson["spec"]), revision=lesson.get("revision", 1)))
    if project.data:
        db.add(DesignVersion(
            id=generate_version_id(),
            project_id=project.id,
            version_number=1,
            name="Restored version",
            data=project.data,
            thumbnail=project.thumbnail,
        ))
    db.delete(deleted_item)
    db.commit()
    db.refresh(project)
    return to_project_response(project)


@router.delete("/trash/{deleted_item_id}")
def permanently_delete_project(
    deleted_item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_item = db.query(DeletedItem).filter(
        DeletedItem.id == deleted_item_id,
        DeletedItem.user_id == current_user.id,
        DeletedItem.item_type == "project"
    ).first()
    if not deleted_item:
        raise HTTPException(status_code=404, detail="Deleted project not found")

    db.delete(deleted_item)
    db.commit()
    return {"message": "Deleted project permanently removed"}


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return to_project_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    req: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if req.name is not None:
        project.name = req.name
    if req.data is not None:
        if project.design_type == "lesson-video":
            raise HTTPException(409, "Edit this project through the lesson-video workspace.")
        persist_project_data_version(db, project, req.data)
    if req.width is not None:
        project.width = req.width
    if req.height is not None:
        project.height = req.height
    if req.background_color is not None:
        project.background_color = req.background_color
    if req.design_type is not None:
        if project.design_type == "lesson-video" and req.design_type != "lesson-video":
            raise HTTPException(409, "A lesson video cannot be converted to a canvas project.")
        project.design_type = req.design_type
    if req.generated_asset_id is not None:
        project.generated_asset_id = req.generated_asset_id
    if req.prompt is not None:
        project.prompt = req.prompt
    if req.provider is not None:
        project.provider = req.provider
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return to_project_response(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).with_for_update().first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    metadata = deleted_project_metadata(project)
    if project.design_type == "lesson-video":
        active = db.query(VideoRenderJob).filter(VideoRenderJob.project_id == project.id, VideoRenderJob.status.in_(["queued", "processing"])).with_for_update().first()
        if active:
            raise HTTPException(409, "Cancel active renders before moving this lesson to trash.")
        doc = db.query(LessonVideoDocument).filter(LessonVideoDocument.project_id == project.id).with_for_update().first()
        if doc:
            metadata["lesson_video"] = {"spec": doc.spec_json, "revision": doc.revision}
        db.query(VideoRenderJob).filter(VideoRenderJob.project_id == project.id).delete(synchronize_session=False)
        db.query(LessonVideoSnapshot).filter(LessonVideoSnapshot.project_id == project.id).delete(synchronize_session=False)
        db.query(LessonVideoDocument).filter(LessonVideoDocument.project_id == project.id).delete(synchronize_session=False)
    db.add(DeletedItem(
        id=generate_deleted_item_id(),
        user_id=current_user.id,
        item_type="project",
        item_id=project.id,
        metadata_json=metadata,
    ))
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted"}
