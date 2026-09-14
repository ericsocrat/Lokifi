"""Create a PostgreSQL backup and prove restoration into an explicit local test database."""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path

import psycopg
from sqlalchemy.engine import make_url

ROOT = Path(__file__).resolve().parents[1]


def target(value, restoring=False):
    url = make_url(value)
    if url.drivername != "postgresql+psycopg":
        raise ValueError("PostgreSQL with psycopg is required")
    if restoring and (url.host not in {"localhost", "127.0.0.1"} or not (url.database or "").endswith("_test")):
        raise ValueError("Restore is restricted to an explicitly named local *_test database")
    return url


def signature(url):
    with psycopg.connect(host=url.host, port=url.port or 5432, user=url.username, password=url.password, dbname=url.database) as db:
        tables = db.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").fetchall()
        contents = {}
        for (table,) in tables:
            statement = psycopg.sql.SQL("SELECT row_to_json(t)::text FROM {} t ORDER BY row_to_json(t)::text").format(psycopg.sql.Identifier(table))
            values = [row[0] for row in db.execute(statement).fetchall()]
            contents[table] = {"rows":len(values),"sha256":hashlib.sha256("\n".join(values).encode()).hexdigest()}
        return contents


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--restore-test',action='store_true');args=parser.parse_args()
    source_url=os.environ.get('LOKIFI_DATABASE_URL')
    if not source_url:
        cfg=json.loads((ROOT/'.local/database.json').read_text())
        source_url=f"postgresql+psycopg://lokifi:{cfg['password']}@127.0.0.1:{cfg['port']}/lokifi_rebuild"
    source=target(source_url)
    binary_dir=ROOT/'.local/postgres/node_modules/@embedded-postgres/windows-x64/native/bin'
    def binary(name):
        candidate=binary_dir/(name+'.exe')
        container=os.environ.get('LOKIFI_PG_CONTAINER')
        return ['docker','exec','-i','-e','PGPASSWORD',container,name] if container else [str(candidate) if candidate.exists() else shutil.which(name) or name]
    backup=ROOT/'.local/backups/portfolio.dump';backup.parent.mkdir(parents=True,exist_ok=True)
    env={**os.environ,'PGPASSWORD':source.password or ''}
    before=signature(source)
    dump=subprocess.run([*binary('pg_dump'),'-h',source.host,'-p',str(source.port or 5432),'-U',source.username,'-d',source.database,'-Fc'],env=env,check=True,capture_output=True)
    backup.write_bytes(dump.stdout)
    report={'backup':'created','source_signature':before}
    if args.restore_test:
        restore=target(os.environ.get('LOKIFI_RESTORE_DATABASE_URL') or source.set(database='lokifi_restore_test').render_as_string(hide_password=False),True)
        if source.database==restore.database and source.host==restore.host and source.port==restore.port:
            raise ValueError('Refusing to restore onto source database')
        subprocess.run([*binary('pg_restore'),'-h',restore.host,'-p',str(restore.port or 5432),'-U',restore.username,'-d',restore.database,'--clean','--if-exists','--exit-on-error','--no-owner'],env={**os.environ,'PGPASSWORD':restore.password or ''},check=True,capture_output=True,input=backup.read_bytes())
        after=signature(restore)
        if before!=after:
            raise RuntimeError('Restored records do not match; stop writes during the verification snapshot')
        report['restore']='PASS: all table row counts and content hashes match'
    (ROOT/'.local/backups/verification.json').write_text(json.dumps(report,indent=2))
    print('Backup created'+('; restoration verified by table content hashes' if args.restore_test else ''))


if __name__=='__main__':
    main()
