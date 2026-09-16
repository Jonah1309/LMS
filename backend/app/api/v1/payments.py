import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Optional

import razorpay
import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.models.coupon import Coupon
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


class CheckoutRequest(BaseModel):
    course_id: int
    currency: str = "USD"  # "USD" or "INR"
    coupon_code: Optional[str] = None


class ValidateCouponRequest(BaseModel):
    course_id: int
    coupon_code: str


def _resolve_coupon(db: Session, code: str, course_id: int) -> Coupon:
    coupon = db.query(Coupon).filter(Coupon.code == code.upper().strip()).first()
    if not coupon or not coupon.is_active:
        raise HTTPException(status_code=404, detail="Coupon not found or inactive")
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired")
    if coupon.max_uses is not None and coupon.uses_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    if coupon.course_id is not None and coupon.course_id != course_id:
        raise HTTPException(status_code=400, detail="Coupon not valid for this course")
    return coupon


def _apply_discount(price: float, coupon: Coupon) -> float:
    if coupon.discount_type == "percent":
        discounted = price * (1 - coupon.discount_value / 100)
    else:
        discounted = price - coupon.discount_value
    return max(0.0, discounted)


def _enroll_if_not_exists(db: Session, user_id: int, course_id: int) -> None:
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == user_id, Enrollment.course_id == course_id
    ).first()
    if not existing:
        db.add(Enrollment(user_id=user_id, course_id=course_id))
        db.commit()


def _send_payment_emails(
    db: Session,
    user_id: int,
    course_id: int,
    amount: float,
    currency: str,
    provider: str,
    transaction_id: str,
) -> None:
    from app.services.email_service import (
        send_enrollment_confirmation_email,
        send_instructor_enrollment_notification,
        send_payment_receipt_email,
    )
    user = db.query(User).filter(User.id == user_id).first()
    course = db.query(Course).filter(Course.id == course_id).first()
    if not user or not course:
        return
    send_payment_receipt_email(user.email, user.name, course.title, amount, currency, provider, transaction_id)
    send_enrollment_confirmation_email(user.email, user.name, course.title, course_id)
    instructor = db.query(User).filter(User.id == course.instructor_id).first()
    if instructor:
        send_instructor_enrollment_notification(
            instructor.email, instructor.name, user.name, course.title, course_id
        )


@router.post("/validate-coupon")
def validate_coupon(
    body: ValidateCouponRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    coupon = _resolve_coupon(db, body.coupon_code, body.course_id)
    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "final_price_usd": _apply_discount(course.price_usd, coupon),
        "final_price_inr": _apply_discount(course.price_inr, coupon),
    }


@router.post("/checkout")
def checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if db.query(Enrollment).filter(
        Enrollment.user_id == current_user.id, Enrollment.course_id == body.course_id
    ).first():
        raise HTTPException(status_code=409, detail="Already enrolled")

    coupon: Optional[Coupon] = None
    if body.coupon_code:
        coupon = _resolve_coupon(db, body.coupon_code, body.course_id)

    if body.currency == "INR":
        price = _apply_discount(course.price_inr, coupon) if coupon else course.price_inr
        if price == 0:
            _enroll_if_not_exists(db, current_user.id, course.id)
            if coupon:
                coupon.uses_count += 1
            db.add(Payment(
                user_id=current_user.id, course_id=course.id, amount=0, currency="INR",
                payment_provider="free", external_transaction_id="coupon-free",
                status="completed", coupon_id=coupon.id if coupon else None,
            ))
            db.commit()
            return {"provider": "free", "course_id": course.id}

        if not settings.razorpay_key_id:
            raise HTTPException(status_code=503, detail="Razorpay not configured")
        client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_secret))
        amount_paise = int(price * 100)
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"course_id": str(course.id), "user_id": str(current_user.id)},
        })
        payment = Payment(
            user_id=current_user.id,
            course_id=course.id,
            amount=price,
            currency="INR",
            payment_provider="razorpay",
            external_transaction_id=order["id"],
            status="pending",
            coupon_id=coupon.id if coupon else None,
        )
        db.add(payment)
        db.commit()
        return {
            "provider": "razorpay",
            "key_id": settings.razorpay_key_id,
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "name": course.title,
            "prefill": {"email": current_user.email, "name": current_user.name or ""},
        }
    else:
        price = _apply_discount(course.price_usd, coupon) if coupon else course.price_usd
        if price == 0:
            _enroll_if_not_exists(db, current_user.id, course.id)
            if coupon:
                coupon.uses_count += 1
            db.add(Payment(
                user_id=current_user.id, course_id=course.id, amount=0, currency="USD",
                payment_provider="free", external_transaction_id="coupon-free",
                status="completed", coupon_id=coupon.id if coupon else None,
            ))
            db.commit()
            return {"provider": "free", "course_id": course.id}

        if not settings.stripe_secret_key:
            raise HTTPException(status_code=503, detail="Stripe not configured")
        stripe.api_key = settings.stripe_secret_key
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": course.title},
                    "unit_amount": int(price * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{settings.frontend_url}/learn/{course.id}?enrolled=1",
            cancel_url=f"{settings.frontend_url}/courses/{course.slug}",
            metadata={"course_id": str(course.id), "user_id": str(current_user.id)},
        )
        payment = Payment(
            user_id=current_user.id,
            course_id=course.id,
            amount=price,
            currency="USD",
            payment_provider="stripe",
            external_transaction_id=session.id,
            status="pending",
            coupon_id=coupon.id if coupon else None,
        )
        db.add(payment)
        db.commit()
        return {"provider": "stripe", "checkout_url": session.url}


