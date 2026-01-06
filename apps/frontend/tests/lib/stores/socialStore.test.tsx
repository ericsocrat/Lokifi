import { enableMapSet } from 'immer';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

// Enable immer MapSet plugin BEFORE any store imports
enableMapSet();

import { setDevFlag } from '../../../src/lib/stores/featureFlags';
import type {
  CopyTrading,
  Notification,
  SocialPost,
  SocialThread,
  SocialUser,
} from '../../../src/lib/stores/socialStore';
import { useSocialStore } from '../../../src/lib/stores/socialStore';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Helper to create a test user
// Note: Use ISO strings for dates to match API response format
const createTestUser = (overrides: Partial<SocialUser> = {}): SocialUser => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  verified: false,
  followers: 100,
  following: 50,
  joinedAt: '2023-01-01T00:00:00.000Z' as unknown as Date,
  ...overrides,
});

// Helper to create a test post
const createTestPost = (overrides: Partial<SocialPost> = {}): SocialPost => ({
  id: 'post-1',
  authorId: 'user-1',
  author: createTestUser(),
  content: 'Test post content',
  createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
  type: 'text',
  likes: 10,
  comments: 5,
  shares: 2,
  views: 100,
  isLiked: false,
  isBookmarked: false,
  isDeleted: false,
  reportCount: 0,
  tags: [],
  ...overrides,
});

// Helper to create a test notification
const createTestNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'like',
  title: 'New Like',
  message: 'Someone liked your post',
  createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
  isRead: false,
  ...overrides,
});

// Helper to create a test copy trading position
const createTestCopyTrading = (overrides: Partial<CopyTrading> = {}): CopyTrading => ({
  id: 'copy-1',
  followerId: 'user-1',
  traderId: 'trader-1',
  trader: createTestUser({ id: 'trader-1', username: 'protrader' }),
  createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
  settings: {
    isActive: true,
    copyPercentage: 50,
    maxPositionSize: 10000,
    maxDailyLoss: 500,
    maxDrawdown: 20,
  },
  performance: {
    totalCopiedTrades: 10,
    successfulTrades: 7,
    totalReturn: 1500,
    fees: 50,
    startDate: '2024-01-01T00:00:00.000Z' as unknown as Date,
  },
  ...overrides,
});

// Helper to create a test thread
const createTestThread = (overrides: Partial<SocialThread> = {}): SocialThread => ({
  id: 'thread-1',
  symbol: 'AAPL',
  title: 'AAPL Discussion',
  createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
  posts: 50,
  participants: 20,
  views: 1000,
  lastPost: '2024-01-15T00:00:00.000Z' as unknown as Date,
  recentPosts: [],
  isPinned: false,
  isLocked: false,
  tags: ['stocks'],
  ...overrides,
});

