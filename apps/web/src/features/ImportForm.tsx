"use client";
import { useState } from "react";
import { FileUp, ArrowDownToLine, Check } from "lucide-react";
import { api, type Preview } from "../api";
import { message } from "../constants";
export function ImportForm({ portfolioId, onDone }: { portfolioId: string; onDone: () => Promise<void> }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    setPreview(null);
    setError("");
    if (!file) return;
    if (file.size > 500000) {
      setError("Use a CSV file smaller than 500 KB.");
      return;
    }
    setBusy(true);
    try {
      setPreview(
        await api<Preview>(`/portfolios/${portfolioId}/imports/preview`, "POST", { csv_text: await file.text() }),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      await api(`/imports/${preview.id}/commit`, "POST");
      await onDone();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="muted">
        Preview every row before anything is added. Maximum 500 holdings. Existing holdings must be edited separately.
      </p>
      <a className="text-link" href="/api/v1/imports/template" download>
        <ArrowDownToLine size={16} />
        Download CSV template
      </a>
      <p className="small muted">
        Use ISO dates (YYYY-MM-DD) and decimal points without currency symbols or thousands separators. Leave price and
        date blank together if unavailable. FX rates are EUR per unit of the original currency.
      </p>
      <label className="upload">
        <FileUp size={28} />
        <strong>Choose your holdings CSV</strong>
        <span>Reviewed locally by your Lokifi server</span>
        <input
          aria-label="Holdings CSV"
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </label>
      {busy && <p role="status">{preview ? "Adding holdings…" : "Validating rows…"}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <>
          <h3>{preview.row_count} holdings ready to import</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Quantity</th>
                  <th>Currency</th>
                  <th>Price date</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, index) => (
                  <tr key={index}>
                    <td>
                      {r.instrument.name}
                      <small>
                        {r.instrument.identifier} · {r.instrument.venue}
                      </small>
                    </td>
                    <td>{String(r.quantity)}</td>
                    <td>{r.instrument.currency}</td>
                    <td>{r.valued_at || "Unvalued"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice">No holdings have been added yet. The entire file will be saved together.</p>
          <button disabled={busy} onClick={() => void commit()} className="full">
            Confirm import
            <Check size={16} />
          </button>
        </>
      )}
    </>
  );
}
