from sqlalchemy import Column, DateTime, ForeignKey, Integer, func
from app.db.base import Base


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    quiz_score = Column(Integer, nullable=True)
    quiz_attempts = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, default=0)
    last_position_seconds = Column(Integer, default=0)
