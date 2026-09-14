import csv
import io
from datetime import date, timedelta
from decimal import Decimal

import pytest
from conftest import safe_test_url
from fastapi.testclient import TestClient

from lokifi.database import SessionLocal
from lokifi.identity import COOKIE, digest
from lokifi.main import app
from lokifi.models import LoginSession, User, now
from lokifi.portfolios import CSV_FIELDS

PREFIX = "/api/v1"
PASSWORD = "Twelve+safe+characters"


def register(c, email="alice@example.com"):
    response = c.post(PREFIX + "/auth/register", json={"name": "Alice", "email": email, "password": PASSWORD})
    assert response.status_code == 201, response.text
    return response.json()


def portfolio(c):
    r = c.post(PREFIX + "/portfolios", json={"name": "Long-term holdings"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def row(code="FUND", currency="EUR", price="0.1", quantity="3", rate=None):
    d = date.today().isoformat()
    return {
        "instrument": {
            "name": code,
            "category": "etf",
            "identifier": code,
            "venue": "XETRA",
            "currency": currency,
        },
        "quantity": quantity,
        "price": price,
        "valued_at": d if price is not None else None,
        "source": "Manual statement",
        "fx_rate": rate,
        "fx_at": d if rate is not None else None,
        "fx_source": "Statement FX" if rate is not None else None,
    }


def add(c, p, data):
    return c.post(f"{PREFIX}/portfolios/{p}/holdings", json=data)


def csv_text(rows):
    out = io.StringIO()
    writer = csv.DictWriter(out, CSV_FIELDS)
    writer.writeheader()
    for r in rows:
        writer.writerow({**r["instrument"], **{k: v for k, v in r.items() if k != "instrument"}})
    return out.getvalue()


def preview(c, p, rows):
    return c.post(f"{PREFIX}/portfolios/{p}/imports/preview", json={"csv_text": csv_text(rows)})


def test_complete_journey_persists_across_clients_and_logout(client):
    register(client)
    p = portfolio(client)
    h = add(client, p, row()).json()
    assert h["eur_value"] is not None and Decimal(h["eur_value"]) == Decimal("0.3")
    fresh = TestClient(app, base_url="http://127.0.0.1:13100", headers={"Origin": "http://127.0.0.1:13100"})
    assert fresh.get(f"{PREFIX}/portfolios/{p}").status_code == 401
    assert (
        fresh.post(
            PREFIX + "/auth/login", json={"email": "alice@example.com", "password": PASSWORD}
        ).status_code
        == 200
    )
    assert fresh.get(f"{PREFIX}/portfolios/{p}").json()["total"] == "0.30"
    token = client.cookies.get(COOKIE)
    assert client.post(PREFIX + "/auth/logout").status_code == 200
    client.cookies.set(COOKIE, token)
    assert client.get(PREFIX + "/auth/me").status_code == 401
    assert fresh.get(f"{PREFIX}/portfolios/{p}").json()["holdings"][0]["id"] == h["id"]
    fresh.close()


def test_anonymous_and_cross_user_access_denied(client):
    for path in ("/portfolios", "/watchlist", "/account/export", "/admin/status"):
        assert client.get(PREFIX + path).status_code == 401
    user = register(client)
    p = portfolio(client)
    h = add(client, p, row()).json()
    watch = client.post(PREFIX + "/watchlist", json={"instrument": row()["instrument"]}).json()
    assert client.get(PREFIX + "/admin/status").status_code == 403
    batch = preview(client, p, [row("NEW")]).json()
    client.post(PREFIX + "/auth/logout")
    register(client, "bob@example.com")
    for path in (f"/portfolios/{p}", f"/portfolios/{p}/export", f"/holdings/{h['id']}"):
        assert client.get(PREFIX + path).status_code == 404
    assert client.post(f"{PREFIX}/imports/{batch['id']}/commit").status_code == 404
    assert client.delete(f"{PREFIX}/watchlist/{watch['id']}").status_code == 404
    assert add(client, p, row("OTHER")).status_code == 404
    assert client.get(PREFIX + "/instruments").json() == []
    assert client.get(PREFIX + "/portfolios").json() == []
    with SessionLocal.begin() as db:
        db.get(User, user["id"]).is_admin = True


def test_admin_and_session_expiry(client):
    u = register(client)
    with SessionLocal.begin() as db:
        db.get(User, u["id"]).is_admin = True
    assert client.get(PREFIX + "/admin/status").status_code == 200
    with SessionLocal.begin() as db:
        db.get(LoginSession, digest(client.cookies.get(COOKIE))).expires_at = now() - timedelta(seconds=1)
    assert client.get(PREFIX + "/auth/me").status_code == 401


def test_csrf_cookie_and_password_rotation(client):
    r = client.post(
        PREFIX + "/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": PASSWORD},
        headers={"Origin": "https://evil.example"},
    )
    assert r.status_code == 403
    r = client.post(
        PREFIX + "/auth/register", json={"name": "Alice", "email": "alice@example.com", "password": PASSWORD}
    )
    assert "HttpOnly" in r.headers["set-cookie"] and "SameSite=lax" in r.headers["set-cookie"]
    token = client.cookies.get(COOKIE)
    r = client.post(
        PREFIX + "/auth/password",
        json={"current_password": PASSWORD, "new_password": "New secure password 123"},
    )
    assert r.status_code == 200, r.text
    rotated = client.cookies.get(COOKIE)
    assert token != rotated
    with SessionLocal() as db:
        assert db.get(LoginSession, digest(token)) is None
    assert (
        client.post(
            PREFIX + "/auth/login", json={"email": "alice@example.com", "password": PASSWORD}
        ).status_code
        == 401
    )
    assert (
        client.post(
            PREFIX + "/auth/login", json={"email": "alice@example.com", "password": "New secure password 123"}
        ).status_code
        == 200
    )


def test_missing_fx_prices_and_no_invented_returns(client):
    register(client)
    p = portfolio(client)
    assert add(client, p, row()).status_code == 201
    assert add(client, p, row("USD", "USD", "10", "2", "0.9")).status_code == 201
    assert add(client, p, row("NO-FX", "USD", "10", "2")).status_code == 201
    assert add(client, p, row("NO-PRICE", price=None)).status_code == 201
    result = client.get(f"{PREFIX}/portfolios/{p}").json()
    assert result["total"] is None and not result["complete"] and result["missing_count"] == 2
    assert result["valued_subtotal"] == "18.30"
    assert result["allocation"][0]["percentage"] == "100.00"
    assert "return" not in result and "performance" not in result
    assert {h["status"] for h in result["holdings"]} == {"valued", "missing_price", "missing_fx"}


def test_zero_price_and_stale_date_are_not_missing(client):
    register(client)
    p = portfolio(client)
    data = row(price="0")
    data["valued_at"] = (date.today() - timedelta(days=30)).isoformat()
    r = add(client, p, data)
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "valued" and r.json()["stale"]
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["total"] == "0.00"


@pytest.mark.parametrize(
    "field,value",
    [
        ("quantity", "NaN"),
        ("quantity", "Infinity"),
        ("quantity", "0"),
        ("quantity", "-1"),
        ("price", "-1"),
        ("price", "0.123456789012"),
        ("fx_rate", "0"),
        ("valued_at", "2999-01-01"),
    ],
)
def test_invalid_financial_input(client, field, value):
    register(client)
    p = portfolio(client)
    data = row()
    data[field] = value
    assert add(client, p, data).status_code == 422
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"] == []


def test_instrument_identity_and_optimistic_edit(client):
    register(client)
    p = portfolio(client)
    data = row()
    r = add(client, p, data)
    assert r.status_code == 201
    h = r.json()
    assert add(client, p, data).status_code == 409
    other = row()
    other["instrument"]["venue"] = "LSE"
    assert add(client, p, other).status_code == 201
    update = {**data, "quantity": "5", "version": h["version"]}
    r = client.put(PREFIX + "/holdings/" + h["id"], json=update)
    assert r.status_code == 200, r.text
    assert client.put(PREFIX + "/holdings/" + h["id"], json=update).status_code == 409
    conflicting = row()
    conflicting["instrument"]["name"] = "Wrong name"
    assert add(client, p, conflicting).status_code == 409


def test_import_preview_atomic_commit_and_duplicates(client):
    register(client)
    p = portfolio(client)
    r = preview(client, p, [row(), row("SECOND")])
    assert r.status_code == 200, r.text
    batch = r.json()["id"]
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"] == []
    r = client.post(f"{PREFIX}/imports/{batch}/commit")
    assert r.status_code == 200, r.text
    assert len(r.json()["holdings"]) == 2 and r.json()["total"] == "0.60"
    assert client.post(f"{PREFIX}/imports/{batch}/commit").status_code == 409
    assert preview(client, p, [row(), row("SECOND")]).status_code == 409


def test_import_late_conflict_rolls_back_all_rows(client):
    register(client)
    p = portfolio(client)
    batch = preview(client, p, [row("FIRST"), row("SECOND")]).json()["id"]
    assert add(client, p, row("SECOND")).status_code == 201
    assert client.post(f"{PREFIX}/imports/{batch}/commit").status_code == 409
    hs = client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"]
    assert len(hs) == 1 and hs[0]["instrument"]["identifier"] == "SECOND"


def test_import_validation_headers_rows_and_ambiguous_instruments(client):
    register(client)
    p = portfolio(client)
    assert preview(client, p, [row(), row()]).status_code == 422
    wrong = row()
    wrong["instrument"]["venue"] = ""
    assert preview(client, p, [row("VALID"), wrong]).status_code == 422
    malformed = ",".join(CSV_FIELDS) + ",price\n"
    assert (
        client.post(f"{PREFIX}/portfolios/{p}/imports/preview", json={"csv_text": malformed}).status_code
        == 422
    )
    wrong = row()
    wrong["quantity"] = "garbage"
    assert preview(client, p, [row("VALID"), wrong]).status_code == 422
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"] == []


def test_exports_are_private_and_spreadsheet_safe(client):
    register(client)
    p = portfolio(client)
    data = row()
    data["source"] = "=CMD()"
    assert add(client, p, data).status_code == 201
    r = client.get(f"{PREFIX}/portfolios/{p}/export")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    exported = list(csv.DictReader(io.StringIO(r.text)))
    assert exported[0]["source"] == "'=CMD()"
    exported = client.get(PREFIX + "/account/export").json()
    assert exported["portfolios"][0]["holdings"][0]["source"] == "=CMD()"
    assert "password_hash" not in str(exported) and "token_hash" not in str(exported)


def test_demo_explicit_separate_readonly(client):
    register(client)
    assert client.get(PREFIX + "/portfolios").json() == []
    r = client.post(PREFIX + "/demo")
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["is_demo"]
    result = client.get(PREFIX + "/portfolios/" + p["id"]).json()
    assert result["total"] == "20300.00"
    assert all("Synthetic" in h["source"] for h in result["holdings"])
    assert add(client, p["id"], row()).status_code == 409
    assert client.post(PREFIX + "/demo").json()["id"] == p["id"]


def test_throttling_persists_across_failed_logins(client):
    for _ in range(10):
        assert (
            client.post(
                PREFIX + "/auth/login", json={"email": "missing@example.com", "password": PASSWORD}
            ).status_code
            == 401
        )
    assert (
        client.post(
            PREFIX + "/auth/login", json={"email": "missing@example.com", "password": PASSWORD}
        ).status_code
        == 429
    )


@pytest.mark.parametrize(
    "url",
    [
        "",
        "postgresql+psycopg://u@localhost/production",
        "postgresql+psycopg://u@remote.example/allowed_test",
        "sqlite:///test.db",
    ],
)
def test_destructive_test_guard(url):
    with pytest.raises(RuntimeError):
        safe_test_url(url)


def test_production_cookie_requires_https_configuration(client, monkeypatch):
    from pydantic import ValidationError

    from lokifi.config import Settings, settings

    with pytest.raises(ValidationError):
        Settings(
            database_url="postgresql+psycopg://u@localhost/test",
            environment="production",
            web_origin="http://localhost",
        )
    monkeypatch.setattr(settings(), "environment", "production")
    response = client.post(
        PREFIX + "/auth/register", json={"name": "Alice", "email": "alice@example.com", "password": PASSWORD}
    )
    assert response.status_code == 201
    assert "Secure" in response.headers["set-cookie"]


def test_expired_preview_cannot_commit(client):
    from lokifi.models import ImportBatch

    register(client)
    p = portfolio(client)
    batch = preview(client, p, [row()]).json()["id"]
    with SessionLocal.begin() as db:
        db.get(ImportBatch, batch).created_at = now() - timedelta(hours=1)
    assert client.post(f"{PREFIX}/imports/{batch}/commit").status_code == 409
    assert client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"] == []


def test_unknown_fields_secrets_and_size_limits(client):
    response = client.post(
        PREFIX + "/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": PASSWORD, "is_admin": True},
    )
    assert response.status_code == 422 and PASSWORD not in response.text
    assert (
        client.post(
            PREFIX + "/auth/register", content=b"x" * 600001, headers={"Content-Type": "application/json"}
        ).status_code
        == 413
    )
    assert client.get(PREFIX + "/health").headers["cache-control"] == "no-store"


def test_password_whitespace_is_significant(client):
    response = client.post(
        PREFIX + "/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": " " + PASSWORD + " "},
    )
    assert response.status_code == 201
    client.post(PREFIX + "/auth/logout")
    assert (
        client.post(
            PREFIX + "/auth/login", json={"email": "alice@example.com", "password": PASSWORD}
        ).status_code
        == 401
    )
    assert (
        client.post(
            PREFIX + "/auth/login", json={"email": "alice@example.com", "password": " " + PASSWORD + " "}
        ).status_code
        == 200
    )


def test_demo_holding_metadata_and_readonly_enforcement(client):
    register(client)
    p = client.post(PREFIX + "/demo").json()["id"]
    h = client.get(f"{PREFIX}/portfolios/{p}").json()["holdings"][0]
    assert h["is_demo"] and client.get(PREFIX + "/holdings/" + h["id"]).json()["is_demo"]
    assert client.delete(PREFIX + "/holdings/" + h["id"]).status_code == 409
