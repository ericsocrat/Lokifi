import "../styles/globals.css";
import { SWRConfig } from "swr";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <SWRConfig value={{ fetcher: (url: string) => fetch(url).then(r => r.json()) }}>
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
