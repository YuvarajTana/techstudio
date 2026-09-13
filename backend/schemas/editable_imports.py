from typing import Any, Literal

from pydantic import BaseModel, Field


class PosterAnalysisRequest(BaseModel):
    asset_id: str = Field(min_length=3, max_length=80)
    mode: Literal["quick", "full"] = "quick"
    language: str = Field(default="auto", max_length=40)


class PosterAnalysisJobResponse(BaseModel):
    job_id: str
    status: str
    stage: str
    progress: int
    error: str | None = None
    result: dict[str, Any] | None = None


class PosterAnalysisFinalizeRequest(BaseModel):
    job_id: str = Field(min_length=3, max_length=80)
    text_blocks: list[dict[str, Any]]


class PosterAnalysisRetryRequest(BaseModel):
    job_id: str = Field(min_length=3, max_length=80)


class PosterRegionConvertRequest(BaseModel):
    job_id: str = Field(min_length=3, max_length=80)
    block_id: str = Field(min_length=1, max_length=240)
