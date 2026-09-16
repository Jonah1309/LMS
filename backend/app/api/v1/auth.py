import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    token = secrets.token_urlsafe(32)
    user = User(
        email=body.email,
        name=body.name,
        password_hash=hash_password(body.password),
        role="student",
        oauth_provider="email",
        is_verified=False,
        verification_token=token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    from app.services.email_service import send_verification_email
    send_verification_email(user.email, user.name, token)

    access_token = create_access_token(user.id, {"role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    token = create_access_token(user.id, {"role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/oauth/google", response_model=TokenResponse)
async def google_oauth(body: dict, db: Session = Depends(get_db)):
    from app.services.auth_service import verify_google_token
    try:
        info = await verify_google_token(body.get("id_token", ""))
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = db.query(User).filter(User.email == info["email"]).first()
    if not user:
        user = User(
            email=info["email"],
            name=info.get("name", info["email"]),
            avatar_url=info.get("picture"),
            role="student",
            oauth_provider="google",
            oauth_id=info["sub"],
            is_verified=True,  # Google already verified the email
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, {"role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    from app.services.email_service import send_welcome_email
    send_welcome_email(user.email, user.name)
    return {"message": "Email verified. You can now log in."}


@router.post("/forgot-password")
def forgot_password(body: dict, db: Session = Depends(get_db)):
    email = body.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()
    # Always return 200 to avoid email enumeration
    if user and user.oauth_provider == "email":
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        db.commit()
        from app.services.email_service import send_password_reset_email
        send_password_reset_email(user.email, user.name, token)
    return {"message": "If that email exists you will receive a reset link shortly"}


@router.post("/reset-password")
def reset_password(body: dict, db: Session = Depends(get_db)):
    token = body.get("token", "")
    new_password = body.get("new_password", "")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="token and new_password required")
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    user.password_hash = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    user.is_verified = True  # treat reset as implicit verification
    db.commit()
    return {"message": "Password updated. You can now log in."}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "is_verified": current_user.is_verified,
    }


@router.post("/oauth/apple", response_model=TokenResponse)
def apple_oauth(body: dict, db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not implemented")
