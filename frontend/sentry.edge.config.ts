/**
 * Sentry Edge Configuration
 * Error tracking for Edge Runtime (middleware, edge functions)
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'development';

// Initialize Sentry only if DSN is provided
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: 1.0,
    
    // Don't send personally identifiable information
    sendDefaultPii: false,
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Enable debug mode in development
    debug: SENTRY_ENVIRONMENT === 'development',
  });
  
  console.log('✅ Sentry initialized (edge runtime)');
} else {
  console.log('ℹ️ Sentry disabled (no DSN provided)');
}
