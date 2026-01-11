import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.services.data_archival_service import (
    ArchivalStats,
    DataArchivalService,
    StorageMetrics,
)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class FakeSession:
    """Minimal async session stub supporting scalar() and execute()."""

    def __init__(self):
        self._scalar_call = 0
        self.executed_sql: list[str] = []
        self._select_rows: list[tuple | object] = []
        self.raise_on_execute: bool = False

    async def scalar(self, query):
        # Drive scalar returns by call order for simplicity in tests
        # 1: threads count, 2: messages count, 3: oldest, 4: newest, 5+: archive table metrics
        self._scalar_call += 1
        if self._scalar_call == 1:
            return 5
        if self._scalar_call == 2:
            return 10
        if self._scalar_call == 3:
            return datetime(2020, 1, 1)
        if self._scalar_call == 4:
            return datetime(2020, 12, 31)
        # Simulate archive table missing for metrics tests
        raise Exception("archive table missing")

    async def execute(self, query, params=None):
        if self.raise_on_execute:
            raise RuntimeError("execute failed")
        # Record SQL for assertions in vacuum tests
        try:
            self.executed_sql.append(str(query))
        except Exception:
            pass
        # For compression selection query, return rows via FakeResult
        return FakeResult(self._select_rows)


async def _fake_session_gen(session: FakeSession):
    yield session


def _make_service(
    enabled: bool = True, db_url: str = "sqlite://"
) -> DataArchivalService:
    settings = SimpleNamespace(
        ARCHIVE_THRESHOLD_DAYS=30,
        DELETE_THRESHOLD_DAYS=180,
        ENABLE_DATA_ARCHIVAL=enabled,
        DATABASE_URL=db_url,
    )
    return DataArchivalService(settings=settings)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_get_storage_metrics_handles_archive_absent(monkeypatch):
    service = _make_service()
    session = FakeSession()

    # Patch get_session to yield our fake session
    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=True: _fake_session_gen(session),
    )

    metrics = await service.get_storage_metrics()

    assert isinstance(metrics, StorageMetrics)
    assert metrics.total_threads == 5
    assert metrics.total_messages == 10
    assert metrics.archived_messages == 0
    assert metrics.ai_messages_archive_size_mb == 0.0
    assert metrics.oldest_message_date == datetime(2020, 1, 1)
    assert metrics.newest_message_date == datetime(2020, 12, 31)
    # Rough size estimates present
    assert metrics.total_size_mb > 0


@pytest.mark.asyncio
async def test_create_archive_table_error_propagates(monkeypatch):
    service = _make_service()
    session = FakeSession()
    session.raise_on_execute = True

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    with pytest.raises(RuntimeError):
        await service.create_archive_table_if_not_exists()


@pytest.mark.asyncio
async def test_archive_old_conversations_disabled():
    service = _make_service(enabled=False)
    stats = await service.archive_old_conversations()
    assert isinstance(stats, ArchivalStats)
    assert stats.messages_archived == 0


@pytest.mark.asyncio
async def test_archive_old_conversations_success(monkeypatch):
    service = _make_service(enabled=True)

    # Avoid table creation side effects
    monkeypatch.setattr(
        service, "create_archive_table_if_not_exists", lambda: asyncio.sleep(0)
    )

    session = FakeSession()
    # Make next scalar (old_count) return a specific value
    session._scalar_call = 4  # next scalar call is the old_count lookup

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=True: _fake_session_gen(session),
    )

    stats = await service.archive_old_conversations()
    assert stats.messages_archived >= 0
    assert stats.operation_duration >= 0


@pytest.mark.asyncio
async def test_vacuum_database_sqlite(monkeypatch):
    service = _make_service(db_url="sqlite://")
    session = FakeSession()

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    await service.vacuum_database()

    # Ensure VACUUM was issued for SQLite
    assert any("VACUUM" in sql and "ANALYZE" not in sql for sql in session.executed_sql)


