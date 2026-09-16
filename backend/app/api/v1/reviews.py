from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.extras import Review
from app.models.user import User

router = APIRouter()


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    body: str = Field(default="", max_length=2000)


@router.post("/{course_id}/reviews", status_code=201)
def create_review(
    course_id: int,
    body: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enrolled = db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Must be enrolled to leave a review")

    existing = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.course_id == course_id,
    ).first()
    def _to_dict(r: Review) -> dict:
        return {"id": r.id, "rating": r.rating, "body": r.body, "created_at": r.created_at}

    if existing:
        existing.rating = body.rating
        existing.body = body.body
        db.commit()
        db.refresh(existing)
        _update_course_rating(db, course_id)
        return _to_dict(existing)

    review = Review(user_id=current_user.id, course_id=course_id, rating=body.rating, body=body.body)
    db.add(review)
    db.commit()
    db.refresh(review)
    _update_course_rating(db, course_id)
    return _to_dict(review)


@router.get("/{course_id}/reviews")
def list_reviews(course_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .filter(Review.course_id == course_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    result = []
    for r in reviews:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "rating": r.rating,
            "body": r.body,
            "created_at": r.created_at,
            "user_name": user.name if user else "Anonymous",
            "user_avatar": user.avatar_url if user else None,
        })
    return result


def _update_course_rating(db: Session, course_id: int) -> None:
    row = db.query(
        func.avg(Review.rating).label("avg"),
        func.count(Review.id).label("cnt"),
    ).filter(Review.course_id == course_id).first()
    course = db.query(Course).filter(Course.id == course_id).first()
    if course:
        course.avg_rating = round(float(row.avg or 0), 2)
        course.review_count = row.cnt or 0
        db.commit()
