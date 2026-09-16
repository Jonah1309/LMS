from pydantic import BaseModel
from typing import Optional


class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price_usd: float = 0.0
    price_inr: float = 0.0
    thumbnail_url: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_usd: Optional[float] = None
    price_inr: Optional[float] = None
    thumbnail_url: Optional[str] = None


class CourseOut(BaseModel):
    id: int
    slug: str
    title: str
    description: Optional[str]
    price_usd: float
    price_inr: float
    status: str
    thumbnail_url: Optional[str]
    avg_rating: float
    review_count: int

    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    title: str
    order_index: int = 0
    module_type: str  # video | text | quiz
    is_preview_free: bool = False
    unlock_after_days: Optional[int] = None


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    is_preview_free: Optional[bool] = None
    unlock_after_days: Optional[int] = None
