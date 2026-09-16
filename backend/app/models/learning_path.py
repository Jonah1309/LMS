from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from app.db.base import Base


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    price_usd = Column(Float, default=0.0)
    price_inr = Column(Float, default=0.0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LearningPathCourse(Base):
    __tablename__ = "learning_path_courses"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    order_index = Column(Integer, default=0)
