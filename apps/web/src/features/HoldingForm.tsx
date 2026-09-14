"use client";

import { Check, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api, money, units, type AssetMatch, type AutomatedHolding, type Holding, type HoldingInput } from "../api";
import { Field } from "../components/Field";
import { message, today } from "../constants";
import { InstrumentFields, readInstrument } from "./instruments";

type SaveValue = HoldingInput & { version?: number };

export function HoldingForm({
  holding,
  onSave,
  busy,
  error,
}: {
  holding?: Holding;
  onSave: (value: SaveValue) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [manual, setManual] = useState(Boolean(holding));
  return (
    <>
      {!holding && (
        <div className="entry-mode" role="group" aria-label="Holding entry method">
          <button type="button" className={!manual ? "active" : ""} onClick={() => setManual(false)}>
            <Sparkles size={15} /> Find automatically
          </button>
          <button type="button" className={manual ? "active" : ""} onClick={() => setManual(true)}>
            Enter manually
          </button>
        </div>
      )}
      {manual ? (
        <ManualHoldingForm holding={holding} onSave={onSave} busy={busy} error={error} />
      ) : (
        <AutomaticHoldingForm onSave={onSave} busy={busy} outerError={error} onManual={() => setManual(true)} />
      )}
    </>
  );
}

function AutomaticHoldingForm({
  onSave,
  busy,
  outerError,
  onManual,
}: {
  onSave: (value: SaveValue) => Promise<void>;
  busy: boolean;
  outerError: string;
  onManual: () => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AssetMatch[]>([]);
  const [selected, setSelected] = useState<AssetMatch | null>(null);
  const [acquiredAt, setAcquiredAt] = useState("");
  const [quantity, setQuantity] = useState("");
  const [resolved, setResolved] = useState<AutomatedHolding | null>(null);
  const [searching, setSearching] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setMatches([]);
      setSelected(null);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setLocalError("");
      try {
        const results = await api<AssetMatch[]>(`/market-data/assets?q=${encodeURIComponent(normalized)}`);
        if (!active) return;
        setMatches(results);
        const exact = results.find((item) => item.symbol === normalized.toUpperCase());
        if (exact) setSelected(exact);
        if (!results.length) setLocalError("No supported EUR crypto asset matched. Try manual entry.");
      } catch (requestError) {
        if (active) setLocalError(message(requestError));
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!selected || !acquiredAt) {
      setResolved(null);
      return;
    }
    let active = true;
    setPricing(true);
    setLocalError("");
    void api<AutomatedHolding>(
      `/market-data/assets/${encodeURIComponent(selected.symbol)}/holding?acquired_at=${encodeURIComponent(acquiredAt)}`,
    )
      .then((result) => {
        if (active) setResolved(result);
      })
      .catch((requestError) => {
        if (active) {
          setResolved(null);
          setLocalError(message(requestError));
        }
      })
      .finally(() => {
        if (active) setPricing(false);
      });
    return () => {
      active = false;
    };
  }, [acquiredAt, selected]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolved) return;
    await onSave({
      instrument: resolved.instrument,
      quantity,
      acquired_at: acquiredAt,
      acquisition_price: resolved.acquisition.price,
      acquisition_source: resolved.acquisition.source,
      price: resolved.valuation.price,
      valued_at: resolved.valuation.date,
      valuation_observed_at: resolved.valuation.observed_at,
      source: resolved.valuation.source,
      fx_rate: null,
      fx_at: null,
      fx_source: null,
    });
  }

  const shownError = localError || outerError;
  return (
    <form onSubmit={submit}>
      <div className="automatic-intro">
        <Sparkles size={19} />
        <div>
          <strong>Start with the symbol.</strong>
          <p>We’ll fill the asset identity, its EUR price on the purchase date, and its latest EUR valuation.</p>
        </div>
      </div>
      <label className="field asset-search">
        <span>Asset symbol or name</span>
        <div>
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Asset symbol or name"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setResolved(null);
            }}
            placeholder="Try BTC or Bitcoin"
            autoComplete="off"
          />
        </div>
        <small>Automatic lookup currently covers crypto assets with a Coinbase EUR market.</small>
      </label>
      {searching && (
        <p role="status" className="lookup-status">
          Looking up {query.trim()}…
        </p>
      )}
      {matches.length > 0 && !selected && (
        <div className="asset-results" role="listbox" aria-label="Matching assets">
          {matches.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={item.product_id}
              onClick={() => {
                setSelected(item);
                setQuery(item.symbol);
              }}
            >
              <span className="asset-mark crypto">{item.symbol.slice(0, 1)}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.symbol} · EUR market</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="resolved-asset">
          <span className="asset-mark crypto">{selected.symbol.slice(0, 1)}</span>
          <div>
            <strong>{selected.name}</strong>
            <p>
              {selected.symbol} · Crypto · {selected.venue} · EUR
            </p>
          </div>
          <span className="badge good">Matched</span>
        </div>
      )}
      <div className="form-grid compact-fields">
        <Field label="Quantity" name="quantity" type="number" step="any" value={quantity} onChange={setQuantity} />
        <Field label="Purchase date" name="acquired_at" type="date" value={acquiredAt} onChange={setAcquiredAt} />
      </div>
      {pricing && (
        <p role="status" className="lookup-status">
          Finding the historical and latest EUR prices…
        </p>
      )}
      {resolved && (
        <div className="price-preview" aria-live="polite">
          <div>
            <span>Reference price on {resolved.acquisition.date}</span>
            <strong>{money(resolved.acquisition.price)}</strong>
            <small>UTC daily close · not necessarily your execution price</small>
          </div>
          <div>
            <span>Latest recorded trade</span>
            <strong>{money(resolved.valuation.price)}</strong>
            <small>{resolved.valuation.observed_at.replace("T", " ").replace("Z", " UTC")}</small>
          </div>
          <p>Source: {resolved.valuation.source}. Prices remain editable after saving.</p>
        </div>
      )}
      {shownError && (
        <p role="alert" className="error">
          {shownError}
        </p>
      )}
      {shownError && (
        <button type="button" className="text-button manual-fallback" onClick={onManual}>
          Enter this holding manually
        </button>
      )}
      <button disabled={busy || pricing || !resolved || !quantity} className="full" type="submit">
        {busy ? "Saving…" : "Add holding"}
        <Check size={16} />
      </button>
    </form>
  );
}

