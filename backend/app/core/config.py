from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Forgiven Generation Church LMS"
    debug: bool = True

    database_url: str = "sqlite:///./lms.db"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    google_client_id: str = ""
    google_client_secret: str = ""
    apple_client_id: str = ""
    apple_client_secret: str = ""

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_raw_bucket: str = ""
    s3_delivery_bucket: str = ""
    cloudfront_domain: str = ""
    cloudfront_key_pair_id: str = ""
    cloudfront_private_key: str = ""
    mediaconvert_endpoint: str = ""
    mediaconvert_role_arn: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    razorpay_key_id: str = ""
    razorpay_secret: str = ""

    ses_from_email: str = ""
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