@router.get("/me")
def payment_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.id.desc()).all()
    result = []
    for p in payments:
        course = db.query(Course).filter(Course.id == p.course_id).first()
        result.append({
            "id": p.id,
            "course_id": p.course_id,
            "course_title": course.title if course else "",
            "amount": p.amount,
            "currency": p.currency,
            "payment_provider": p.payment_provider,
            "status": p.status,
            "created_at": p.created_at,
        })
    return result


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    if settings.stripe_webhook_secret:
        stripe.api_key = settings.stripe_secret_key
        try:
            event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # No secret configured — accept in dev mode
        try:
            event = json.loads(payload)
        except Exception:
            raise HTTPException(status_code=400, detail="Bad payload")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        course_id = int(session["metadata"]["course_id"])
        user_id = int(session["metadata"]["user_id"])
        amount_cents = session.get("amount_total", 0)
        payment_rec = db.query(Payment).filter(Payment.external_transaction_id == session["id"]).first()
        if payment_rec:
            payment_rec.status = "completed"
            if payment_rec.coupon_id:
                coupon = db.query(Coupon).filter(Coupon.id == payment_rec.coupon_id).first()
                if coupon:
                    coupon.uses_count += 1
        _enroll_if_not_exists(db, user_id, course_id)
        db.commit()
        logger.info("Stripe: enrolled user %s in course %s", user_id, course_id)
        _send_payment_emails(db, user_id, course_id, amount_cents / 100, "USD", "stripe", session["id"])

    return {"status": "ok"}


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")

    if settings.razorpay_secret and sig:
        expected = hmac.new(
            settings.razorpay_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Bad payload")

    if event.get("event") == "payment.captured":
        payment_entity = event["payload"]["payment"]["entity"]
        order_id = payment_entity.get("order_id")
        notes = payment_entity.get("notes", {})
        course_id = int(notes.get("course_id", 0))
        user_id = int(notes.get("user_id", 0))
        if order_id:
            payment_rec = db.query(Payment).filter(Payment.external_transaction_id == order_id).first()
            if payment_rec:
                payment_rec.status = "completed"
                if payment_rec.coupon_id:
                    coupon = db.query(Coupon).filter(Coupon.id == payment_rec.coupon_id).first()
                    if coupon:
                        coupon.uses_count += 1
        if course_id and user_id:
            _enroll_if_not_exists(db, user_id, course_id)
            db.commit()
            logger.info("Razorpay: enrolled user %s in course %s", user_id, course_id)
            amount_rupees = payment_entity.get("amount", 0) / 100
            _send_payment_emails(db, user_id, course_id, amount_rupees, "INR", "razorpay", payment_entity.get("id", ""))

    return {"status": "ok"}
