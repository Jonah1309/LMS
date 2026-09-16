from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import auth, courses, enrollments, payments, analytics, admin, media, certificates, reviews, notifications, coupons, qa, notes, learning_paths, users

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["courses"])
app.include_router(enrollments.router, prefix="/api/v1/enrollments", tags=["enrollments"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(media.router, prefix="/api/v1/media", tags=["media"])
app.include_router(certificates.router, prefix="/api/v1/certificates", tags=["certificates"])
app.include_router(reviews.router, prefix="/api/v1/courses", tags=["reviews"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(coupons.router, prefix="/api/v1/coupons", tags=["coupons"])
app.include_router(qa.router, prefix="/api/v1", tags=["qa"])
app.include_router(notes.router, prefix="/api/v1", tags=["notes"])
app.include_router(learning_paths.router, prefix="/api/v1/paths", tags=["learning_paths"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])


@app.get("/health")
def health():
    return {"status": "ok"}
