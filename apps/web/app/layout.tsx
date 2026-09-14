import type { Metadata } from "next";
import "./globals.css";
import { CanonicalBoundary } from "../src/CanonicalBoundary";
export const metadata: Metadata = {
  title: "Lokifi — Your portfolio, clearly",
  description:
    "Understand your holdings, their valuation, and the source behind every figure. Portfolio tracking with explicit data provenance.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CanonicalBoundary />
        {children}
      </body>
    </html>
  );
}
