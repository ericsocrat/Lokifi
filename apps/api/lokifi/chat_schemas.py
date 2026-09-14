from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .schemas import Input


class ConversationInput(Input):
    portfolio_id: str | None = None


class ConversationView(BaseModel):
    id: str
    portfolio_id: str | None
    title: str
    created_at: datetime


class ChatInput(Input):
    message: str = Field(min_length=1, max_length=2000)
    idempotency_key: str = Field(min_length=16, max_length=64)


class ChatEvent(BaseModel):
    type: Literal["started", "progress", "text", "citation", "proposal", "complete", "error", "cancelled"]
    run_id: str
    data: dict


class ProposalInput(Input):
    payload: dict | None = None


class ProposalView(BaseModel):
    id: str
    action: str
    payload: dict
    status: str
    expires_at: datetime


class MessageView(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class ConversationDetail(ConversationView):
    messages: list[MessageView]
    proposals: list[ProposalView]
    runs: list[dict]
