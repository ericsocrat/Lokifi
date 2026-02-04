/**
 * Admin Panel Middleware
 * Session 188: Route protection and authentication checks
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect admin dashboard routes
 * Redirects to login if not authenticated
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Check if accessing protected route
  if (pathname.startsWith('/dashboard')) {
    // Check for auth token in cookies
    const authToken = request.cookies.get('admin_session')?.value;

    if (!authToken) {
      // No auth token - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Token exists - allow access
    // Note: Token validation happens server-side via API calls
    return NextResponse.next();
  }

  // Allow access to public routes (login, landing)
  return NextResponse.next();
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
