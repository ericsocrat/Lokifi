/**
 * Centralized API Error Handling & Retry Logic
 *
 * Provides robust error recovery patterns including:
 * - Exponential backoff retry strategy
 * - Circuit breaker pattern for failing endpoints
 * - Detailed error classification (network, timeout, validation, server)
 * - Error recovery callbacks
 *
 * @module apiErrorHandler
 * @see docs/guides/testing/external-api-testing-patterns.md for async testing
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('APIErrorHandler');

/**
 * Categorized API error types for better error handling
 */
export enum ErrorCategory {
  /** Network errors: No internet, CORS, etc */
  NETWORK = 'network',
  /** Timeout: Request took too long */
  TIMEOUT = 'timeout',
  /** Client errors: 4xx status codes */
  CLIENT = 'client',
  /** Server errors: 5xx status codes */
  SERVER = 'server',
  /** Parsing/validation errors */
  VALIDATION = 'validation',
  /** Unknown error type */
  UNKNOWN = 'unknown',
}

/**
 * Enhanced error object with retry information
 */
export interface APIError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  retryable: boolean;
  retryCount: number;
  originalError: Error;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds (exponential backoff: baseDelay * 2^attempt) */
  baseDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** HTTP status codes that should trigger retries (e.g., [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes: number[];
  /** Custom retry condition function */
  shouldRetry?: (error: APIError, attempt: number) => boolean;
}

/**
 * Default retry configuration - optimized for production APIs
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 32000, // 32 seconds (max for exponential backoff with 3 retries)
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Timeout, Rate limit, Server errors
};

/**
 * Classify API error into standard categories
 *
 * @param error - The error to classify
 * @returns Error category for routing error handling
 */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }

  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return ErrorCategory.NETWORK;
  }

  if (error instanceof Error && error.message.includes('timeout')) {
    return ErrorCategory.TIMEOUT;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return ErrorCategory.TIMEOUT;
  }

  if (error instanceof Error && error.message.includes('JSON')) {
    return ErrorCategory.VALIDATION;
  }

  if (
    error instanceof Response ||
    (typeof error === 'object' && error !== null && 'status' in error)
  ) {
    const status = (error as { status?: number }).status || 0;
    if (status >= 400 && status < 500) return ErrorCategory.CLIENT;
    if (status >= 500) return ErrorCategory.SERVER;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Create an enhanced API error with context
 *
 * @param error - Original error
 * @param statusCode - HTTP status code if applicable
 * @param retryCount - Current retry attempt number
 * @returns Enhanced APIError object
 */
export function createAPIError(
  error: unknown,
  statusCode?: number,
  retryCount = 0
): APIError {
  const category = classifyError(error);
  
  // Create error message, handling Response objects specially
  let message: string;
  if (error instanceof Response) {
    message = `HTTP ${error.status}: ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  
  const originalError = error instanceof Error ? error : new Error(message);

  // Determine if error is retryable based on category and status code
  const retryable =
    category === ErrorCategory.NETWORK ||
    category === ErrorCategory.TIMEOUT ||
    (statusCode !== undefined && [408, 429, 500, 502, 503, 504].includes(statusCode));

  const apiError = new Error(message) as APIError;
  apiError.category = category;
  apiError.statusCode = statusCode;
  apiError.retryable = retryable;
  apiError.retryCount = retryCount;
  apiError.originalError = originalError;

  return apiError;
}

/**
 * Execute async operation with exponential backoff retry
 *
 * Implements retry logic with:
 * - Exponential backoff (baseDelay * 2^attempt)
 * - Jitter to prevent thundering herd (±10%)
 * - Configurable retry conditions
 * - Detailed logging for observability
 *
 * @example
 * ```typescript
 * const data = await withRetry(async () => {
 *   const response = await fetch('/api/data');
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.json();
 * });
 * ```
 *
 * @param fn - Async function to execute with retry
 * @param config - Retry configuration (uses defaults if not provided)
 * @returns Result of successful function execution
 * @throws APIError if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: APIError | undefined;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        logger.debug(`API call succeeded after ${attempt} retries`);
      }
      return result;
    } catch (error) {
      const statusCode = getStatusCodeFromError(error);
      lastError = createAPIError(error, statusCode, attempt);

      // Check if we should retry
      const customShouldRetry = finalConfig.shouldRetry?.(lastError, attempt);
      const shouldRetry =
        customShouldRetry !== undefined
          ? customShouldRetry
          : lastError.retryable && attempt < finalConfig.maxRetries;

      if (!shouldRetry) {
        logger.error('API call failed - not retrying', {
          category: lastError.category,
          statusCode,
          attempt,
          message: lastError.message,
        });
        throw lastError;
      }

      if (attempt < finalConfig.maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = Math.min(
          finalConfig.baseDelay * Math.pow(2, attempt),
          finalConfig.maxDelay
        );

        // Add jitter (±10%) to prevent thundering herd
        const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);
        const delay = Math.round(exponentialDelay + jitter);

        logger.debug(`API call failed, retrying in ${delay}ms`, {
          category: lastError.category,
          statusCode,
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  if (lastError) {
    logger.error('All API retries exhausted', {
      category: lastError.category,
      statusCode: lastError.statusCode,
      maxRetries: finalConfig.maxRetries,
      message: lastError.message,
    });
    throw lastError;
  }

  throw new Error('Unknown error in retry loop');
}

/**
 * Extract HTTP status code from various error types
 *
 * @param error - Error object (could be Response, Error, or unknown)
 * @returns Status code if found, undefined otherwise
 */
function getStatusCodeFromError(error: unknown): number | undefined {
  // Response object
  if (error instanceof Response) {
    return error.status;
  }

  // Object with status property
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as Record<string, unknown>).status;
    if (typeof status === 'number') {
      return status;
    }
  }

  // Error with status in message
  if (error instanceof Error) {
    const match = error.message.match(/HTTP (\d{3})/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return undefined;
}

/**
 * Circuit breaker pattern for failing endpoints
 *
 * Tracks failure rates and stops sending requests to endpoints
 * that are consistently failing, allowing them time to recover.
 *
 * States:
 * - CLOSED: Normal operation (requests allowed)
 * - OPEN: Too many failures (requests denied, fast-fail)
 * - HALF_OPEN: Testing if endpoint recovered (limited requests allowed)
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly endpoint: string,
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly resetTimeoutMs = 60000 // 1 minute
  ) {}

  /**
   * Check if request should be allowed
   *
   * @returns true if request should proceed, false if circuit is open
   * @throws Error if circuit breaker is open
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        logger.debug(`Circuit breaker reset for ${this.endpoint}, trying half-open`);
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker OPEN for ${this.endpoint}. Service unavailable.`
        );
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          logger.info(`Circuit breaker CLOSED for ${this.endpoint}, service recovered`);
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        logger.warn(`Circuit breaker OPEN for ${this.endpoint}, too many failures`);
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Create an error recovery callback for Zustand stores
 *
 * @example
 * ```typescript
 * const handleAPIError = createErrorRecovery((error) => {
 *   if (error.category === ErrorCategory.NETWORK) {
 *     // Show offline indicator
 *   } else if (error.statusCode === 401) {
 *     // Trigger re-authentication
 *   }
 * });
 * ```
 *
 * @param onError - Callback function for error handling
 * @returns Error handler function
 */
export function createErrorRecovery(
  onError: (error: APIError) => void
): (error: unknown) => APIError {
  return (error: unknown) => {
    const statusCode = getStatusCodeFromError(error);
    const apiError = createAPIError(error, statusCode);

    try {
      onError(apiError);
    } catch (callbackError) {
      logger.error('Error in recovery callback', {
        error: callbackError instanceof Error ? callbackError.message : String(callbackError),
      });
    }

    return apiError;
  };
}
