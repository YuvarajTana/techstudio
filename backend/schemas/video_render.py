from typing import Literal, Optional

from pydantic import BaseModel


VideoRenderStatusValue = Literal["queued", "processing", "completed", "failed", "cancelled"]


class VideoRenderCreated(BaseModel):
    job_id: str
    status: Literal["queued"]


class VideoRenderStatusResponse(BaseModel):
    job_id: str
    status: VideoRenderStatusValue
    progress: int
    stage: str
    error: Optional[str] = None
    file_name: Optional[str] = None
    download_url: Optional[str] = None
    duration_ms: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[int] = None
    total_frames: Optional[int] = None
    rendered_frames: Optional[int] = None
