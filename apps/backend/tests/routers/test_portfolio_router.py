from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.portfolio import router as portfolio_router


def create_test_app() -> TestClient:
    app = FastAPI()
    app.include_router(portfolio_router)
    return TestClient(app, raise_server_exceptions=False)


def test_create_portfolio_success():
    client = create_test_app()
    payload = {
        "name": "My Portfolio",
        # is_public defaults to False if omitted
        "benchmark_symbol": "^GSPC",
    }
    res = client.post("/portfolio/", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["name"] == "My Portfolio"
    assert data["benchmark_symbol"] == "^GSPC"
    # default from schema
    assert data["is_public"] is False


def test_add_holding_success():
    client = create_test_app()
    payload = {
        "symbol": "AAPL",
        "quantity": 10.0,
        "cost_basis": 150.25,
    }
    res = client.post("/portfolio/1/holdings", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["symbol"] == "AAPL"
    assert data["quantity"] == 10.0
    assert data["cost_basis"] == 150.25
