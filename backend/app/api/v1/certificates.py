import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.course import Course
from app.models.extras import Certificate
from app.models.user import User

router = APIRouter()


@router.get("/me")
def my_certificates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.id).all()
    result = []
    for c in certs:
        course = db.query(Course).filter(Course.id == c.course_id).first()
        result.append({
            "id": c.id,
            "certificate_uuid": c.certificate_uuid,
            "course_id": c.course_id,
            "course_title": course.title if course else "",
            "issued_at": c.issued_at,
            "verify_url": f"/certificates/{c.certificate_uuid}",
        })
    return result


@router.get("/{cert_uuid}/verify")
def verify_certificate(cert_uuid: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.certificate_uuid == cert_uuid).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    user = db.query(User).filter(User.id == cert.user_id).first()
    course = db.query(Course).filter(Course.id == cert.course_id).first()
    return {
        "valid": True,
        "student_name": user.name if user else "",
        "course_title": course.title if course else "",
        "issued_at": cert.issued_at,
        "certificate_uuid": cert_uuid,
    }


@router.get("/{cert_uuid}/download")
def download_certificate(cert_uuid: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cert = db.query(Certificate).filter(Certificate.certificate_uuid == cert_uuid).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    if cert.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.certificate_service import get_certificate_path
    path = get_certificate_path(cert_uuid)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Certificate file not found")

    course = db.query(Course).filter(Course.id == cert.course_id).first()
    filename = f"certificate-{cert_uuid[:8]}.pdf"
    if course:
        safe = "".join(c if c.isalnum() or c in " -" else "" for c in course.title).strip().replace(" ", "-")
        filename = f"certificate-{safe}.pdf"

    return FileResponse(path, media_type="application/pdf", filename=filename)
