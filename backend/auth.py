import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import Cookie, HTTPException

CLIENT_ID = os.getenv("INTRA_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("INTRA_CLIENT_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")

_host = os.getenv("HOST", "")
REDIRECT_URI = (
    f"https://{_host}/api/auth/callback"
    if _host
    else "http://localhost:8000/api/auth/callback"
)

_AUTHORIZE_URL = "https://api.intra.42.fr/oauth/authorize"
_TOKEN_URL = "https://api.intra.42.fr/oauth/token"
_ME_URL = "https://api.intra.42.fr/v2/me"
_COOKIE = "session"
_TTL_HOURS = 8

_client = httpx.AsyncClient(timeout=15.0)


def authorize_url() -> str:
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "public",
    }
    return f"{_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    r = await _client.post(
        _TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": REDIRECT_URI,
        },
    )
    r.raise_for_status()
    access_token = r.json()["access_token"]
    me = await _client.get(_ME_URL, headers={"Authorization": f"Bearer {access_token}"})
    me.raise_for_status()
    return me.json()


def make_cookie(user: dict) -> str:
    payload = {
        "sub": str(user["id"]),
        "login": user["login"],
        "displayname": user.get("displayname", user["login"]),
        "exp": datetime.now(timezone.utc) + timedelta(hours=_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")


def require_auth(session: str | None = Cookie(default=None, alias=_COOKIE)) -> dict:
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode(session)


COOKIE_NAME = _COOKIE
