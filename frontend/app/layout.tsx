import "../styles/globals.css";
import { SWRProvider } from "@/components/SWRProvider";
import type { Metadata } from "next";
import { AuthProvider } from "@/src/components/AuthProvider";
import "@/styles/globals.css";

export const metadata: Metadata = { title: "Fynix" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SWRProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
