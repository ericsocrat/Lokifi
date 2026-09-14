import json
from datetime import timedelta

import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import select
from test_journey import PASSWORD, PREFIX, add, portfolio, register, row

from lokifi import account_security, chat_provider
from lokifi.config import settings
from lokifi.database import SessionLocal
from lokifi.identity import digest
from lokifi.models import AccountToken, ChatRun, Conversation, Holding, User, now


def verified(client, monkeypatch):
    u = register(client)
    with SessionLocal.begin() as db:
        db.get(User, u["id"]).email_verified = True
    assert client.post(PREFIX + "/account/ai-consent").status_code == 200
    monkeypatch.setattr(settings(), "groq_api_key", SecretStr("synthetic-test-key"))
    monkeypatch.setattr(settings(), "groq_free_confirmed", True)
    return u


def conversation(client, p=None):
    r = client.post(PREFIX + "/chat/conversations", json={"portfolio_id": p})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def send(client, c, key="synthetic-message-0001", content="Explain my portfolio"):
    return client.post(
        f"{PREFIX}/chat/conversations/{c}/messages", json={"message": content, "idempotency_key": key}
    )


def events(response):
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith("data: ")]


def test_ai_requires_verified_email_consent_and_configured_free_provider(client, monkeypatch):
    register(client)
    c = conversation(client)
    assert send(client, c).status_code == 403
    with SessionLocal.begin() as db:
        db.scalar(select(User)).email_verified = True
    assert send(client, c).status_code == 403
    client.post(PREFIX + "/account/ai-consent")
    assert send(client, c).status_code == 503


def test_stream_idempotency_and_history(client, monkeypatch):
    verified(client, monkeypatch)
    c = conversation(client)
    requests = []

    async def provider(messages, tools):
        requests.append(messages)
        yield {"kind": "text", "text": "Your records are available."}
        yield {"kind": "usage", "tokens": 120}

    monkeypatch.setattr(chat_provider, "stream_completion", provider)
    r = send(client, c)
    assert r.status_code == 200, r.text
    assert any(e["type"] == "text" for e in events(r))
    assert events(r)[-1]["data"]["status"] == "complete"
    assert send(client, c).json()["replayed"]
    assert len(requests) == 1
    assert send(client, c, content="Different prompt").status_code == 409
    detail = client.get(f"{PREFIX}/chat/conversations/{c}").json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]
    assert "alice@example.com" not in json.dumps(requests)
    assert PASSWORD not in json.dumps(requests)


def test_confirmed_changes_are_atomic_and_stale_proposals_rejected(client, monkeypatch):
    from lokifi import chat_actions

    u = verified(client, monkeypatch)
    p = portfolio(client)
    h = add(client, p, row()).json()
    c = conversation(client, p)
    with SessionLocal.begin() as db:
        proposal = chat_actions.propose(
            db,
            u["id"],
            db.get(Conversation, c),
            "edit_holding",
            {"holding_id": h["id"], "holding": {**row(), "quantity": "8"}},
        )
        pid = proposal.id
    assert client.get(PREFIX + "/holdings/" + h["id"]).json()["quantity"].startswith("3.")
    r = client.post(f"{PREFIX}/chat/proposals/{pid}/confirm", json={})
    assert r.status_code == 200, r.text
    assert client.post(f"{PREFIX}/chat/proposals/{pid}/confirm", json={}).status_code == 409
    with SessionLocal.begin() as db:
        newer = chat_actions.propose(
            db, u["id"], db.get(Conversation, c), "remove_holding", {"holding_id": h["id"]}
        )
        stale_id = newer.id
        db.get(Holding, h["id"]).version += 1
    assert client.post(f"{PREFIX}/chat/proposals/{stale_id}/confirm", json={}).status_code == 409


def test_cross_user_chat_and_proposal_access_denied(client, monkeypatch):
    from lokifi import chat_actions

    u = verified(client, monkeypatch)
    p = portfolio(client)
    c = conversation(client, p)
    with SessionLocal.begin() as db:
        prop = chat_actions.propose(
            db, u["id"], db.get(Conversation, c), "rename_portfolio", {"portfolio_id": p, "name": "Changed"}
        )
        pid = prop.id
    client.post(PREFIX + "/auth/logout")
    b = register(client, "bob@example.com")
    with SessionLocal.begin() as db:
        db.get(User, b["id"]).email_verified = True
    client.post(PREFIX + "/account/ai-consent")
    assert client.get(f"{PREFIX}/chat/conversations/{c}").status_code == 404
    assert client.delete(f"{PREFIX}/chat/conversations/{c}").status_code == 404
    assert client.post(f"{PREFIX}/chat/proposals/{pid}/confirm", json={}).status_code == 404


