# Verification evidence

The rebuilt application is a local portfolio preview. This report records observed checks, not a production certification.

## Recorded results, 2026-09-14

| Check | Result | Evidence |
|---|---|---|
| Legacy inventory | 43 pages / 283 API declarations | `docs/audit/legacy-inventory.md` |
| Legacy browser | Six representative routes at 1440 and 390 px, synthetic services | `test-results/legacy-browser.json` and legacy PNG captures |
| Legacy clean migration | FAIL after head merge: posts table referenced before creation | Audit report; isolated `lokifi_legacy_test` |
| API integration | 30 passed on PostgreSQL | `uv run --directory apps/api python -m pytest` with guarded test URL |
| Authentication and ownership | Anonymous, ordinary-admin, cross-user, expiry, revocation, CSRF and secure-cookie assertions passed | `apps/api/tests/test_journey.py` |
| Financial and import behavior | Decimals, mixed currencies, missing/zero values, stale dates, invalid input, atomic rollback and replay assertions passed | Same API suite |
| Frontend static | TypeScript and ESLint passed without ignored build errors | `npm run verify` |
| Production build | Next.js 16.3.5 build passed | `npm run build` |
| API contract | Generated declaration matched OpenAPI | `node tools/contracts.mjs --check` |
| Browser and formatting | Four full desktop/mobile scenario executions plus two decimal-format test executions passed | `apps/web/tests`; Playwright report and screenshots |
| Accessibility | No axe WCAG A/AA violations in the tested portfolio views; viewport overflow assertion passed | Browser journey suite |
| npm dependencies | Zero known advisories at scan time | `npm audit` |
| Python production dependencies | No known vulnerabilities found | uv frozen export + pip-audit |
| Backup / restore | Matching counts and hashes for all public tables | `.local/backups/verification.json` |
| Local launcher | Started API + built standalone web, same-origin health returned 200 | `.local/logs` |

Browser tests use a fresh isolated headless Edge profile on this Windows machine, not the user's browser profile. CI is configured for Playwright Chromium. The full journey creates a synthetic account, adds a portfolio and holding, imports mixed-currency records, checks incomplete valuation, downloads CSV, saves a watchlist item, reloads, signs out and verifies persistence in a second browser session. Provider calls are absent from the new runtime.

Screenshots are generated test artifacts and intentionally not committed. They include empty, portfolio, unavailable-storage and synthetic-example states at desktop/mobile widths. Legacy historical screenshots are not reused as new evidence.

## Remaining environment limits

- Docker Desktop fails before engine startup; Compose images have not been executed here. Native PostgreSQL 17.6 is the demonstrated database path.
- No remote push or GitHub workflow run was performed. The authored CI configuration is not evidence of hosted CI success.
- No production DNS, HTTPS deployment, public-user trial, data licensing, or demand evidence exists.
- Two upstream Python test-client deprecation warnings remain; tests are not suppressing them. No test failures were waived.
- Clean-checkout reproduction is recorded in the closeout section after it is run.

## Scope of acceptance

Complete local portfolio journey and source restructuring. The legacy source is preserved in Git and the original checkout; archived documents are non-operational. Public rollout remains gated by the separately documented privacy, recovery, hosting and data-provider decisions.

## Clean-checkout closeout

Reproduced from detached revision `b496bbd1fa3ae041841cb5804cd94a20685e68d4`, with no node_modules, Python environment, build output or application configuration copied from the implementation checkout. A separate `lokifi_clean_test` database was created on the isolated PostgreSQL cluster.

- `npm ci --ignore-scripts`: passed, zero npm advisories.
- `uv sync --project apps/api --frozen`: passed with Python 3.12.10.
- `npm run verify`: passed; 30 API tests, migration from empty database, contract, lint, types and production build.
- Started the API from this checkout against `lokifi_clean_test`; started its generated standalone web server.
- `npm run test:e2e` with headless Edge: all six test executions passed in 13.8 seconds, including desktop/mobile complete journeys, provider-unavailable display and synthetic demonstration labeling.
- `backup.py --restore-test`: source and restored public table counts/content hashes matched.
- `git status --short`: empty after installs, builds, runtime and browser checks.

The implementation checkout was then restarted using the local launcher and its separate persistent `lokifi_rebuild` database. Final desktop/mobile portfolio screenshots are available as ignored local artifacts under `.local/evidence/`. No branch was pushed, no PR opened, and no domain, email or paid-service settings were changed.

The original checkout remains on `58f9471f` with no tracked changes. Only its origin/main tracking reference was refreshed during worktree creation. The audit checkpoint is `92698009`; implementation and line-ending normalization checkpoints are `d998bd55` and `b496bbd1`.
