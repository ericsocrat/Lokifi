"""Model-visible proposals are inert until an authenticated confirmation."""

import hashlib
import json
from datetime import timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .database import owned
from .models import ChatProposal, Conversation, Holding, Portfolio, WatchItem, now
from .portfolios import add_holding, detail, resolve_instrument
from .schemas import HoldingInput, PortfolioInput, WatchInput

ACTIONS = {
    "create_portfolio",
    "rename_portfolio",
    "add_holding",
    "edit_holding",
    "remove_holding",
    "add_watch",
    "remove_watch",
}


def fingerprint(item) -> str:
    if isinstance(item, Holding):
        values = {"id": item.id, "version": item.version}
    elif isinstance(item, Portfolio):
        values = {"id": item.id, "name": item.name, "is_demo": item.is_demo}
    else:
        values = {"id": item.id, "instrument_id": item.instrument_id}
    return hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()


def validate(db: Session, user_id: str, conversation: Conversation, action: str, payload: dict):
    if action not in ACTIONS:
        raise HTTPException(422, "This action is not supported")
    allowed = {
        "create_portfolio": {"name"},
        "rename_portfolio": {"portfolio_id", "name"},
        "add_holding": {"portfolio_id", "holding"},
        "edit_holding": {"holding_id", "holding"},
        "remove_holding": {"holding_id"},
        "add_watch": {"instrument"},
        "remove_watch": {"item_id"},
    }[action]
    if set(payload) != allowed:
        raise HTTPException(422, "The proposal fields do not match the action")
    target = None
    if "portfolio_id" in payload:
        if payload["portfolio_id"] != conversation.portfolio_id:
            raise HTTPException(403, "Select that portfolio before proposing a change")
        target = owned(db, Portfolio, payload["portfolio_id"], user_id)
        if target.is_demo:
            raise HTTPException(409, "Example portfolios are read-only")
    if "holding_id" in payload:
        target = owned(db, Holding, payload["holding_id"], user_id)
        if target.portfolio_id != conversation.portfolio_id:
            raise HTTPException(403, "This holding is outside the selected portfolio")
        if db.get(Portfolio, target.portfolio_id).is_demo:
            raise HTTPException(409, "Example portfolios are read-only")
    if "item_id" in payload:
        target = owned(db, WatchItem, payload["item_id"], user_id)
    if action in {"create_portfolio", "rename_portfolio"}:
        PortfolioInput(name=payload["name"])
    elif action in {"add_holding", "edit_holding"}:
        HoldingInput.model_validate(payload["holding"])
    elif action == "add_watch":
        WatchInput.model_validate(payload)
    return target


def propose(db: Session, user_id: str, conversation: Conversation, action: str, payload: dict):
    target = validate(db, user_id, conversation, action, payload)
    proposal = ChatProposal(
        user_id=user_id,
        conversation_id=conversation.id,
        action=action,
        payload=payload,
        expected_hash=fingerprint(target) if target else None,
        expires_at=now() + timedelta(minutes=15),
    )
    db.add(proposal)
    db.flush()
    return proposal


def apply(db: Session, proposal: ChatProposal, user_id: str, replacement: dict | None):
    if proposal.user_id != user_id:
        raise HTTPException(404, "Proposal not found")
    if proposal.status != "pending" or proposal.expires_at <= now():
        raise HTTPException(409, "Proposal already handled or expired. Ask for a new proposal.")
    conversation = owned(db, Conversation, proposal.conversation_id, user_id)
    payload = replacement if replacement is not None else proposal.payload
    # Editing fields cannot retarget an action to a different record.
    for key in ("portfolio_id", "holding_id", "item_id"):
        if payload.get(key) != proposal.payload.get(key):
            raise HTTPException(409, "Changing the target requires a new proposal")
    target = validate(db, user_id, conversation, proposal.action, payload)
    if target is not None:
        db.refresh(target, with_for_update=True)
        if fingerprint(target) != proposal.expected_hash:
            raise HTTPException(409, "The record changed. Review a fresh proposal.")
    action = proposal.action
    if action == "create_portfolio":
        db.add(Portfolio(user_id=user_id, name=PortfolioInput(name=payload["name"]).name))
    elif action == "rename_portfolio":
        target.name = PortfolioInput(name=payload["name"]).name
    elif action == "add_holding":
        add_holding(db, target, HoldingInput.model_validate(payload["holding"]))
    elif action == "edit_holding":
        data = HoldingInput.model_validate(payload["holding"])
        instrument = resolve_instrument(db, data.instrument, user_id)
        target.instrument_id = instrument.id
        for key, value in data.model_dump(exclude={"instrument"}).items():
            setattr(target, key, value)
        target.version += 1
    elif action in {"remove_holding", "remove_watch"}:
        db.delete(target)
    elif action == "add_watch":
        instrument = resolve_instrument(db, WatchInput.model_validate(payload).instrument, user_id)
        db.add(WatchItem(user_id=user_id, instrument_id=instrument.id))
    proposal.status = "confirmed"
    proposal.payload = payload
    db.flush()


def scenario(db: Session, user_id: str, portfolio_id: str, category: str, change: str):
    if category not in {"stock", "etf", "cash", "crypto"}:
        raise HTTPException(422, "Unknown category")
    value = Decimal(change)
    if not value.is_finite() or abs(value) > Decimal("1000000000000"):
        raise HTTPException(422, "Invalid scenario amount")
    summary = detail(db, owned(db, Portfolio, portfolio_id, user_id))
    if not summary.complete:
        return {
            "available": False,
            "reason": "Complete missing valuations before comparing allocation scenarios",
        }
    amounts = {row.category: Decimal(row.eur_value) for row in summary.allocation}
    amounts[category] = amounts.get(category, Decimal(0)) + value
    total = sum(amounts.values(), Decimal(0))
    if amounts[category] < 0 or total <= 0:
        raise HTTPException(422, "Scenario would create negative holdings or a non-positive portfolio")
    return {
        "hypothetical": True,
        "total_eur": f"{total:.2f}",
        "allocation": [
            {"category": key, "eur_value": f"{amount:.2f}", "percentage": f"{amount / total * 100:.2f}"}
            for key, amount in amounts.items()
        ],
    }
