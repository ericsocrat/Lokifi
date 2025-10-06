/**
 * Sentry Client Configuration
 * Error tracking for browser-side errors
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
    tracesSampleRate: 1.0, // Capture 100% of transactions in dev, reduce in prod
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% when errors occur
    
    // Additional options
    integrations: [
      // Enable automatic session tracking
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Track browser performance
      Sentry.browserTracingIntegration(),
    ],
    
    // Filter out non-critical errors
    beforeSend(event, hint) {
      // Don't send network errors that are user-caused
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        
        // Filter out common non-critical errors
        if (
          message.includes('Failed to fetch') ||
          message.includes('Network request failed') ||
          message.includes('Load failed')
        ) {
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
  
  console.log('✅ Sentry initialized (client-side)');
} else {
  console.log('ℹ️ Sentry disabled (no DSN provided)');
}
