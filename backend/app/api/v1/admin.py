from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.core.security import hash_password
from app.models.course import Course
from app.models.user import User
from app.schemas.admin import AdminCreateUser, AdminUserOut

router = APIRouter()


@router.get("/users", response_model=list[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return db.query(User).all()


@router.post("/users", response_model=AdminUserOut, status_code=201)
def create_user(
    body: AdminCreateUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        name=body.name,
        role=body.role,
        password_hash=hash_password(body.password),
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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


@router.put("/users/{user_id}/verify", response_model=AdminUserOut)
def verify_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/deactivate", response_model=AdminUserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/reactivate", response_model=AdminUserOut)
def reactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """DESTRUCTIVE — permanently deletes the user row and all associated data.

    Dev convenience only. In production prefer PUT /users/{id}/deactivate (soft-delete)
    to preserve enrollment history, course progress, and audit trails.
    Deleted rows CANNOT be recovered.
    """
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


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
