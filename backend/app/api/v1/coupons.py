from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_role
from app.models.coupon import Coupon
from app.models.course import Course
from app.models.user import User

router = APIRouter()


class CouponCreate(BaseModel):
    code: str
    discount_type: str  # "percent" or "fixed"
    discount_value: float
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
    course_id: Optional[int] = None


def _coupon_out(c: Coupon) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "discount_type": c.discount_type,
        "discount_value": c.discount_value,
        "max_uses": c.max_uses,
        "uses_count": c.uses_count,
        "expires_at": c.expires_at,
        "course_id": c.course_id,
        "instructor_id": c.instructor_id,
        "is_active": c.is_active,
        "created_at": c.created_at,
    }


@router.get("")
def list_coupons(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    if current_user.role == "admin":
        coupons = db.query(Coupon).order_by(Coupon.id.desc()).all()
    else:
        coupons = (
            db.query(Coupon)
            .filter(Coupon.instructor_id == current_user.id)
            .order_by(Coupon.id.desc())
            .all()
        )
    return [_coupon_out(c) for c in coupons]


@router.post("")
def create_coupon(
    body: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    if body.discount_type not in ("percent", "fixed"):
        raise HTTPException(status_code=422, detail="discount_type must be 'percent' or 'fixed'")
    if body.discount_value <= 0:
        raise HTTPException(status_code=422, detail="discount_value must be positive")
    if body.discount_type == "percent" and body.discount_value > 100:
        raise HTTPException(status_code=422, detail="Percent discount cannot exceed 100")

    code = body.code.upper().strip()
    if db.query(Coupon).filter(Coupon.code == code).first():
        raise HTTPException(status_code=409, detail="Coupon code already exists")

    course_id = body.course_id
    instructor_id: Optional[int] = None

    if current_user.role == "instructor":
        if course_id is None:
            raise HTTPException(status_code=422, detail="Instructors must specify a course_id")
        course = db.query(Course).filter(
            Course.id == course_id, Course.instructor_id == current_user.id
        ).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        instructor_id = current_user.id

    coupon = Coupon(
        code=code,
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
        course_id=course_id,
        instructor_id=instructor_id,
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return _coupon_out(coupon)


@router.delete("/{coupon_id}")
def deactivate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    if current_user.role == "instructor" and coupon.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    coupon.is_active = False
    db.commit()
    return {"ok": True}
