from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class TemplateCategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    color: Optional[str] = None
    group_name: Optional[str] = None
    sort_order: int = 0


class TemplateSubcategoryResponse(BaseModel):
    id: str
    category_id: str
    name: str
    slug: str
    sort_order: int = 0


class TemplateCategoryWithSubcategoriesResponse(TemplateCategoryResponse):
    subcategories: list[TemplateSubcategoryResponse] = Field(default_factory=list)


class TemplateCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    subcategory_id: Optional[str] = None
    subcategory_slug: Optional[str] = None
    template_type: Optional[str] = None
    data: Optional[str] = None
    thumbnail: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    width: int = 800
    height: int = 800
    tags: list[str] = Field(default_factory=list)
    is_premium: bool = False
    is_featured: bool = False
    sort_weight: int = 0
    status: str = "published"
    metadata: Optional[dict[str, Any]] = None


class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    subcategory_id: Optional[str] = None
    subcategory_slug: Optional[str] = None
    template_type: Optional[str] = None
    data: Optional[str] = None
    thumbnail: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: Optional[list[str]] = None
    is_premium: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_weight: Optional[int] = None
    status: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    category: Optional[TemplateCategoryResponse] = None
    subcategory_id: Optional[str] = None
    subcategory: Optional[TemplateSubcategoryResponse] = None
    template_type: Optional[str] = None
    data: Optional[str] = None
    thumbnail: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    width: int
    height: int
    tags: list[str] = Field(default_factory=list)
    is_premium: bool
    is_featured: bool = False
    is_favourite: bool = False
    sort_weight: int = 0
    status: str = "published"
    use_count: int
    metadata: Optional[dict[str, Any]] = None
    created_at: str
    updated_at: str


class TemplateListResponse(BaseModel):
    items: list[TemplateResponse] = Field(default_factory=list)
    templates: list[TemplateResponse] = Field(default_factory=list)
    total: int
    page: int
    page_size: int
    per_page: int
    total_pages: int = 0
    has_more: bool


class TemplateCategoriesResponse(BaseModel):
    categories: list[TemplateCategoryWithSubcategoriesResponse]


class TemplateFavouriteResponse(BaseModel):
    id: str
    template_id: str
    created_at: str


class TemplateFavouriteToggleResponse(BaseModel):
    template_id: str
    is_favourite: bool
    message: str


class ProjectFromTemplateResponse(BaseModel):
    id: str
    name: str
    data: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    background_color: Optional[str] = None
    design_type: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    createdAt: str
    updatedAt: str


class TemplateTransformSummary(BaseModel):
    source: str
    changes: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class TemplateRemixRequest(BaseModel):
    prompt: str
    project_name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class TemplateQuickReplaceRequest(BaseModel):
    project_name: Optional[str] = None
    image_prompt: Optional[str] = None
    palette: list[str] = Field(default_factory=list)
    heading_font: Optional[str] = None
    body_font: Optional[str] = None
    text_replacements: dict[str, str] = Field(default_factory=dict)
    replace_images: bool = False
    apply_palette: bool = True
    apply_fonts: bool = True
    replace_text: bool = True
    width: Optional[int] = None
    height: Optional[int] = None


class TemplateUseRequest(BaseModel):
    project_name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class TemplateUseResponse(BaseModel):
    template: TemplateResponse
    project: ProjectFromTemplateResponse
    usage_id: str
    transform: Optional[TemplateTransformSummary] = None
