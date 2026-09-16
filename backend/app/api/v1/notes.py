from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.note import Note
from app.models.module import Module

router = APIRouter()


class NoteCreate(BaseModel):
    module_id: int
    timestamp_seconds: Optional[int] = None
    body: str


class NoteUpdate(BaseModel):
    body: str


class NoteOut(BaseModel):
    id: int
    course_id: int
    module_id: int
    timestamp_seconds: Optional[int]
    body: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/courses/{course_id}/notes", response_model=list[NoteOut])
def list_notes(
    course_id: int,
    module_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(Note).filter(Note.user_id == current_user.id, Note.course_id == course_id)
    if module_id is not None:
        q = q.filter(Note.module_id == module_id)
    return q.order_by(Note.created_at).all()


@router.post("/courses/{course_id}/notes", response_model=NoteOut, status_code=201)
def create_note(
    course_id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not payload.body.strip():
        raise HTTPException(status_code=422, detail="Note body cannot be empty.")
    note = Note(
        user_id=current_user.id,
        course_id=course_id,
        module_id=payload.module_id,
        timestamp_seconds=payload.timestamp_seconds,
        body=payload.body.strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.put("/notes/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    if not payload.body.strip():
        raise HTTPException(status_code=422, detail="Note body cannot be empty.")
    note.body = payload.body.strip()
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    db.delete(note)
    db.commit()


@router.get("/courses/{course_id}/notes/export", response_class=PlainTextResponse)
def export_notes(
    course_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notes = (
        db.query(Note)
        .filter(Note.user_id == current_user.id, Note.course_id == course_id)
        .order_by(Note.module_id, Note.created_at)
        .all()
    )
    if not notes:
        return PlainTextResponse("No notes found for this course.")

    module_ids = list({n.module_id for n in notes})
    modules = db.query(Module).filter(Module.id.in_(module_ids)).all()
    module_map = {m.id: m.title for m in modules}

    lines: list[str] = []
    current_module_id = None
    for n in notes:
        if n.module_id != current_module_id:
            current_module_id = n.module_id
            title = module_map.get(n.module_id, f"Module {n.module_id}")
            lines.append(f"\n=== {title} ===\n")
        if n.timestamp_seconds is not None:
            mins, secs = divmod(n.timestamp_seconds, 60)
            lines.append(f"[{mins}:{secs:02d}] {n.body}")
        else:
            lines.append(n.body)
        lines.append("")

    return PlainTextResponse("\n".join(lines).strip())
