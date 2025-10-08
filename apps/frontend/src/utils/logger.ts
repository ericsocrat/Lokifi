/**
 * Production-ready logging utility
 * Replaces console.log with environment-aware logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`🔍 [DEBUG]`, message, ...args);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`ℹ️ [INFO]`, message, ...args);
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️ [WARN]`, message, ...args);
    }
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`❌ [ERROR]`, message, error, ...args);
      
      // In production, you might want to send to error tracking service
      // if (!this.isDevelopment && typeof window !== 'undefined') {
      //   // Send to Sentry, LogRocket, etc.
      // }
    }
  }

  /**
   * Log WebSocket events
   */
  websocket(event: string, details?: any): void {
    if (this.isDevelopment) {
      console.log(`🌐 [WS]`, event, details || '');
    }
  }

  /**
   * Log API calls
   */
  api(method: string, url: string, details?: any): void {
    if (this.isDevelopment) {
      console.log(`🔌 [API]`, method, url, details || '');
    }
  }

  /**
   * Log performance metrics
   */
  perf(metric: string, value: number, unit: string = 'ms'): void {
    if (this.isDevelopment) {
      console.log(`⚡ [PERF]`, `${metric}: ${value}${unit}`);
    }
  }

  /**
   * Set log level programmatically
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Check if a log level is enabled
   */
  isEnabled(level: LogLevel): boolean {
    return this.level <= level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logWebSocket = logger.websocket.bind(logger);
export const logApi = logger.api.bind(logger);
export const logPerf = logger.perf.bind(logger);
