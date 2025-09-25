from pydantic import BaseModel
from typing import Any, Literal

AlertType = Literal["price","percent","indicator","news","btcdom"]

class AlertCreate(BaseModel):
    type: AlertType
    payload: dict[str, Any]
    channels: list[str] = ["inapp"]
    cooldown_s: int = 300

class AlertOut(BaseModel):
    id: int
    type: AlertType
    payload: dict
    is_active: bool
    cooldown_s: int