def test_chat_deletion_does_not_reset_daily_quota(client, monkeypatch):
    verified(client, monkeypatch)

    async def provider(messages, tools):
        yield {"kind": "text", "text": "Hello."}
        yield {"kind": "usage", "tokens": 10}

    monkeypatch.setattr(chat_provider, "stream_completion", provider)
    for i in range(5):
        c = conversation(client)
        assert send(client, c, f"synthetic-request-{i:03}").status_code == 200
        assert client.delete(f"{PREFIX}/chat/conversations/{c}").status_code == 200
    assert send(client, conversation(client), "synthetic-request-last").status_code == 429


def test_quota_is_reserved_before_provider_and_survives_failure(client, monkeypatch):
    from lokifi.models import ChatQuota

    verified(client, monkeypatch)
    c = conversation(client)
    seen = []

    async def provider(messages, tools):
        with SessionLocal() as db:
            reservations = db.scalars(select(ChatQuota).where(ChatQuota.reserved > 0)).all()
            assert len(reservations) == 1
            assert reservations[0].actual is None
            seen.append(reservations[0].reserved)
        raise chat_provider.ProviderError("Synthetic provider failure")
        yield  # Make this an async generator without contacting a provider.

    monkeypatch.setattr(chat_provider, "stream_completion", provider)
    r = send(client, c)
    assert events(r)[-1]["data"]["status"] == "failed"
    assert seen and seen[0] > 1024
    with SessionLocal() as db:
        q = db.scalar(select(ChatQuota).where(ChatQuota.reserved > 0))
        assert q.actual is None  # Unknown usage is charged conservatively.
    monkeypatch.setattr(settings(), "chat_daily_tokens", 1)
    blocked = send(client, c, "synthetic-global-ceiling")
    assert any("shared free AI allowance" in e["data"].get("message", "") for e in events(blocked))
    assert len(seen) == 1


def test_crypto_preparation_builds_validated_reference_card_without_writing(client, monkeypatch):
    from lokifi import market_data
    from lokifi.schemas import AutomatedHolding

    verified(client, monkeypatch)
    p = portfolio(client)
    c = conversation(client, p)
    fixture = AutomatedHolding.model_validate(
        {
            "instrument": {
                "name": "Bitcoin",
                "category": "crypto",
                "identifier": "BTC",
                "venue": "COINBASE EXCHANGE",
                "currency": "EUR",
            },
            "acquisition": {
                "product_id": "BTC-EUR",
                "price": "123.45",
                "date": "2024-01-01",
                "observed_at": "2024-01-02T00:00:00Z",
                "kind": "daily_close",
                "source": "Synthetic historical reference",
            },
            "valuation": {
                "product_id": "BTC-EUR",
                "price": "234.56",
                "date": "2024-01-02",
                "observed_at": "2024-01-02T00:00:00Z",
                "kind": "latest_trade",
                "source": "Synthetic current reference",
            },
        }
    )

    async def resolve(symbol, acquired_at):
        assert symbol == "BTC" and str(acquired_at) == "2024-01-01"
        return fixture

    calls = []

    async def provider(messages, tools):
        if not calls:
            calls.append(True)
            yield {
                "kind": "tool",
                "id": "call_crypto",
                "name": "prepare_crypto_holding",
                "arguments": json.dumps({"symbol": "BTC", "quantity": "0.25", "acquired_at": "2024-01-01"}),
            }
        else:
            yield {"kind": "text", "text": "Review the reference prices before confirming."}
        yield {"kind": "usage", "tokens": 100}

    monkeypatch.setattr(market_data, "automated_holding", resolve)
    monkeypatch.setattr(chat_provider, "stream_completion", provider)
    response = send(client, c)
    proposal = next(e["data"] for e in events(response) if e["type"] == "proposal")
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"] == []
    holding = proposal["payload"]["holding"]
    assert holding["acquisition_price"] == "123.45"
    assert "not execution" in holding["acquisition_source"]
    assert client.post(f"{PREFIX}/chat/proposals/{proposal['id']}/confirm", json={}).status_code == 200
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["total"] == "58.64"


