from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, func
from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    price_usd = Column(Float, default=0.0)
    price_inr = Column(Float, default=0.0)
    status = Column(Enum("draft", "published", name="course_status"), default="draft")
    thumbnail_url = Column(String, nullable=True)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
