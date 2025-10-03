import GlobalHeader from '@/components/GlobalHeader';
import { SWRProvider } from '@/components/SWRProvider';
import { AuthProvider } from '@/src/components/AuthProvider';
import { PreferencesProvider } from '@/src/components/dashboard/PreferencesContext';
import { ToastProvider } from '@/src/components/dashboard/ToastProvider';
import '@/styles/globals.css';
import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = { title: 'Lokifi' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
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
      </body>
    </html>
  );
}
