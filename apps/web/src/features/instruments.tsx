"use client";
import type { Instrument } from "../api";
import { Field } from "../components/Field";
import { categories, categoryNames, currencies } from "../constants";
export function InstrumentFields({
  instrument,
  onCurrency,
}: {
  instrument?: Instrument;
  onCurrency?: (v: string) => void;
}) {
  return (
    <>
      <Field label="Asset name" name="name" value={instrument?.name} help="Use the name on your account statement." />
      <label className="field">
        <span>Asset category</span>
        <select name="category" defaultValue={instrument?.category || "etf"}>
          {categories.map((c) => (
            <option value={c} key={c}>
              {categoryNames[c]}
            </option>
          ))}
        </select>
      </label>
      <Field
        label="Instrument identifier"
        name="identifier"
        value={instrument?.identifier}
        help="ISIN, exchange ticker, coin ID or cash account code."
      />
      <Field
        label="Exchange, network or account"
        name="venue"
        value={instrument?.venue}
        help="Identifies the listing or account; never inferred from a ticker."
      />
      <label className="field">
        <span>Original currency</span>
        <select
          name="currency"
          defaultValue={instrument?.currency || "EUR"}
          onChange={(e) => onCurrency?.(e.target.value)}
        >
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
    </>
  );
}

export function readInstrument(form: FormData): Instrument {
  return {
    name: String(form.get("name")),
    category: String(form.get("category")) as Instrument["category"],
    identifier: String(form.get("identifier")),
    venue: String(form.get("venue")),
    currency: String(form.get("currency")),
  };
}
