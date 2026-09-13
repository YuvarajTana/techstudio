from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, ContentCalendarEvent, Project, User
from auth import get_current_user
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/content-calendar", tags=["content_calendar"])


class EventCreateRequest(BaseModel):
    title: Optional[str] = "Untitled Post"
    platform: Optional[str] = "instagram"
    scheduled_at: Optional[str] = None
    scheduledAt: Optional[str] = None
    project_id: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_calendar_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List scheduled marketing content calendar events."""
    events = db.query(ContentCalendarEvent).filter(
        ContentCalendarEvent.user_id == current_user.id
    ).order_by(ContentCalendarEvent.scheduled_at.asc()).all()

    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "platform": e.platform,
                "scheduled_at": e.scheduled_at.isoformat() if e.scheduled_at else None,
                "project_id": e.project_id,
                "status": e.status,
                "notes": e.notes,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]
    }


@router.post("")
def create_calendar_event(req: EventCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new content calendar event."""
    raw_date = req.scheduled_at or req.scheduledAt
    if not raw_date:
        dt = datetime.now(timezone.utc)
    else:
        try:
            dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        except Exception:
            dt = datetime.now(timezone.utc)

    title = (req.title or "Untitled Post").strip()
    platform = (req.platform or "instagram").lower().strip()

    event = ContentCalendarEvent(
        id=f"event_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        project_id=req.project_id,
        title=title,
        platform=platform,
        scheduled_at=dt,
        notes=req.notes,
        status="scheduled",
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    return {"success": True, "event_id": event.id}


@router.delete("/{event_id}")
def delete_calendar_event(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a scheduled event."""
    e = db.query(ContentCalendarEvent).filter(
        ContentCalendarEvent.id == event_id,
        ContentCalendarEvent.user_id == current_user.id
    ).first()
    if e:
        db.delete(e)
        db.commit()
    return {"success": True}
