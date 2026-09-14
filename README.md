# Lokifi

A portfolio workspace for understanding what you own, how it is valued, and where each figure comes from. English-first, EUR reporting, automatic crypto lookup plus manual or CSV-imported valuations. **Public beta: [lokifi.com](https://lokifi.com).** Runtime services are hosted remotely on free plans.

## Open locally on Windows

With Node.js 24 and uv installed, double-click **Start-Lokifi.cmd**. It prepares the locked dependencies, starts a dedicated PostgreSQL database and the application, then opens [Lokifi](http://127.0.0.1:13100). Create your account in the interface. No API keys, paid accounts, or hand-edited data files are needed.

The first setup downloads packages and a local PostgreSQL runtime. Records are stored under `.local/pgdata`, not in browser storage. Do not delete `.local` to troubleshoot. Docker is optional; the launcher does not alter existing Docker volumes or services.

## What works

- Account registration, sign-in/out, profile editing, password changes and session revocation.
- Multiple portfolios; manual holdings; explicit stock, ETF, crypto and cash identity.
- Crypto symbol lookup with Coinbase EUR identity, purchase-date daily close, and latest-trade valuation.
- Dated prices, sources and EUR conversion rates; incomplete valuations stay visible.
- CSV template, validated preview, atomic commit and duplicate protection.
- Holding details and editing, watchlist, CSV exports and full-account JSON exports.
- A separate, read-only synthetic example portfolio.
- Automatic signup verification emails, a locked workspace until verification, recovery and account deletion.
- Groq-hosted Assistant with saved conversations, portfolio explanations and separately confirmed changes.

There are no fabricated returns, trading operations, or active legacy administration interfaces. AI can make mistakes; records change only after confirmation. Public research is disabled because the tested browser-search call exceeded the beta's safe per-turn token budget. Automatic crypto references come from Coinbase Exchange public market data; a historical daily close may differ from the user's execution price. Manual records remain user-supplied rather than independently verified.

## Developer setup

Use Node 24, Python 3.12 and uv 0.12.9. From the repository root:

```powershell
npm ci --ignore-scripts
uv sync --project apps/api --frozen
powershell -File tools/start.ps1 -SetupOnly
node tools/local-postgres.mjs
```

In separate terminals, migrate and start the API and web application:

```powershell
powershell -File tools/api.ps1 -Migrate
powershell -File tools/api.ps1
npm run dev
```

Backend: loopback port 18100. Browser: loopback port 13100, which proxies `/api/v1` to the API. PostgreSQL: loopback port 15439. The local launcher creates unique database credentials; they are never committed.

## Verification

```powershell
npm run verify
$env:PLAYWRIGHT_CHANNEL='msedge' # Windows; omit with Playwright Chromium installed
npm run test:e2e
uv run --directory apps/api python ../../tools/backup.py --restore-test
```

`verify` checks Python, real PostgreSQL integration, generated API contracts, frontend types/lint/build, and npm advisories. E2E requires running API/web servers; use `npm start` to exercise the production build. A fresh checkout can run all checks using `LOKIFI_TEST_DATABASE_URL` pointing to an isolated local PostgreSQL database whose name ends in `_test`.

## Current documentation

- [Original product audit](docs/audit/2026-09-14.md) and [complete legacy route inventory](docs/audit/legacy-inventory.md).
- [Architecture and financial rules](docs/architecture.md).
- [Operations, backup and local startup](docs/operations.md).
- [Verification evidence and release status](docs/verification.md).
- [Optional public-pilot cost proposal](docs/pilot-proposal.md).
- [Hosted beta, deployment evidence and rollback](docs/hosted-beta.md).

`docs/archive` is historical evidence, not setup guidance. Legacy source remains available in Git at `e4b1a833` and the unchanged original checkout. The replacement uses a separate database. Its local portfolio records were copied to Neon with exact content-hash verification; old sessions were not migrated. Existing legacy databases were not modified.
