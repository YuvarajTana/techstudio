from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, FeatureFlag, User
from auth import get_current_user

router = APIRouter(prefix="/api/feature-flags", tags=["feature_flags"])

DEFAULT_FEATURE_FLAGS = [
    {"key": "ai_remix_v2", "name": "AI Remix Engine v2", "description": "Enhanced AI remixing capability", "is_enabled": True},
    {"key": "qr_generator", "name": "Vector QR Code Generator", "description": "Generate QR codes for canvas", "is_enabled": True},
    {"key": "chart_builder", "name": "Infographic & Chart Builder", "description": "Bar, Line, Pie SVG charts", "is_enabled": True},
    {"key": "content_calendar", "name": "Social Media Content Planner", "description": "Schedule poster releases", "is_enabled": True},
    {"key": "design_quality_checker", "name": "Design Quality & Accessibility Audit", "description": "WCAG contrast & quality score", "is_enabled": True},
    {"key": "notification_center", "name": "Notification System", "description": "Activity & alert notifications", "is_enabled": True},
]


@router.get("")
def get_feature_flags(db: Session = Depends(get_db)):
    """Fetch active feature flags."""
    flags = db.query(FeatureFlag).all()
    if not flags:
        # Seed default feature flags if none exist
        for item in DEFAULT_FEATURE_FLAGS:
            f = FeatureFlag(
                id=f"flag_{item['key']}",
                name=item["name"],
                key=item["key"],
                description=item["description"],
                is_enabled=item["is_enabled"],
            )
            db.add(f)
        db.commit()
        flags = db.query(FeatureFlag).all()

    return {
        "flags": {f.key: f.is_enabled for f in flags},
        "details": [
            {
                "key": f.key,
                "name": f.name,
                "description": f.description,
                "is_enabled": f.is_enabled,
            }
            for f in flags
        ]
    }
