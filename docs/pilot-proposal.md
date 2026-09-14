# Optional public pilot: cost proposal

Decision now: **remain local, €0 new spending**. No accounts, subscriptions, DNS edits or publication were performed. The existing domain's renewal is not included in this new-spend figure.

## Later deployment candidate

Keep one web app, one API and PostgreSQL on one EU VM, with existing Cloudflare DNS in front. Build images locally/CI and deploy to the host rather than building on its smallest instance. This adds hosting only when approved, without rewriting the application into a provider-specific stack.

For a concrete reference, Hetzner's published Germany/Finland price adjustment lists CX23 at **€5.49/month** and CX33 at **€8.49/month**, excluding IPv4 and VAT. These prices were checked on 2026-09-14. CX33 is the budgeting reference for additional application/database headroom, not a measured capacity guarantee. [Hetzner source](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)

Allow a provisional **€15–25/month before VAT** for the VM, IP, backup storage and contingency. This range is an estimate, not a vendor quote; verify all line items and load-test the selected instance before purchase. Operational maintenance time is additional. Existing Cloudflare Free DNS does not charge for queries. [Cloudflare DNS pricing explanation](https://developers.cloudflare.com/dns/faq/)

## Data costs

Manual/statement import remains the default: **€0 provider subscription**, with user effort to refresh records. ECB informational reference rates could be added later, clearly dated and sourced, with no suggestion of transaction execution rates. [ECB guidance](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)

Automatic equity/ETF and crypto pricing is a separate decision. Free access does not establish redistribution rights or coverage of European listings. CoinGecko currently lists a Demo plan and paid plans with distinct licensing; do not treat the prototype's old API adapters as commercial entitlement. [CoinGecko pricing](https://www.coingecko.com/en/api/pricing)

Before enabling a feed, record the required instrument universe, exchange/listing identifiers, data delay, redistribution rights, attribution, refresh budget, outage behavior and a verified monthly quote. A feed that cannot meet those requirements stays disabled. No user demand or willingness to pay is established by this rebuild.
