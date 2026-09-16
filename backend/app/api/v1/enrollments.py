import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.module import Module, Quiz
from app.models.progress import Progress
from app.models.user import User

router = APIRouter()


# ── enrollment list ─────────────────────────────────────────────────────────

@router.get("/me")
def my_enrollments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.id).all()
    result = []
    for e in enrollments:
        course = db.query(Course).filter(Course.id == e.course_id).first()
        total_modules = db.query(func.count(Module.id)).filter(Module.course_id == e.course_id).scalar() or 0
        completed_modules = db.query(func.count(Progress.id)).filter(
            Progress.enrollment_id == e.id, Progress.completed_at.isnot(None)
        ).scalar() or 0
        result.append({
            "enrollment_id": e.id,
            "course_id": e.course_id,
            "course_title": course.title if course else "",
            "course_slug": course.slug if course else "",
            "course_thumbnail": course.thumbnail_url if course else None,
            "enrolled_at": e.enrolled_at,
            "completion_status": e.completion_status,
            "total_modules": total_modules,
            "completed_modules": completed_modules,
            "progress_pct": round(completed_modules / total_modules * 100) if total_modules else 0,
        })
    return result


# ── enroll ───────────────────────────────────────────────────────────────────

@router.post("/{course_id}/enroll", status_code=201)
def enroll(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled")
    enrollment = Enrollment(user_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    course = db.query(Course).filter(Course.id == course_id).first()
    if course:
        from app.services.email_service import (
            send_enrollment_confirmation_email,
            send_instructor_enrollment_notification,
        )
        send_enrollment_confirmation_email(current_user.email, current_user.name, course.title, course_id)
        instructor = db.query(User).filter(User.id == course.instructor_id).first()
        if instructor:
            send_instructor_enrollment_notification(
                instructor.email, instructor.name, current_user.name, course.title, course_id
            )
        from app.api.v1.notifications import push_notification
        push_notification(db, current_user.id, f"You enrolled in \"{course.title}\"", "enrollment")
        if instructor:
            push_notification(db, instructor.id, f"{current_user.name} enrolled in \"{course.title}\"", "enrollment")

    return enrollment


# ── mark module complete ─────────────────────────────────────────────────────

@router.post("/{course_id}/progress")
def save_progress(
    course_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module_id = body.get("module_id")
    if not module_id:
        raise HTTPException(status_code=400, detail="module_id required")

    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled")

    progress = db.query(Progress).filter(
        Progress.enrollment_id == enrollment.id, Progress.module_id == module_id
    ).first()
    if not progress:
        progress = Progress(enrollment_id=enrollment.id, module_id=module_id)
        db.add(progress)

    progress.completed_at = datetime.utcnow()
    db.commit()

    _check_course_completion(db, enrollment, course_id, current_user)

    total = db.query(func.count(Module.id)).filter(Module.course_id == course_id).scalar() or 0
    done = db.query(func.count(Progress.id)).filter(
        Progress.enrollment_id == enrollment.id, Progress.completed_at.isnot(None)
    ).scalar() or 0
    return {"status": "saved", "completed_modules": done, "total_modules": total}


# ── quiz submit ──────────────────────────────────────────────────────────────

class QuizSubmitBody(BaseModel):
    answers: list[int]


@router.post("/{course_id}/quiz/{module_id}/submit")
def submit_quiz(
    course_id: int,
    module_id: int,
    body: QuizSubmitBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled")

    quiz = db.query(Quiz).filter(Quiz.module_id == module_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = json.loads(quiz.questions) if quiz.questions else []
    max_attempts = quiz.max_attempts or 3
    passing_pct = quiz.passing_score_pct or 70

    progress = db.query(Progress).filter(
        Progress.enrollment_id == enrollment.id, Progress.module_id == module_id
    ).first()
    if not progress:
        progress = Progress(enrollment_id=enrollment.id, module_id=module_id, quiz_attempts=0)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    attempts_used = progress.quiz_attempts or 0
    if attempts_used >= max_attempts:
        raise HTTPException(status_code=429, detail="Maximum attempts reached")

    # Grade
    correct = sum(
        1 for i, q in enumerate(questions)
        if i < len(body.answers) and body.answers[i] == q.get("correct_index")
    )
    total_q = len(questions)
    score_pct = round(correct / total_q * 100) if total_q else 0
    passed = score_pct >= passing_pct

    progress.quiz_attempts = attempts_used + 1
    progress.quiz_score = score_pct
    if passed and not progress.completed_at:
        progress.completed_at = datetime.utcnow()
    db.commit()

    if passed:
        _check_course_completion(db, enrollment, course_id, current_user)

    result = {
        "score": correct,
        "total": total_q,
        "score_pct": score_pct,
        "passed": passed,
        "passing_pct": passing_pct,
        "attempts_used": progress.quiz_attempts,
        "attempts_remaining": max(0, max_attempts - progress.quiz_attempts),
    }
    if quiz.show_answers_after:
        result["correct_answers"] = [q.get("correct_index") for q in questions]
    return result


# ── video position ───────────────────────────────────────────────────────────

class PositionBody(BaseModel):
    module_id: int
    position_seconds: int


@router.post("/{course_id}/position")
def save_position(
    course_id: int,
    body: PositionBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled")

    progress = db.query(Progress).filter(
        Progress.enrollment_id == enrollment.id, Progress.module_id == body.module_id
    ).first()
    if not progress:
        progress = Progress(enrollment_id=enrollment.id, module_id=body.module_id)
        db.add(progress)

    progress.last_position_seconds = body.position_seconds
    db.commit()
    return {"ok": True}


@router.get("/{course_id}/position/{module_id}")
def get_position(
    course_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == course_id
    ).first()
    if not enrollment:
        return {"position_seconds": 0}

    progress = db.query(Progress).filter(
        Progress.enrollment_id == enrollment.id, Progress.module_id == module_id
    ).first()
    return {"position_seconds": progress.last_position_seconds if progress else 0}


# ── helpers ──────────────────────────────────────────────────────────────────

def _check_course_completion(db: Session, enrollment: Enrollment, course_id: int, user: User) -> None:
    if enrollment.completion_status == "completed":
        return
    total = db.query(func.count(Module.id)).filter(Module.course_id == course_id).scalar() or 0
    done = db.query(func.count(Progress.id)).filter(
        Progress.enrollment_id == enrollment.id, Progress.completed_at.isnot(None)
    ).scalar() or 0
    if total and done >= total:
        enrollment.completion_status = "completed"
        enrollment.completed_at = datetime.utcnow()
        db.commit()
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            from app.services.email_service import send_course_completion_email
            send_course_completion_email(user.email, user.name, course.title)
            instructor = db.query(User).filter(User.id == course.instructor_id).first()
            instructor_name = instructor.name if instructor else "Instructor"
            from app.services.certificate_service import issue_certificate
            issue_certificate(db, enrollment, user, course, instructor_name)
            from app.api.v1.notifications import push_notification
            push_notification(db, user.id, f"Congratulations! You completed \"{course.title}\"", "completion")
