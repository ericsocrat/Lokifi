from fastapi.security import HTTPBearer
from fastapi import Depends, HTTPException
import jwt
from .config import settings

reusable_oauth2 = HTTPBearer(auto_error=False)

async def get_current_user(token=Depends(reusable_oauth2)):
    if token is None:
        return {"id": 0, "email": "anon@local", "handle": "anon"}
    try:
        payload = jwt.decode(token.credentials, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGS], options={"verify_aud": False})
        return {"id": payload.get("sub"), "email": payload.get("email"), "handle": payload.get("handle")}
    except Exception:
        raise HTTPException(401, "Invalid token")
