from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, SharedDesign, Project, User
from auth import get_current_user
import random
import string

router = APIRouter(prefix="/api/shared", tags=["shared"])


def generate_id():
    return "sh_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def generate_token():
    return "".join(random.choices(string.ascii_letters + string.digits, k=32))


class ShareCreate(BaseModel):
    project_id: str
    shared_with_email: str
    access_level: Optional[str] = "view"


class ShareResponse(BaseModel):
    id: str
    project_id: str
    project_name: str
    shared_by: str
    shared_by_name: str
    shared_with_email: str
    access_level: str
    share_token: Optional[str]
    created_at: str


class ShareListResponse(BaseModel):
    shares: List[ShareResponse]


@router.get("", response_model=ShareListResponse)
def list_shared_designs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Designs shared WITH this user
    received = db.query(SharedDesign).filter(
        SharedDesign.shared_with_email == current_user.email
    ).all()

    # Designs shared BY this user
    sent = db.query(SharedDesign).filter(
        SharedDesign.shared_by == current_user.id
    ).all()

    all_shares = received + sent
    results = []
    for s in all_shares:
        project = db.query(Project).filter(Project.id == s.project_id).first()
        sharer = db.query(User).filter(User.id == s.shared_by).first()
        results.append(ShareResponse(
            id=s.id,
            project_id=s.project_id,
            project_name=project.name if project else "Deleted",
            shared_by=s.shared_by,
            shared_by_name=sharer.name if sharer else "Unknown",
            shared_with_email=s.shared_with_email,
            access_level=s.access_level,
            share_token=s.share_token,
            created_at=s.created_at.isoformat() if s.created_at else "",
        ))

    return ShareListResponse(shares=results)


@router.post("", response_model=ShareResponse)
def share_design(
    req: ShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(
        Project.id == req.project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    share = SharedDesign(
        id=generate_id(),
        project_id=req.project_id,
        shared_by=current_user.id,
        shared_with_email=req.shared_with_email,
        access_level=req.access_level,
        share_token=generate_token(),
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    return ShareResponse(
        id=share.id,
        project_id=share.project_id,
        project_name=project.name,
        shared_by=share.shared_by,
        shared_by_name=current_user.name,
        shared_with_email=share.shared_with_email,
        access_level=share.access_level,
        share_token=share.share_token,
        created_at=share.created_at.isoformat() if share.created_at else "",
    )


@router.get("/by-token/{token}")
def get_shared_by_token(token: str, db: Session = Depends(get_db)):
    share = db.query(SharedDesign).filter(SharedDesign.share_token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    project = db.query(Project).filter(Project.id == share.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "project_id": project.id,
        "project_name": project.name,
        "project_data": project.data,
        "access_level": share.access_level,
    }


@router.delete("/{share_id}")
def delete_share(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    share = db.query(SharedDesign).filter(SharedDesign.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.shared_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(share)
    db.commit()
    return {"message": "Share removed"}
