from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, get_optional_user, require_role
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.module import Module, VideoContent, TextContent, Quiz
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, ModuleCreate, ModuleUpdate

import json
import re
from datetime import datetime, timedelta

router = APIRouter()


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


@router.get("")
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.status == "published").all()


@router.get("/mine")
def list_my_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    return db.query(Course).filter(Course.instructor_id == current_user.id).order_by(Course.id.desc()).all()


@router.post("", status_code=201)
def create_course(
    body: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    slug = slugify(body.title)
    base_slug = slug
    counter = 1
    while db.query(Course).filter(Course.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    course = Course(**body.model_dump(), slug=slug, instructor_id=current_user.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_id}")
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    if course_id.isdigit():
        course = db.query(Course).filter(Course.id == int(course_id)).first()
    else:
        course = db.query(Course).filter(Course.slug == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    modules = db.query(Module).filter(Module.course_id == course.id).order_by(Module.order_index).all()
    enrolled_at = None
    if current_user:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course.id,
        ).first()
        if enrollment:
            enrolled_at = enrollment.enrolled_at
    now = datetime.utcnow()
    annotated = []
    for m in modules:
        d = {**m.__dict__}
        if m.unlock_after_days is not None and enrolled_at is not None:
            unlock_date = enrolled_at + timedelta(days=m.unlock_after_days)
            d["is_drip_locked"] = now < unlock_date
            d["available_in_days"] = max(0, (unlock_date - now).days) if now < unlock_date else 0
        else:
            d["is_drip_locked"] = False
            d["available_in_days"] = 0
        annotated.append(d)
    return {**course.__dict__, "modules": annotated}


@router.put("/{course_id}")
def update_course(
    course_id: int,
    body: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Not found")
    if course.instructor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Not found")
    if course.instructor_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(course)
    db.commit()


@router.post("/{course_id}/publish")
def publish_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Not found")
    course.status = "published"
    db.commit()
    return {"status": "published"}


@router.post("/{course_id}/modules", status_code=201)
def create_module(
    course_id: int,
    body: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    module = Module(**body.model_dump(), course_id=course_id)
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.get("/{course_id}/modules")
def list_modules(
    course_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.order_index).all()
    enrolled_at = None
    if current_user:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        ).first()
        if enrollment:
            enrolled_at = enrollment.enrolled_at
    now = datetime.utcnow()
    result = []
    for m in modules:
        d = {**m.__dict__}
        if m.unlock_after_days is not None and enrolled_at is not None:
            unlock_date = enrolled_at + timedelta(days=m.unlock_after_days)
            d["is_drip_locked"] = now < unlock_date
            d["available_in_days"] = max(0, (unlock_date - now).days) if now < unlock_date else 0
        else:
            d["is_drip_locked"] = False
            d["available_in_days"] = 0
        result.append(d)
    return result


@router.put("/{course_id}/reorder-modules")
def reorder_modules(
    course_id: int,
    body: list[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    """body: [{"id": 1, "order_index": 0}, {"id": 2, "order_index": 1}, ...]"""
    for item in body:
        db.query(Module).filter(Module.id == item["id"], Module.course_id == course_id).update(
            {"order_index": item["order_index"]}
        )
    db.commit()
    return {"status": "ok"}


@router.put("/{course_id}/modules/{module_id:int}")
def update_module(
    course_id: int,
    module_id: int,
    body: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(module, k, v)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/{course_id}/modules/{module_id:int}", status_code=204)
def delete_module(
    course_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()


def _check_content_access(course_id: int, module_id: int, db: Session, current_user):
    module = db.query(Module).filter(Module.id == module_id, Module.course_id == course_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    if module.is_preview_free:
        return module
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    if current_user.role in ("admin", "instructor"):
        course = db.query(Course).filter(Course.id == course_id).first()
        if current_user.role == "admin" or (course and course.instructor_id == current_user.id):
            return module
    enrolled = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Enrollment required")
    if module.unlock_after_days is not None:
        unlock_date = enrolled.enrolled_at + timedelta(days=module.unlock_after_days)
        if datetime.utcnow() < unlock_date:
            raise HTTPException(status_code=403, detail="Content not yet available")
    return module


@router.get("/{course_id}/modules/{module_id:int}/content")
def get_module_content(
    course_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    _check_content_access(course_id, module_id, db, current_user)
    content = db.query(TextContent).filter(TextContent.module_id == module_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"rich_text_html": content.rich_text_html or ""}


@router.get("/{course_id}/modules/{module_id:int}/quiz")
def get_module_quiz(
    course_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    _check_content_access(course_id, module_id, db, current_user)
    quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    questions = []
    if quiz.questions:
        try:
            questions = json.loads(quiz.questions)
        except Exception:
            questions = []
    # Strip correct_index — grading happens server-side via the submit endpoint
    safe_questions = [{"question": q.get("question"), "options": q.get("options", [])} for q in questions]
    return {
        "id": quiz.id,
        "title": quiz.title,
        "max_attempts": quiz.max_attempts or 3,
        "show_answers_after": quiz.show_answers_after,
        "passing_score_pct": quiz.passing_score_pct or 70,
        "questions": safe_questions,
    }
