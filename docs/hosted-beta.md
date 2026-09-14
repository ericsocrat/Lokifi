# Hosted beta: deployment and evidence

**Live:** https://lokifi.com. Public registration is enabled. Application revision
fa8d763803d3764f9987af2e54627a9962e404c7 was deployed on 2026-09-14.
The original checkout, historical source and local database were preserved.

## Deployment

| Component | Deployed resource |
|---|---|
| Website / API proxy | Cloudflare Pages project lokifi-beta, Free |
| Frontend deployment | 8315c087.lokifi-beta.pages.dev; canonical site lokifi.com |
| Backend | https://lokifi-api.onrender.com; srv-dajv408jo6nc73fde2u0; Free Frankfurt |
| Backend deployment | dep-dajvsvm7bikc73dmtb0g |
| Database | Neon sparkling-unit-41248177; Free AWS Frankfurt; PostgreSQL 18.6 |
| AI | Groq Free; only openai/gpt-oss-120b; inference zero-data-retention enabled |
| Email | Resend Free; verified mail.lokifi.com; enforced transport TLS |
| Bot protection | Turnstile managed; server-checked hostname and action |

No payment method, paid upgrade, paid fallback or local inference was added.
Render explicitly showed no card on file. support@lokifi.com already had active
Cloudflare forwarding.

The browser accesses same-origin /api/v1/* only. Pages injects the server-only
proxy secret and client IP. Direct protected Render requests return 403;
anonymous portfolio requests through the site return 401. Private API responses
use no-store. Functions execute only for API routes. The built local preview uses
tools/web-start.mjs; development uses a server-side Next.js rewrite.

Cloudflare's active "Lokifi www to canonical domain" rule returns 301 and preserves
queries. Legacy detail URLs serve the corresponding static entry and then replace
the URL with /portfolio?id=… or /holding?id=…. Preview aliases redirect in the
client to the canonical domain. Root mail MX/SPF/DMARC were read back unchanged.

## Verified behavior

- npm run verify: **48 PostgreSQL tests**, API contract, lint, type checks, static
  production build and npm dependency audit pass; two upstream deprecation
  warnings remain.
- npm run test:e2e: **12 desktop/mobile checks pass**, covering portfolios, CSV,
  persistence in another session, BTC form automation, keyboard dismissal/focus,
  safe chat formatting, pending-verification gating and axe accessibility.
  Chat-stream browser fixtures are simulated; live-provider checks are separate.
- [CI run 34853024892](https://github.com/ericsocrat/Lokifi/actions/runs/34853024892)
  passed for fa8d7638, including clean installation, migration, browser checks
  and backup restoration.
- Live Groq tool calling passed. A synthetic portfolio answer matched its exact
  **€1,000.01** backend total. Rename proposals stayed pending until confirmation,
  then persisted.
- Live crypto preparation resolved **0.25 BTC / 2024-01-01** into an inert review
  card with dated Coinbase references. The portfolio stayed empty until explicit
  confirmation, then contained one holding. Repeated confirmation returned 409.
  Message replay did not invoke inference again. Cross-user access was denied.
- User-assisted signup and email verification succeeded. Hotmail placed a
  verification message in Junk. The subsequent fix sends email automatically at
  signup and blocks workspace access until verified; production-mode tests cover
  both successful delivery and email failure.
- Hosted password-reset testing used a **synthetic token fixture**: reuse was
  rejected, all old sessions were revoked, and the new password worked. This is
  not a human inbox-to-recovery-browser round-trip.
- Hosted unverified-account access returned 403. Chat deletion withdrew consent.
  Both temporary hosted test accounts were deleted through account endpoints;
  owned data was removed and anonymous quota totals preserved.
- Canonical website/API health passed with the original local API/web stopped.
  No deployed runtime service depends on localhost.

## Migration and backup

tools/backup.py --restore-test restored the cutover database to an isolated local
test database with matching table counts and content hashes.
tools/migrate-hosted-data.py refused nonempty destination storage and copied inside
one transaction, normalizing timezone serialization and Windows source encoding.

Matched records: **19 users, 68 instruments, 19 portfolios, 68 holdings, 8 imports
and 4 watchlist entries**. Sessions and authentication-attempt state were not copied.
The preserved dump and reports are in ignored .local/backups and
.local/hosted-migration-verification.json. Later hosted edits are not part of that
cutover snapshot.

## Limits and remaining evidence

- Research is disabled: one successful browser-search lookup consumed **78,739
  tokens**, exceeding a safe per-turn reservation. Setup checks were charged to
  the shared application quota ledger.
- Email authentication is configured, but **inbox placement remains unresolved**.
  Plain-text content and the support reply address do not prove spam placement
  is fixed.
- A physical second-device test with the whole PC powered off, an actual idle
  cold start, and a human recovery-email round-trip remain unproven. Server
  independence, startup handling, token recovery and revocation were checked
  as described above.
- No scheduled off-site backup or monitoring automation was provisioned. Agree
  on ongoing ownership before expanding adoption.
- Deployment follows codex/portfolio-rebuild. GitHub's default main still contains
  the historical application; its dependency alerts do not describe the deployed
  branch. Source-history consolidation is separate from deployment.

## Rollback

1. Set LOKIFI_SIGNUP_ENABLED=false and, if necessary,
   LOKIFI_GROQ_FREE_CONFIRMED=false in Render; redeploy without deleting records.
2. Export current hosted records before schema/storage recovery. Retain the
   cutover snapshot separately; it cannot recover subsequent changes.
3. Roll Pages and Render back to matching verified application revisions. Keep
   signup paused when rolling back before fa8d7638 because verification gating
   differs.
4. Keep Neon migrations in place for code rollback. Restore into a separate
   database, verify contents and sessions, then explicitly switch connections.
5. Preserve mail DNS. To withdraw the website entirely, remove only its two
   CNAMEs and canonical redirect after preserving hosted data.

Raw diagnostics, synthetic exports and screenshots remain in ignored .local
evidence. Never publish credentials or user records. See [operations](operations.md)
and [cost/capacity](pilot-proposal.md).
