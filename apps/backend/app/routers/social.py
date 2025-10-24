from fastapi import APIRouter

from app.db.schemas.social import PostCreate

router = APIRouter(prefix="/social", tags=["social"])


@router.post("/posts")
async def create_post(payload: PostCreate):
    return {"id": 1, "user_id": 0, **payload.model_dump(), "created_at": "2025-01-01T00:00:00Z"}


@router.get("/feed")
async def feed(symbol: str | None = None, limit: int = 50):
    return []
