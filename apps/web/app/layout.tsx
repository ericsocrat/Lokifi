import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Lokifi — Your portfolio, clearly",
  description:
    "Understand your holdings, their valuation, and the source behind every figure. Portfolio tracking with explicit data provenance.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
