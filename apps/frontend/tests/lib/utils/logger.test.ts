/**
 * Tests for logger utility
 */
import { createLogger, isError, LogLevel, Logger, logger } from '@/lib/utils/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupSpy: ReturnType<typeof vi.spyOn>;
  let consoleGroupEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values in order', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.NONE).toBe(4);
    });
  });

  describe('Logger class', () => {
    describe('constructor', () => {
      it('should create a logger with default config', () => {
        const log = new Logger();
        expect(log).toBeInstanceOf(Logger);
      });

      it('should accept custom config', () => {
        const log = new Logger({ enabled: true, level: LogLevel.DEBUG });
        log.debug('test');
        // In test mode, default is disabled, but we enabled it
        expect(consoleDebugSpy).toHaveBeenCalled();
      });

      it('should accept context', () => {
        const log = new Logger({ enabled: true, level: LogLevel.INFO, includeContext: true }, 'TestContext');
        log.info('test message');
        
        expect(consoleInfoSpy).toHaveBeenCalled();
        const logMessage = consoleInfoSpy.mock.calls[0][0];
        expect(logMessage).toContain('TestContext');
      });
    });

    describe('withContext', () => {
      it('should create child logger with context', () => {
        const parent = new Logger({ enabled: true, level: LogLevel.INFO, includeContext: true });
        const child = parent.withContext('ChildContext');
        
        expect(child).toBeInstanceOf(Logger);
        child.info('test');
        
        const logMessage = consoleInfoSpy.mock.calls[0][0];
        expect(logMessage).toContain('ChildContext');
      });
    });

    describe('configure', () => {
      it('should update logger configuration', () => {
        const log = new Logger({ enabled: false, level: LogLevel.INFO });
        log.info('should not log');
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        
        log.configure({ enabled: true });
        log.info('should log now');
        expect(consoleInfoSpy).toHaveBeenCalled();
      });
    });

    describe('log levels', () => {
      it('should respect log level filter', () => {
        const log = new Logger({ enabled: true, level: LogLevel.WARN });
        
        log.debug('debug message');
        log.info('info message');
        log.warn('warn message');
        log.error('error message');
        
        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should log all levels when set to DEBUG', () => {
        const log = new Logger({ enabled: true, level: LogLevel.DEBUG });
        
        log.debug('debug');
        log.info('info');
        log.warn('warn');
        log.error('error');
        
        expect(consoleDebugSpy).toHaveBeenCalled();
        expect(consoleInfoSpy).toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      it('should not log when disabled', () => {
        const log = new Logger({ enabled: false, level: LogLevel.DEBUG });
        
        log.debug('debug');
        log.info('info');
        log.warn('warn');
        log.error('error');
        
        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it('should not log when level is NONE', () => {
        const log = new Logger({ enabled: true, level: LogLevel.NONE });
        
        log.debug('debug');
        log.info('info');
        log.warn('warn');
        log.error('error');
        
        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    describe('debug', () => {
      it('should log message with data', () => {
        const log = new Logger({ enabled: true, level: LogLevel.DEBUG });
        log.debug('Test message', { key: 'value' });
        
        expect(consoleDebugSpy).toHaveBeenCalled();
        const message = consoleDebugSpy.mock.calls[0][0];
        expect(message).toContain('Test message');
      });
    });

    describe('info', () => {
      it('should log message with data', () => {
        const log = new Logger({ enabled: true, level: LogLevel.INFO });
        log.info('Info message', { count: 42 });
        
        expect(consoleInfoSpy).toHaveBeenCalled();
        const message = consoleInfoSpy.mock.calls[0][0];
        expect(message).toContain('Info message');
      });
    });

    describe('warn', () => {
      it('should log warning message', () => {
        const log = new Logger({ enabled: true, level: LogLevel.WARN });
        log.warn('Warning message', { remaining: 5 });
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        const message = consoleWarnSpy.mock.calls[0][0];
        expect(message).toContain('Warning message');
      });
    });

    describe('error', () => {
      it('should log error message with Error object', () => {
        const log = new Logger({ enabled: true, level: LogLevel.ERROR });
        const error = new Error('Test error');
        log.error('Error occurred', error);
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        const message = consoleErrorSpy.mock.calls[0][0];
        expect(message).toContain('Error occurred');
        expect(message).toContain('Test error');
      });

      it('should handle non-Error objects', () => {
        const log = new Logger({ enabled: true, level: LogLevel.ERROR });
        log.error('Error occurred', { code: 'UNKNOWN' });
        
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
    });

    describe('group', () => {
      it('should group logs when enabled and includeContext is true', () => {
        const log = new Logger({ enabled: true, includeContext: true });
        const fn = vi.fn();
        
        log.group('Test Group', fn);
        
        expect(consoleGroupSpy).toHaveBeenCalledWith('Test Group');
        expect(fn).toHaveBeenCalled();
        expect(consoleGroupEndSpy).toHaveBeenCalled();
      });

      it('should call function without grouping when disabled', () => {
        const log = new Logger({ enabled: false });
        const fn = vi.fn();
        
        log.group('Test Group', fn);
        
        expect(consoleGroupSpy).not.toHaveBeenCalled();
        expect(fn).toHaveBeenCalled();
      });

      it('should call groupEnd even if function throws', () => {
        const log = new Logger({ enabled: true, includeContext: true });
        const fn = vi.fn(() => { throw new Error('Test'); });
        
        expect(() => log.group('Test', fn)).toThrow('Test');
        expect(consoleGroupEndSpy).toHaveBeenCalled();
      });
    });

    describe('time', () => {
      it('should time function execution', async () => {
        const log = new Logger({ enabled: true, level: LogLevel.DEBUG });
        const result = await log.time('test', () => 'result');
        
        expect(result).toBe('result');
        expect(consoleDebugSpy).toHaveBeenCalled();
      });

      it('should time async function execution', async () => {
        const log = new Logger({ enabled: true, level: LogLevel.DEBUG });
        const result = await log.time('test', async () => {
          await new Promise(r => setTimeout(r, 10));
          return 'async result';
        });
        
        expect(result).toBe('async result');
        expect(consoleDebugSpy).toHaveBeenCalled();
      });

      it('should execute function even when logging disabled', async () => {
        const log = new Logger({ enabled: false });
        const fn = vi.fn(() => 'result');
        
        const result = await log.time('test', fn);
        
        expect(fn).toHaveBeenCalled();
        expect(result).toBe('result');
      });
    });

    describe('formatting', () => {
      it('should include timestamp when configured', () => {
        const log = new Logger({ 
          enabled: true, 
          level: LogLevel.INFO,
          timestamps: true,
          structured: false 
        });
        log.info('Test message');
        
        const message = consoleInfoSpy.mock.calls[0][0];
        // Should contain ISO timestamp pattern
        expect(message).toMatch(/\d{4}-\d{2}-\d{2}T/);
      });

      it('should output structured JSON when configured', () => {
        const log = new Logger({ 
          enabled: true, 
          level: LogLevel.INFO,
          structured: true 
        });
        log.info('Test message', { key: 'value' });
        
        const message = consoleInfoSpy.mock.calls[0][0];
        const parsed = JSON.parse(message);
        
        expect(parsed.message).toBe('Test message');
        expect(parsed.data.key).toBe('value');
      });
    });
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const log = createLogger('TestComponent', { enabled: true, level: LogLevel.INFO, includeContext: true });
      
      expect(log).toBeInstanceOf(Logger);
      log.info('Test');
      
      const message = consoleInfoSpy.mock.calls[0][0];
      expect(message).toContain('TestComponent');
    });
  });

  describe('logger singleton', () => {
    it('should be a Logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('isError type guard', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
      expect(isError(new RangeError('test'))).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(isError('error string')).toBe(false);
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError(42)).toBe(false);
    });
  });
});
