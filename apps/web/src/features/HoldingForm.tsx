"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { units, type Holding, type HoldingInput } from "../api";
import { Field } from "../components/Field";
import { InstrumentFields, readInstrument } from "./instruments";
import { today } from "../constants";
export function HoldingForm({
  holding,
  onSave,
  busy,
  error,
}: {
  holding?: Holding;
  onSave: (value: HoldingInput & { version?: number }) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [currency, setCurrency] = useState(holding?.instrument.currency || "EUR");
  const [hasPrice, setHasPrice] = useState(holding ? holding.price !== null : true);
  const [hasFX, setHasFX] = useState(holding ? holding.fx_rate !== null : false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await onSave({
      instrument: readInstrument(f),
      quantity: String(f.get("quantity")),
      price: hasPrice ? String(f.get("price")) : null,
      valued_at: hasPrice ? String(f.get("valued_at")) : null,
      source: String(f.get("source")),
      fx_rate: currency !== "EUR" && hasFX ? String(f.get("fx_rate")) : null,
      fx_at: currency !== "EUR" && hasFX ? String(f.get("fx_at")) : null,
      fx_source: currency !== "EUR" && hasFX ? String(f.get("fx_source")) : null,
      ...(holding ? { version: holding.version } : {}),
    });
  }
  return (
    <form onSubmit={submit}>
      <p className="muted">Add what you own. Record a dated price from your statement, or leave it unvalued.</p>
      <div className="form-grid">
        <InstrumentFields
          instrument={holding?.instrument}
          onCurrency={(v) => {
            setCurrency(v);
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
        <h3>Valuation</h3>
        <label className="check-label">
          <input type="checkbox" checked={hasPrice} onChange={(e) => setHasPrice(e.target.checked)} />I have a dated
          unit price
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
            <input type="checkbox" checked={hasFX} onChange={(e) => setHasFX(e.target.checked)} />I have a dated
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
