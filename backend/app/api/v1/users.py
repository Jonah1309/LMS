from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.progress import Progress
from app.models.note import Note
from app.models.course import Course

router = APIRouter()


@router.delete("/me", status_code=204)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    user.email = f"deleted_{user.id}@deleted.invalid"
    user.name = "[Deleted]"
    user.avatar_url = None
    user.password_hash = None
    user.oauth_id = None
    user.verification_token = None
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()


@router.get("/me/export")
def export_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    enrollments = db.query(Enrollment).filter(Enrollment.user_id == current_user.id).all()
    enrollment_ids = [e.id for e in enrollments]

    payments = db.query(Payment).filter(Payment.user_id == current_user.id).all()

    progress_rows = (
        db.query(Progress).filter(Progress.enrollment_id.in_(enrollment_ids)).all()
        if enrollment_ids else []
    )

    notes = db.query(Note).filter(Note.user_id == current_user.id).all()

    def serialize_dt(val):
        return val.isoformat() if isinstance(val, datetime) else val

    return JSONResponse({
        "profile": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "created_at": serialize_dt(user.created_at),
        },
        "enrollments": [
            {
                "id": e.id,
                "course_id": e.course_id,
                "enrolled_at": serialize_dt(e.enrolled_at),
                "completion_status": e.completion_status,
                "completed_at": serialize_dt(e.completed_at),
            }
            for e in enrollments
        ],
        "payments": [
            {
                "id": p.id,
                "course_id": p.course_id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "created_at": serialize_dt(p.created_at),
            }
            for p in payments
        ],
        "progress": [
            {
                "id": r.id,
                "enrollment_id": r.enrollment_id,
                "module_id": r.module_id,
                "completed_at": serialize_dt(r.completed_at),
                "quiz_score": r.quiz_score,
                "time_spent_seconds": r.time_spent_seconds,
            }
            for r in progress_rows
        ],
        "notes": [
            {
                "id": n.id,
                "course_id": n.course_id,
                "module_id": n.module_id,
                "timestamp_seconds": n.timestamp_seconds,
                "body": n.body,
                "created_at": serialize_dt(n.created_at),
            }
            for n in notes
        ],
    })
