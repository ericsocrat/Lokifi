"use client";
import type { Holding } from "../api";
export function Status({ holding }: { holding: Holding }) {
  return (
    <span className={"badge " + (holding.status !== "valued" ? "warning" : holding.stale ? "neutral" : "good")}>
      {holding.status === "missing_price"
        ? "Missing price"
        : holding.status === "missing_fx"
          ? "Missing FX rate"
          : holding.stale
            ? "Review date"
            : "Recorded"}
    </span>
  );
}