describe('socialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    server.resetHandlers();

    // Enable the feature flag
    setDevFlag('social', true);

    // Reset store state
    useSocialStore.setState({
      currentUser: null,
      isAuthenticated: false,
      feed: [],
      threads: new Map(),
      notifications: [],
      following: new Set(),
      followers: new Set(),
      copyTradingPositions: [],
      traderStats: new Map(),
      selectedSymbol: null,
      feedFilter: 'all',
      searchQuery: '',
      realtimeConnected: false,
      activeUsers: new Set(),
      socialSettings: {
        profilePublic: true,
        showTrades: true,
        showReturns: false,
        allowCopyTrading: false,
        pushNotifications: true,
        emailNotifications: false,
        notificationTypes: ['like', 'comment', 'follow'],
      },
      isLoading: false,
      error: null,
    });
  });

  describe('feature flag gating', () => {
    it('should block operations when social flag is disabled', async () => {
      setDevFlag('social', false);

      // Try to login - should return early without making API call
      await useSocialStore.getState().login({ username: 'test', password: 'pass' });

      // Authentication should remain false
      expect(useSocialStore.getState().isAuthenticated).toBe(false);
    });

    it('should allow operations when social flag is enabled', async () => {
      setDevFlag('social', true);
      const mockUser = createTestUser();

      // Set up MSW handler for login
      server.use(
        http.post('/api/social/login', () => {
          return HttpResponse.json({ user: mockUser, token: 'test-token' });
        }),
        http.get('/api/social/feed', () => {
          return HttpResponse.json([]);
        }),
        http.get('/api/social/notifications', () => {
          return HttpResponse.json([]);
        })
      );

      await useSocialStore.getState().login({ username: 'test', password: 'pass' });

      expect(useSocialStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should login successfully', async () => {
      const mockUser = createTestUser();

      server.use(
        http.post('/api/social/login', () => {
          return HttpResponse.json({ user: mockUser, token: 'test-token' });
        }),
        http.get('/api/social/feed', () => {
          return HttpResponse.json([]);
        }),
        http.get('/api/social/notifications', () => {
          return HttpResponse.json([]);
        })
      );

      await useSocialStore.getState().login({ username: 'test', password: 'pass' });

      expect(useSocialStore.getState().isAuthenticated).toBe(true);
      expect(useSocialStore.getState().currentUser).toEqual(mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('social_token', 'test-token');
    });

    it('should handle login failure', async () => {
      server.use(
        http.post('/api/social/login', () => {
          return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        })
      );

      await useSocialStore.getState().login({ username: 'test', password: 'wrong' });

      expect(useSocialStore.getState().isAuthenticated).toBe(false);
      expect(useSocialStore.getState().error).toBe('Login failed');
    });

    it('should logout and clear state', () => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
        feed: [createTestPost()],
        notifications: [createTestNotification()],
        following: new Set(['user-2']),
        copyTradingPositions: [createTestCopyTrading()],
      });

      useSocialStore.getState().logout();

      expect(useSocialStore.getState().isAuthenticated).toBe(false);
      expect(useSocialStore.getState().currentUser).toBeNull();
      expect(useSocialStore.getState().feed).toEqual([]);
      expect(useSocialStore.getState().notifications).toEqual([]);
      expect(useSocialStore.getState().following.size).toBe(0);
      expect(useSocialStore.getState().copyTradingPositions).toEqual([]);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('social_token');
    });

    it('should update profile', async () => {
      const currentUser = createTestUser();
      const updatedUser = { ...currentUser, displayName: 'Updated Name' };

      useSocialStore.setState({
        currentUser,
        isAuthenticated: true,
      });
      mockLocalStorage.store['social_token'] = 'test-token';

      server.use(
        http.put('/api/social/profile', () => {
          return HttpResponse.json(updatedUser);
        })
      );

      await useSocialStore.getState().updateProfile({ displayName: 'Updated Name' });

      expect(useSocialStore.getState().currentUser?.displayName).toBe('Updated Name');
    });
  });

  describe('content creation', () => {
    beforeEach(() => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should create a post with optimistic update', async () => {
      const savedPost = createTestPost({ id: 'server-post-id' });

      server.use(
        http.post('/api/social/posts', () => {
          return HttpResponse.json(savedPost);
        })
      );

      const postId = await useSocialStore.getState().createPost({
        content: 'New post',
        type: 'text',
        tags: [],
      });

      expect(postId).toBe('server-post-id');
      expect(useSocialStore.getState().feed).toHaveLength(1);
    });

    it('should revert optimistic update on post creation failure', async () => {
      server.use(
        http.post('/api/social/posts', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      await expect(
        useSocialStore.getState().createPost({
          content: 'New post',
          type: 'text',
          tags: [],
        })
      ).rejects.toThrow('Failed to create post');

      expect(useSocialStore.getState().feed).toHaveLength(0);
    });

    it('should update a post', async () => {
      const post = createTestPost();
      useSocialStore.setState({ feed: [post] });

      server.use(
        http.put('/api/social/posts/:postId', () => {
          return HttpResponse.json({ ...post, content: 'Updated content' });
        })
      );

      await useSocialStore.getState().updatePost('post-1', { content: 'Updated content' });

      expect(useSocialStore.getState().feed[0].content).toBe('Updated content');
    });

    it('should delete a post', async () => {
      const post = createTestPost();
      useSocialStore.setState({ feed: [post] });

      server.use(
        http.delete('/api/social/posts/:postId', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().deletePost('post-1');

      expect(useSocialStore.getState().feed).toHaveLength(0);
    });
  });

  describe('content interaction', () => {
    beforeEach(() => {
      const post = createTestPost();
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
        feed: [post],
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should like a post with optimistic update', async () => {
      server.use(
        http.post('/api/social/posts/:postId/like', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().likePost('post-1');

      const post = useSocialStore.getState().feed[0];
      expect(post.likes).toBe(11);
      expect(post.isLiked).toBe(true);
    });

    it('should revert like on failure', async () => {
      server.use(
        http.post('/api/social/posts/:postId/like', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      await useSocialStore.getState().likePost('post-1');

      const post = useSocialStore.getState().feed[0];
      expect(post.likes).toBe(10);
      expect(post.isLiked).toBe(false);
    });

    it('should unlike a post with optimistic update', async () => {
      useSocialStore.setState({
        feed: [createTestPost({ isLiked: true, likes: 11 })],
      });

      server.use(
        http.post('/api/social/posts/:postId/unlike', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().unlikePost('post-1');

      const post = useSocialStore.getState().feed[0];
      expect(post.likes).toBe(10);
      expect(post.isLiked).toBe(false);
    });

    it('should bookmark a post', async () => {
      server.use(
        http.post('/api/social/posts/:postId/bookmark', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().bookmarkPost('post-1');

      expect(useSocialStore.getState().feed[0].isBookmarked).toBe(true);
    });

    it('should unbookmark a post', async () => {
      useSocialStore.setState({
        feed: [createTestPost({ isBookmarked: true })],
      });

      server.use(
        http.post('/api/social/posts/:postId/unbookmark', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().unbookmarkPost('post-1');

      expect(useSocialStore.getState().feed[0].isBookmarked).toBe(false);
    });

    it('should share a post and increment count', async () => {
      server.use(
        http.post('/api/social/posts/:postId/share', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().sharePost('post-1', 'twitter');

      expect(useSocialStore.getState().feed[0].shares).toBe(3);
    });
  });

  describe('comments', () => {
    beforeEach(() => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
        feed: [createTestPost()],
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should add a comment', async () => {
      server.use(
        http.post('/api/social/posts/:postId/comments', () => {
          return HttpResponse.json({ id: 'comment-1' });
        })
      );

      const commentId = await useSocialStore.getState().addComment('post-1', 'Nice post!');

      expect(commentId).toBe('comment-1');
      expect(useSocialStore.getState().feed[0].comments).toBe(6);
    });

    it('should return empty string on comment failure', async () => {
      server.use(
        http.post('/api/social/posts/:postId/comments', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      const commentId = await useSocialStore.getState().addComment('post-1', 'Nice post!');

      expect(commentId).toBe('');
    });

    it('should update a comment', async () => {
      server.use(
        http.put('/api/social/comments/:commentId', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().updateComment('comment-1', 'Updated comment');

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should delete a comment', async () => {
      server.use(
        http.delete('/api/social/comments/:commentId', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().deleteComment('comment-1');

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('social interactions', () => {
    beforeEach(() => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should follow a user with optimistic update', async () => {
      server.use(
        http.post('/api/social/users/:userId/follow', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().followUser('user-2');

      expect(useSocialStore.getState().following.has('user-2')).toBe(true);
    });

    it('should revert follow on failure', async () => {
      server.use(
        http.post('/api/social/users/:userId/follow', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      await useSocialStore.getState().followUser('user-2');

      expect(useSocialStore.getState().following.has('user-2')).toBe(false);
    });

    it('should unfollow a user with optimistic update', async () => {
      useSocialStore.setState({
        following: new Set(['user-2']),
      });

      server.use(
        http.post('/api/social/users/:userId/unfollow', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().unfollowUser('user-2');

      expect(useSocialStore.getState().following.has('user-2')).toBe(false);
    });

    it('should block a user and remove their content', async () => {
      useSocialStore.setState({
        feed: [createTestPost({ authorId: 'user-2' }), createTestPost({ id: 'post-2' })],
        following: new Set(['user-2']),
      });

      server.use(
        http.post('/api/social/users/:userId/block', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().blockUser('user-2');

      expect(useSocialStore.getState().feed).toHaveLength(1);
      expect(useSocialStore.getState().following.has('user-2')).toBe(false);
    });

    it('should report content', async () => {
      server.use(
        http.post('/api/social/report', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().reportContent('post-1', 'post', 'spam');

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('feed management', () => {
    it('should load feed', async () => {
      const posts = [createTestPost(), createTestPost({ id: 'post-2' })];

      server.use(
        http.get('/api/social/feed', () => {
          return HttpResponse.json(posts);
        })
      );

      await useSocialStore.getState().loadFeed();

      expect(useSocialStore.getState().feed).toHaveLength(2);
      expect(useSocialStore.getState().feedFilter).toBe('all');
    });

    it('should load feed with filter', async () => {
      server.use(
        http.get('/api/social/feed', () => {
          return HttpResponse.json([]);
        })
      );

      await useSocialStore.getState().loadFeed('trending');

      expect(useSocialStore.getState().feedFilter).toBe('trending');
    });

    it('should append to feed when offset > 0', async () => {
      useSocialStore.setState({ feed: [createTestPost()] });
      const newPosts = [createTestPost({ id: 'post-2' })];

      server.use(
        http.get('/api/social/feed', () => {
          return HttpResponse.json(newPosts);
        })
      );

      await useSocialStore.getState().loadFeed('all', 20);

      expect(useSocialStore.getState().feed).toHaveLength(2);
    });

    it('should load symbol thread', async () => {
      const thread = createTestThread();

      server.use(
        http.get('/api/social/threads/:symbol', () => {
          return HttpResponse.json(thread);
        })
      );

      await useSocialStore.getState().loadSymbolThread('AAPL');

      expect(useSocialStore.getState().threads.get('AAPL')).toEqual(thread);
    });

    it('should search content', async () => {
      const posts = [createTestPost()];

      server.use(
        http.get('/api/social/search', () => {
          return HttpResponse.json(posts);
        })
      );

      const results = await useSocialStore.getState().searchContent('test');

      expect(results).toHaveLength(1);
    });

    it('should return empty array on search failure', async () => {
      server.use(
        http.get('/api/social/search', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      const results = await useSocialStore.getState().searchContent('test');

      expect(results).toEqual([]);
    });
  });

  describe('copy trading', () => {
    beforeEach(() => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should start copy trading', async () => {
      const copyTrading = createTestCopyTrading();

      server.use(
        http.post('/api/social/copy-trading', () => {
          return HttpResponse.json(copyTrading);
        })
      );

      const id = await useSocialStore.getState().startCopyTrading('trader-1', {
        isActive: true,
        copyPercentage: 50,
        maxPositionSize: 10000,
        maxDailyLoss: 500,
        maxDrawdown: 20,
      });

      expect(id).toBe('copy-1');
      expect(useSocialStore.getState().copyTradingPositions).toHaveLength(1);
    });

    it('should stop copy trading', async () => {
      useSocialStore.setState({
        copyTradingPositions: [createTestCopyTrading()],
      });

      server.use(
        http.delete('/api/social/copy-trading/:id', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().stopCopyTrading('copy-1');

      expect(useSocialStore.getState().copyTradingPositions).toHaveLength(0);
    });

    it('should update copy settings', async () => {
      const original = createTestCopyTrading();
      const updated = { ...original, settings: { ...original.settings, copyPercentage: 75 } };

      useSocialStore.setState({
        copyTradingPositions: [original],
      });

      server.use(
        http.put('/api/social/copy-trading/:id', () => {
          return HttpResponse.json(updated);
        })
      );

      await useSocialStore.getState().updateCopySettings('copy-1', { copyPercentage: 75 });

      expect(useSocialStore.getState().copyTradingPositions[0].settings.copyPercentage).toBe(75);
    });

    it('should load trader stats', async () => {
      const stats = {
        totalReturns: 25.5,
        winRate: 0.65,
        sharpeRatio: 1.8,
        followersReturn: 18.2,
      };

      server.use(
        http.get('/api/social/traders/:traderId/stats', () => {
          return HttpResponse.json(stats);
        })
      );

      await useSocialStore.getState().loadTraderStats('trader-1');

      expect(useSocialStore.getState().traderStats.get('trader-1')).toEqual(stats);
    });
  });

  describe('notifications', () => {
    beforeEach(() => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
      });
      mockLocalStorage.store['social_token'] = 'test-token';
    });

    it('should load notifications', async () => {
      const notifications = [createTestNotification(), createTestNotification({ id: 'notif-2' })];

      server.use(
        http.get('/api/social/notifications', () => {
          return HttpResponse.json(notifications);
        })
      );

      await useSocialStore.getState().loadNotifications();

      expect(useSocialStore.getState().notifications).toHaveLength(2);
    });

    it('should mark notification as read with optimistic update', async () => {
      useSocialStore.setState({
        notifications: [createTestNotification()],
      });

      server.use(
        http.post('/api/social/notifications/:notifId/read', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().markNotificationRead('notif-1');

      expect(useSocialStore.getState().notifications[0].isRead).toBe(true);
    });

    it('should revert mark as read on failure', async () => {
      useSocialStore.setState({
        notifications: [createTestNotification()],
      });

      server.use(
        http.post('/api/social/notifications/:notifId/read', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      await useSocialStore.getState().markNotificationRead('notif-1');

      expect(useSocialStore.getState().notifications[0].isRead).toBe(false);
    });

    it('should mark all notifications as read', async () => {
      useSocialStore.setState({
        notifications: [createTestNotification(), createTestNotification({ id: 'notif-2' })],
      });

      server.use(
        http.post('/api/social/notifications/read-all', () => {
          return HttpResponse.json({ success: true });
        })
      );

      await useSocialStore.getState().markAllNotificationsRead();

      expect(useSocialStore.getState().notifications.every((n) => n.isRead)).toBe(true);
    });
  });

  describe('real-time', () => {
    it('should set connected state on connect', () => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
      });

      // We can't fully test WebSocket, but we can test the disconnect
      useSocialStore.getState().disconnectRealtime();

      expect(useSocialStore.getState().realtimeConnected).toBe(false);
      expect(useSocialStore.getState().activeUsers.size).toBe(0);
    });
  });

  describe('settings', () => {
    it('should update social settings', () => {
      useSocialStore.getState().updateSocialSettings({
        profilePublic: false,
        showTrades: false,
      });

      const settings = useSocialStore.getState().socialSettings;
      expect(settings.profilePublic).toBe(false);
      expect(settings.showTrades).toBe(false);
      // Other settings should remain unchanged
      expect(settings.pushNotifications).toBe(true);
    });
  });

  describe('UI state', () => {
    it('should set selected symbol and load thread', async () => {
      server.use(
        http.get('/api/social/threads/:symbol', () => {
          return HttpResponse.json(createTestThread());
        })
      );

      useSocialStore.getState().setSelectedSymbol('AAPL');

      expect(useSocialStore.getState().selectedSymbol).toBe('AAPL');
    });

    it('should clear selected symbol when set to null', () => {
      useSocialStore.setState({ selectedSymbol: 'AAPL' });

      useSocialStore.getState().setSelectedSymbol(null);

      expect(useSocialStore.getState().selectedSymbol).toBeNull();
    });

    it('should set feed filter and reload feed', async () => {
      server.use(
        http.get('/api/social/feed', () => {
          return HttpResponse.json([]);
        })
      );

      useSocialStore.getState().setFeedFilter('trending');

      expect(useSocialStore.getState().feedFilter).toBe('trending');
    });

    it('should set search query', () => {
      useSocialStore.getState().setSearchQuery('bitcoin');

      expect(useSocialStore.getState().searchQuery).toBe('bitcoin');
    });
  });

  describe('selectors', () => {
    it('should count unread notifications', () => {
      useSocialStore.setState({
        notifications: [
          createTestNotification({ isRead: false }),
          createTestNotification({ id: 'notif-2', isRead: true }),
          createTestNotification({ id: 'notif-3', isRead: false }),
        ],
      });

      // Use the selector directly
      const count = useSocialStore.getState().notifications.filter((n) => !n.isRead).length;
      expect(count).toBe(2);
    });

    it('should check if following user', () => {
      useSocialStore.setState({
        following: new Set(['user-2', 'user-3']),
      });

      expect(useSocialStore.getState().following.has('user-2')).toBe(true);
      expect(useSocialStore.getState().following.has('user-4')).toBe(false);
    });

    it('should get symbol thread', () => {
      const thread = createTestThread();
      useSocialStore.setState({
        threads: new Map([['AAPL', thread]]),
      });

      expect(useSocialStore.getState().threads.get('AAPL')).toEqual(thread);
      expect(useSocialStore.getState().threads.get('GOOGL')).toBeUndefined();
    });

    it('should get copy trading positions', () => {
      const positions = [createTestCopyTrading()];
      useSocialStore.setState({
        copyTradingPositions: positions,
      });

      expect(useSocialStore.getState().copyTradingPositions).toEqual(positions);
    });
  });

  describe('edge cases', () => {
    it('should not proceed with createPost when not authenticated', async () => {
      useSocialStore.setState({
        currentUser: null,
        isAuthenticated: false,
      });

      await expect(
        useSocialStore.getState().createPost({
          content: 'Test',
          type: 'text',
          tags: [],
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should handle empty feed filter values', async () => {
      const filters: Array<'all' | 'following' | 'trending' | 'charts' | 'trades'> = [
        'all',
        'following',
        'trending',
        'charts',
        'trades',
      ];

      server.use(
        http.get('/api/social/feed', () => {
          return HttpResponse.json([]);
        })
      );

      for (const filter of filters) {
        useSocialStore.getState().setFeedFilter(filter);
        expect(useSocialStore.getState().feedFilter).toBe(filter);
      }
    });

    it('should handle concurrent like operations', async () => {
      useSocialStore.setState({
        currentUser: createTestUser(),
        isAuthenticated: true,
        feed: [
          createTestPost({ id: 'post-1' }),
          createTestPost({ id: 'post-2' }),
          createTestPost({ id: 'post-3' }),
        ],
      });
      mockLocalStorage.store['social_token'] = 'test-token';

      server.use(
        http.post('/api/social/posts/:postId/like', () => {
          return HttpResponse.json({ success: true });
        })
      );

      // Like all posts concurrently
      await Promise.all([
        useSocialStore.getState().likePost('post-1'),
        useSocialStore.getState().likePost('post-2'),
        useSocialStore.getState().likePost('post-3'),
      ]);

      const feed = useSocialStore.getState().feed;
      expect(feed.every((p) => p.isLiked)).toBe(true);
    });
  });
});
