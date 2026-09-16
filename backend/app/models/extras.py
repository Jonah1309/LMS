from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    body = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    enrollment_id = Column(Integer, ForeignKey("enrollments.id"), nullable=False)
    certificate_uuid = Column(String, unique=True, nullable=False)
    s3_key = Column(String, nullable=True)
    issued_at = Column(DateTime, server_default=func.now())
