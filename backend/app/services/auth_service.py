import httpx
from app.core.config import settings


async def verify_google_token(id_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
        if resp.status_code != 200:
            raise ValueError("Invalid Google token")
        data = resp.json()
        if data.get("aud") != settings.google_client_id:
            raise ValueError("Token audience mismatch")
        return data  # contains: sub, email, name, picture
