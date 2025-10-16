import {
  type Alert,
  type AlertEvent,
  createAlert,
  deleteAlert,
  listAlerts,
  subscribeAlerts,
  toggleAlert,
} from '@/lib/utils/alerts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('alerts utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('listAlerts', () => {
    it('should return an empty array', async () => {
      const result = await listAlerts();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should be a Promise', () => {
      const result = listAlerts();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return consistent results on multiple calls', async () => {
      const result1 = await listAlerts();
      const result2 = await listAlerts();
      expect(result1).toEqual(result2);
    });
  });

  describe('createAlert', () => {
    it('should create alert with default values', async () => {
      const payload = {
        kind: 'price',
        sound: 'ping' as const,
      };

      const result = await createAlert(payload);

      expect(result).toMatchObject({
        kind: 'price',
        sound: 'ping',
        enabled: true,
        triggers: 0,
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should create alert with optional fields', async () => {
      const payload = {
        kind: 'cross',
        sound: 'none' as const,
        snoozedUntil: Date.now() + 10000,
        maxTriggers: 5,
        note: 'Test note',
      };

      const result = await createAlert(payload);

      expect(result).toMatchObject({
        kind: 'cross',
        sound: 'none',
        enabled: true,
        triggers: 0,
        snoozedUntil: payload.snoozedUntil,
        maxTriggers: 5,
        note: 'Test note',
      });
    });

    it('should generate unique IDs for different alerts', async () => {
      const payload = { kind: 'price' };

      const alert1 = await createAlert(payload);
      vi.advanceTimersByTime(1);
      const alert2 = await createAlert(payload);

      expect(alert1.id).not.toBe(alert2.id);
    });

    it('should handle payload without optional fields', async () => {
      const payload = {
        kind: 'volume',
      };

      const result = await createAlert(payload);

      expect(result).toMatchObject({
        kind: 'volume',
        enabled: true,
        triggers: 0,
      });
      expect(result.sound).toBeUndefined();
      expect(result.snoozedUntil).toBeUndefined();
      expect(result.maxTriggers).toBeUndefined();
      expect(result.note).toBeUndefined();
    });

    it('should return a Promise', () => {
      const result = createAlert({ kind: 'price' });
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle different kind values', async () => {
      const kinds = ['price', 'cross', 'volume', 'custom'];

      for (const kind of kinds) {
        const result = await createAlert({ kind });
        expect(result.kind).toBe(kind);
      }
    });

    it('should preserve all payload properties', async () => {
      const payload = {
        kind: 'price',
        sound: 'ping' as const,
        snoozedUntil: 1234567890,
        maxTriggers: 10,
        note: 'Important alert',
      };

      const result = await createAlert(payload);

      expect(result.kind).toBe(payload.kind);
      expect(result.sound).toBe(payload.sound);
      expect(result.snoozedUntil).toBe(payload.snoozedUntil);
      expect(result.maxTriggers).toBe(payload.maxTriggers);
      expect(result.note).toBe(payload.note);
    });
  });

  describe('toggleAlert', () => {
    it('should return true when enabled', async () => {
      const result = await toggleAlert('test-id', true);
      expect(result).toBe(true);
    });

    it('should return true when disabled', async () => {
      const result = await toggleAlert('test-id', false);
      expect(result).toBe(true);
    });

    it('should handle different ID formats', async () => {
      const ids = ['1', 'abc-123', '12345', 'uuid-like-string'];

      for (const id of ids) {
        const result = await toggleAlert(id, true);
        expect(result).toBe(true);
      }
    });

    it('should return a Promise', () => {
      const result = toggleAlert('test-id', true);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle multiple toggle calls', async () => {
      const id = 'test-id';
      const result1 = await toggleAlert(id, true);
      const result2 = await toggleAlert(id, false);
      const result3 = await toggleAlert(id, true);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe('deleteAlert', () => {
    it('should return true for any ID', async () => {
      const result = await deleteAlert('test-id');
      expect(result).toBe(true);
    });

    it('should handle different ID formats', async () => {
      const ids = ['1', 'abc-123', '12345', 'uuid-like-string'];

      for (const id of ids) {
        const result = await deleteAlert(id);
        expect(result).toBe(true);
      }
    });

    it('should return a Promise', () => {
      const result = deleteAlert('test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle multiple delete calls', async () => {
      const id = 'test-id';
      const result1 = await deleteAlert(id);
      const result2 = await deleteAlert(id);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('subscribeAlerts', () => {
    it('should return an unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should not call callback immediately', () => {
      const callback = vi.fn();
      subscribeAlerts(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback before tick interval', () => {
      const callback = vi.fn();
      subscribeAlerts(callback);

      vi.advanceTimersByTime(30_000); // 30 seconds
      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow unsubscribe to stop callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback);

      unsubscribe();
      vi.advanceTimersByTime(60_000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscriptions independently', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribeAlerts(callback1);
      const unsubscribe2 = subscribeAlerts(callback2);

      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(unsubscribe1).not.toBe(unsubscribe2);
    });

    it('should handle unsubscribe being called multiple times', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback);

      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it('should handle subscription with withPast parameter', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback, true);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle subscription without withPast parameter', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle callback that throws error', () => {
      const errorCallback = () => {
        throw new Error('Callback error');
      };

      expect(() => {
        const unsubscribe = subscribeAlerts(errorCallback);
        unsubscribe();
      }).not.toThrow();
    });

    it('should allow immediate unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeAlerts(callback);
      unsubscribe();

      vi.advanceTimersByTime(60_000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle createAlert with empty kind', async () => {
      const result = await createAlert({ kind: '' });
      expect(result.kind).toBe('');
      expect(result.enabled).toBe(true);
      expect(result.triggers).toBe(0);
    });

    it('should handle toggleAlert with empty string ID', async () => {
      const result = await toggleAlert('', true);
      expect(result).toBe(true);
    });

    it('should handle deleteAlert with empty string ID', async () => {
      const result = await deleteAlert('');
      expect(result).toBe(true);
    });

    it('should handle createAlert with very large maxTriggers', async () => {
      const result = await createAlert({
        kind: 'price',
        maxTriggers: Number.MAX_SAFE_INTEGER,
      });
      expect(result.maxTriggers).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle createAlert with negative snoozedUntil', async () => {
      const result = await createAlert({
        kind: 'price',
        snoozedUntil: -1000,
      });
      expect(result.snoozedUntil).toBe(-1000);
    });

    it('should handle createAlert with very long note', async () => {
      const longNote = 'a'.repeat(10000);
      const result = await createAlert({
        kind: 'price',
        note: longNote,
      });
      expect(result.note).toBe(longNote);
    });
  });

  describe('type safety', () => {
    it('should handle Alert type structure', () => {
      const alert: Alert = {
        id: '1',
        kind: 'price',
        enabled: true,
        sound: 'ping',
        snoozedUntil: Date.now(),
        maxTriggers: 5,
        triggers: 2,
        note: 'Test',
      };

      expect(alert.id).toBeDefined();
      expect(alert.kind).toBeDefined();
      expect(alert.enabled).toBeDefined();
    });

    it('should handle AlertEvent type structure', () => {
      const event: AlertEvent = {
        id: '1',
        kind: 'price',
        at: Date.now(),
        price: 100.5,
      };

      expect(event.id).toBeDefined();
      expect(event.kind).toBeDefined();
      expect(event.at).toBeDefined();
    });

    it('should handle createAlert return type', async () => {
      const result = await createAlert({ kind: 'price' });

      // TypeScript ensures these properties exist
      const _id: string = result.id;
      const _kind: string = result.kind;
      const _enabled: boolean = result.enabled;
      const _triggers: number = result.triggers;

      expect(_id).toBeDefined();
      expect(_kind).toBeDefined();
      expect(_enabled).toBeDefined();
      expect(_triggers).toBeDefined();
    });
  });
});
