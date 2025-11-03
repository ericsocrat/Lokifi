'use client';

/**
 * React Query Provider
 *
 * Wraps the application with QueryClientProvider for React Query support.
 * Must be a client component to use React Query hooks.
 */

import { queryClient } from '@/lib/api/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

// Lazy load DevTools - only in development, saves ~15-20KB in dev bundle
// Completely excluded from production builds (tree-shaken away)
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  {
    ssr: false,
    loading: () => null, // No loading state needed for DevTools
  }
);

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development, dynamically loaded */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
