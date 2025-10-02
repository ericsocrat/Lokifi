import { SWRProvider } from '@/components/SWRProvider';
import { AuthProvider } from '@/src/components/AuthProvider';
import '@/styles/globals.css';
import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Lokifi - Professional Trading Terminal',
  description:
    'Advanced trading platform with real-time market data, technical analysis, and professional tools',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/logo-icon-only.svg',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SWRProvider>
          <AuthProvider>{children}</AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
