from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.course import Course
from app.models.user import User

router = APIRouter()


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return db.query(User).all()


@router.put("/users/{user_id}/role")
def update_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if role not in ("student", "instructor", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"id": user.id, "role": user.role}


@router.get("/courses")
def list_all_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return db.query(Course).all()


@router.put("/courses/{course_id}/status")
def set_course_status(
    course_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course.status = status
    db.commit()
    return {"id": course.id, "status": course.status}
