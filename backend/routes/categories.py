from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, Category

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str]
    color: Optional[str]
    group_name: Optional[str]
    sort_order: int


class CategoryListResponse(BaseModel):
    categories: List[CategoryResponse]


@router.get("", response_model=CategoryListResponse)
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).order_by(Category.sort_order).all()
    return CategoryListResponse(
        categories=[
            CategoryResponse(
                id=c.id, name=c.name, slug=c.slug,
                icon=c.icon, color=c.color,
                group_name=c.group_name, sort_order=c.sort_order,
            )
            for c in categories
        ]
    )


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: str, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategoryResponse(
        id=cat.id, name=cat.name, slug=cat.slug,
        icon=cat.icon, color=cat.color,
        group_name=cat.group_name, sort_order=cat.sort_order,
    )
