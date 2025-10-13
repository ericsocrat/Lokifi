/**
 * MSW Server Setup for Node.js (Test Environment)
 *
 * Creates a mock server that intercepts HTTP requests during tests.
 * Runs in Node.js environment (not browser).
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the mock server with our handlers
export const server = setupServer(...handlers);

// Enable request logging in development
if (process.env.NODE_ENV === 'development') {
  server.events.on('request:start', ({ request }) => {
    console.log('MSW intercepted:', request.method, request.url);
  });
}
