"""Copy existing records to the approved EMPTY Neon database, verifying exact content.

Run after backup.py --restore-test and remote Alembic migration. Source is read-only.
Sessions and throttling/token state are deliberately not migrated.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

import psycopg
from psycopg import sql

ROOT = Path(__file__).resolve().parents[1]
cfg = json.loads((ROOT / ".local/database.json").read_text(encoding="utf-8-sig"))
private = json.loads((ROOT / ".local/hosting-secrets.json").read_text(encoding="utf-8-sig"))
destination = private["NEON_DATABASE_URL"]
assert urlparse(destination).hostname == "ep-calm-feather-b246y4yv-pooler.c-6.eu-central-1.aws.neon.tech"
backup_report = json.loads((ROOT / ".local/backups/verification.json").read_text())
assert backup_report.get("restore", "").startswith("PASS"), "A verified backup is required"
tables = ["users", "instruments", "portfolios", "holdings", "imports", "watchlist"]

def signature(db, table, columns):
    query = sql.SQL("SELECT row_to_json(t)::text FROM (SELECT {} FROM {}) t ORDER BY row_to_json(t)::text").format(
        columns, sql.Identifier(table))
    values = [row[0] for row in db.execute(query)]
    return {"rows": len(values), "sha256": hashlib.sha256("\n".join(values).encode()).hexdigest()}

with psycopg.connect(host="127.0.0.1", port=cfg["port"], user="lokifi", password=cfg["password"],
                     dbname="lokifi_rebuild") as source, psycopg.connect(destination) as target:
    source.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    source.execute("SET client_encoding TO 'UTF8'")
    target.execute("SET client_encoding TO 'UTF8'")
    # Match serialization timezone when comparing timestamp text, without altering stored instants.
    timezone = source.execute("SHOW TimeZone").fetchone()[0]
    target.execute("SELECT set_config('TimeZone', %s, true)", (timezone,))
    target.execute("SELECT pg_advisory_xact_lock(8123109)")
    remote_tables = [r[0] for r in target.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")]
    assert set(tables).issubset(remote_tables), "Run remote migrations first"
    for table in remote_tables:
        if table != "alembic_version":
            count = target.execute(sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))).fetchone()[0]
            assert count == 0, f"Refusing to overwrite nonempty remote table {table}"
    report = {"sessions_migrated": False, "tables": {}}
    for table in tables:
        names = [r[0] for r in source.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", (table,))]
        columns = sql.SQL(",").join(map(sql.Identifier, names))
        before = signature(source, table, columns)
        assert before == backup_report["source_signature"][table], "Source changed since verified backup"
        with source.cursor().copy(sql.SQL("COPY (SELECT {} FROM {}) TO STDOUT").format(columns, sql.Identifier(table))) as outgoing:
            with target.cursor().copy(sql.SQL("COPY {} ({}) FROM STDIN").format(sql.Identifier(table), columns)) as incoming:
                for block in outgoing:
                    incoming.write(block)
        assert signature(target, table, columns) == before, f"Content mismatch: {table}; transaction rolled back"
        report["tables"][table] = before
    assert target.execute("SELECT count(*) FROM sessions").fetchone()[0] == 0
    target.commit()
    (ROOT / ".local/hosted-migration-verification.json").write_text(json.dumps(report, indent=2))
    print("Hosted migration verified: exact source hashes match; all hosted sessions invalidated.")
    print(json.dumps({table: value["rows"] for table, value in report["tables"].items()}))
