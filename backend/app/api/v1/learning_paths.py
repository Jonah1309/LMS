from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import re

from app.core.dependencies import get_current_user, get_db, get_optional_user, require_role
from app.models.learning_path import LearningPath, LearningPathCourse
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.user import User

router = APIRouter()


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


class LearningPathCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price_usd: float = 0.0
    price_inr: float = 0.0


class LearningPathUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_usd: Optional[float] = None
    price_inr: Optional[float] = None


class PathCourseAdd(BaseModel):
    course_id: int
    order_index: int = 0


@router.get("")
def list_paths(db: Session = Depends(get_db)):
    paths = db.query(LearningPath).all()
    result = []
    for path in paths:
        entries = (
            db.query(LearningPathCourse)
            .filter(LearningPathCourse.path_id == path.id)
            .order_by(LearningPathCourse.order_index)
            .all()
        )
        course_ids = [e.course_id for e in entries]
        courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
        courses_by_id = {c.id: c for c in courses}
        result.append({
            **path.__dict__,
            "course_count": len(entries),
            "courses": [
                {**courses_by_id[e.course_id].__dict__, "order_index": e.order_index}
                for e in entries
                if e.course_id in courses_by_id
            ],
        })
    return result


@router.get("/{slug}")
def get_path(
    slug: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    if slug.isdigit():
        path = db.query(LearningPath).filter(LearningPath.id == int(slug)).first()
    else:
        path = db.query(LearningPath).filter(LearningPath.slug == slug).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    entries = (
        db.query(LearningPathCourse)
        .filter(LearningPathCourse.path_id == path.id)
        .order_by(LearningPathCourse.order_index)
        .all()
    )
    course_ids = [e.course_id for e in entries]
    courses = db.query(Course).filter(Course.id.in_(course_ids)).all() if course_ids else []
    courses_by_id = {c.id: c for c in courses}

    enrolled_course_ids: set[int] = set()
    if current_user:
        enrollments = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id.in_(course_ids),
        ).all()
        enrolled_course_ids = {e.course_id for e in enrollments}

    annotated_courses = []
    total_modules = 0
    completed_modules = 0
    for e in entries:
        course = courses_by_id.get(e.course_id)
        if not course:
            continue
        is_enrolled = e.course_id in enrolled_course_ids
        course_progress = None
        if is_enrolled and current_user:
            enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == e.course_id,
            ).first()
            if enrollment:
                prog_rows = db.query(Progress).filter(
                    Progress.enrollment_id == enrollment.id,
                    Progress.completed_at.isnot(None),
                ).count()
                course_progress = prog_rows
                completed_modules += prog_rows
        annotated_courses.append({
            **course.__dict__,
            "order_index": e.order_index,
            "is_enrolled": is_enrolled,
            "completed_modules": course_progress,
        })

    return {
        **path.__dict__,
        "courses": annotated_courses,
        "is_fully_enrolled": len(course_ids) > 0 and enrolled_course_ids >= set(course_ids),
    }


@router.post("", status_code=201)
def create_path(
    body: LearningPathCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    slug = slugify(body.title)
    base_slug = slug
    counter = 1
    while db.query(LearningPath).filter(LearningPath.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    path = LearningPath(**body.model_dump(), slug=slug, created_by=current_user.id)
    db.add(path)
    db.commit()
    db.refresh(path)
    return path


@router.put("/{path_id}")
def update_path(
    path_id: int,
    body: LearningPathUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Not found")
    if path.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(path, k, v)
    db.commit()
    db.refresh(path)
    return path


@router.delete("/{path_id}", status_code=204)
def delete_path(
    path_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Not found")
    if path.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db.query(LearningPathCourse).filter(LearningPathCourse.path_id == path_id).delete()
    db.delete(path)
    db.commit()


@router.post("/{path_id}/courses", status_code=201)
def add_course_to_path(
    path_id: int,
    body: PathCourseAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    if path.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    existing = db.query(LearningPathCourse).filter(
        LearningPathCourse.path_id == path_id,
        LearningPathCourse.course_id == body.course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course already in path")
    entry = LearningPathCourse(path_id=path_id, course_id=body.course_id, order_index=body.order_index)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{path_id}/courses/{course_id}", status_code=204)
def remove_course_from_path(
    path_id: int,
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")
    if path.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    entry = db.query(LearningPathCourse).filter(
        LearningPathCourse.path_id == path_id,
        LearningPathCourse.course_id == course_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()


@router.post("/{path_id}/enroll", status_code=201)
def enroll_in_bundle(
    path_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = db.query(LearningPath).filter(LearningPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    entries = db.query(LearningPathCourse).filter(LearningPathCourse.path_id == path_id).all()
    if not entries:
        raise HTTPException(status_code=400, detail="Path has no courses")

    created = []
    for entry in entries:
        existing = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == entry.course_id,
        ).first()
        if not existing:
            enrollment = Enrollment(user_id=current_user.id, course_id=entry.course_id)
            db.add(enrollment)
            created.append(entry.course_id)

    db.commit()
    return {"enrolled_course_ids": created, "already_enrolled": len(entries) - len(created)}
