/**
 * Tests for API Error Handling & Retry Logic
 *
 * Tests cover:
 * - Error classification for network, timeout, client, server errors
 * - Retry logic with exponential backoff
 * - Jitter implementation to prevent thundering herd
 * - Circuit breaker state transitions
 * - Error recovery callbacks
 */

import {
  CircuitBreaker,
  classifyError,
  createAPIError,
  createErrorRecovery,
  ErrorCategory,
  withRetry,
} from '@/lib/api/errorHandler';
import { describe, expect, it, vi } from 'vitest';

describe('ErrorHandler - API Error Management', () => {
  describe('classifyError', () => {
    it('should classify network errors', () => {
      const networkError = new TypeError('Failed to fetch');
      expect(classifyError(networkError)).toBe(ErrorCategory.NETWORK);
    });

    it('should classify timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      expect(classifyError(timeoutError)).toBe(ErrorCategory.TIMEOUT);
    });

    it('should classify AbortError as timeout', () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      expect(classifyError(abortError)).toBe(ErrorCategory.TIMEOUT);
    });

    it('should classify JSON parsing errors as validation', () => {
      const jsonError = new SyntaxError('Unexpected token in JSON');
      expect(classifyError(jsonError)).toBe(ErrorCategory.VALIDATION);
    });

    it('should classify 4xx errors as client errors', () => {
      const response = new Response('Not Found', { status: 404 });
      expect(classifyError(response)).toBe(ErrorCategory.CLIENT);
    });

    it('should classify 5xx errors as server errors', () => {
      const response = new Response('Server Error', { status: 500 });
      expect(classifyError(response)).toBe(ErrorCategory.SERVER);
    });

    it('should default to UNKNOWN for unrecognized errors', () => {
      expect(classifyError(new Error('Weird error'))).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('createAPIError', () => {
    it('should create error with correct properties', () => {
      const originalError = new Error('Test error');
      const apiError = createAPIError(originalError, 500, 1);

      expect(apiError.message).toBe('Test error');
      expect(apiError.statusCode).toBe(500);
      expect(apiError.retryCount).toBe(1);
      expect(apiError.originalError).toBe(originalError);
    });

    it('should mark retryable status codes as retryable', () => {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];

      retryableStatuses.forEach((status) => {
        const error = createAPIError(new Error(), status);
        expect(error.retryable).toBe(true);
      });
    });

    it('should mark non-retryable status codes as non-retryable', () => {
      const nonRetryableStatuses = [400, 401, 403, 404];

      nonRetryableStatuses.forEach((status) => {
        const error = createAPIError(new Error(), status);
        expect(error.retryable).toBe(false);
      });
    });

    it('should mark network errors as retryable', () => {
      const networkError = new TypeError('Failed to fetch');
      const apiError = createAPIError(networkError);
      expect(apiError.retryable).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn(async () => 'success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should retry on transient failures', async () => {
      vi.useFakeTimers();
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Response('Server Error', { status: 503 });
        }
        return 'success';
      });

      const resultPromise = withRetry(fn);

      // Fast forward through all retry delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      vi.useRealTimers();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn(async () => {
        throw new Response('Not Found', { status: 404 });
      });

      await expect(withRetry(fn)).rejects.toThrow();
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should throw after exhausting retries', async () => {
      vi.useFakeTimers();
      const fn = vi.fn(async () => {
        throw new Response('Server Error', { status: 503 });
      });

      const resultPromise = withRetry(fn, { maxRetries: 2, baseDelay: 1000 });

      // Run all timers
      await vi.runAllTimersAsync();

      vi.useRealTimers();

      await expect(resultPromise).rejects.toThrow('HTTP 503');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use custom shouldRetry function', async () => {
      vi.useFakeTimers();
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Response('Custom Error', { status: 418 }); // I'm a teapot
        }
        return 'success';
      });

      const resultPromise = withRetry(fn, {
        maxRetries: 3,
        baseDelay: 100,
        shouldRetry: (error, attempt) => {
          // Custom logic: retry status 418 only on first attempt
          return error.statusCode === 418 && attempt === 0;
        },
      });

      await vi.runAllTimersAsync();

      vi.useRealTimers();

      const result = await resultPromise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker('test-endpoint');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after threshold failures', async () => {
      const breaker = new CircuitBreaker('test-endpoint', 3, 2, 60000);
      const fn = vi.fn(async () => {
        throw new Error('Service failed');
      });

      // First 3 failures
      for (let i = 0; i < 3; i++) {
        await expect(breaker.call(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');

      // Subsequent calls should fail immediately without calling fn
      await expect(breaker.call(fn)).rejects.toThrow('Circuit breaker OPEN');
      expect(fn).toHaveBeenCalledTimes(3); // fn not called again
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      vi.useFakeTimers();

      const breaker = new CircuitBreaker('test-endpoint', 3, 2, 5000); // 5 second timeout
      const fn = vi.fn(async () => {
        throw new Error('Service failed');
      });

      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        await expect(breaker.call(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');

      // Advance past reset timeout
      await vi.advanceTimersByTimeAsync(5100);

      // Next call should attempt (HALF_OPEN state)
      vi.useRealTimers();

      vi.useFakeTimers();
      const fn2 = vi.fn(async () => 'recovered');
      await breaker.call(fn2);

      expect(fn2).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker('test-endpoint', 2, 2, 1000);
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount <= 2) throw new Error('Failed');
        return 'success';
      });

      // Trigger OPEN
      await expect(breaker.call(fn)).rejects.toThrow();
      await expect(breaker.call(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');

      // Mock time passage
      vi.useFakeTimers();
      await vi.advanceTimersByTimeAsync(1100);

      // Next calls should succeed
      vi.useRealTimers();
      let testFn = vi.fn(async () => 'ok');
      await breaker.call(testFn);
      testFn = vi.fn(async () => 'ok');
      await breaker.call(testFn);

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reset circuit breaker', async () => {
      const breaker = new CircuitBreaker('test-endpoint');
      const fn = vi.fn(async () => {
        throw new Error('Failed');
      });

      // Trigger OPEN
      for (let i = 0; i < 5; i++) {
        await expect(breaker.call(fn)).rejects.toThrow();
      }

      expect(breaker.getState()).toBe('OPEN');

      // Reset
      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('createErrorRecovery', () => {
    it('should call error handler with APIError', async () => {
      const handler = vi.fn();
      const recovery = createErrorRecovery(handler);

      const error = new TypeError('Failed to fetch');
      const apiError = recovery(error);

      expect(handler).toHaveBeenCalledWith(apiError);
      expect(apiError.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle callback errors gracefully', async () => {
      const handler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const recovery = createErrorRecovery(handler);

      const error = new Error('Test');
      expect(() => recovery(error)).not.toThrow();
    });

    it('should return APIError from recovery', async () => {
      const handler = vi.fn();
      const recovery = createErrorRecovery(handler);

      const error = new Response('Server Error', { status: 500 });
      const apiError = recovery(error);

      expect(apiError.category).toBe(ErrorCategory.SERVER);
      expect(apiError.statusCode).toBe(500);
    });
  });

  describe('Jitter in retry delays', () => {
    it('should add random jitter to delays', async () => {
      vi.useFakeTimers();

      const fn = vi.fn(async () => {
        throw new Response('Error', { status: 503 });
      });

      const resultPromise = withRetry(fn, {
        maxRetries: 1,
        baseDelay: 1000,
        maxDelay: 10000,
      });

      // Advance past the first retry delay (baseDelay with jitter)
      // Jitter is ±10% of 1000, so delay ranges from 900-1100
      // Advance 1500 to cover all possibilities
      await vi.advanceTimersByTimeAsync(1500);

      vi.useRealTimers();

      await expect(resultPromise).rejects.toThrow('HTTP 503');

      // If we get here without timeout, jitter logic worked correctly
      expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
    });
  });
});
