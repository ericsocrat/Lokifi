'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/components/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setHasChecked(true);
      
      if (requireAuth && !user) {
        // Store the intended destination for after they log in via navbar button
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirectAfterAuth', pathname || '/');
        }
      }
    }
  }, [loading, user, requireAuth, pathname]);

  // Show loading state while checking authentication
  if (loading || !hasChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not logged in, show message
  if (requireAuth && !user) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <svg 
                  className="w-8 h-8 text-blue-600 dark:text-blue-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Authentication Required
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please use the "Login / Sign Up" button in the top right to access this page
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>👆</span>
                <span>Look for the blue button in the navigation bar</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // User is authenticated or auth is not required, render children
  return <>{children}</>;
}
