/**
 * Tests for centralized logging utility
 * 
 * @see apps/frontend/lib/utils/logger.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createLogger, logger, isError } from '../../lib/utils/logger';

describe('Logger Utility', () => {
  // Mock console methods
  const originalConsole = { ...console };
  
  beforeEach(() => {
    // Mock all console methods
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
  });

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole);
    vi.clearAllMocks();
  });

  describe('Logger Construction', () => {
    it('should create logger with default config', () => {
      const log = new Logger();
      expect(log).toBeInstanceOf(Logger);
    });

    it('should create logger with custom config', () => {
      const log = new Logger({ level: LogLevel.ERROR, enabled: true });
      log.error('test error');
      expect(console.error).toHaveBeenCalledOnce();
    });

    it('should create logger with context', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: true, structured: false }, 'TestContext');
      log.info('test message');
      expect(console.info).toHaveBeenCalled();
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[TestContext]');
    });
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      const log = new Logger({ level: LogLevel.WARN, enabled: true });
      
      log.debug('debug message');
      log.info('info message');
      log.warn('warn message');
      log.error('error message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledOnce();
      expect(console.error).toHaveBeenCalledOnce();
    });

    it('should allow DEBUG level in development', () => {
      const log = new Logger({ level: LogLevel.DEBUG, enabled: true });
      
      log.debug('debug message');
      expect(console.debug).toHaveBeenCalledOnce();
    });

    it('should disable all logging when level is NONE', () => {
      const log = new Logger({ level: LogLevel.NONE, enabled: true });
      
      log.debug('debug');
      log.info('info');
      log.warn('warn');
      log.error('error');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should disable all logging when enabled is false', () => {
      const log = new Logger({ level: LogLevel.DEBUG, enabled: false });
      
      log.debug('debug');
      log.info('info');
      log.warn('warn');
      log.error('error');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Log Methods', () => {
    it('should log debug messages', () => {
      const log = new Logger({ level: LogLevel.DEBUG, enabled: true });
      log.debug('debug message', { foo: 'bar' });
      
      expect(console.debug).toHaveBeenCalledOnce();
      const call = (console.debug as any).mock.calls[0][0];
      expect(call).toContain('debug message');
    });

    it('should log info messages', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true });
      log.info('info message', { count: 42 });
      
      expect(console.info).toHaveBeenCalledOnce();
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('info message');
    });

    it('should log warning messages', () => {
      const log = new Logger({ level: LogLevel.WARN, enabled: true });
      log.warn('warning message', { severity: 'medium' });
      
      expect(console.warn).toHaveBeenCalledOnce();
      const call = (console.warn as any).mock.calls[0][0];
      expect(call).toContain('warning message');
    });

    it('should log error messages', () => {
      const log = new Logger({ level: LogLevel.ERROR, enabled: true });
      const error = new Error('Test error');
      log.error('error message', error);
      
      expect(console.error).toHaveBeenCalledOnce();
      const call = (console.error as any).mock.calls[0][0];
      expect(call).toContain('error message');
    });

    it('should handle Error objects in error logging', () => {
      const log = new Logger({ level: LogLevel.ERROR, enabled: true, structured: true });
      const error = new Error('Test error');
      log.error('Failed operation', error);
      
      expect(console.error).toHaveBeenCalledOnce();
      const call = (console.error as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.data.name).toBe('Error');
      expect(parsed.data.message).toBe('Test error');
      expect(parsed.data.stack).toBeDefined();
    });

    it('should handle non-Error objects in error logging', () => {
      const log = new Logger({ level: LogLevel.ERROR, enabled: true });
      log.error('Failed operation', { code: 500, message: 'Internal error' });
      
      expect(console.error).toHaveBeenCalledOnce();
    });
  });

  describe('Context', () => {
    it('should create child logger with context', () => {
      const parentLog = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: true, structured: false });
      const childLog = parentLog.withContext('ChildContext');
      
      childLog.info('test message');
      expect(console.info).toHaveBeenCalled();
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[ChildContext]');
    });

    it('should include context in log output when enabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: true, structured: false }, 'MyComponent');
      log.info('test message');
      
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[MyComponent]');
    });

    it('should not include context when disabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: false }, 'MyComponent');
      log.info('test message');
      
      const call = (console.info as any).mock.calls[0][0];
      expect(call).not.toContain('[MyComponent]');
    });
  });

  describe('Structured Logging', () => {
    it('should format logs as JSON when structured is true', () => {
      const log = new Logger({ 
        level: LogLevel.INFO, 
        enabled: true, 
        structured: true,
        timestamps: false,
      });
      
      log.info('test message', { foo: 'bar' });
      
      const call = (console.info as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.message).toBe('test message');
      expect(parsed.data.foo).toBe('bar');
      expect(parsed.level).toBe('INFO');
    });

    it('should format logs as human-readable when structured is false', () => {
      const log = new Logger({ 
        level: LogLevel.INFO, 
        enabled: true, 
        structured: false,
        timestamps: false,
      });
      
      log.info('test message');
      
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('INFO: test message');
      expect(() => JSON.parse(call)).toThrow();
    });
  });

  describe('Timestamps', () => {
    it('should include timestamp when enabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, timestamps: true });
      log.info('test message');
      
      const call = (console.info as any).mock.calls[0][0];
      // Check for ISO timestamp pattern (YYYY-MM-DD)
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should not include timestamp when disabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, timestamps: false });
      log.info('test message');
      
      const call = (console.info as any).mock.calls[0][0];
      // Should not contain ISO timestamp pattern
      expect(call).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });
  });

  describe('Configuration', () => {
    it('should allow runtime configuration updates', () => {
      const log = new Logger({ level: LogLevel.ERROR, enabled: true });
      
      log.info('should not log');
      expect(console.info).not.toHaveBeenCalled();
      
      log.configure({ level: LogLevel.INFO });
      log.info('should log now');
      expect(console.info).toHaveBeenCalledOnce();
    });
  });

  describe('Grouping', () => {
    it('should group logs when includeContext is enabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: true });
      
      log.group('Test Group', () => {
        log.info('grouped message');
      });
      
      expect(console.group).toHaveBeenCalledWith('Test Group');
      expect(console.info).toHaveBeenCalledOnce();
      expect(console.groupEnd).toHaveBeenCalledOnce();
    });

    it('should not group logs when includeContext is disabled', () => {
      const log = new Logger({ level: LogLevel.INFO, enabled: true, includeContext: false });
      
      log.group('Test Group', () => {
        log.info('grouped message');
      });
      
      expect(console.group).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledOnce();
      expect(console.groupEnd).not.toHaveBeenCalled();
    });

    it('should execute callback even if grouping fails', () => {
      const log = new Logger({ enabled: true, includeContext: true });
      const callback = vi.fn();
      
      log.group('Test Group', callback);
      
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('Performance Timing', () => {
    it('should time async function execution', async () => {
      const log = new Logger({ level: LogLevel.DEBUG, enabled: true });
      
      const result = await log.time('test-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });
      
      expect(result).toBe('result');
      expect(console.debug).toHaveBeenCalled();
      const call = (console.debug as any).mock.calls[0][0];
      expect(call).toContain('test-operation completed in');
    });

    it('should time sync function execution', async () => {
      const log = new Logger({ level: LogLevel.DEBUG, enabled: true });
      
      const result = await log.time('test-operation', () => {
        return 'result';
      });
      
      expect(result).toBe('result');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should not affect function execution when logging is disabled', async () => {
      const log = new Logger({ enabled: false });
      
      const result = await log.time('test-operation', () => 'result');
      
      expect(result).toBe('result');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('Factory Functions', () => {
    it('should create logger with createLogger factory', () => {
      const log = createLogger('TestComponent');
      expect(log).toBeInstanceOf(Logger);
      
      log.configure({ level: LogLevel.INFO, enabled: true, includeContext: true, structured: false });
      log.info('test');
      
      const call = (console.info as any).mock.calls[0][0];
      expect(call).toContain('[TestComponent]');
    });

    it('should export default logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify Error objects', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError('error string')).toBe(false);
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical component logging flow', () => {
      const log = createLogger('WebSocketConnection');
      log.configure({ 
        level: LogLevel.DEBUG, 
        enabled: true,
        includeContext: true,
      });
      
      log.debug('Attempting connection', { url: 'ws://localhost' });
      log.info('Connection established');
      log.warn('Connection unstable', { reconnects: 3 });
      
      expect(console.debug).toHaveBeenCalledOnce();
      expect(console.info).toHaveBeenCalledOnce();
      expect(console.warn).toHaveBeenCalledOnce();
    });

    it('should handle error scenarios with stack traces', () => {
      const log = createLogger('AuthService');
      log.configure({ level: LogLevel.ERROR, enabled: true, structured: true });
      
      try {
        throw new Error('Authentication failed');
      } catch (error) {
        log.error('Login error', error);
      }
      
      expect(console.error).toHaveBeenCalledOnce();
      const call = (console.error as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.message).toBe('Login error');
      expect(parsed.data.stack).toBeDefined();
    });
  });
});
