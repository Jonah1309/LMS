from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    role = Column(Enum("student", "instructor", "admin", name="user_role"), default="student", nullable=False)
    oauth_provider = Column(Enum("email", "google", "apple", name="oauth_provider"), default="email")
    oauth_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True, index=True)
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
