from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, require_role
from app.models.enrollment import Enrollment
from app.models.module import VideoContent
from app.models.user import User

router = APIRouter()


@router.get("/upload-url")
def get_upload_url(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    # TODO: generate S3 presigned POST URL for raw video upload
    raise HTTPException(status_code=501, detail="AWS not configured")


@router.get("/playback-url/{module_id}")
def get_playback_url(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(VideoContent).filter(VideoContent.module_id == module_id).first()
    if not video or video.status != "ready":
        raise HTTPException(status_code=404, detail="Video not ready")

    # Verify enrollment
    from app.models.module import Module
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module.is_preview_free:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == module.course_id,
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")

    # TODO: generate CloudFront signed URL with RSA key (6-hr expiry)
    raise HTTPException(status_code=501, detail="AWS not configured")


@router.get("/caption-upload-url")
def get_caption_upload_url(
    module_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "admin")),
):
    # TODO: generate S3 presigned PUT URL for VTT caption file upload
    raise HTTPException(status_code=501, detail="AWS not configured")


@router.get("/caption-url/{module_id}")
def get_caption_url(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.module import Module
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    if not module.is_preview_free:
        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == module.course_id,
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled")

    video = db.query(VideoContent).filter(VideoContent.module_id == module_id).first()
    if not video or not video.vtt_s3_key:
        raise HTTPException(status_code=404, detail="No captions available")

    # TODO: generate CloudFront signed URL for VTT file
    raise HTTPException(status_code=501, detail="AWS not configured")


@router.post("/webhooks/mediaconvert")
async def mediaconvert_webhook(body: dict, db: Session = Depends(get_db)):
    # EventBridge → Lambda → this endpoint: mark video as ready
    job_id = body.get("jobId")
    s3_hls_prefix = body.get("hlsPrefix")
    module_id = body.get("moduleId")
    if not module_id:
        raise HTTPException(status_code=400, detail="Missing moduleId")
    video = db.query(VideoContent).filter(VideoContent.module_id == int(module_id)).first()
    if video:
        video.status = "ready"
        video.s3_hls_prefix = s3_hls_prefix
    db.commit()
    return {"status": "updated"}
