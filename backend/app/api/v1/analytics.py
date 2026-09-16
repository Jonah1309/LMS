from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_role
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.user import User

router = APIRouter()


@router.get("/overview")
def analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    course_ids = [
        r[0] for r in db.query(Course.id).filter(Course.instructor_id == current_user.id).all()
    ]
    if not course_ids:
        return {"total_students": 0, "total_revenue_usd": 0, "completion_rate": 0, "active_courses": 0}

    total_students = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.course_id.in_(course_ids))
        .scalar() or 0
    )
    completed = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.course_id.in_(course_ids), Enrollment.completion_status == "completed")
        .scalar() or 0
    )
    total_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.course_id.in_(course_ids), Payment.status == "completed", Payment.currency == "USD")
        .scalar() or 0
    )
    active_courses = (
        db.query(func.count(Course.id))
        .filter(Course.instructor_id == current_user.id, Course.status == "published")
        .scalar() or 0
    )
    return {
        "total_students": total_students,
        "total_revenue_usd": float(total_revenue),
        "completion_rate": round(completed / total_students * 100, 1) if total_students else 0,
        "active_courses": active_courses,
    }


@router.get("/enrollments-over-time")
def enrollments_over_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    course_ids = [
        r[0] for r in db.query(Course.id).filter(Course.instructor_id == current_user.id).all()
    ]
    if not course_ids:
        return []

    six_months_ago = datetime.utcnow() - timedelta(days=180)
    rows = (
        db.query(
            func.strftime("%Y-%m", Enrollment.enrolled_at).label("month"),
            func.count(Enrollment.id).label("count"),
        )
        .filter(Enrollment.course_id.in_(course_ids), Enrollment.enrolled_at >= six_months_ago)
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "count": r.count} for r in rows]


@router.get("/courses")
def per_course_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()
    result = []
    for course in courses:
        total = (
            db.query(func.count(Enrollment.id)).filter(Enrollment.course_id == course.id).scalar() or 0
        )
        completed = (
            db.query(func.count(Enrollment.id))
            .filter(Enrollment.course_id == course.id, Enrollment.completion_status == "completed")
            .scalar() or 0
        )
        revenue = (
            db.query(func.sum(Payment.amount))
            .filter(Payment.course_id == course.id, Payment.status == "completed")
            .scalar() or 0
        )
        result.append({
            "id": course.id,
            "title": course.title,
            "status": course.status,
            "total_students": total,
            "completion_pct": round(completed / total * 100, 1) if total else 0,
            "revenue": float(revenue),
        })
    return result


# ── Admin-only platform-wide analytics ───────────────────────────────────────

@router.get("/admin/overview")
def admin_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0
    total_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.status == "completed", Payment.currency == "USD")
        .scalar() or 0
    )
    active_courses = (
        db.query(func.count(Course.id))
        .filter(Course.status == "published")
        .scalar() or 0
    )
    return {
        "total_users": total_users,
        "total_enrollments": total_enrollments,
        "total_revenue_usd": float(total_revenue),
        "active_courses": active_courses,
    }


@router.get("/admin/enrollments-over-time")
def admin_enrollments_over_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    rows = (
        db.query(
            func.strftime("%Y-%m", Enrollment.enrolled_at).label("month"),
            func.count(Enrollment.id).label("count"),
        )
        .filter(Enrollment.enrolled_at >= six_months_ago)
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": r.month, "count": r.count} for r in rows]


@router.get("/admin/top-courses")
def admin_top_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    courses = db.query(Course).filter(Course.status == "published").all()
    result = []
    for course in courses:
        enrollment_count = (
            db.query(func.count(Enrollment.id))
            .filter(Enrollment.course_id == course.id)
            .scalar() or 0
        )
        revenue = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.course_id == course.id,
                Payment.status == "completed",
                Payment.currency == "USD",
            )
            .scalar() or 0
        )
        result.append({
            "id": course.id,
            "title": course.title,
            "enrollment_count": enrollment_count,
            "revenue_usd": float(revenue),
        })
    result.sort(key=lambda x: x["enrollment_count"], reverse=True)
    return result[:10]
