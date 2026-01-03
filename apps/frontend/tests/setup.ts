/**
 * Vitest Global Test Setup
 *
 * Configures the test environment before running tests.
 * Sets up MSW mock server to intercept API calls.
 * Enables Immer plugins for Map and Set support.
 */

import { enableMapSet } from 'immer';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';

// Enable Immer MapSet plugin for stores that use Map/Set in state
enableMapSet();

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    // Log warnings when requests don't match any handlers
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up and close server after all tests
afterAll(() => {
  server.close();
});
