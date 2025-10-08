/**
 * Sentry Server Configuration
 * Error tracking for server-side errors (API routes, SSR, etc.)
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
    tracesSampleRate: 1.0, // Capture 100% of transactions
    
    // Additional options
    integrations: [
      // Track HTTP requests
      Sentry.httpIntegration(),
    ],
    
    // Filter out non-critical errors
    beforeSend(event, hint) {
      // Don't send specific error types
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        
        // Filter out ECONNREFUSED errors (backend not running)
        if (message.includes('ECONNREFUSED')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Don't send personally identifiable information
    sendDefaultPii: false,
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Enable debug mode in development
    debug: SENTRY_ENVIRONMENT === 'development',
  });
  
  console.log('✅ Sentry initialized (server-side)');
} else {
  console.log('ℹ️ Sentry disabled (no DSN provided)');
}
