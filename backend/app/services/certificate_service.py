import io
import os
import uuid
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.platypus.flowables import HRFlowable

CERT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "certificates")


def _ensure_dir():
    os.makedirs(CERT_DIR, exist_ok=True)


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    instructor_name: str,
    issued_at: datetime,
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    church = ParagraphStyle(
        "church",
        fontSize=13,
        textColor=colors.HexColor("#6B4FA0"),
        alignment=1,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    heading = ParagraphStyle(
        "heading",
        fontSize=32,
        textColor=colors.HexColor("#1E1B4B"),
        alignment=1,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    subtitle = ParagraphStyle(
        "subtitle",
        fontSize=13,
        textColor=colors.HexColor("#64748B"),
        alignment=1,
        spaceAfter=20,
        fontName="Helvetica",
    )
    name_style = ParagraphStyle(
        "name",
        fontSize=28,
        textColor=colors.HexColor("#6B4FA0"),
        alignment=1,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    body = ParagraphStyle(
        "body",
        fontSize=13,
        textColor=colors.HexColor("#374151"),
        alignment=1,
        spaceAfter=4,
        fontName="Helvetica",
    )
    course_style = ParagraphStyle(
        "course",
        fontSize=18,
        textColor=colors.HexColor("#1E1B4B"),
        alignment=1,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    )
    small = ParagraphStyle(
        "small",
        fontSize=10,
        textColor=colors.HexColor("#9CA3AF"),
        alignment=1,
        fontName="Helvetica",
    )

    date_str = issued_at.strftime("%B %d, %Y")

    story = [
        Spacer(1, 0.1 * inch),
        Paragraph("FORGIVEN GENERATION CHURCH", church),
        HRFlowable(width="80%", thickness=1, color=colors.HexColor("#6B4FA0"), spaceAfter=10),
        Paragraph("Certificate of Completion", heading),
        Paragraph("This is to certify that", subtitle),
        Paragraph(student_name, name_style),
        Paragraph("has successfully completed the course", body),
        Paragraph(course_title, course_style),
        HRFlowable(width="60%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceAfter=14),
        Paragraph(f"Instructor: {instructor_name}", body),
        Paragraph(f"Date Issued: {date_str}", body),
        Spacer(1, 0.2 * inch),
        Paragraph("God bless your continued growth in knowledge and faith.", small),
    ]

    doc.build(story)
    return buf.getvalue()


def save_certificate_locally(pdf_bytes: bytes, cert_uuid: str) -> str:
    _ensure_dir()
    path = os.path.join(CERT_DIR, f"{cert_uuid}.pdf")
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    return path


def get_certificate_path(cert_uuid: str) -> str:
    return os.path.join(CERT_DIR, f"{cert_uuid}.pdf")


def issue_certificate(db, enrollment, user, course, instructor_name: str):
    from app.models.extras import Certificate

    existing = db.query(Certificate).filter(Certificate.enrollment_id == enrollment.id).first()
    if existing:
        return existing

    cert_uuid = str(uuid.uuid4())
    issued_at = datetime.utcnow()

    pdf_bytes = generate_certificate_pdf(
        student_name=user.name or user.email,
        course_title=course.title,
        instructor_name=instructor_name,
        issued_at=issued_at,
    )
    save_certificate_locally(pdf_bytes, cert_uuid)

    cert = Certificate(
        user_id=user.id,
        course_id=course.id,
        enrollment_id=enrollment.id,
        certificate_uuid=cert_uuid,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert
