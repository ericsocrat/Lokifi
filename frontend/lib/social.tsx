import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Social Types
export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  followers: number;
  following: number;
  joinedAt: Date;
  
  // Trading Stats (optional, if public)
  publicStats?: {
    totalReturns: number;
    winRate: number;
    sharpeRatio: number;
    followersReturn: number; // Performance of followers who copy trades
  };
}

export interface SocialPost {
  id: string;
  authorId: string;
  author: SocialUser;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Post Type
  type: 'text' | 'chart' | 'trade' | 'analysis' | 'news';
  
  // Associated Data
  symbol?: string;
  chartSnapshot?: string; // Base64 image or URL
  tradeData?: {
    action: 'buy' | 'sell';
    symbol: string;
    quantity: number;
    price: number;
    timestamp: Date;
    reasoning?: string;
  };
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  views: number;
  
  // User Interactions
  isLiked: boolean;
  isBookmarked: boolean;
  
  // Moderation
  isDeleted: boolean;
  reportCount: number;
  tags: string[];
}

export interface SocialComment {
  id: string;
  postId: string;
  authorId: string;
  author: SocialUser;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Nested comments
  parentId?: string;
  replies: SocialComment[];
  
  // Engagement
  likes: number;
  isLiked: boolean;
  
  // Moderation
  isDeleted: boolean;
  reportCount: number;
}

export interface SocialThread {
  id: string;
  symbol: string;
  title: string;
  description?: string;
  createdAt: Date;
  
  // Thread Stats
  posts: number;
  participants: number;
  views: number;
  
  // Recent Activity
  lastPost: Date;
  recentPosts: SocialPost[];
  
  // Moderation
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
}

export interface CopyTrading {
  id: string;
  followerId: string;
  traderId: string;
  trader: SocialUser;
  createdAt: Date;
  
  // Copy Settings
  settings: {
    isActive: boolean;
    copyPercentage: number; // 0-100% of each trade
    maxPositionSize: number;
    stopLoss?: number;
    takeProfit?: number;
    
    // Filters
    minInvestment?: number;
    maxInvestment?: number;
    allowedSymbols?: string[];
    blockedSymbols?: string[];
    
    // Risk Management
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  
  // Performance Tracking
  performance: {
    totalCopiedTrades: number;
    successfulTrades: number;
    totalReturn: number;
    fees: number;
    startDate: Date;
    endDate?: Date;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'trade_alert' | 'copy_trade';
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  
  // Associated Data
  postId?: string;
  commentId?: string;
  fromUserId?: string;
  fromUser?: SocialUser;
  
  // Actions
  actionUrl?: string;
  actionLabel?: string;
}

// Store State
interface SocialState {
  // Current User
  currentUser: SocialUser | null;
  isAuthenticated: boolean;
  
  // Social Content
  feed: SocialPost[];
  threads: Map<string, SocialThread>;
  notifications: Notification[];
  
  // Following/Followers
  following: Set<string>;
  followers: Set<string>;
  
  // Copy Trading
  copyTradingPositions: CopyTrading[];
  traderStats: Map<string, any>;
  
  // UI State
  selectedSymbol: string | null;
  feedFilter: 'all' | 'following' | 'trending' | 'charts' | 'trades';
  searchQuery: string;
  
  // Real-time
  realtimeConnected: boolean;
  activeUsers: Set<string>;
  
  // Settings
  socialSettings: {
    profilePublic: boolean;
    showTrades: boolean;
    showReturns: boolean;
    allowCopyTrading: boolean;
    
    // Notifications
    pushNotifications: boolean;
    emailNotifications: boolean;
    notificationTypes: string[];
  };
  
  // Loading States
  isLoading: boolean;
  error: string | null;
}

// Store Actions
interface SocialActions {
  // Authentication
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<SocialUser>) => Promise<void>;
  
  // Content Creation
  createPost: (post: Omit<SocialPost, 'id' | 'author' | 'createdAt' | 'likes' | 'comments' | 'shares' | 'views' | 'isLiked' | 'isBookmarked' | 'isDeleted' | 'reportCount'>) => Promise<string>;
  updatePost: (postId: string, updates: Partial<SocialPost>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  
  // Content Interaction
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  unbookmarkPost: (postId: string) => Promise<void>;
  sharePost: (postId: string, platform?: string) => Promise<void>;
  
  // Comments
  addComment: (postId: string, content: string, parentId?: string) => Promise<string>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  
  // Social Interactions
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  reportContent: (contentId: string, type: 'post' | 'comment', reason: string) => Promise<void>;
  
  // Feed Management
  loadFeed: (filter?: SocialState['feedFilter'], offset?: number) => Promise<void>;
  loadSymbolThread: (symbol: string) => Promise<void>;
  searchContent: (query: string) => Promise<SocialPost[]>;
  
  // Copy Trading
  startCopyTrading: (traderId: string, settings: CopyTrading['settings']) => Promise<string>;
  stopCopyTrading: (copyTradingId: string) => Promise<void>;
  updateCopySettings: (copyTradingId: string, settings: Partial<CopyTrading['settings']>) => Promise<void>;
  loadTraderStats: (traderId: string) => Promise<void>;
  
  // Notifications
  loadNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  // Real-time
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  
  // Settings
  updateSocialSettings: (settings: Partial<SocialState['socialSettings']>) => void;
  
  // UI State
  setSelectedSymbol: (symbol: string | null) => void;
  setFeedFilter: (filter: SocialState['feedFilter']) => void;
  setSearchQuery: (query: string) => void;
}

// Create Store
export const useSocialStore = create<SocialState & SocialActions>()(
  persist(
      immer<SocialState & SocialActions>((set, get) => ({
        // Initial State
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
          notificationTypes: ['like', 'comment', 'follow']
        },
        isLoading: false,
        error: null,
        
        // Authentication
        login: async (credentials) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await fetch('/api/social/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials)
            });
            
            if (!response.ok) throw new Error('Login failed');
            
            const { user, token } = await response.json();
            
            // Store auth token
            localStorage.setItem('social_token', token);
            
            set((state) => {
              state.currentUser = user;
              state.isAuthenticated = true;
              state.isLoading = false;
            });
            
            // Load user's social data
            get().loadFeed();
            get().loadNotifications();
            get().connectRealtime();
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Login failed';
              state.isLoading = false;
            });
          }
        },
        
