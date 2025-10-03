import GlobalHeader from '@/components/GlobalHeader';
import { SWRProvider } from '@/components/SWRProvider';
import { AuthProvider } from '@/src/components/AuthProvider';
import { PreferencesProvider } from '@/src/components/dashboard/PreferencesContext';
import { ToastProvider } from '@/src/components/dashboard/ToastProvider';
import '@/styles/globals.css';
import type { Metadata } from 'next';
import '../styles/globals.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = { title: 'Lokifi' };

// Google OAuth Client ID - Replace with your actual client ID
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <SWRProvider>
            <AuthProvider>
              <PreferencesProvider>
                <ToastProvider>
                  <GlobalHeader />
                  {children}
                </ToastProvider>
              </PreferencesProvider>
            </AuthProvider>
          </SWRProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
