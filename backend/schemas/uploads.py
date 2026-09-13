from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class UploadedImageResponse(BaseModel):
    id: str
    projectId: Optional[str] = None
    filename: str
    mimeType: str
    fileSize: int
    width: int
    height: int
    url: str
    thumbnailUrl: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    assetRole: str = "upload"
    createdAt: datetime
    updatedAt: datetime


class UploadedImageListResponse(BaseModel):
    items: list[UploadedImageResponse]
    total: int
    limit: int
    offset: int


class UploadedImageRenameRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
