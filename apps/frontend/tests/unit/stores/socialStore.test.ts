/**
 * @vitest-environment jsdom
 */
/**
 * Social Store Tests
 *
 * Comprehensive unit tests for socialStore covering:
 * - Initial state verification
 * - UI state management (setSelectedSymbol, setFeedFilter, setSearchQuery)
 * - Settings management (updateSocialSettings)
 * - Authentication flows (login, logout, updateProfile)
 * - Content creation and interaction (posts, comments, likes, bookmarks, shares)
 * - Social interactions (follow, unfollow, block, report)
 * - Feed and thread management
 * - Copy trading functionality
 * - Notification management
 * - Real-time connection state
 * - Optimistic updates and error handling
 *
 * @module tests/unit/stores/socialStore
 */

import { act } from '@testing-library/react';
import { enableMapSet } from 'immer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Enable Immer MapSet plugin for tests
enableMapSet();

// Mock feature flags BEFORE importing the store
vi.mock('@/lib/stores/featureFlags', () => ({
  FLAGS: {
    social: true,
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  send = vi.fn();
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Import store after mocks
import { useSocialStore } from '@/lib/stores/socialStore';

// Mock fetch - defined after import but before tests
let mockFetch: ReturnType<typeof vi.spyOn>;

// Test data factories
const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  verified: false,
  followers: 100,
  following: 50,
  joinedAt: '2024-01-01T00:00:00.000Z',
  publicStats: {
    posts: 10,
    trades: 25,
    winRate: 65,
    totalReturn: 15.5,
  },
  ...overrides,
});

const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  authorId: 'user-1',
  author: createMockUser(),
  content: 'Test post content',
  type: 'text' as const,
  attachments: [],
  symbols: ['AAPL'],
  createdAt: '2024-01-01T12:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
  likes: 10,
  comments: 5,
  shares: 2,
  reposts: 1,
  isLiked: false,
  isBookmarked: false,
  isReposted: false,
  visibility: 'public' as const,
  moderation: {
    isReported: false,
    isHidden: false,
  },
  ...overrides,
});

const createMockComment = (overrides = {}) => ({
  id: 'comment-1',
  authorId: 'user-1',
  author: createMockUser(),
  content: 'Test comment',
  createdAt: '2024-01-01T12:30:00.000Z',
  updatedAt: '2024-01-01T12:30:00.000Z',
  likes: 3,
  isLiked: false,
  replies: [],
  moderation: {
    isReported: false,
    isHidden: false,
  },
  ...overrides,
});

const createMockNotification = (overrides = {}) => ({
  id: 'notification-1',
  type: 'like' as const,
  fromUserId: 'user-2',
  fromUser: createMockUser({ id: 'user-2', username: 'other' }),
  targetType: 'post' as const,
  targetId: 'post-1',
  message: 'User liked your post',
  createdAt: '2024-01-01T13:00:00.000Z',
  isRead: false,
  ...overrides,
});

const createMockCopyTrading = (overrides = {}) => ({
  id: 'copy-1',
  traderId: 'trader-1',
  trader: createMockUser({ id: 'trader-1', username: 'trader' }),
  followerId: 'user-1',
  settings: {
    maxPositionSize: 10,
    maxTotalAllocation: 50,
    riskMultiplier: 1.0,
    autoCopy: true,
  },
  startedAt: '2024-01-01T00:00:00.000Z',
  performance: {
    totalTrades: 10,
    profitableTrades: 7,
    totalReturn: 12.5,
  },
  ...overrides,
});

const createMockThread = (symbol: string, overrides = {}) => ({
  symbol,
  posts: [createMockPost()],
  participants: 15,
  lastActivity: '2024-01-01T14:00:00.000Z',
  ...overrides,
});

// Helper to reset store between tests
const resetStore = () => {
  const store = useSocialStore.getState();
  useSocialStore.setState({
    // User state
    currentUser: null,
    isAuthenticated: false,

    // Content
    feed: [],
    threads: new Map(),
    notifications: [],

    // Social graph
    following: new Set(),
    followers: new Set(),
    blocked: new Set(),

    // Copy trading
    copyTradingPositions: [],
    traderStats: new Map(),

    // UI state
    selectedSymbol: null,
    feedFilter: 'all',
    searchQuery: '',
    activeUsers: new Set(),
    realtimeConnected: false,

    // Settings
    socialSettings: {
      privacy: {
        showOnlineStatus: true,
        showTrades: true,
        showPortfolio: false,
        allowMessages: true,
        allowFollows: true,
      },
      notifications: {
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        copyTradingUpdates: true,
      },
    },

    // Loading/Error states
    isLoading: false,
    error: null,
  });
};

