# Operations

## Local runtime

`Start-Lokifi.cmd` calls `tools/start.ps1`. It installs locked dependencies if missing, prepares the embedded PostgreSQL distribution under `.local/postgres`, starts PostgreSQL, applies the schema, starts API and web, and opens the browser. No global PostgreSQL service or existing Docker volume is changed. The downloaded runtime is PostgreSQL 17.6 via embedded-postgres 17.6.0-beta.15; this is development tooling, not the proposed public database distribution.

Credentials are generated into ignored `.local/database.json`. The data directory is `.local/pgdata`. The browser uses port 13100; API 18100; database 15439, all bound to 127.0.0.1. Browser records do not disappear when a tab is closed or another device/session signs in. Local PostgreSQL must remain running while using the app.

Developer API configuration: `LOKIFI_DATABASE_URL` (postgresql+psycopg), `LOKIFI_ENVIRONMENT` (local/test/production), `LOKIFI_WEB_ORIGIN` and optional `LOKIFI_SESSION_HOURS` (1–168). Web configuration: server-only `LOKIFI_API_ORIGIN`. No NEXT_PUBLIC credentials or market-provider variables are used.

The launcher builds only when a build is absent. After changing code, run `npm run build` before starting the production server. For development use `npm run dev`. Do not run build and dev concurrently for release evidence; verify the built server after stopping dev.

An optional loopback-only Compose configuration is supplied. It requires `LOKIFI_DB_PASSWORD`, keeps database/API private and publishes only the web port. Docker execution was not verified on this workstation because Docker Desktop fails before its engine starts. Native PostgreSQL execution is the verified path.

## Backups and recovery

Run `uv run --directory apps/api python ../../tools/backup.py` from the repository root. It creates a custom-format dump under `.local/backups/portfolio.dump`. The file contains private records: keep it in user-controlled storage and do not commit it. It is not an encrypted off-site backup.

`--restore-test` restores into `lokifi_restore_test` by default, using `pg_restore --clean --if-exists`. It refuses a non-local target, a database not ending in `_test`, or the source database itself. All public table row counts and content hashes must match the source. Run without concurrent writes for a deterministic comparison. This is a destructive operation only on the dedicated restore-test database.

If PostgreSQL command tools are on PATH they are used; the local Windows distribution is discovered automatically. CI can set `LOKIFI_PG_CONTAINER` to use the matching PostgreSQL service container's tools. Source/restore passwords are passed as environment variables, not command-line URLs.

For real recovery, preserve the damaged database and dump first. Restore to a new database, run migrations and integrity checks, then change the API database configuration only after approving the verified result. No script automatically replaces a production database.

## Release process

1. Fresh checkout; `npm ci --ignore-scripts`; `uv sync --project apps/api --frozen`.
2. Point `LOKIFI_TEST_DATABASE_URL` at a dedicated local `*_test` PostgreSQL database. Tests validate this before importing the app.
3. Run `npm run verify`; it stops on any failed required check.
4. Start the built web application and API, then run desktop/mobile browser journeys and axe accessibility checks.
5. Verify backup restoration and record the revision and evidence paths.
6. Prepare an explicit deployment proposal before any purchase, publication, credential change or DNS edit.

The GitHub workflow implements these gates without source rewriting or continue-on-error. It has been authored locally; no push or hosted workflow execution has occurred. Do not call remote CI green until it actually runs on the final revision.

## Public-pilot work deliberately outstanding

TLS/secure cookie readback on the actual origin; off-site encrypted backups and restore ownership; public account recovery and deletion; privacy notices/retention; monitoring and alert ownership; abuse capacity limits; licensing for any proposed quote provider. Current alpha has no email sender, broker connection or automatic price ingestion. These are public-release prerequisites, not hidden completed features.