def test_expired_proposal_and_cross_user_send_are_denied(client, monkeypatch):
    from lokifi import chat_actions
    from lokifi.models import ChatProposal

    u = verified(client, monkeypatch)
    p = portfolio(client)
    c = conversation(client, p)
    with SessionLocal.begin() as db:
        prop = chat_actions.propose(
            db,
            u["id"],
            db.get(Conversation, c),
            "rename_portfolio",
            {"portfolio_id": p, "name": "Expired change"},
        )
        prop.expires_at = now() - timedelta(seconds=1)
        pid = prop.id
    assert client.post(f"{PREFIX}/chat/proposals/{pid}/confirm", json={}).status_code == 409
    with SessionLocal() as db:
        assert db.get(ChatProposal, pid).status == "pending"
    client.post(PREFIX + "/auth/logout")
    other = register(client, "other@example.com")
    with SessionLocal.begin() as db:
        db.get(User, other["id"]).email_verified = True
    client.post(PREFIX + "/account/ai-consent")
    assert send(client, c).status_code == 404


def test_cancel_expiry_and_retention(client, monkeypatch):
    u = verified(client, monkeypatch)
    c = conversation(client)
    with SessionLocal.begin() as db:
        run = ChatRun(
            user_id=u["id"], conversation_id=c, idempotency_key="synthetic-running", request_hash="a" * 64
        )
        db.add(run)
        db.flush()
        rid = run.id
    assert send(client, c).status_code == 409
    assert client.post(f"{PREFIX}/chat/runs/{rid}/cancel").status_code == 200
    with SessionLocal.begin() as db:
        db.get(Conversation, c).created_at = now() - timedelta(days=31)
    assert client.get(PREFIX + "/chat/conversations").json() == []


def test_verification_and_reset_tokens_are_single_use(client, monkeypatch):
    u = register(client)
    with SessionLocal.begin() as db:
        db.add(
            AccountToken(
                user_id=u["id"],
                kind="verify",
                token_hash=digest("verification-token-long-enough"),
                expires_at=now() + timedelta(minutes=5),
            )
        )
        db.add(
            AccountToken(
                user_id=u["id"],
                kind="reset",
                token_hash=digest("reset-token-long-enough"),
                expires_at=now() + timedelta(minutes=5),
            )
        )
    r = client.post(PREFIX + "/auth/verification/confirm", json={"token": "verification-token-long-enough"})
    assert r.status_code == 200
    assert (
        client.post(
            PREFIX + "/auth/verification/confirm", json={"token": "verification-token-long-enough"}
        ).status_code
        == 400
    )
    assert client.get(PREFIX + "/auth/me").json()["email_verified"]
    r = client.post(
        PREFIX + "/auth/reset-password",
        json={"token": "reset-token-long-enough", "password": "New+synthetic+password"},
    )
    assert r.status_code == 200
    assert client.get(PREFIX + "/auth/me").status_code == 401


def test_turnstile_rejects_wrong_hostname_and_action(monkeypatch):
    monkeypatch.setattr(settings(), "environment", "local")
    monkeypatch.setattr(settings(), "turnstile_secret", SecretStr("synthetic"))

    class Reply:
        def raise_for_status(self):
            pass

        def json(self):
            return {"success": True, "hostname": "evil.example", "action": "signup"}

    monkeypatch.setattr(account_security.httpx, "post", lambda *a, **k: Reply())
    with pytest.raises(HTTPException):
        account_security.challenge("synthetic", "signup")


def test_account_deletion_removes_owned_data(client, monkeypatch):
    verified(client, monkeypatch)
    p = portfolio(client)
    add(client, p, row())
    conversation(client, p)
    r = client.request("DELETE", PREFIX + "/account", json={"password": PASSWORD})
    assert r.status_code == 200, r.text
    assert client.get(PREFIX + "/auth/me").status_code == 401
    with SessionLocal() as db:
        assert db.scalar(select(User)) is None
        assert db.scalar(select(Holding)) is None
