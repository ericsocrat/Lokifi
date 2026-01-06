/**
 * Tests for notify utility
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureNotificationPermission, notify } from '@/lib/utils/notify';

describe('notify', () => {
  let originalNotification: typeof Notification;
  let mockNotification: ReturnType<typeof vi.fn>;
  let mockRequestPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalNotification = globalThis.Notification;
    
    // Create mock Notification constructor
    mockNotification = vi.fn();
    mockRequestPermission = vi.fn().mockResolvedValue('granted');
    
    Object.defineProperty(mockNotification, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(mockNotification, 'requestPermission', {
      value: mockRequestPermission,
      writable: true,
      configurable: true,
    });
    
    // @ts-expect-error - mocking global
    globalThis.Notification = mockNotification;
  });

  afterEach(() => {
    globalThis.Notification = originalNotification;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('ensureNotificationPermission', () => {
    it('should return granted if permission is already granted', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'granted', configurable: true });
      
      const result = await ensureNotificationPermission();
      
      expect(result).toBe('granted');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should return denied if permission is already denied', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'denied', configurable: true });
      
      const result = await ensureNotificationPermission();
      
      expect(result).toBe('denied');
      expect(mockRequestPermission).not.toHaveBeenCalled();
    });

    it('should request permission if default and return granted', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'default', configurable: true });
      mockRequestPermission.mockResolvedValue('granted');
      
      const result = await ensureNotificationPermission();
      
      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });

    it('should return denied if Notification is not supported', async () => {
      // @ts-expect-error - removing global
      delete globalThis.Notification;
      
      const result = await ensureNotificationPermission();
      
      expect(result).toBe('denied');
    });
  });

  describe('notify', () => {
    it('should create notification with title and body when permission granted', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'granted', configurable: true });
      
      await notify('Test Title', 'Test Body');
      
      expect(mockNotification).toHaveBeenCalledWith('Test Title', expect.objectContaining({
        body: 'Test Body',
      }));
    });

    it('should play sound when sound parameter is ping', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'granted', configurable: true });
      
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        volume: 1,
      };
      vi.spyOn(globalThis, 'Audio').mockImplementation(() => mockAudio as unknown as HTMLAudioElement);
      
      await notify('Test', 'Body', 'ping');
      
      expect(mockAudio.play).toHaveBeenCalled();
      expect(mockAudio.volume).toBe(0.15);
    });

    it('should not play sound when sound parameter is none', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'granted', configurable: true });
      
      const audioSpy = vi.spyOn(globalThis, 'Audio');
      
      await notify('Test', 'Body', 'none');
      
      expect(audioSpy).not.toHaveBeenCalled();
    });

    it('should not create notification if permission denied', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'denied', configurable: true });
      
      await notify('Test', 'Body');
      
      // Notification constructor should not be called when denied
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should handle audio play failure gracefully', async () => {
      Object.defineProperty(mockNotification, 'permission', { value: 'granted', configurable: true });
      
      const mockAudio = {
        play: vi.fn().mockRejectedValue(new Error('Audio play failed')),
        volume: 1,
      };
      vi.spyOn(globalThis, 'Audio').mockImplementation(() => mockAudio as unknown as HTMLAudioElement);
      
      // Should not throw
      await expect(notify('Test', 'Body', 'ping')).resolves.not.toThrow();
    });

    it('should do nothing if Notification is not supported', async () => {
      // @ts-expect-error - removing global
      delete globalThis.Notification;
      
      // Should not throw
      await expect(notify('Test', 'Body')).resolves.not.toThrow();
    });
  });
});