        logout: () => {
          if (!FLAGS.social) return;
          
          localStorage.removeItem('social_token');
          get().disconnectRealtime();
          
          set((state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
            state.feed = [];
            state.notifications = [];
            state.following.clear();
            state.followers.clear();
            state.copyTradingPositions = [];
          });
        },
        
        updateProfile: async (updates) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch('/api/social/profile', {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Profile update failed');
            
            const updatedUser = await response.json();
            
            set((state) => {
              state.currentUser = updatedUser;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Profile update failed';
            });
          }
        },
        
        // Content Creation
        createPost: async (postData) => {
          if (!FLAGS.social || !get().isAuthenticated) throw new Error('Not authenticated');
          
          const postId = `post_${Date.now()}`;
          const now = new Date();
          const { currentUser } = get();
          
          if (!currentUser) throw new Error('No current user');
          
          const post: SocialPost = {
            ...postData,
            id: postId,
            author: currentUser,
            authorId: currentUser.id,
            createdAt: now,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            isLiked: false,
            isBookmarked: false,
            isDeleted: false,
            reportCount: 0
          };
          
          // Optimistic update
          set((state) => {
            state.feed.unshift(post);
          });
          
          try {
            const response = await fetch('/api/social/posts', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify(postData)
            });
            
            if (!response.ok) throw new Error('Failed to create post');
            
            const savedPost = await response.json();
            
            set((state) => {
              const index = state.feed.findIndex(p => p.id === postId);
              if (index !== -1) {
                state.feed[index] = savedPost;
              }
            });
            
            return savedPost.id;
            
          } catch (error) {
            // Revert optimistic update
            set((state) => {
              const index = state.feed.findIndex(p => p.id === postId);
              if (index !== -1) {
                state.feed.splice(index, 1);
              }
              state.error = error instanceof Error ? error.message : 'Failed to create post';
            });
            throw error;
          }
        },
        
        updatePost: async (postId, updates) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/posts/${postId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify(updates)
            });
            
            if (!response.ok) throw new Error('Failed to update post');
            
            const updatedPost = await response.json();
            
            set((state) => {
              const index = state.feed.findIndex(p => p.id === postId);
              if (index !== -1) {
                state.feed[index] = updatedPost;
              }
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update post';
            });
          }
        },
        
        deletePost: async (postId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/posts/${postId}`, {
              method: 'DELETE',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to delete post');
            
            set((state) => {
              const index = state.feed.findIndex(p => p.id === postId);
              if (index !== -1) {
                state.feed.splice(index, 1);
              }
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete post';
            });
          }
        },
        
        // Content Interaction
        likePost: async (postId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          // Optimistic update
          set((state) => {
            const post = state.feed.find(p => p.id === postId);
            if (post && !post.isLiked) {
              post.likes++;
              post.isLiked = true;
            }
          });
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/like`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to like post');
            
          } catch (error) {
            // Revert optimistic update
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post && post.isLiked) {
                post.likes--;
                post.isLiked = false;
              }
              state.error = error instanceof Error ? error.message : 'Failed to like post';
            });
          }
        },
        
        unlikePost: async (postId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          // Optimistic update
          set((state) => {
            const post = state.feed.find(p => p.id === postId);
            if (post && post.isLiked) {
              post.likes--;
              post.isLiked = false;
            }
          });
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/unlike`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to unlike post');
            
          } catch (error) {
            // Revert optimistic update
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post && !post.isLiked) {
                post.likes++;
                post.isLiked = true;
              }
              state.error = error instanceof Error ? error.message : 'Failed to unlike post';
            });
          }
        },
        
        bookmarkPost: async (postId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            const post = state.feed.find(p => p.id === postId);
            if (post) {
              post.isBookmarked = true;
            }
          });
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/bookmark`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to bookmark post');
            
          } catch (error) {
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post) {
                post.isBookmarked = false;
              }
              state.error = error instanceof Error ? error.message : 'Failed to bookmark post';
            });
          }
        },
        
        unbookmarkPost: async (postId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            const post = state.feed.find(p => p.id === postId);
            if (post) {
              post.isBookmarked = false;
            }
          });
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/unbookmark`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to unbookmark post');
            
          } catch (error) {
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post) {
                post.isBookmarked = true;
              }
              state.error = error instanceof Error ? error.message : 'Failed to unbookmark post';
            });
          }
        },
        
        sharePost: async (postId, platform) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/share`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ platform })
            });
            
            if (!response.ok) throw new Error('Failed to share post');
            
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post) {
                post.shares++;
              }
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to share post';
            });
          }
        },
        
        // Comments (simplified implementation)
        addComment: async (postId, content, parentId) => {
          if (!FLAGS.social || !get().isAuthenticated) return '';
          
          try {
            const response = await fetch(`/api/social/posts/${postId}/comments`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ content, parentId })
            });
            
            if (!response.ok) throw new Error('Failed to add comment');
            
            const comment = await response.json();
            
            set((state) => {
              const post = state.feed.find(p => p.id === postId);
              if (post) {
                post.comments++;
              }
            });
            
            return comment.id;
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to add comment';
            });
            return '';
          }
        },
        
        updateComment: async (commentId, content) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/comments/${commentId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ content })
            });
            
            if (!response.ok) throw new Error('Failed to update comment');
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update comment';
            });
          }
        },
        
        deleteComment: async (commentId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/comments/${commentId}`, {
              method: 'DELETE',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to delete comment');
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to delete comment';
            });
          }
        },
        
        likeComment: async (commentId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/comments/${commentId}/like`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to like comment');
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to like comment';
            });
          }
        },
        
        // Social Interactions
        followUser: async (userId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            state.following.add(userId);
          });
          
          try {
            const response = await fetch(`/api/social/users/${userId}/follow`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to follow user');
            
          } catch (error) {
            set((state) => {
              state.following.delete(userId);
              state.error = error instanceof Error ? error.message : 'Failed to follow user';
            });
          }
        },
        
        unfollowUser: async (userId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            state.following.delete(userId);
          });
          
          try {
            const response = await fetch(`/api/social/users/${userId}/unfollow`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to unfollow user');
            
          } catch (error) {
            set((state) => {
              state.following.add(userId);
              state.error = error instanceof Error ? error.message : 'Failed to unfollow user';
            });
          }
        },
        
        blockUser: async (userId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/users/${userId}/block`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to block user');
            
            // Remove user's content from feed
            set((state) => {
              state.feed = state.feed.filter(post => post.authorId !== userId);
              state.following.delete(userId);
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to block user';
            });
          }
        },
        
        reportContent: async (contentId, type, reason) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch('/api/social/report', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ contentId, type, reason })
            });
            
            if (!response.ok) throw new Error('Failed to report content');
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to report content';
            });
          }
        },
        
        // Feed Management
        loadFeed: async (filter = 'all', offset = 0) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.isLoading = offset === 0; // Only show loading for initial load
            state.error = null;
          });
          
          try {
            const params = new URLSearchParams({
              filter,
              offset: offset.toString(),
              limit: '20'
            });
            
            const response = await fetch(`/api/social/feed?${params}`, {
              headers: get().isAuthenticated ? {
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              } : {}
            });
            
            if (!response.ok) throw new Error('Failed to load feed');
            
            const posts: SocialPost[] = await response.json();
            
            set((state) => {
              if (offset === 0) {
                state.feed = posts;
              } else {
                state.feed.push(...posts);
              }
              state.feedFilter = filter;
              state.isLoading = false;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load feed';
              state.isLoading = false;
            });
          }
        },
        
        loadSymbolThread: async (symbol) => {
          if (!FLAGS.social) return;
          
          try {
            const response = await fetch(`/api/social/threads/${symbol}`);
            if (!response.ok) throw new Error('Failed to load thread');
            
            const thread: SocialThread = await response.json();
            
            set((state) => {
              state.threads.set(symbol, thread);
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load thread';
            });
          }
        },
        
        searchContent: async (query) => {
          if (!FLAGS.social) return [];
          
          try {
            const response = await fetch(`/api/social/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            
            return await response.json();
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Search failed';
            });
            return [];
          }
        },
        
        // Copy Trading (simplified - would integrate with paper trading)
        startCopyTrading: async (traderId, settings) => {
          if (!FLAGS.social || !get().isAuthenticated) return '';
          
          try {
            const response = await fetch('/api/social/copy-trading', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ traderId, settings })
            });
            
            if (!response.ok) throw new Error('Failed to start copy trading');
            
            const copyTrading: CopyTrading = await response.json();
            
            set((state) => {
              state.copyTradingPositions.push(copyTrading);
            });
            
            return copyTrading.id;
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to start copy trading';
            });
            return '';
          }
        },
        
        stopCopyTrading: async (copyTradingId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/copy-trading/${copyTradingId}`, {
              method: 'DELETE',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to stop copy trading');
            
            set((state) => {
              state.copyTradingPositions = state.copyTradingPositions.filter(
                ct => ct.id !== copyTradingId
              );
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to stop copy trading';
            });
          }
        },
        
        updateCopySettings: async (copyTradingId, settings) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch(`/api/social/copy-trading/${copyTradingId}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              },
              body: JSON.stringify({ settings })
            });
            
            if (!response.ok) throw new Error('Failed to update copy settings');
            
            const updatedCopyTrading = await response.json();
            
            set((state) => {
              const index = state.copyTradingPositions.findIndex(ct => ct.id === copyTradingId);
              if (index !== -1) {
                state.copyTradingPositions[index] = updatedCopyTrading;
              }
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to update copy settings';
            });
          }
        },
        
        loadTraderStats: async (traderId) => {
          if (!FLAGS.social) return;
          
          try {
            const response = await fetch(`/api/social/traders/${traderId}/stats`);
            if (!response.ok) throw new Error('Failed to load trader stats');
            
            const stats = await response.json();
            
            set((state) => {
              state.traderStats.set(traderId, stats);
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load trader stats';
            });
          }
        },
        
        // Notifications
        loadNotifications: async () => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          try {
            const response = await fetch('/api/social/notifications', {
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to load notifications');
            
            const notifications: Notification[] = await response.json();
            
            set((state) => {
              state.notifications = notifications;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load notifications';
            });
          }
        },
        
        markNotificationRead: async (notificationId) => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.isRead = true;
            }
          });
          
          try {
            const response = await fetch(`/api/social/notifications/${notificationId}/read`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to mark notification as read');
            
          } catch (error) {
            set((state) => {
              const notification = state.notifications.find(n => n.id === notificationId);
              if (notification) {
                notification.isRead = false;
              }
              state.error = error instanceof Error ? error.message : 'Failed to mark notification as read';
            });
          }
        },
        
        markAllNotificationsRead: async () => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          set((state) => {
            state.notifications.forEach(n => n.isRead = true);
          });
          
          try {
            const response = await fetch('/api/social/notifications/read-all', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${localStorage.getItem('social_token')}`
              }
            });
            
            if (!response.ok) throw new Error('Failed to mark all notifications as read');
            
          } catch (error) {
            set((state) => {
              state.notifications.forEach(n => n.isRead = false);
              state.error = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
            });
          }
        },
        
        // Real-time
        connectRealtime: () => {
          if (!FLAGS.social || !get().isAuthenticated) return;
          
          const ws = new WebSocket('/ws/social');
          
          ws.onopen = () => {
            set((state) => {
              state.realtimeConnected = true;
            });
          };
          
          ws.onclose = () => {
            set((state) => {
              state.realtimeConnected = false;
            });
          };
          
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'new_post':
                set((state) => {
                  state.feed.unshift(data.post);
                });
                break;
                
              case 'post_liked':
                set((state) => {
                  const post = state.feed.find(p => p.id === data.postId);
                  if (post) {
                    post.likes = data.likes;
                  }
                });
                break;
                
              case 'new_notification':
                set((state) => {
                  state.notifications.unshift(data.notification);
                });
                break;
                
              case 'user_online':
                set((state) => {
                  state.activeUsers.add(data.userId);
                });
                break;
                
              case 'user_offline':
                set((state) => {
                  state.activeUsers.delete(data.userId);
                });
                break;
            }
          };
        },
        
        disconnectRealtime: () => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.realtimeConnected = false;
            state.activeUsers.clear();
          });
        },
        
        // Settings
        updateSocialSettings: (settings) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            Object.assign(state.socialSettings, settings);
          });
        },
        
        // UI State
        setSelectedSymbol: (symbol) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.selectedSymbol = symbol;
          });
          
          if (symbol) {
            get().loadSymbolThread(symbol);
          }
        },
        
        setFeedFilter: (filter) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.feedFilter = filter;
          });
          
          get().loadFeed(filter, 0);
        },
        
        setSearchQuery: (query) => {
          if (!FLAGS.social) return;
          
          set((state) => {
            state.searchQuery = query;
          });
        }
      })),
      {
        name: 'lokifi-social-storage',
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              threads: new Map(),
              activeUsers: new Set(),
              traderStats: new Map()
            };
          }
          return persistedState as SocialState & SocialActions;
        }
      }
    )
  );

// Selectors
export const useUnreadNotificationsCount = () =>
  useSocialStore((state) => 
    state.notifications.filter(n => !n.isRead).length
  );

export const useIsFollowing = (userId: string) =>
  useSocialStore((state) => state.following.has(userId));

export const useSymbolThread = (symbol: string) =>
  useSocialStore((state) => state.threads.get(symbol));

export const useCopyTradingPositions = () =>
  useSocialStore((state) => state.copyTradingPositions);

// Initialize store
if (typeof window !== 'undefined' && FLAGS.social) {
  const token = localStorage.getItem('social_token');
  if (token) {
    // Auto-login if token exists
    const store = useSocialStore.getState();
    // Verify token and set user state
    fetch('/api/social/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => response.ok ? response.json() : null)
    .then(user => {
      if (user) {
        store.currentUser = user;
        store.isAuthenticated = true;
        store.loadFeed();
        store.loadNotifications();
      } else {
        localStorage.removeItem('social_token');
      }
    })
    .catch(() => {
      localStorage.removeItem('social_token');
    });
  }
}