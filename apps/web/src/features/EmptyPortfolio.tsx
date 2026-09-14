"use client";
import { ArrowRight, ArrowUpRight, Layers3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, type Portfolio } from "../api";
import type { Action, OpenPanel } from "./types";
export function EmptyPortfolio({ open, action, busy }: { open: OpenPanel; action: Action; busy: boolean }) {
  const router = useRouter();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A CLEARER FINANCIAL PICTURE</p>
          <h1>Your portfolio starts here.</h1>
          <p className="muted">Bring your holdings together, one clear record at a time.</p>
        </div>
      </div>
      <section className="start-card">
        <span className="large-icon">
          <Layers3 size={36} />
        </span>
        <h2>A place for everything you own.</h2>
        <p>
          Stocks, ETFs, crypto or cash. Start with a portfolio,
          <br />
          then add holdings manually or import a CSV.
        </p>
        <button onClick={() => open("portfolio")}>
          Create your first portfolio
          <ArrowRight size={18} />
        </button>
        <div className="steps">
          <span>
            <b>01</b>Create a portfolio
          </span>
          <span>
            <b>02</b>Add your holdings
          </span>
          <span>
            <b>03</b>See the full picture
          </span>
        </div>
      </section>
      <div className="demo-callout">
        <div>
          <strong>Take a look before you begin.</strong>
          <p className="muted small">Explore an example with clearly labeled synthetic holdings.</p>
        </div>
        <button
          disabled={busy}
          className="secondary"
          onClick={() =>
            void action(async () => {
              const p = await api<Portfolio>("/demo", "POST");
              router.push("/portfolios/" + p.id);
            })
          }
        >
          Open example
          <ArrowUpRight size={16} />
        </button>
      </div>
    </>
  );
}
