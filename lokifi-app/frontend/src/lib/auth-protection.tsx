'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/components/AuthProvider';

/**
 * Higher-Order Component to protect routes that require authentication
 * Usage: export default withAuth(YourPage)
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const redirectTo = options?.redirectTo || '/';

    useEffect(() => {
      if (!loading && !user) {
        // Store intended destination
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
        }
        router.push(redirectTo);
      }
    }, [loading, user, router]);

    // Show loading state
    if (loading) {
      return (
        options?.loadingComponent || (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        )
      );
    }

    // If not authenticated, show nothing (will redirect)
    if (!user) {
      return null;
    }

    // User is authenticated, render the component
    return <Component {...props} />;
  };
}

/**
 * Hook to require authentication in a component
 * Usage: useRequireAuth() at the top of your component
 */
export function useRequireAuth(redirectTo: string = '/') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Store intended destination
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
      }
      router.push(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}