function ManualHoldingForm({
  holding,
  onSave,
  busy,
  error,
}: {
  holding?: Holding;
  onSave: (value: SaveValue) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [currency, setCurrency] = useState(holding?.instrument.currency || "EUR");
  const [hasPrice, setHasPrice] = useState(holding ? holding.price !== null : true);
  const [hasFX, setHasFX] = useState(holding ? holding.fx_rate !== null : false);
  const [hasAcquisition, setHasAcquisition] = useState(Boolean(holding?.acquired_at));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const acquisitionPrice =
      hasAcquisition && form.get("acquisition_price") ? String(form.get("acquisition_price")) : null;
    await onSave({
      instrument: readInstrument(form),
      quantity: String(form.get("quantity")),
      acquired_at: hasAcquisition ? String(form.get("acquired_at")) : null,
      acquisition_price: acquisitionPrice,
      acquisition_source: acquisitionPrice ? String(form.get("acquisition_source")) : null,
      price: hasPrice ? String(form.get("price")) : null,
      valued_at: hasPrice ? String(form.get("valued_at")) : null,
      valuation_observed_at: null,
      source: String(form.get("source")),
      fx_rate: currency !== "EUR" && hasFX ? String(form.get("fx_rate")) : null,
      fx_at: currency !== "EUR" && hasFX ? String(form.get("fx_at")) : null,
      fx_source: currency !== "EUR" && hasFX ? String(form.get("fx_source")) : null,
      ...(holding ? { version: holding.version } : {}),
    });
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">Enter the details that identify the asset and the source of its valuation.</p>
      <div className="form-grid">
        <InstrumentFields
          instrument={holding?.instrument}
          onCurrency={(value) => {
            setCurrency(value);
            setHasFX(false);
            if (holding) setHasPrice(false);
          }}
        />
        <Field
          label="Quantity / cash balance"
          name="quantity"
          type="number"
          step="any"
          value={holding ? units(holding.quantity) : ""}
        />
      </div>
      <div className="form-section">
        <h3>Purchase details</h3>
        <label className="check-label">
          <input
            type="checkbox"
            checked={hasAcquisition}
            onChange={(event) => setHasAcquisition(event.target.checked)}
          />
          Record when this holding was acquired
        </label>
        {hasAcquisition && (
          <div className="form-grid">
            <Field label="Purchase date" name="acquired_at" type="date" value={holding?.acquired_at || ""} />
            <Field
              label={`Purchase price (${currency}, optional)`}
              name="acquisition_price"
              type="number"
              step="any"
              required={false}
              value={holding?.acquisition_price ? units(holding.acquisition_price) : ""}
            />
            <Field
              label="Purchase-price source"
              name="acquisition_source"
              required={false}
              value={holding?.acquisition_source || ""}
              help="Required when a purchase price is entered."
            />
          </div>
        )}
      </div>
      <div className="form-section">
        <h3>Current valuation</h3>
        <label className="check-label">
          <input type="checkbox" checked={hasPrice} onChange={(event) => setHasPrice(event.target.checked)} />I have a
          dated unit price
        </label>
        {hasPrice && (
          <div className="form-grid">
            <Field
              label={`Unit price (${currency})`}
              name="price"
              type="number"
              step="any"
              value={holding?.price ? units(holding.price) : ""}
              help="For cash, enter 1. Zero is a recorded price, not missing data."
            />
            <Field label="Price date" name="valued_at" type="date" value={holding?.valued_at || today()} />
          </div>
        )}
        <Field
          label="Record source"
          name="source"
          value={holding?.source || ""}
          help="For example: September account statement or manual entry."
        />
        {!hasPrice && (
          <p className="notice">This holding will be marked as missing a price. It will not be counted as zero.</p>
        )}
      </div>
      {currency !== "EUR" && (
        <div className="form-section">
          <h3>Convert to EUR</h3>
          <label className="check-label">
            <input type="checkbox" checked={hasFX} onChange={(event) => setHasFX(event.target.checked)} />I have a dated
            exchange rate
          </label>
          {hasFX ? (
            <>
              <div className="form-grid">
                <Field
                  label={`EUR per 1 ${currency}`}
                  name="fx_rate"
                  type="number"
                  step="any"
                  value={holding?.fx_rate ? units(holding.fx_rate) : ""}
                />
                <Field label="Exchange rate date" name="fx_at" type="date" value={holding?.fx_at || today()} />
              </div>
              <Field label="Exchange rate source" name="fx_source" value={holding?.fx_source || ""} />
            </>
          ) : (
            <p className="notice">An exchange rate is needed before this holding can contribute to the EUR total.</p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={busy} className="full" type="submit">
        {busy ? "Saving…" : holding ? "Save changes" : "Save holding"}
        <Check size={16} />
      </button>
    </form>
  );
}
