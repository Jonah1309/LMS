from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String

from app.db.base import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    discount_type = Column(String, nullable=False)  # "percent" or "fixed"
    discount_value = Column(Float, nullable=False)
    max_uses = Column(Integer, nullable=True)
    uses_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
