from app.db.base import Base  # noqa: F401 — imports Base for Alembic to discover all models
from app.models.user import User  # noqa: F401
from app.models.course import Course  # noqa: F401
from app.models.module import Module, VideoContent, TextContent, Quiz  # noqa: F401
from app.models.enrollment import Enrollment  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.progress import Progress  # noqa: F401
from app.models.coupon import Coupon  # noqa
from app.models.note import Note  # noqa
from app.models.question import Question, Answer  # noqa
from app.models.extras import Notification, Review, Certificate  # noqa: F401