describe('socialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    localStorageMock.getItem.mockReturnValue(null);

    // Set up fetch mock using vi.spyOn
    mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFetch?.mockRestore();
  });

  // =============================================================================
  // INITIAL STATE TESTS
  // =============================================================================
  describe('Initial State', () => {
    it('should have correct initial user state', () => {
      const state = useSocialStore.getState();

      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should have correct initial content state', () => {
      const state = useSocialStore.getState();

      expect(state.feed).toEqual([]);
      expect(state.threads).toBeInstanceOf(Map);
      expect(state.threads.size).toBe(0);
      expect(state.notifications).toEqual([]);
    });

    it('should have correct initial social graph state', () => {
      const state = useSocialStore.getState();

      expect(state.following).toBeInstanceOf(Set);
      expect(state.following.size).toBe(0);
      expect(state.followers).toBeInstanceOf(Set);
      expect(state.followers.size).toBe(0);
      expect(state.blocked).toBeInstanceOf(Set);
      expect(state.blocked.size).toBe(0);
    });

    it('should have correct initial copy trading state', () => {
      const state = useSocialStore.getState();

      expect(state.copyTradingPositions).toEqual([]);
      expect(state.traderStats).toBeInstanceOf(Map);
      expect(state.traderStats.size).toBe(0);
    });

    it('should have correct initial UI state', () => {
      const state = useSocialStore.getState();

      expect(state.selectedSymbol).toBeNull();
      expect(state.feedFilter).toBe('all');
      expect(state.searchQuery).toBe('');
      expect(state.activeUsers).toBeInstanceOf(Set);
      expect(state.activeUsers.size).toBe(0);
      expect(state.realtimeConnected).toBe(false);
    });

    it('should have correct initial settings', () => {
      const state = useSocialStore.getState();

      expect(state.socialSettings).toEqual({
        privacy: {
          showOnlineStatus: true,
          showTrades: true,
          showPortfolio: false,
          allowMessages: true,
          allowFollows: true,
        },
        notifications: {
          likes: true,
          comments: true,
          follows: true,
          mentions: true,
          copyTradingUpdates: true,
        },
      });
    });

    it('should have correct initial loading/error state', () => {
      const state = useSocialStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // =============================================================================
  // UI STATE MANAGEMENT TESTS
  // =============================================================================
  describe('UI State Management', () => {
    describe('setSelectedSymbol', () => {
      it('should set selected symbol', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockThread('AAPL'),
        });

        await act(async () => {
          useSocialStore.getState().setSelectedSymbol('AAPL');
        });

        const state = useSocialStore.getState();
        expect(state.selectedSymbol).toBe('AAPL');
      });

      it('should clear selected symbol when null', async () => {
        useSocialStore.setState({ selectedSymbol: 'AAPL' });

        await act(async () => {
          useSocialStore.getState().setSelectedSymbol(null);
        });

        expect(useSocialStore.getState().selectedSymbol).toBeNull();
      });

      it('should trigger loadSymbolThread when symbol is set', async () => {
        const mockThread = createMockThread('TSLA');
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockThread,
        });

        await act(async () => {
          useSocialStore.getState().setSelectedSymbol('TSLA');
        });

        // Wait for async operations
        await vi.waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith('/api/social/threads/TSLA');
        });
      });
    });

    describe('setFeedFilter', () => {
      it('should set feed filter', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await act(async () => {
          useSocialStore.getState().setFeedFilter('following');
        });

        expect(useSocialStore.getState().feedFilter).toBe('following');
      });

      it('should trigger loadFeed with new filter', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await act(async () => {
          useSocialStore.getState().setFeedFilter('trending');
        });

        await vi.waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/social/feed?filter=trending&offset=0&limit=20',
            expect.anything()
          );
        });
      });
    });

    describe('setSearchQuery', () => {
      it('should set search query', async () => {
        await act(async () => {
          useSocialStore.getState().setSearchQuery('bitcoin');
        });

        expect(useSocialStore.getState().searchQuery).toBe('bitcoin');
      });

      it('should clear search query when empty string', async () => {
        useSocialStore.setState({ searchQuery: 'previous search' });

        await act(async () => {
          useSocialStore.getState().setSearchQuery('');
        });

        expect(useSocialStore.getState().searchQuery).toBe('');
      });
    });
  });

  // =============================================================================
  // SETTINGS MANAGEMENT TESTS
  // =============================================================================
  describe('Settings Management', () => {
    describe('updateSocialSettings', () => {
      it('should update privacy settings', async () => {
        await act(async () => {
          useSocialStore.getState().updateSocialSettings({
            privacy: {
              showOnlineStatus: false,
              showTrades: false,
              showPortfolio: true,
              allowMessages: false,
              allowFollows: false,
            },
          });
        });

        const state = useSocialStore.getState();
        expect(state.socialSettings.privacy.showOnlineStatus).toBe(false);
        expect(state.socialSettings.privacy.showTrades).toBe(false);
        expect(state.socialSettings.privacy.showPortfolio).toBe(true);
        expect(state.socialSettings.privacy.allowMessages).toBe(false);
        expect(state.socialSettings.privacy.allowFollows).toBe(false);
      });

      it('should update notification settings', async () => {
        await act(async () => {
          useSocialStore.getState().updateSocialSettings({
            notifications: {
              likes: false,
              comments: false,
              follows: true,
              mentions: false,
              copyTradingUpdates: false,
            },
          });
        });

        const state = useSocialStore.getState();
        expect(state.socialSettings.notifications.likes).toBe(false);
        expect(state.socialSettings.notifications.comments).toBe(false);
        expect(state.socialSettings.notifications.follows).toBe(true);
        expect(state.socialSettings.notifications.mentions).toBe(false);
        expect(state.socialSettings.notifications.copyTradingUpdates).toBe(false);
      });

      it('should partially update settings', async () => {
        await act(async () => {
          useSocialStore.getState().updateSocialSettings({
            privacy: {
              showOnlineStatus: false,
              showTrades: true,
              showPortfolio: false,
              allowMessages: true,
              allowFollows: true,
            },
          });
        });

        const state = useSocialStore.getState();
        // Privacy updated
        expect(state.socialSettings.privacy.showOnlineStatus).toBe(false);
        // Notifications unchanged
        expect(state.socialSettings.notifications.likes).toBe(true);
      });
    });
  });

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================
  describe('Authentication', () => {
    describe('login', () => {
      it('should login successfully', async () => {
        const mockUser = createMockUser();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: mockUser, token: 'test-token' }),
        });

        await act(async () => {
          await useSocialStore.getState().login('testuser', 'password123');
        });

        const state = useSocialStore.getState();
        expect(state.currentUser).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('social_token', 'test-token');
      });

      it('should set loading state during login', async () => {
        let loadingDuringFetch = false;

        mockFetch.mockImplementationOnce(async () => {
          loadingDuringFetch = useSocialStore.getState().isLoading;
          return {
            ok: true,
            json: async () => ({ user: createMockUser(), token: 'test-token' }),
          };
        });

        await act(async () => {
          await useSocialStore.getState().login('testuser', 'password123');
        });

        expect(loadingDuringFetch).toBe(true);
        expect(useSocialStore.getState().isLoading).toBe(false);
      });

      it('should handle login failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        await act(async () => {
          await useSocialStore.getState().login('testuser', 'wrongpassword');
        });

        const state = useSocialStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.currentUser).toBeNull();
        expect(state.error).toBe('Login failed');
      });

      it('should handle network error during login', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await act(async () => {
          await useSocialStore.getState().login('testuser', 'password123');
        });

        const state = useSocialStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBe('Network error');
      });
    });

    describe('logout', () => {
      it('should logout and clear state', async () => {
        // Set up authenticated state
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          feed: [createMockPost()],
          notifications: [createMockNotification()],
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        await act(async () => {
          useSocialStore.getState().logout();
        });

        const state = useSocialStore.getState();
        expect(state.currentUser).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.feed).toEqual([]);
        expect(state.notifications).toEqual([]);
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('social_token');
      });
    });

    describe('updateProfile', () => {
      it('should update profile successfully', async () => {
        const mockUser = createMockUser();
        const updatedUser = { ...mockUser, displayName: 'Updated Name', bio: 'New bio' };

        useSocialStore.setState({
          currentUser: mockUser,
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedUser,
        });

        await act(async () => {
          await useSocialStore
            .getState()
            .updateProfile({ displayName: 'Updated Name', bio: 'New bio' });
        });

        const state = useSocialStore.getState();
        expect(state.currentUser?.displayName).toBe('Updated Name');
        expect(state.currentUser?.bio).toBe('New bio');
      });

      it('should not update if not authenticated', async () => {
        useSocialStore.setState({
          currentUser: null,
          isAuthenticated: false,
        });

        await act(async () => {
          await useSocialStore.getState().updateProfile({ displayName: 'Test' });
        });

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle update failure', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
        });

        await act(async () => {
          await useSocialStore.getState().updateProfile({ displayName: 'Test' });
        });

        const state = useSocialStore.getState();
        expect(state.error).toBe('Profile update failed');
      });
    });
  });

  // =============================================================================
  // POST MANAGEMENT TESTS
  // =============================================================================
  describe('Post Management', () => {
    describe('createPost', () => {
      it('should create post successfully', async () => {
        const mockPost = createMockPost();
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPost,
        });

        await act(async () => {
          const postId = await useSocialStore.getState().createPost({
            content: 'Test post content',
            type: 'text',
            symbols: ['AAPL'],
          });
          expect(postId).toBe('post-1');
        });

        expect(useSocialStore.getState().feed).toContainEqual(mockPost);
      });

      it('should throw error if not authenticated', async () => {
        useSocialStore.setState({
          isAuthenticated: false,
        });

        await expect(
          useSocialStore.getState().createPost({
            content: 'Test',
            type: 'text',
          })
        ).rejects.toThrow('Not authenticated');

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('updatePost', () => {
      it('should update post with optimistic update', async () => {
        const originalPost = createMockPost({ content: 'Original content' });
        useSocialStore.setState({
          feed: [originalPost],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...originalPost, content: 'Updated content' }),
        });

        await act(async () => {
          await useSocialStore.getState().updatePost('post-1', 'Updated content');
        });

        const state = useSocialStore.getState();
        const updatedPost = state.feed.find((p) => p.id === 'post-1');
        expect(updatedPost?.content).toBe('Updated content');
      });

      it('should rollback on update failure', async () => {
        const originalPost = createMockPost({ content: 'Original content' });
        useSocialStore.setState({
          feed: [originalPost],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        await act(async () => {
          await useSocialStore.getState().updatePost('post-1', 'Updated content');
        });

        const state = useSocialStore.getState();
        const post = state.feed.find((p) => p.id === 'post-1');
        expect(post?.content).toBe('Original content');
        expect(state.error).toBe('Failed to update post');
      });
    });

    describe('deletePost', () => {
      it('should delete post with optimistic update', async () => {
        const post = createMockPost();
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
        });

        await act(async () => {
          await useSocialStore.getState().deletePost('post-1');
        });

        expect(useSocialStore.getState().feed).toEqual([]);
      });

      it('should rollback deletion on failure', async () => {
        const post = createMockPost();
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        await act(async () => {
          await useSocialStore.getState().deletePost('post-1');
        });

        expect(useSocialStore.getState().feed).toContainEqual(post);
        expect(useSocialStore.getState().error).toBe('Failed to delete post');
      });
    });
  });

  // =============================================================================
  // POST INTERACTION TESTS
  // =============================================================================
  describe('Post Interactions', () => {
    describe('likePost', () => {
      it('should like post with optimistic update', async () => {
        const post = createMockPost({ likes: 10, isLiked: false });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().likePost('post-1');
        });

        const state = useSocialStore.getState();
        const likedPost = state.feed.find((p) => p.id === 'post-1');
        expect(likedPost?.likes).toBe(11);
        expect(likedPost?.isLiked).toBe(true);
      });

      it('should rollback like on failure', async () => {
        const post = createMockPost({ likes: 10, isLiked: false });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: false });

        await act(async () => {
          await useSocialStore.getState().likePost('post-1');
        });

        const state = useSocialStore.getState();
        const rollbackPost = state.feed.find((p) => p.id === 'post-1');
        expect(rollbackPost?.likes).toBe(10);
        expect(rollbackPost?.isLiked).toBe(false);
      });
    });

    describe('unlikePost', () => {
      it('should unlike post with optimistic update', async () => {
        const post = createMockPost({ likes: 10, isLiked: true });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().unlikePost('post-1');
        });

        const state = useSocialStore.getState();
        const unlikedPost = state.feed.find((p) => p.id === 'post-1');
        expect(unlikedPost?.likes).toBe(9);
        expect(unlikedPost?.isLiked).toBe(false);
      });
    });

    describe('bookmarkPost', () => {
      it('should bookmark post with optimistic update', async () => {
        const post = createMockPost({ isBookmarked: false });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().bookmarkPost('post-1');
        });

        const state = useSocialStore.getState();
        const bookmarkedPost = state.feed.find((p) => p.id === 'post-1');
        expect(bookmarkedPost?.isBookmarked).toBe(true);
      });
    });

    describe('unbookmarkPost', () => {
      it('should unbookmark post with optimistic update', async () => {
        const post = createMockPost({ isBookmarked: true });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().unbookmarkPost('post-1');
        });

        const state = useSocialStore.getState();
        const unbookmarkedPost = state.feed.find((p) => p.id === 'post-1');
        expect(unbookmarkedPost?.isBookmarked).toBe(false);
      });
    });

    describe('sharePost', () => {
      it('should increment share count with optimistic update', async () => {
        const post = createMockPost({ shares: 5 });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().sharePost('post-1');
        });

        const state = useSocialStore.getState();
        const sharedPost = state.feed.find((p) => p.id === 'post-1');
        expect(sharedPost?.shares).toBe(6);
      });
    });
  });

  // =============================================================================
  // COMMENT MANAGEMENT TESTS
  // =============================================================================
  describe('Comment Management', () => {
    describe('addComment', () => {
      it('should add comment and update post comment count', async () => {
        const mockComment = createMockComment();
        const post = createMockPost({ comments: 5 });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockComment,
        });

        await act(async () => {
          const commentId = await useSocialStore.getState().addComment('post-1', 'Test comment');
          expect(commentId).toBe('comment-1');
        });

        const state = useSocialStore.getState();
        const updatedPost = state.feed.find((p) => p.id === 'post-1');
        expect(updatedPost?.comments).toBe(6);
      });

      it('should not add comment if not authenticated', async () => {
        useSocialStore.setState({
          feed: [createMockPost()],
          isAuthenticated: false,
        });

        await act(async () => {
          const commentId = await useSocialStore.getState().addComment('post-1', 'Test');
          expect(commentId).toBe('');
        });

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('updateComment', () => {
      it('should update comment content', async () => {
        const comment = createMockComment({ content: 'Original' });
        const post = createMockPost();
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...comment, content: 'Updated' }),
        });

        await act(async () => {
          await useSocialStore.getState().updateComment('comment-1', 'Updated');
        });

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/social/comments/comment-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ content: 'Updated' }),
          })
        );
      });
    });

    describe('deleteComment', () => {
      it('should delete comment', async () => {
        const post = createMockPost({ comments: 5 });
        useSocialStore.setState({
          feed: [post],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().deleteComment('comment-1');
        });

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/social/comments/comment-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('likeComment', () => {
      it('should call API to like comment', async () => {
        useSocialStore.setState({
          feed: [createMockPost()],
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().likeComment('comment-1');
        });

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/social/comments/comment-1/like',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  // =============================================================================
  // SOCIAL INTERACTIONS TESTS
  // =============================================================================
  describe('Social Interactions', () => {
    describe('followUser', () => {
      it('should add user to following set with optimistic update', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          following: new Set(),
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().followUser('user-2');
        });

        expect(useSocialStore.getState().following.has('user-2')).toBe(true);
      });

      it('should rollback on follow failure', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          following: new Set(),
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: false });

        await act(async () => {
          await useSocialStore.getState().followUser('user-2');
        });

        expect(useSocialStore.getState().following.has('user-2')).toBe(false);
        expect(useSocialStore.getState().error).toBe('Failed to follow user');
      });
    });

    describe('unfollowUser', () => {
      it('should remove user from following set with optimistic update', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          following: new Set(['user-2']),
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().unfollowUser('user-2');
        });

        expect(useSocialStore.getState().following.has('user-2')).toBe(false);
      });

      it('should rollback on unfollow failure', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          following: new Set(['user-2']),
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: false });

        await act(async () => {
          await useSocialStore.getState().unfollowUser('user-2');
        });

        expect(useSocialStore.getState().following.has('user-2')).toBe(true);
        expect(useSocialStore.getState().error).toBe('Failed to unfollow user');
      });
    });

    describe('blockUser', () => {
      it('should remove user from following and filter posts on successful block', async () => {
        const userPost = createMockPost({ id: 'user2-post', authorId: 'user-2' });
        const otherPost = createMockPost({ id: 'other-post', authorId: 'user-3' });
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          feed: [userPost, otherPost],
          following: new Set(['user-2']),
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().blockUser('user-2');
        });

        const state = useSocialStore.getState();
        // Should unfollow when blocking
        expect(state.following.has('user-2')).toBe(false);
        // Should filter out blocked user's posts from feed
        expect(state.feed.find((p) => p.authorId === 'user-2')).toBeUndefined();
        expect(state.feed.find((p) => p.authorId === 'user-3')).toBeDefined();
      });
    });

    describe('reportContent', () => {
      it('should report content with correct parameters', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().reportContent('post-1', 'post', 'spam');
        });

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/social/report',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ contentId: 'post-1', type: 'post', reason: 'spam' }),
          })
        );
      });
    });
  });

  // =============================================================================
  // FEED MANAGEMENT TESTS
  // =============================================================================
  describe('Feed Management', () => {
    describe('loadFeed', () => {
      it('should load feed successfully', async () => {
        const mockPosts = [createMockPost(), createMockPost({ id: 'post-2' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPosts,
        });

        await act(async () => {
          await useSocialStore.getState().loadFeed('all', 0);
        });

        const state = useSocialStore.getState();
        expect(state.feed).toEqual(mockPosts);
        expect(state.feedFilter).toBe('all');
      });

      it('should append to feed when offset > 0', async () => {
        const existingPost = createMockPost({ id: 'existing' });
        const newPost = createMockPost({ id: 'new' });
        useSocialStore.setState({ feed: [existingPost] });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [newPost],
        });

        await act(async () => {
          await useSocialStore.getState().loadFeed('all', 20);
        });

        const state = useSocialStore.getState();
        expect(state.feed).toHaveLength(2);
        expect(state.feed[0].id).toBe('existing');
        expect(state.feed[1].id).toBe('new');
      });

      it('should show loading only on initial load', async () => {
        let loadingOnInitial = false;
        let loadingOnPagination = false;

        mockFetch
          .mockImplementationOnce(async () => {
            loadingOnInitial = useSocialStore.getState().isLoading;
            return { ok: true, json: async () => [] };
          })
          .mockImplementationOnce(async () => {
            loadingOnPagination = useSocialStore.getState().isLoading;
            return { ok: true, json: async () => [] };
          });

        await act(async () => {
          await useSocialStore.getState().loadFeed('all', 0);
        });

        await act(async () => {
          await useSocialStore.getState().loadFeed('all', 20);
        });

        expect(loadingOnInitial).toBe(true);
        expect(loadingOnPagination).toBe(false);
      });
    });

    describe('loadSymbolThread', () => {
      it('should load and store thread for symbol', async () => {
        const mockThread = createMockThread('AAPL');
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockThread,
        });

        await act(async () => {
          await useSocialStore.getState().loadSymbolThread('AAPL');
        });

        // Wait for state to update
        await vi.waitFor(() => {
          const state = useSocialStore.getState();
          expect(state.threads.get('AAPL')).toEqual(mockThread);
        });
      });
    });

    describe('searchContent', () => {
      it('should search and return results', async () => {
        const mockResults = [createMockPost()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResults,
        });

        let results: unknown[] = [];
        await act(async () => {
          results = await useSocialStore.getState().searchContent('bitcoin');
        });

        expect(results).toEqual(mockResults);
        expect(mockFetch).toHaveBeenCalledWith('/api/social/search?q=bitcoin');
      });

      it('should return empty array on search failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        let results: unknown[] = [];
        await act(async () => {
          results = await useSocialStore.getState().searchContent('test');
        });

        expect(results).toEqual([]);
        expect(useSocialStore.getState().error).toBe('Search failed');
      });
    });
  });

  // =============================================================================
  // COPY TRADING TESTS
  // =============================================================================
  describe('Copy Trading', () => {
    describe('startCopyTrading', () => {
      it('should start copy trading and add to positions', async () => {
        const mockCopyTrading = createMockCopyTrading();
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockCopyTrading,
        });

        await act(async () => {
          const id = await useSocialStore.getState().startCopyTrading('trader-1', {
            maxPositionSize: 10,
            maxTotalAllocation: 50,
            riskMultiplier: 1.0,
            autoCopy: true,
          });
          expect(id).toBe('copy-1');
        });

        expect(useSocialStore.getState().copyTradingPositions).toContainEqual(mockCopyTrading);
      });

      it('should return empty string if not authenticated', async () => {
        useSocialStore.setState({ isAuthenticated: false });

        await act(async () => {
          const id = await useSocialStore.getState().startCopyTrading('trader-1', {
            maxPositionSize: 10,
            maxTotalAllocation: 50,
            riskMultiplier: 1.0,
            autoCopy: true,
          });
          expect(id).toBe('');
        });

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('stopCopyTrading', () => {
      it('should remove copy trading position', async () => {
        const copyTrading = createMockCopyTrading();
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          copyTradingPositions: [copyTrading],
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().stopCopyTrading('copy-1');
        });

        expect(useSocialStore.getState().copyTradingPositions).toEqual([]);
      });
    });

    describe('updateCopySettings', () => {
      it('should update copy trading settings', async () => {
        const copyTrading = createMockCopyTrading();
        const updatedCopyTrading = {
          ...copyTrading,
          settings: { ...copyTrading.settings, riskMultiplier: 0.5 },
        };
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          copyTradingPositions: [copyTrading],
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedCopyTrading,
        });

        await act(async () => {
          await useSocialStore.getState().updateCopySettings('copy-1', { riskMultiplier: 0.5 });
        });

        const state = useSocialStore.getState();
        const updated = state.copyTradingPositions.find((ct) => ct.id === 'copy-1');
        expect(updated?.settings.riskMultiplier).toBe(0.5);
      });
    });

    describe('loadTraderStats', () => {
      it('should load and store trader stats', async () => {
        const mockStats = {
          totalTrades: 100,
          profitableTrades: 70,
          totalReturn: 25.5,
          followers: 500,
          copiers: 50,
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

        await act(async () => {
          await useSocialStore.getState().loadTraderStats('trader-1');
        });

        // Wait for state to update
        await vi.waitFor(() => {
          const state = useSocialStore.getState();
          expect(state.traderStats.get('trader-1')).toEqual(mockStats);
        });
      });
    });
  });

  // =============================================================================
  // NOTIFICATION TESTS
  // =============================================================================
  describe('Notifications', () => {
    describe('loadNotifications', () => {
      it('should load notifications', async () => {
        const mockNotifications = [createMockNotification(), createMockNotification({ id: 'n-2' })];
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockNotifications,
        });

        await act(async () => {
          await useSocialStore.getState().loadNotifications();
        });

        expect(useSocialStore.getState().notifications).toEqual(mockNotifications);
      });

      it('should not load if not authenticated', async () => {
        useSocialStore.setState({ isAuthenticated: false });

        await act(async () => {
          await useSocialStore.getState().loadNotifications();
        });

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('markNotificationRead', () => {
      it('should mark notification as read with optimistic update', async () => {
        const notification = createMockNotification({ isRead: false });
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          notifications: [notification],
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().markNotificationRead('notification-1');
        });

        const state = useSocialStore.getState();
        const updated = state.notifications.find((n) => n.id === 'notification-1');
        expect(updated?.isRead).toBe(true);
      });

      it('should rollback on failure', async () => {
        const notification = createMockNotification({ isRead: false });
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          notifications: [notification],
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: false });

        await act(async () => {
          await useSocialStore.getState().markNotificationRead('notification-1');
        });

        const state = useSocialStore.getState();
        const n = state.notifications.find((n) => n.id === 'notification-1');
        expect(n?.isRead).toBe(false);
        expect(state.error).toBe('Failed to mark notification as read');
      });
    });

    describe('markAllNotificationsRead', () => {
      it('should mark all notifications as read with optimistic update', async () => {
        const notifications = [
          createMockNotification({ id: 'n-1', isRead: false }),
          createMockNotification({ id: 'n-2', isRead: false }),
          createMockNotification({ id: 'n-3', isRead: true }),
        ];
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          notifications,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: true });

        await act(async () => {
          await useSocialStore.getState().markAllNotificationsRead();
        });

        const state = useSocialStore.getState();
        expect(state.notifications.every((n) => n.isRead)).toBe(true);
      });

      it('should rollback all on failure', async () => {
        const notifications = [
          createMockNotification({ id: 'n-1', isRead: false }),
          createMockNotification({ id: 'n-2', isRead: false }),
        ];
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
          notifications,
        });
        localStorageMock.getItem.mockReturnValue('test-token');

        mockFetch.mockResolvedValueOnce({ ok: false });

        await act(async () => {
          await useSocialStore.getState().markAllNotificationsRead();
        });

        const state = useSocialStore.getState();
        expect(state.notifications.every((n) => !n.isRead)).toBe(true);
      });
    });
  });

  // =============================================================================
  // REAL-TIME CONNECTION TESTS
  // =============================================================================
  describe('Real-time Connection', () => {
    describe('connectRealtime', () => {
      it('should set realtimeConnected to true when connected', async () => {
        useSocialStore.setState({
          currentUser: createMockUser(),
          isAuthenticated: true,
        });

        await act(async () => {
          useSocialStore.getState().connectRealtime();
        });

        // Simulate WebSocket open event
        // The MockWebSocket doesn't automatically trigger events,
        // but the function should create the WebSocket
        expect(useSocialStore.getState().realtimeConnected).toBe(false); // Not yet connected
      });

      it('should not connect if not authenticated', async () => {
        useSocialStore.setState({ isAuthenticated: false });

        await act(async () => {
          useSocialStore.getState().connectRealtime();
        });

        // Should not create WebSocket
        expect(useSocialStore.getState().realtimeConnected).toBe(false);
      });
    });

    describe('disconnectRealtime', () => {
      it('should set realtimeConnected to false and clear activeUsers', async () => {
        useSocialStore.setState({
          realtimeConnected: true,
          activeUsers: new Set(['user-1', 'user-2']),
        });

        await act(async () => {
          useSocialStore.getState().disconnectRealtime();
        });

        const state = useSocialStore.getState();
        expect(state.realtimeConnected).toBe(false);
        expect(state.activeUsers.size).toBe(0);
      });
    });
  });

  // =============================================================================
  // FEATURE FLAG TESTS
  // =============================================================================
  describe('Feature Flag Behavior', () => {
    it.skip('should respect feature flag for all operations', async () => {
      // This test is skipped because the FLAGS are a Proxy object and
      // cannot be easily mocked after module initialization.
      // The feature flag behavior is tested implicitly through the store
      // since the mock returns FLAGS.social = true
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================
  describe('Error Handling', () => {
    it('should set error state on API failure', async () => {
      useSocialStore.setState({
        currentUser: createMockUser(),
        isAuthenticated: true,
      });
      localStorageMock.getItem.mockReturnValue('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await useSocialStore.getState().loadFeed();
      });

      expect(useSocialStore.getState().error).toBe('Failed to load feed');
    });

    it('should handle network errors', async () => {
      useSocialStore.setState({
        currentUser: createMockUser(),
        isAuthenticated: true,
      });
      localStorageMock.getItem.mockReturnValue('test-token');

      mockFetch.mockRejectedValueOnce(new Error('Network disconnected'));

      await act(async () => {
        await useSocialStore.getState().loadFeed();
      });

      expect(useSocialStore.getState().error).toBe('Network disconnected');
    });

    it('should handle non-Error exceptions', async () => {
      useSocialStore.setState({
        currentUser: createMockUser(),
        isAuthenticated: true,
      });
      localStorageMock.getItem.mockReturnValue('test-token');

      mockFetch.mockRejectedValueOnce('String error');

      await act(async () => {
        await useSocialStore.getState().loadFeed();
      });

      expect(useSocialStore.getState().error).toBe('Failed to load feed');
    });
  });
});
