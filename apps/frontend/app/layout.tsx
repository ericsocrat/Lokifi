import { SWRProvider } from '@/components/SWRProvider';
import { AuthProvider } from '@/src/components/AuthProvider';
import { PreferencesProvider } from '@/src/components/dashboard/PreferencesContext';
import { ToastProvider } from '@/src/components/dashboard/ToastProvider';
import { GlobalLayout } from '@/src/components/layout/GlobalLayout';
import { ReactQueryProvider } from '@/src/components/ReactQueryProvider';
import '@/styles/globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Lokifi - Personal Finance & Crypto Portfolio Tracker',
  description:
    'Track your crypto, stocks, and investment portfolio in real-time. Join 50,000+ users managing $2B+ in assets with advanced analytics, price alerts, and AI-powered insights.',
  keywords: [
    'portfolio tracker',
    'crypto tracker',
    'investment tracking',
    'finance app',
    'crypto portfolio',
    'stock portfolio',
    'asset management',
  ],
  authors: [{ name: 'Lokifi' }],
  openGraph: {
    title: 'Lokifi - Personal Finance & Crypto Portfolio Tracker',
    description:
      'Track your crypto, stocks, and investment portfolio in real-time. Join 50,000+ users managing $2B+ in assets.',
    type: 'website',
    locale: 'en_US',
    url: 'https://lokifi.com',
    siteName: 'Lokifi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lokifi - Personal Finance & Crypto Portfolio Tracker',
    description:
      'Track your crypto, stocks, and investment portfolio in real-time. Join 50,000+ users managing $2B+ in assets.',
  },
};

// Google OAuth Client ID - Replace with your actual client ID
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-0 text-surface-200">
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <ReactQueryProvider>
            <SWRProvider>
              <AuthProvider>
                <PreferencesProvider>
                  <ToastProvider>
                    <GlobalLayout>{children}</GlobalLayout>
                  </ToastProvider>
                </PreferencesProvider>
              </AuthProvider>
            </SWRProvider>
          </ReactQueryProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
