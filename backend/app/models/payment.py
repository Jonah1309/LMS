from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, func
from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(Enum("INR", "USD", name="currency"), nullable=False)
    payment_provider = Column(Enum("stripe", "razorpay", name="payment_provider"), nullable=False)
    external_transaction_id = Column(String, nullable=True)
    status = Column(Enum("pending", "completed", "failed", "refunded", name="payment_status"), default="pending")
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
