from datetime import datetime
from pydantic import BaseModel


class AdminUserOut(BaseModel):
    id: int
    email: str
    name: str | None
    role: str  # str not Enum — SQLAlchemy Enum emits "user_role.admin" instead of "admin"
    is_verified: bool
    is_active: bool
    created_at: datetime | None

    model_config = {"from_attributes": True}


class AdminCreateUser(BaseModel):
    email: str
    name: str
    role: str = "student"
    password: str
