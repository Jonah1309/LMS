from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, func
from app.db.base import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrolled_at = Column(DateTime, server_default=func.now())
    completion_status = Column(Enum("in_progress", "completed", name="completion_status"), default="in_progress")
    completed_at = Column(DateTime, nullable=True)
