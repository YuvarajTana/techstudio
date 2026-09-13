from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, Notification, User
from auth import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationCreateRequest(BaseModel):
    title: str
    message: str
    type: Optional[str] = "info"  # info, success, warning, error
    action_url: Optional[str] = None


@router.get("")
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch all notifications for the current user."""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "action_url": n.action_url,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "unread_count": unread_count,
    }


@router.post("")
def create_notification(req: NotificationCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new notification for current user."""
    n = Notification(
        id=f"notif_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        title=req.title,
        message=req.message,
        type=req.type or "info",
        action_url=req.action_url,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return {"success": True, "id": n.id}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark a specific notification as read."""
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")

    n.is_read = True
    db.commit()
    return {"success": True}


@router.post("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.delete("/{notification_id}")
def delete_notification(notification_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a notification."""
    n = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if n:
        db.delete(n)
        db.commit()
    return {"success": True}
