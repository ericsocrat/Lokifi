from pydantic import BaseModel

class PostCreate(BaseModel):
    body: str
    symbols: list[str] | None = None
    media_url: str | None = None

class PostOut(BaseModel):
    id: int
    user_id: int
    body: str
    symbols: list[str] | None
    media_url: str | None
    created_at: str