@pytest.mark.asyncio
async def test_vacuum_database_postgres(monkeypatch):
    service = _make_service(db_url="postgresql://localhost/lokifi")
    session = FakeSession()

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    await service.vacuum_database()

    # Ensure VACUUM ANALYZE was issued for both tables on PostgreSQL
    joined = "\n".join(session.executed_sql)
    assert "VACUUM ANALYZE ai_messages" in joined
    assert "VACUUM ANALYZE ai_threads" in joined


@pytest.mark.asyncio
async def test_vacuum_database_error(monkeypatch):
    service = _make_service(db_url="sqlite://")
    session = FakeSession()
    session.raise_on_execute = True

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    with pytest.raises(RuntimeError):
        await service.vacuum_database()


@pytest.mark.asyncio
async def test_run_full_maintenance_success(monkeypatch):
    service = _make_service()

    async def _fake_archive():
        return ArchivalStats(messages_archived=7)

    async def _fake_metrics():
        return StorageMetrics(total_size_mb=12.5, total_messages=123)

    async def _fake_vacuum():
        return None

    monkeypatch.setattr(service, "archive_old_conversations", _fake_archive)
    monkeypatch.setattr(service, "get_storage_metrics", _fake_metrics)
    monkeypatch.setattr(service, "vacuum_database", _fake_vacuum)

    results = await service.run_full_maintenance()
    assert "archive" in results
    assert isinstance(results["archive"], ArchivalStats)
    assert results["archive"].messages_archived == 7


@pytest.mark.asyncio
async def test_run_full_maintenance_error(monkeypatch):
    service = _make_service()

    async def _boom():
        raise RuntimeError("maintenance failed")

    monkeypatch.setattr(service, "archive_old_conversations", _boom)

    with pytest.raises(RuntimeError):
        await service.run_full_maintenance()


@pytest.mark.asyncio
async def test_compress_old_messages_disabled():
    service = _make_service(enabled=False)
    stats = await service.compress_old_messages()
    assert stats.messages_compressed == 0


@pytest.mark.asyncio
async def test_compress_old_messages_no_rows(monkeypatch):
    service = _make_service(enabled=True)
    session = FakeSession()
    session._select_rows = []

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    stats = await service.compress_old_messages(batch_size=50)
    assert stats.messages_compressed == 0
    assert stats.operation_duration >= 0


@pytest.mark.asyncio
async def test_compress_old_messages_with_rows(monkeypatch):
    service = _make_service(enabled=True)
    session = FakeSession()

    # Provide rows with mapping and tuple forms
    class RowObj:
        def __init__(self, id, content):
            self._mapping = {"id": id, "content": content}

    session._select_rows = [
        RowObj(1, "hello world"),
        (2, "another message"),
    ]

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    stats = await service.compress_old_messages(batch_size=10)
    assert stats.messages_compressed == 2
    # Expect some positive savings (gzip compresses text)
    assert stats.space_freed_mb >= 0
    assert stats.operation_duration >= 0


@pytest.mark.asyncio
async def test_delete_expired_conversations_disabled():
    service = _make_service(enabled=False)
    stats = await service.delete_expired_conversations()
    assert stats.messages_deleted == 0


@pytest.mark.asyncio
async def test_delete_expired_conversations_paths(monkeypatch):
    service = _make_service(enabled=True)
    session = FakeSession()

    # Make first scalar call in this method be delete_count
    session._scalar_call = 0

    from app.services import data_archival_service as das_mod

    monkeypatch.setattr(
        das_mod.db_manager,
        "get_session",
        lambda read_only=False: _fake_session_gen(session),
    )

    # First run: delete_count > 0 → conservative 0 deletions
    stats1 = await service.delete_expired_conversations(batch_size=100)
    assert stats1.messages_deleted == 0

    # Second run: ensure no exceptions when count is falsy (simulate by raising on next scalar)
    session._scalar_call = 0

    async def scalar_zero(_):
        return 0

    # Patch scalar to return 0
    session.scalar = scalar_zero  # type: ignore[assignment]
    stats2 = await service.delete_expired_conversations(batch_size=100)
    assert stats2.messages_deleted == 0
