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
6. Deploy only the approved revision and configuration. Purchases and paid upgrades require a separate decision; the current beta is explicitly restricted to free services.

The GitHub workflow implements these gates without source rewriting or continue-on-error. Hosted CI passed for application revision `fa8d7638`, including PostgreSQL integration, browser tests, and restoration. See [hosted beta evidence](hosted-beta.md).

## Hosted beta operations

The runtime is Cloudflare Pages, Render Free Frankfurt, Neon Free Frankfurt, Groq Free and Resend Free. API secrets live on Render; the proxy secret and upstream origin live in Pages secrets. Registration, recovery and verification use server-validated Turnstile. Production configuration refuses open signup without the required email, proxy, bot-protection and support settings.

Use `LOKIFI_SIGNUP_ENABLED=false` to pause registration and `LOKIFI_GROQ_FREE_CONFIRMED=false` to disable inference without deleting records. Apply through Render secrets/environment configuration and redeploy. No artificial keep-alive traffic is configured. Do not upgrade services or add a card automatically.

The original verified local backup and the migration hash report remain in ignored `.local/backups` and `.local/hosted-migration-verification.json`. They represent the cutover snapshot, not subsequent hosted edits. Scheduled off-site backup automation is not configured; export current records before recovery work. Broader adoption requires an agreed ongoing backup and monitoring owner. There is no broker connection, scheduled price ingestion, or automatic equity/ETF pricing.
