import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '@/lib/api/auth-guard';
import * as authModule from '@/lib/api/auth';

// Mock auth module
vi.mock('@/lib/api/auth', () => ({
  me: vi.fn(),
}));

const mockMe = authModule.me as ReturnType<typeof vi.fn>;

describe('auth-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return profile when user is authenticated', async () => {
      const mockProfile = {
        handle: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Hello world',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockMe.mockResolvedValue(mockProfile);

      const result = await requireAuth();

      expect(mockMe).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    it('should throw error when profile has no handle', async () => {
      const mockProfile = {
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Hello world',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockMe.mockResolvedValue(mockProfile);

      await expect(requireAuth()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when profile is null', async () => {
      mockMe.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when profile is undefined', async () => {
      mockMe.mockResolvedValue(undefined);

      await expect(requireAuth()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when me() rejects', async () => {
      mockMe.mockRejectedValue(new Error('Network error'));

      await expect(requireAuth()).rejects.toThrow('Network error');
    });

    it('should return profile with minimal required fields', async () => {
      const mockProfile = {
        handle: 'minimaluser',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockMe.mockResolvedValue(mockProfile);

      const result = await requireAuth();

      expect(result.handle).toBe('minimaluser');
      expect(result.avatar_url).toBeUndefined();
      expect(result.bio).toBeUndefined();
    });

    it('should throw error when handle is empty string', async () => {
      const mockProfile = {
        handle: '',
        created_at: '2024-01-01T00:00:00Z',
      };
      mockMe.mockResolvedValue(mockProfile);

      await expect(requireAuth()).rejects.toThrow('Not authenticated');
    });
  });
});
