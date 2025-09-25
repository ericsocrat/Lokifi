from fastapi import APIRouter
from app.db.schemas.alert import AlertCreate

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/")
async def create(body: AlertCreate):
    return {"id": 1, "type": body.type, "payload": body.payload, "is_active": True, "cooldown_s": body.cooldown_s}

@router.get("/")
async def index():
    return []
