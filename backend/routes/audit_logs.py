from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database import get_db, AuditLog, User
from auth import get_current_user
from typing import Optional
import uuid

router = APIRouter(prefix="/api/audit-logs", tags=["audit_logs"])


def log_action(
    db: Session,
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    request: Optional[Request] = None,
    details: Optional[dict] = None
):
    """Helper function to record security audit logs."""
    try:
        ip = request.client.host if request and request.client else None
        agent = request.headers.get("user-agent", "")[:255] if request else None

        log = AuditLog(
            id=f"audit_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip,
            user_agent=agent,
            details_json=details,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Audit log error: {e}")


@router.get("")
def get_user_audit_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch security audit activity log for current user."""
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.created_at.desc()).limit(100).all()

    return {
        "logs": [
            {
                "id": l.id,
                "action": l.action,
                "resource_type": l.resource_type,
                "resource_id": l.resource_id,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "details": l.details_json,
            }
            for l in logs
        ]
    }
