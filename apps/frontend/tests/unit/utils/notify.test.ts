import { ensureNotificationPermission, notify } from '@/lib/utils/notify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Notification Module', () => {
  let mockNotification: any;
  let mockAudio: any;
  let originalNotification: any;

  // Helper to set notification permission
  const setNotificationPermission = (permission: NotificationPermission) => {
    Object.defineProperty(global.Notification, 'permission', {
      writable: true,
      configurable: true,
      value: permission,
    });
  };

  beforeEach(() => {
    // Mock Audio
    mockAudio = {
      volume: 0,
      play: vi.fn().mockResolvedValue(undefined),
    };

    global.Audio = vi.fn(() => mockAudio) as any;

    // Mock Notification API
    mockNotification = {
      requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission),
    };

    // Save original and set mock
    originalNotification = global.Notification;
    global.Notification = mockNotification as any;

    // Use Object.defineProperty to set read-only permission
    Object.defineProperty(global.Notification, 'permission', {
      writable: true,
      configurable: true,
      value: 'default',
    });
  });

  afterEach(() => {
    // Restore original
    if (originalNotification) {
      global.Notification = originalNotification;
    }
    vi.restoreAllMocks();
  });

  describe('ensureNotificationPermission', () => {
    it('returns "denied" when Notification API is not available', async () => {
      const tempNotification = global.Notification;
      delete (global as any).Notification;

      const result = await ensureNotificationPermission();

      expect(result).toBe('denied');

      // Restore
      global.Notification = tempNotification;
    });

    it('returns current permission when not "default"', async () => {
      setNotificationPermission('granted');

      const result = await ensureNotificationPermission();

      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('returns "denied" permission without requesting', async () => {
      setNotificationPermission('denied');

      const result = await ensureNotificationPermission();

      expect(result).toBe('denied');
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it('requests permission when permission is "default"', async () => {
      setNotificationPermission('default');
      mockNotification.requestPermission.mockResolvedValue('granted');

      const result = await ensureNotificationPermission();

      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe('granted');
    });
  });

  describe('notify', () => {
    beforeEach(() => {
      // Reset Notification constructor spy
      global.Notification = vi.fn() as any;
      setNotificationPermission('granted');
      global.Notification.requestPermission = mockNotification.requestPermission;
    });

    it('does nothing when Notification API is not available', async () => {
      const tempNotification = global.Notification;
      delete (global as any).Notification;

      await notify('Test Title');

      // Should not throw

      // Restore
      global.Notification = tempNotification;
    });

    it('creates notification with title only', async () => {
      setNotificationPermission('granted');

      await notify('Test Title');

      expect(global.Notification).toHaveBeenCalledWith('Test Title', { body: undefined });
    });

    it('creates notification with title and body', async () => {
      setNotificationPermission('granted');

      await notify('Test Title', 'Test Body');

      expect(global.Notification).toHaveBeenCalledWith('Test Title', { body: 'Test Body' });
    });

    it('does not create notification when permission is denied', async () => {
      setNotificationPermission('denied');

      await notify('Test Title');

      expect(global.Notification).not.toHaveBeenCalled();
    });

    it('plays sound when sound is "ping"', async () => {
      setNotificationPermission('granted');

      await notify('Test Title', 'Test Body', 'ping');

      expect(global.Audio).toHaveBeenCalledWith(expect.stringContaining('data:audio/wav'));
      expect(mockAudio.volume).toBe(0.15);
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('does not play sound when sound is "none"', async () => {
      setNotificationPermission('granted');

      await notify('Test Title', 'Test Body', 'none');

      expect(global.Audio).not.toHaveBeenCalled();
    });

    it('does not play sound by default', async () => {
      setNotificationPermission('granted');

      await notify('Test Title');

      expect(global.Audio).not.toHaveBeenCalled();
    });

    it('handles audio play errors gracefully', async () => {
      setNotificationPermission('granted');
      mockAudio.play.mockRejectedValue(new Error('Audio error'));

      // Should not throw
      await expect(notify('Test', 'Body', 'ping')).resolves.toBeUndefined();
    });

    it('handles notification creation errors gracefully', async () => {
      setNotificationPermission('granted');
      global.Notification = vi.fn().mockImplementation(() => {
        throw new Error('Notification error');
      }) as any;
      setNotificationPermission('granted');

      // Should not throw (caught in try-catch)
      await expect(notify('Test')).resolves.toBeUndefined();
    });

    it('handles permission request errors gracefully', async () => {
      setNotificationPermission('default');
      mockNotification.requestPermission.mockRejectedValue(new Error('Permission error'));
      global.Notification.requestPermission = mockNotification.requestPermission;

      // Should not throw (caught in try-catch)
      await expect(notify('Test')).resolves.toBeUndefined();
    });

    it('sets correct audio volume for ping sound', async () => {
      setNotificationPermission('granted');

      await notify('Test', undefined, 'ping');

      expect(mockAudio.volume).toBe(0.15);
    });
  });
});

