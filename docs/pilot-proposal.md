# Public beta cost and capacity

The approved beta is hosted at **https://lokifi.com** with **€0 new recurring
service charges**. No payment method or paid upgrade was added. Existing domain
registration and renewal are separate from this service budget.

| Service | Current selection | Capacity behavior |
|---|---|---|
| Cloudflare Pages / Functions | Free | Static assets and API-only Functions; shared allowance |
| Render API | Free, Frankfurt | One instance; idle sleep and cold starts; no keep-alive |
| Neon PostgreSQL | Free, AWS Frankfurt | Free storage/compute ceilings; TLS and small pools |
| Groq inference | Free, openai/gpt-oss-120b | Five turns/account/day; 160,000 shared tokens/day; three calls/turn |
| Resend transactional email | Free, Ireland | Application cap of 90 sends/day; paid overages off |

Free selections were verified during provisioning on 2026-09-14. Provider
allowances are shared and may change. Exhaustion must stop the affected feature;
it must never activate a paid fallback.

Primary references: [Cloudflare](https://developers.cloudflare.com/pages/platform/limits/),
[Render](https://render.com/docs/free), [Neon](https://neon.com/pricing),
[Groq](https://console.groq.com/docs/rate-limits),
[Resend](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

## Data and research

Coinbase EUR crypto references are available on demand. A purchase-date daily
close is not an execution price. Stocks, ETFs and unsupported instruments retain
manual/imported prices. There is no paid quote feed, broker integration,
scheduled price ingestion or transaction ledger.

Groq browser search was accessible but consumed 78,739 tokens for one small
lookup. It remains disabled until provider-generated context can be bounded.
Setup-check usage was included in the shared application ledger. No paid search
alternative was activated.

## Before expanding the pilot

Measure signup demand, retention, support work, database growth and model usage.
Agree on ongoing backup and monitoring ownership. Recheck quote-data coverage
and public-use/redistribution terms before increasing distribution or monetizing
data. If allowances become insufficient, pause enrollment or the affected feature
and present a measured cost proposal for approval.

Neither a functioning beta nor a free allowance establishes customer demand,
commercial differentiation or unlimited capacity.
