/**
 * Centralized Logging Utility for Lokifi Frontend
 *
 * Provides structured logging with environment-based filtering,
 * log levels, and better debugging capabilities than console.log.
 *
 * @module logger
 * @see docs/guides/CODING_STANDARDS.md for usage guidelines
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // Disable all logging
}

/**
 * Logger configuration options
 */
interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;
  /** Enable console output */
  enabled: boolean;
  /** Include timestamps in logs */
  timestamps: boolean;
  /** Include source context (file/component) */
  includeContext: boolean;
  /** Enable structured logging (JSON format) */
  structured: boolean;
}

/**
 * Log entry metadata
 */
interface LogMetadata {
  timestamp?: string;
  context?: string;
  level?: string;
  [key: string]: any;
}

/**
 * Default configuration based on environment
 */
const getDefaultConfig = (): LoggerConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  return {
    level: isTest ? LogLevel.NONE : isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
    enabled: !isTest, // Disable in tests to reduce noise
    timestamps: isDevelopment,
    includeContext: isDevelopment,
    structured: !isDevelopment, // Use JSON in production for better parsing
  };
};

/**
 * Logger class for centralized logging
 */
class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(config?: Partial<LoggerConfig>, context?: string) {
    this.config = { ...getDefaultConfig(), ...config };
    this.context = context;
  }

  /**
   * Create a child logger with specific context
   *
   * @example
   * const log = logger.withContext('WebSocketConnection');
   * log.info('Connected to server');
   */
  withContext(context: string): Logger {
    return new Logger(this.config, context);
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Format log message with metadata
   */
  private format(level: LogLevel, message: string, data?: any): string {
    const metadata: LogMetadata = {};

    if (this.config.timestamps) {
      metadata.timestamp = new Date().toISOString();
    }

    if (this.config.includeContext && this.context) {
      metadata.context = this.context;
    }

    metadata.level = LogLevel[level];

    if (this.config.structured) {
      return JSON.stringify({
        ...metadata,
        message,
        ...(data && { data }),
      });
    }

    // Human-readable format for development
    const prefix = [
      metadata.timestamp,
      metadata.context ? `[${metadata.context}]` : null,
      `${LogLevel[level]}:`,
    ]
      .filter(Boolean)
      .join(' ');

    return `${prefix} ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  }

  /**
   * Check if log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  /**
   * Debug level logging - detailed information for debugging
   * Only shown in development mode
   *
   * @example
   * logger.debug('User input validation', { email, isValid: true });
   */
  debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.format(LogLevel.DEBUG, message, data));
  }

  /**
   * Info level logging - general informational messages
   *
   * @example
   * logger.info('WebSocket connected', { url: wsUrl });
   */
  info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.format(LogLevel.INFO, message, data));
  }

  /**
   * Warning level logging - potentially harmful situations
   *
   * @example
   * logger.warn('API rate limit approaching', { remaining: 5 });
   */
  warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.format(LogLevel.WARN, message, data));
  }

  /**
   * Error level logging - error events
   * Always logged in all environments except tests
   *
   * @example
   * logger.error('Failed to fetch user data', { error: err.message });
   */
  error(message: string, error?: Error | any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorData =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    console.error(this.format(LogLevel.ERROR, message, errorData));
  }

  /**
   * Group related log messages (development only)
   *
   * @example
   * logger.group('User Authentication', () => {
   *   logger.info('Validating credentials');
   *   logger.info('Fetching user profile');
   * });
   */
  group(label: string, fn: () => void): void {
    if (!this.config.enabled || !this.config.includeContext) {
      fn();
      return;
    }

    console.group(label);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Time a function execution (development only)
   *
   * @example
   * await logger.time('fetchUserData', async () => {
   *   return await api.getUser(userId);
   * });
   */
  async time<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return await fn();
    }

    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Create a performance mark for measuring
   *
   * @example
   * logger.mark('data-fetch-start');
   * await fetchData();
   * logger.measure('data-fetch', 'data-fetch-start');
   */
  mark(name: string): void {
    if (!this.config.enabled) return;
    performance.mark(name);
  }

  /**
   * Measure duration between marks
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if (!this.config.enabled) return;

    try {
      const measure = performance.measure(name, startMark, endMark);
      this.debug(`Performance: ${name}`, {
        duration: `${measure.duration.toFixed(2)}ms`,
      });
    } catch (error) {
      this.warn('Performance measurement failed', { name, error });
    }
  }
}

/**
 * Default logger instance
 *
 * @example
 * import { logger } from '@/lib/utils/logger';
 * logger.info('Application started');
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 *
 * @example
 * import { createLogger } from '@/lib/utils/logger';
 * const log = createLogger('MyComponent');
 * log.info('Component mounted');
 */
export const createLogger = (context: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config, context);
};

/**
 * Export Logger class for advanced usage
 */
export { Logger };

/**
 * Type guard for Error objects
 */
export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

// Export default logger for convenience
export default logger;
