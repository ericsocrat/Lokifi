"use client";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  FileUp,
  Layers3,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { money, units, type Detail } from "../api";
import { Status } from "../components/Status";
import { categoryNames } from "../constants";
import type { OpenPanel } from "./types";
export function PortfolioOverview({ detail, open }: { detail: Detail; open: OpenPanel }) {
  const [search, setSearch] = useState("");
  const filtered = detail.holdings.filter((h) =>
    (h.instrument.name + " " + h.instrument.identifier).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PORTFOLIO, IN CONTEXT</p>
          <h1>{detail.name}</h1>
          <p className="muted">A clearer view of what you own.</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => open("import")} disabled={detail.is_demo}>
            <FileUp size={16} />
            Import CSV
          </button>
          <button onClick={() => open("holding")} disabled={detail.is_demo}>
            <Plus size={17} />
            Add holding
          </button>
        </div>
      </div>
      {detail.is_demo && (
        <div className="demo-banner">
          <span>
            <strong>Synthetic example</strong> · These are illustrative holdings and prices, not market data. This
            portfolio is read-only.
          </span>
          <button className="secondary" onClick={() => open("portfolio")}>
            Create your own
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="stat-grid">
        <section className="stat primary-stat">
          <span className="stat-label">
            {detail.complete ? "Portfolio value" : "Valued subtotal"}
            <Wallet size={17} />
          </span>
          <div className="big-number">{money(detail.valued_subtotal)}</div>
          <span className="small">
            {detail.complete ? "Based on your recorded valuations" : "Incomplete — excludes unvalued holdings"}
          </span>
        </section>
        <section className="stat">
          <span className="stat-label">
            Holdings
            <Layers3 size={17} />
          </span>
          <div className="big-number">
            {detail.holdings.length}
            <span className="number-note">assets</span>
          </div>
          <span className="small muted">
            Across {new Set(detail.holdings.map((h) => h.instrument.category)).size} asset categories
          </span>
        </section>
        <section className="stat">
          <span className="stat-label">
            Valuation coverage
            <ShieldCheck size={17} />
          </span>
          <div className="big-number">
            {detail.holdings.length - detail.missing_count}
            <span className="number-note">/ {detail.holdings.length}</span>
          </div>
          <span className="small muted">
            {detail.missing_count
              ? `${detail.missing_count} need a price or exchange rate`
              : "Every holding has a recorded value"}
          </span>
        </section>
        <section className="stat">
          <span className="stat-label">
            Review dates
            <CircleHelp size={17} />
          </span>
          <div className="big-number">
            {detail.stale_count}
            <span className="number-note">to review</span>
          </div>
          <span className="small muted">Valuation dates older than 7 days</span>
        </section>
      </div>
      {!detail.complete && (
        <p role="status" className="notice">
          Your total is incomplete. Add the missing prices or exchange rates below to see a full valuation.
        </p>
      )}
      <div className="overview-grid">
        <section className="card holdings-card">
          <div className="card-heading">
            <div>
              <h2>
                Portfolio holdings<span className="count">{detail.holdings.length}</span>
              </h2>
              <p className="small muted">Your assets and the figures behind them.</p>
            </div>
            <a
              className="icon-button"
              href={`/api/v1/portfolios/${detail.id}/export`}
              aria-label="Export holdings CSV"
              download
            >
              <ArrowDownToLine size={18} />
            </a>
          </div>
          {detail.holdings.length ? (
            <>
              <label className="search">
                <span className="sr-only">Search holdings</span>
                <input placeholder="Find a holding…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <span>{filtered.length} holdings</span>
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th className="numeric">Quantity</th>
                      <th className="numeric">Value · EUR</th>
                      <th>Valuation</th>
                      <th>
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <div className="asset-cell">
                            <span className={"asset-mark " + h.instrument.category}>
                              {h.instrument.name.slice(0, 1)}
                            </span>
                            <div>
                              <Link href={"/holdings/" + h.id}>{h.instrument.name}</Link>
                              <small>
                                {h.instrument.identifier} · {categoryNames[h.instrument.category]}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="numeric">{units(h.quantity)}</td>
                        <td className="numeric amount">{money(h.eur_value)}</td>
                        <td>
                          <Status holding={h} />
                          <small>{h.valued_at || "No date recorded"}</small>
                        </td>
                        <td>
                          <Link
                            className="icon-button"
                            href={"/holdings/" + h.id}
                            aria-label={"View " + h.instrument.name}
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && <p className="muted center">No holdings match your search.</p>}
              </div>
            </>
          ) : (
            <div className="empty">
              <Layers3 size={32} />
              <h3>Your first holding belongs here.</h3>
              <p>Add an asset and a dated valuation, or import your records.</p>
              <button className="secondary" onClick={() => open("holding")}>
                <Plus size={16} />
                Add a holding
              </button>
            </div>
          )}
          <div className="card-footer">
            <span className="dot" />
            Manual and imported records only
            <span className="spacer" />
            <button className="text-button" disabled={detail.is_demo} onClick={() => open("rename")}>
              Rename portfolio
            </button>
          </div>
        </section>
        <aside className="allocation-column">
          <section className="card">
            <p className="eyebrow">THE BIG PICTURE</p>
            <h2>Asset allocation</h2>
            <p className="small muted">
              {detail.complete ? "Share of recorded portfolio value." : "Share of the valued subtotal only."}
            </p>
            <div className="allocation-bar" aria-hidden="true">
              {detail.allocation.map((a) => (
                <span key={a.category} className={a.category} style={{ width: a.percentage + "%" }} />
              ))}
            </div>
            {detail.allocation.length ? (
              detail.allocation.map((a) => (
                <div className="allocation-row" key={a.category}>
                  <div>
                    <span className={"legend-dot " + a.category} />
                    {categoryNames[a.category]}
                    <strong>{a.percentage}%</strong>
                  </div>
                  <small>{money(a.eur_value)}</small>
                </div>
              ))
            ) : (
              <p className="muted small">Allocation appears when you add valued holdings.</p>
            )}
          </section>
          <section className="source-note">
            <ShieldCheck size={23} />
            <h3>Every figure has a starting point.</h3>
            <p>Open a holding to see its price, date and source. Missing information stays visible.</p>
            <span>Recorded value ≠ investment return</span>
          </section>
        </aside>
      </div>
      <p className="bottom-note">
        Values are based on your records and may be from different dates. No live prices or return estimates are
        generated.
      </p>
    </>
  );
}
