from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from app.db.base import Base


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, default=0)
    module_type = Column(Enum("video", "text", "quiz", name="module_type"), nullable=False)
    is_preview_free = Column(Boolean, default=False)
    unlock_after_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class VideoContent(Base):
    __tablename__ = "video_content"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    s3_raw_key = Column(String, nullable=True)
    s3_hls_prefix = Column(String, nullable=True)
    cloudfront_domain = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(Enum("processing", "ready", "error", name="video_status"), default="processing")
    vtt_s3_key = Column(String, nullable=True)


class TextContent(Base):
    __tablename__ = "text_content"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    rich_text_html = Column(Text, nullable=True)


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    title = Column(String, nullable=False)
    questions = Column(Text, nullable=True)  # JSON string
    max_attempts = Column(Integer, default=3)
    show_answers_after = Column(Boolean, default=True)
    passing_score_pct = Column(Integer, default=70)
