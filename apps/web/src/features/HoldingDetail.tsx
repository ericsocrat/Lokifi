"use client";
import { Star } from "lucide-react";
import Link from "next/link";
import { api, money, units, type Holding } from "../api";
import { Status } from "../components/Status";
import { HoldingForm } from "./HoldingForm";
import type { Action, OpenPanel } from "./types";
export function HoldingDetail({
  holding,
  open,
  action,
  busy,
  error,
}: {
  holding: Holding;
  open: OpenPanel;
  action: Action;
  busy: boolean;
  error: string;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="text-link" href="/dashboard">
            ← Portfolio overview
          </Link>
          <h1>{holding.instrument.name}</h1>
          <p className="muted">
            {holding.instrument.identifier} · {holding.instrument.venue} · {holding.instrument.currency}
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            void action(
              () =>
                api("/watchlist", "POST", {
                  instrument: ((i) => ({
                    name: i.name,
                    category: i.category,
                    identifier: i.identifier,
                    venue: i.venue,
                    currency: i.currency,
                  }))(holding.instrument),
                }),
              "Added to watchlist.",
            )
          }
        >
          <Star size={16} />
          Watch instrument
        </button>
      </div>
      <div className="detail-grid">
        <section className="card">
          {holding.is_demo ? (
            <>
              <span className="badge neutral">Synthetic example</span>
              <h2>Example holding</h2>
              <p className="muted">
                This read-only illustration contains {units(holding.quantity)} units at a synthetic price of{" "}
                {money(holding.price, holding.instrument.currency)}. Create your own portfolio to record actual
                holdings.
              </p>
              <button className="secondary" onClick={() => open("portfolio")}>
                Create your own portfolio
              </button>
            </>
          ) : (
            <HoldingForm
              key={holding.id + "-" + holding.version}
              holding={holding}
              error={error}
              busy={busy}
              onSave={async (value) => {
                await action(() => api(`/holdings/${holding.id}`, "PUT", value), "Holding updated.");
              }}
            />
          )}
        </section>
        <aside>
          <section className="card value-card">
            <p className="eyebrow">RECORDED VALUE</p>
            <h2 className="big-number">{money(holding.eur_value)}</h2>
            <p className="muted">{money(holding.original_value, holding.instrument.currency)} in original currency</p>
            <Status holding={holding} />
            <dl className="facts">
              <dt>Price source</dt>
              <dd>{holding.source}</dd>
              <dt>Price date</dt>
              <dd>{holding.valued_at || "Not recorded"}</dd>
              {holding.valuation_observed_at && (
                <>
                  <dt>Observed at</dt>
                  <dd>
                    {new Date(holding.valuation_observed_at).toLocaleString("en-IE", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </dd>
                </>
              )}
              <dt>Purchase date</dt>
              <dd>{holding.acquired_at || "Not recorded"}</dd>
              <dt>Reference purchase price</dt>
              <dd>
                {holding.acquisition_price
                  ? money(holding.acquisition_price, holding.instrument.currency)
                  : "Not recorded"}
              </dd>
              {holding.acquisition_source && (
                <>
                  <dt>Purchase-price source</dt>
                  <dd>{holding.acquisition_source}</dd>
                </>
              )}
              <dt>FX source</dt>
              <dd>
                {holding.instrument.currency === "EUR" ? "No conversion needed" : holding.fx_source || "Not recorded"}
              </dd>
              <dt>FX date</dt>
              <dd>{holding.fx_at || "—"}</dd>
            </dl>
            <p className="small muted">This is a snapshot valuation, not an investment return.</p>
          </section>
          {!holding.is_demo && (
            <button className="danger-link" onClick={() => open("remove")}>
              Remove holding
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
