from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.question import Answer, Question
from app.models.user import User

router = APIRouter()


class QuestionCreate(BaseModel):
    title: str
    body: Optional[str] = None
    module_id: Optional[int] = None


class AnswerCreate(BaseModel):
    body: str


def _require_enrolled_or_instructor(db: Session, user: User, course: Course) -> None:
    if user.role in ("instructor", "admin"):
        return
    enrolled = db.query(Enrollment).filter(
        Enrollment.user_id == user.id, Enrollment.course_id == course.id
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")


def _notify_instructor(db: Session, course_id: int, asker_name: str, question_title: str) -> None:
    try:
        from app.services.email_service import send_new_question_notification
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return
        instructor = db.query(User).filter(User.id == course.instructor_id).first()
        if instructor:
            send_new_question_notification(
                instructor.email, instructor.name, asker_name, course.title, question_title
            )
    except Exception:
        pass


def _serialize_question(q: Question, db: Session) -> dict:
    asker = db.query(User).filter(User.id == q.user_id).first()
    answer_count = db.query(Answer).filter(Answer.question_id == q.id).count()
    return {
        "id": q.id,
        "title": q.title,
        "body": q.body,
        "module_id": q.module_id,
        "is_answered": q.is_answered,
        "created_at": q.created_at,
        "user_id": q.user_id,
        "user_name": asker.name if asker else "Unknown",
        "answer_count": answer_count,
    }


def _serialize_answer(a: Answer, db: Session) -> dict:
    responder = db.query(User).filter(User.id == a.user_id).first()
    return {
        "id": a.id,
        "body": a.body,
        "is_accepted": a.is_accepted,
        "created_at": a.created_at,
        "user_id": a.user_id,
        "user_name": responder.name if responder else "Unknown",
    }


@router.get("/courses/{course_id}/questions")
def list_questions(
    course_id: int,
    module_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    query = db.query(Question).filter(Question.course_id == course_id)
    if module_id is not None:
        query = query.filter(Question.module_id == module_id)
    questions = query.order_by(Question.created_at.desc()).all()
    return [_serialize_question(q, db) for q in questions]


@router.post("/courses/{course_id}/questions")
def create_question(
    course_id: int,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    _require_enrolled_or_instructor(db, current_user, course)
    q = Question(
        course_id=course_id,
        module_id=body.module_id,
        user_id=current_user.id,
        title=body.title,
        body=body.body,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    _notify_instructor(db, course_id, current_user.name or current_user.email, body.title)
    return _serialize_question(q, db)


@router.get("/questions/{question_id}")
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    answers = (
        db.query(Answer)
        .filter(Answer.question_id == q.id)
        .order_by(Answer.is_accepted.desc(), Answer.created_at)
        .all()
    )
    result = _serialize_question(q, db)
    result["answers"] = [_serialize_answer(a, db) for a in answers]
    return result


@router.post("/questions/{question_id}/answers")
def post_answer(
    question_id: int,
    body: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    a = Answer(question_id=question_id, user_id=current_user.id, body=body.body)
    db.add(a)
    db.commit()
    db.refresh(a)
    return _serialize_answer(a, db)


@router.put("/answers/{answer_id}/accept")
def accept_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Answer).filter(Answer.id == answer_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Answer not found")
    q = db.query(Question).filter(Question.id == a.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    course = db.query(Course).filter(Course.id == q.course_id).first()
    is_question_author = q.user_id == current_user.id
    is_admin = current_user.role == "admin"
    is_course_instructor = course and course.instructor_id == current_user.id
    if not (is_question_author or is_admin or is_course_instructor):
        raise HTTPException(status_code=403, detail="Not authorized to accept answers")
    db.query(Answer).filter(Answer.question_id == q.id).update({"is_accepted": False})
    a.is_accepted = True
    q.is_answered = True
    db.commit()
    return {"ok": True}


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    course = db.query(Course).filter(Course.id == q.course_id).first()
    is_author = q.user_id == current_user.id
    is_admin = current_user.role == "admin"
    is_course_instructor = course and course.instructor_id == current_user.id
    if not (is_author or is_admin or is_course_instructor):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.query(Answer).filter(Answer.question_id == q.id).delete()
    db.delete(q)
    db.commit()
    return {"ok": True}


@router.delete("/answers/{answer_id}")
def delete_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Answer).filter(Answer.id == answer_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Answer not found")
    q = db.query(Question).filter(Question.id == a.question_id).first()
    course = db.query(Course).filter(Course.id == q.course_id).first() if q else None
    is_author = a.user_id == current_user.id
    is_admin = current_user.role == "admin"
    is_course_instructor = course and course.instructor_id == current_user.id
    if not (is_author or is_admin or is_course_instructor):
        raise HTTPException(status_code=403, detail="Not authorized")
    if a.is_accepted and q:
        q.is_answered = False
    db.delete(a)
    db.commit()
    return {"ok": True}
