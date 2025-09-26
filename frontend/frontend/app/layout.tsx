export const metadata = {
  title: "Fynix",
  description: "Market + Social + AI Super-App",
};

import "./globals.css";
import { AuthProvider } from "@/src/components/AuthProvider";
import { Navbar } from "@/src/components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <AuthProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
