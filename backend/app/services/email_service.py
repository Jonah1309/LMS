import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(email: str, name: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"
    _send(
        to=email,
        subject="Verify your Forgiven Generation Church email",
        body=(
            f"Hi {name},\n\n"
            f"Welcome to Forgiven Generation Church! Please verify your email address:\n\n"
            f"  {verify_url}\n\n"
            f"This link does not expire.\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_password_reset_email(email: str, name: str, token: str) -> None:
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    _send(
        to=email,
        subject="Reset your Forgiven Generation Church password",
        body=(
            f"Hi {name},\n\n"
            f"Click the link below to reset your password:\n\n"
            f"  {reset_url}\n\n"
            f"This link expires in 1 hour. If you didn't request a reset, ignore this email.\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_welcome_email(email: str, name: str) -> None:
    _send(
        to=email,
        subject="Your email is verified — welcome to Forgiven Generation Church!",
        body=(
            f"Hi {name},\n\n"
            f"Your email is now verified and your account is ready.\n\n"
            f"Start learning: {settings.frontend_url}/courses\n\n"
            f"God bless your studies!\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_enrollment_confirmation_email(email: str, name: str, course_title: str, course_id: int) -> None:
    learn_url = f"{settings.frontend_url}/learn/{course_id}"
    _send(
        to=email,
        subject=f"You're enrolled in {course_title}",
        body=(
            f"Hi {name},\n\n"
            f"You're now enrolled in \"{course_title}\".\n\n"
            f"Start learning here:\n  {learn_url}\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_payment_receipt_email(
    email: str,
    name: str,
    course_title: str,
    amount: float,
    currency: str,
    provider: str,
    transaction_id: str,
) -> None:
    symbol = "₹" if currency.upper() == "INR" else "$"
    _send(
        to=email,
        subject=f"Payment receipt — {course_title}",
        body=(
            f"Hi {name},\n\n"
            f"We received your payment for \"{course_title}\".\n\n"
            f"  Amount: {symbol}{amount:,.2f} {currency.upper()}\n"
            f"  Provider: {provider.capitalize()}\n"
            f"  Transaction ID: {transaction_id}\n\n"
            f"You can view your billing history at:\n"
            f"  {settings.frontend_url}/billing\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_course_completion_email(email: str, name: str, course_title: str) -> None:
    _send(
        to=email,
        subject=f"Congratulations — you completed {course_title}!",
        body=(
            f"Hi {name},\n\n"
            f"You've completed \"{course_title}\"!\n\n"
            f"View your certificate from your dashboard:\n"
            f"  {settings.frontend_url}/dashboard\n\n"
            f"Well done — keep growing in knowledge and faith.\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_instructor_enrollment_notification(
    instructor_email: str,
    instructor_name: str,
    student_name: str,
    course_title: str,
    course_id: int,
) -> None:
    _send(
        to=instructor_email,
        subject=f"New student enrolled in {course_title}",
        body=(
            f"Hi {instructor_name},\n\n"
            f"{student_name} just enrolled in your course \"{course_title}\".\n\n"
            f"View analytics: {settings.frontend_url}/instructor/dashboard\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def send_new_question_notification(
    instructor_email: str, instructor_name: str, asker_name: str,
    course_title: str, question_title: str,
) -> None:
    _send(
        to=instructor_email,
        subject=f"New question in {course_title}",
        body=(
            f"Hi {instructor_name},\n\n"
            f"{asker_name} asked a question in \"{course_title}\":\n\n"
            f"  \"{question_title}\"\n\n"
            f"Answer it here: {settings.frontend_url}/instructor/dashboard\n\n"
            f"— The Forgiven Generation Church Team"
        ),
    )


def _send(to: str, subject: str, body: str) -> None:
    if not settings.ses_from_email:
        logger.info("EMAIL (console): to=%s subject=%s\n%s", to, subject, body)
        return
    try:
        import boto3
        client = boto3.client("ses", region_name=settings.aws_region)
        client.send_email(
            Source=settings.ses_from_email,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body}},
            },
        )
    except Exception as exc:
        logger.error("SES send failed: %s", exc)
