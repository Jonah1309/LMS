from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.extras import Notification
from app.models.user import User

router = APIRouter()


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "message": r.message,
            "type": r.type,
            "read": r.read,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .count()
    )
    return {"count": count}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"ok": True}


@router.put("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}


def push_notification(db: Session, user_id: int, message: str, type: str = "info") -> None:
    """Helper called from other modules to create a notification."""
    notif = Notification(user_id=user_id, message=message, type=type)
    db.add(notif)
    db.commit()
