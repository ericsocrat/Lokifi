/**
 * Tests for social utility
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPost,
  createUser,
  feed,
  follow,
  getUser,
  listPosts,
  type Post,
  unfollow,
  type UserProfile,
} from '@/lib/utils/social';

// Mock apiFetch for follow/unfollow/createPost
vi.mock('@/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/api/apiFetch';

const mockUser: UserProfile = {
  handle: 'testuser',
  avatar_url: 'https://example.com/avatar.png',
  bio: 'Test bio',
  created_at: '2024-01-01T00:00:00Z',
  following_count: 10,
  followers_count: 20,
  posts_count: 5,
};

const mockPost: Post = {
  id: 1,
  handle: 'testuser',
  content: 'Hello world!',
  symbol: 'BTC',
  created_at: '2024-01-15T12:00:00Z',
  avatar_url: 'https://example.com/avatar.png',
};

describe('social', () => {
  let originalFetch: typeof fetch;
  let mockFetch: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  
  describe('createUser', () => {
    it('should create a new user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });
      
      const user = await createUser('newuser', 'https://avatar.com/pic.png', 'My bio');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/users'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('newuser'),
        })
      );
      expect(user).toEqual(mockUser);
    });
    
    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'User already exists',
      });
      
      await expect(createUser('existing')).rejects.toThrow('User already exists');
    });
  });
  
  describe('getUser', () => {
    it('should fetch user profile', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });
      
      const user = await getUser('testuser');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/social/users/testuser'),
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(user.handle).toBe('testuser');
    });
    
    it('should throw error if user not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'User not found',
      });
      
      await expect(getUser('unknown')).rejects.toThrow('User not found');
    });
  });
  
  describe('follow', () => {
    it('should call apiFetch with POST method', async () => {
      vi.mocked(apiFetch).mockResolvedValue(new Response());
      
      await follow('usertofollow');
      
      expect(apiFetch).toHaveBeenCalledWith('/social/follow/usertofollow', { method: 'POST' });
    });
  });
  
  describe('unfollow', () => {
    it('should call apiFetch with DELETE method', async () => {
      vi.mocked(apiFetch).mockResolvedValue(new Response());
      
      await unfollow('usertounfollow');
      
      expect(apiFetch).toHaveBeenCalledWith('/social/follow/usertounfollow', { method: 'DELETE' });
    });
  });
  
  describe('createPost', () => {
    it('should create a post and return it', async () => {
      vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify(mockPost)));
      
      const post = await createPost('myhandle', 'Hello!', 'ETH');
      
      expect(apiFetch).toHaveBeenCalledWith('/social/posts', {
        method: 'POST',
        body: JSON.stringify({ handle: 'myhandle', content: 'Hello!', symbol: 'ETH' }),
      });
      expect(post).toEqual(mockPost);
    });
    
    it('should create a post without symbol', async () => {
      vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ ...mockPost, symbol: null })));
      
      await createPost('myhandle', 'Just a message');
      
      expect(apiFetch).toHaveBeenCalledWith('/social/posts', {
        method: 'POST',
        body: JSON.stringify({ handle: 'myhandle', content: 'Just a message', symbol: undefined }),
      });
    });
  });
  
  describe('listPosts', () => {
    it('should list all posts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockPost],
      });
      
      const posts = await listPosts();
      
      expect(posts).toHaveLength(1);
      expect(posts[0].content).toBe('Hello world!');
    });
    
    it('should filter by symbol', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockPost],
      });
      
      await listPosts({ symbol: 'BTC' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=BTC'),
        expect.anything()
      );
    });
    
    it('should support pagination params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      
      await listPosts({ limit: 10, after_id: 5 });
      
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=10');
      expect(url).toContain('after_id=5');
    });
    
    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Server error',
      });
      
      await expect(listPosts()).rejects.toThrow('Server error');
    });
  });
  
  describe('feed', () => {
    it('should fetch user feed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [mockPost],
      });
      
      const posts = await feed({ handle: 'myhandle' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('handle=myhandle'),
        expect.anything()
      );
      expect(posts).toHaveLength(1);
    });
    
    it('should support filter params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      
      await feed({ handle: 'myhandle', symbol: 'ETH', limit: 20 });
      
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('handle=myhandle');
      expect(url).toContain('symbol=ETH');
      expect(url).toContain('limit=20');
    });
    
    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Unauthorized',
      });
      
      await expect(feed({ handle: 'myhandle' })).rejects.toThrow('Unauthorized');
    });
  });
});
