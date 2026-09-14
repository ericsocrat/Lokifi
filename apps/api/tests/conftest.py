import os
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url


def safe_test_url(value: str) -> str:
    if not value:
        raise RuntimeError("LOKIFI_TEST_DATABASE_URL must explicitly name a disposable PostgreSQL database")
    target = make_url(value)
    if (
        target.drivername != "postgresql+psycopg"
        or target.host not in {"127.0.0.1", "localhost", "postgres"}
        or not (target.database or "").endswith("_test")
    ):
        raise RuntimeError("Refusing destructive tests outside a local PostgreSQL *_test database")
    return value


# This guard runs BEFORE importing the application or constructing its engine.
os.environ["LOKIFI_DATABASE_URL"] = safe_test_url(os.environ.get("LOKIFI_TEST_DATABASE_URL", ""))
os.environ["LOKIFI_ENVIRONMENT"] = "test"
os.environ["LOKIFI_WEB_ORIGIN"] = "http://127.0.0.1:13100"

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from lokifi.database import engine  # noqa: E402
from lokifi.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def schema():
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def empty_database(schema):
    with engine.begin() as c:
        c.execute(text("TRUNCATE users, auth_attempts, email_quota CASCADE"))


@pytest.fixture
def client():
    with TestClient(
        app, base_url="http://127.0.0.1:13100", headers={"Origin": "http://127.0.0.1:13100"}
    ) as c:
        yield c
