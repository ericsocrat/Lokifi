import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lokifi Admin",
  description: "Administrative dashboard for Lokifi platform management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
