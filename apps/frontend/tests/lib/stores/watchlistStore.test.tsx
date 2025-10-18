/**
 * Comprehensive tests for Watchlist Store
 * Tests watchlist management, symbol tracking, alerts, and screener functionality
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchlistStore } from '../../../src/lib/stores/watchlistStore';
import { setDevFlag } from '../../../src/lib/utils/featureFlags';

describe('WatchlistStore', () => {
  beforeEach(() => {
    // Enable watchlist feature
    setDevFlag('watchlist', true);

    // Reset store to initial state
    act(() => {
      useWatchlistStore.setState({
        watchlists: [],
        activeWatchlistId: null,
        screenerResults: [],
        screenerQuery: {
          filters: [],
          sortBy: 'changePercent',
          sortOrder: 'desc',
          limit: 50,
        },
        isLoading: false,
        error: null,
        symbolDirectory: new Map(),
        lastUpdated: null,
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty watchlists', () => {
      const { result } = renderHook(() => useWatchlistStore());

      expect(result.current.watchlists).toEqual([]);
      expect(result.current.activeWatchlistId).toBeNull();
      expect(result.current.screenerResults).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have default screener query', () => {
      const { result } = renderHook(() => useWatchlistStore());

      expect(result.current.screenerQuery).toEqual({
        filters: [],
        sortBy: 'changePercent',
        sortOrder: 'desc',
        limit: 50,
      });
    });
  });

  describe('Watchlist Management', () => {
    describe('createWatchlist', () => {
      it('should create a new watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('My Watchlist');
        });

        expect(watchlistId).toBeTruthy();
        expect(result.current.watchlists).toHaveLength(1);
        expect(result.current.watchlists[0].name).toBe('My Watchlist');
        expect(result.current.watchlists[0].items).toEqual([]);
        expect(result.current.watchlists[0].id).toBe(watchlistId);
      });

      it('should set first watchlist as default and active', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('First List');
        });

        expect(result.current.watchlists[0].isDefault).toBe(true);
        expect(result.current.activeWatchlistId).toBe(watchlistId);
      });

      it('should create multiple watchlists', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let id1: string = '',
          id2: string = '';
        act(() => {
          id1 = result.current.createWatchlist('List 1');
          id2 = result.current.createWatchlist('List 2');
        });

        expect(result.current.watchlists).toHaveLength(2);
        expect(result.current.watchlists[0].id).toBe(id1);
        expect(result.current.watchlists[1].id).toBe(id2);
        expect(result.current.watchlists[1].isDefault).toBeFalsy();
      });

      it('should not create watchlist when feature is disabled', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          setDevFlag('watchlist', false);
        });

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Test');
        });

        expect(watchlistId).toBe('');
        expect(result.current.watchlists).toHaveLength(0);
      });

      it('should generate unique IDs for each watchlist', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        let id1: string = '',
          id2: string = '',
          id3: string = '';
        act(() => {
          id1 = result.current.createWatchlist('List 1');
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));

        act(() => {
          id2 = result.current.createWatchlist('List 2');
        });

        await new Promise((resolve) => setTimeout(resolve, 5));

        act(() => {
          id3 = result.current.createWatchlist('List 3');
        });

        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id3).toBeTruthy();
        expect(id1).not.toBe(id2);
        expect(id2).not.toBe(id3);
        expect(id1).not.toBe(id3);
      });

      it('should set created and updated timestamps', () => {
        const { result } = renderHook(() => useWatchlistStore());

        const before = new Date();
        act(() => {
          result.current.createWatchlist('Test List');
        });
        const after = new Date();

        const watchlist = result.current.watchlists[0];
        expect(watchlist.createdAt).toBeInstanceOf(Date);
        expect(watchlist.updatedAt).toBeInstanceOf(Date);
        expect(watchlist.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(watchlist.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('deleteWatchlist', () => {
      it('should delete an existing watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('To Delete');
        });

        expect(result.current.watchlists).toHaveLength(1);

        act(() => {
          result.current.deleteWatchlist(watchlistId);
        });

        expect(result.current.watchlists).toHaveLength(0);
      });

      it('should update activeWatchlistId when deleting active watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let id1: string = '',
          id2: string = '';
        act(() => {
          id1 = result.current.createWatchlist('List 1');
          id2 = result.current.createWatchlist('List 2');
          result.current.setActiveWatchlist(id1);
        });

        expect(result.current.activeWatchlistId).toBe(id1);

        act(() => {
          result.current.deleteWatchlist(id1);
        });

        expect(result.current.activeWatchlistId).toBe(id2);
      });

      it('should set activeWatchlistId to null when deleting last watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Last One');
        });

        act(() => {
          result.current.deleteWatchlist(watchlistId);
        });

        expect(result.current.activeWatchlistId).toBeNull();
      });

      it('should not error when deleting non-existent watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.createWatchlist('Existing');
        });

        expect(() => {
          act(() => {
            result.current.deleteWatchlist('non-existent-id');
          });
        }).not.toThrow();

        expect(result.current.watchlists).toHaveLength(1);
      });
    });

    describe('renameWatchlist', () => {
      it('should rename an existing watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Old Name');
        });

        act(() => {
          result.current.renameWatchlist(watchlistId, 'New Name');
        });

        expect(result.current.watchlists[0].name).toBe('New Name');
      });

      it('should update updatedAt timestamp when renaming', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Test');
        });

        const originalUpdatedAt = result.current.watchlists[0].updatedAt;

        // Wait a tiny bit to ensure timestamp differs
        await new Promise((resolve) => setTimeout(resolve, 10));

        act(() => {
          result.current.renameWatchlist(watchlistId, 'Updated Name');
        });

        expect(result.current.watchlists[0].updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });

      it('should not error when renaming non-existent watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        expect(() => {
          act(() => {
            result.current.renameWatchlist('non-existent', 'New Name');
          });
        }).not.toThrow();
      });
    });

    describe('setActiveWatchlist', () => {
      it('should set active watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let id1: string = '',
          id2: string = '';
        act(() => {
          id1 = result.current.createWatchlist('List 1');
          id2 = result.current.createWatchlist('List 2');
        });

        act(() => {
          result.current.setActiveWatchlist(id2);
        });

        expect(result.current.activeWatchlistId).toBe(id2);
      });

      it('should not set non-existent watchlist as active', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let id1: string = '';
        act(() => {
          id1 = result.current.createWatchlist('List 1');
        });

        expect(result.current.activeWatchlistId).toBe(id1);

        act(() => {
          result.current.setActiveWatchlist('non-existent');
        });

        expect(result.current.activeWatchlistId).toBe(id1); // Should remain unchanged
      });
    });
  });

  describe('Item Management', () => {
    let watchlistId: string = '';

    beforeEach(() => {
      const { result } = renderHook(() => useWatchlistStore());
      act(() => {
        watchlistId = result.current.createWatchlist('Test Watchlist');
      });
    });

    describe('addToWatchlist', () => {
      it('should add symbol to watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL');
        });

        const watchlist = result.current.watchlists[0];
        expect(watchlist.items).toHaveLength(1);
        expect(watchlist.items[0].symbol).toBe('AAPL');
        expect(watchlist.items[0].addedAt).toBeInstanceOf(Date);
        expect(watchlist.items[0].alerts).toEqual([]);
      });

      it('should add symbol with notes', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addToWatchlist(watchlistId, 'TSLA', 'Watch for earnings');
        });

        expect(result.current.watchlists[0].items[0].notes).toBe('Watch for earnings');
      });

      it('should convert symbol to uppercase', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addToWatchlist(watchlistId, 'aapl');
        });

        expect(result.current.watchlists[0].items[0].symbol).toBe('AAPL');
      });

      it('should not add duplicate symbols', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL');
          result.current.addToWatchlist(watchlistId, 'AAPL');
        });

        expect(result.current.watchlists[0].items).toHaveLength(1);
      });

      it('should add multiple different symbols', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL');
          result.current.addToWatchlist(watchlistId, 'TSLA');
          result.current.addToWatchlist(watchlistId, 'MSFT');
        });

        expect(result.current.watchlists[0].items).toHaveLength(3);
      });

      it('should update watchlist updatedAt timestamp', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        const originalUpdatedAt = result.current.watchlists[0].updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));

        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL');
        });

        expect(result.current.watchlists[0].updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });
    });

    describe('removeFromWatchlist', () => {
      beforeEach(() => {
        const { result } = renderHook(() => useWatchlistStore());
        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL');
          result.current.addToWatchlist(watchlistId, 'TSLA');
          result.current.addToWatchlist(watchlistId, 'MSFT');
        });
      });

      it('should remove symbol from watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.removeFromWatchlist(watchlistId, 'TSLA');
        });

        expect(result.current.watchlists[0].items).toHaveLength(2);
        expect(result.current.watchlists[0].items.map((c: any) => c.symbol)).not.toContain('TSLA');
      });

      it('should not error when removing non-existent symbol', () => {
        const { result } = renderHook(() => useWatchlistStore());

        expect(() => {
          act(() => {
            result.current.removeFromWatchlist(watchlistId, 'NVDA');
          });
        }).not.toThrow();

        expect(result.current.watchlists[0].items).toHaveLength(3);
      });

      it('should update watchlist updatedAt timestamp', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        const originalUpdatedAt = result.current.watchlists[0].updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));

        act(() => {
          result.current.removeFromWatchlist(watchlistId, 'AAPL');
        });

        expect(result.current.watchlists[0].updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });
    });

    describe('updateWatchlistItem', () => {
      beforeEach(() => {
        const { result } = renderHook(() => useWatchlistStore());
        act(() => {
          result.current.addToWatchlist(watchlistId, 'AAPL', 'Original notes');
        });
      });

      it('should update watchlist item notes', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.updateWatchlistItem(watchlistId, 'AAPL', { notes: 'Updated notes' });
        });

        expect(result.current.watchlists[0].items[0].notes).toBe('Updated notes');
      });

      it('should partially update item properties', () => {
        const { result } = renderHook(() => useWatchlistStore());

        const originalAddedAt = result.current.watchlists[0].items[0].addedAt;

        act(() => {
          result.current.updateWatchlistItem(watchlistId, 'AAPL', { notes: 'New note' });
        });

        expect(result.current.watchlists[0].items[0].addedAt).toEqual(originalAddedAt);
        expect(result.current.watchlists[0].items[0].notes).toBe('New note');
      });

      it('should not error when updating non-existent symbol', () => {
        const { result } = renderHook(() => useWatchlistStore());

        expect(() => {
          act(() => {
            result.current.updateWatchlistItem(watchlistId, 'NVDA', { notes: 'Test' });
          });
        }).not.toThrow();
      });
    });
  });

  describe('Alert Management', () => {
    let watchlistId: string = '';

    beforeEach(() => {
      const { result } = renderHook(() => useWatchlistStore());
      act(() => {
        watchlistId = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(watchlistId, 'AAPL');
      });
    });

    describe('addAlert', () => {
      it('should add alert to watchlist item', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addAlert(watchlistId, 'AAPL', {
            condition: 'above',
            value: 150,
            field: 'price',
            isActive: true,
          });
        });

        const item = result.current.watchlists[0].items[0];
        expect(item.alerts).toHaveLength(1);
        expect(item.alerts![0].condition).toBe('above');
        expect(item.alerts![0].value).toBe(150);
        expect(item.alerts![0].field).toBe('price');
        expect(item.alerts![0].isActive).toBe(true);
        expect(item.alerts![0].id).toBeTruthy();
      });

      it('should add multiple alerts to same symbol', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addAlert(watchlistId, 'AAPL', {
            condition: 'above',
            value: 150,
            field: 'price',
            isActive: true,
          });
          result.current.addAlert(watchlistId, 'AAPL', {
            condition: 'below',
            value: 140,
            field: 'price',
            isActive: true,
          });
        });

        expect(result.current.watchlists[0].items[0].alerts).toHaveLength(2);
      });

      it('should generate unique alert IDs', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addAlert(watchlistId, 'AAPL', {
            condition: 'above',
            value: 150,
            field: 'price',
            isActive: true,
          });
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));

        act(() => {
          result.current.addAlert(watchlistId, 'AAPL', {
            condition: 'below',
            value: 140,
            field: 'price',
            isActive: true,
          });
        });

        const alerts = result.current.watchlists[0].items[0].alerts!;
        expect(alerts).toHaveLength(2);
        expect(alerts[0].id).toBeTruthy();
        expect(alerts[1].id).toBeTruthy();
        expect(alerts[0].id).not.toBe(alerts[1].id);
      });
    });
  });

  describe('Screener Functionality', () => {
    describe('updateScreenerQuery', () => {
      it('should update screener query', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.updateScreenerQuery({
            sortBy: 'volume',
            sortOrder: 'asc',
            limit: 100,
          });
        });

        expect(result.current.screenerQuery.sortBy).toBe('volume');
        expect(result.current.screenerQuery.sortOrder).toBe('asc');
        expect(result.current.screenerQuery.limit).toBe(100);
      });

      it('should partially update query', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.updateScreenerQuery({ limit: 25 });
        });

        expect(result.current.screenerQuery.limit).toBe(25);
        expect(result.current.screenerQuery.sortBy).toBe('changePercent'); // Should keep default
      });
    });

    describe('addScreenerFilter', () => {
      it('should add filter to screener query', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addScreenerFilter({
            field: 'marketCap',
            operator: 'gt',
            value: 1000000000,
            label: 'Large Cap',
          });
        });

        expect(result.current.screenerQuery.filters).toHaveLength(1);
        expect(result.current.screenerQuery.filters[0].field).toBe('marketCap');
        expect(result.current.screenerQuery.filters[0].operator).toBe('gt');
        expect(result.current.screenerQuery.filters[0].id).toBeTruthy();
      });

      it('should add multiple filters', () => {
        const { result } = renderHook(() => useWatchlistStore());

        act(() => {
          result.current.addScreenerFilter({
            field: 'marketCap',
            operator: 'gt',
            value: 1000000000,
            label: 'Large Cap',
          });
          result.current.addScreenerFilter({
            field: 'volume',
            operator: 'gte',
            value: 1000000,
            label: 'High Volume',
          });
        });

        expect(result.current.screenerQuery.filters).toHaveLength(2);
      });
    });

    describe('removeScreenerFilter', () => {
      it('should remove filter from screener query', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let filterId: string = '';
        act(() => {
          result.current.addScreenerFilter({
            field: 'marketCap',
            operator: 'gt',
            value: 1000000000,
            label: 'Large Cap',
          });
        });

        // Read filterId after state has updated
        filterId = result.current.screenerQuery.filters[0]?.id || '';
        expect(filterId).toBeTruthy();

        act(() => {
          result.current.removeScreenerFilter(filterId);
        });

        expect(result.current.screenerQuery.filters).toHaveLength(0);
      });

      it('should not error when removing non-existent filter', () => {
        const { result } = renderHook(() => useWatchlistStore());

        expect(() => {
          act(() => {
            result.current.removeScreenerFilter('non-existent-id');
          });
        }).not.toThrow();
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('importWatchlist', () => {
      it('should import symbols and create new watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let importedId: string = '';
        act(() => {
          importedId = result.current.importWatchlist(['AAPL', 'TSLA', 'MSFT']);
        });

        expect(importedId).toBeTruthy();
        const watchlist = result.current.watchlists.find((c: any) => c.id === importedId);
        expect(watchlist).toBeDefined();
        expect(watchlist!.items).toHaveLength(3);
        expect(watchlist!.items.map((c: any) => c.symbol)).toEqual(['AAPL', 'TSLA', 'MSFT']);
      });

      it('should handle empty import', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let importedId: string = '';
        act(() => {
          importedId = result.current.importWatchlist([]);
        });

        expect(importedId).toBeTruthy();
        const watchlist = result.current.watchlists.find((c: any) => c.id === importedId);
        expect(watchlist!.items).toHaveLength(0);
      });
    });

    describe('exportWatchlist', () => {
      it('should export watchlist symbols', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Export Test');
          result.current.addToWatchlist(watchlistId, 'AAPL');
          result.current.addToWatchlist(watchlistId, 'TSLA');
          result.current.addToWatchlist(watchlistId, 'MSFT');
        });

        let exported: string[] = [];
        act(() => {
          exported = result.current.exportWatchlist(watchlistId);
        });

        expect(exported).toEqual(['AAPL', 'TSLA', 'MSFT']);
      });

      it('should handle empty watchlist export', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let watchlistId: string = '';
        act(() => {
          watchlistId = result.current.createWatchlist('Empty List');
        });

        let exported: string[] = [];
        act(() => {
          exported = result.current.exportWatchlist(watchlistId);
        });

        expect(exported).toEqual([]);
      });

      it('should return empty array for non-existent watchlist', () => {
        const { result } = renderHook(() => useWatchlistStore());

        let exported: string[] = [];
        act(() => {
          exported = result.current.exportWatchlist('non-existent-id');
        });

        expect(exported).toEqual([]);
      });
    });
  });

  describe('Edge Cases & Integration', () => {
    it('should handle rapid watchlist creation and deletion', () => {
      const { result } = renderHook(() => useWatchlistStore());

      const ids: string[] = [];
      act(() => {
        for (let i = 0; i < 10; i++) {
          ids.push(result.current.createWatchlist(`List ${i}`));
        }
      });

      expect(result.current.watchlists).toHaveLength(10);

      act(() => {
        ids.forEach((id) => result.current.deleteWatchlist(id));
      });

      expect(result.current.watchlists).toHaveLength(0);
    });

    it('should handle operations with empty watchlists array', () => {
      const { result } = renderHook(() => useWatchlistStore());

      expect(() => {
        act(() => {
          result.current.setActiveWatchlist('any-id');
          result.current.deleteWatchlist('any-id');
          result.current.renameWatchlist('any-id', 'New Name');
          result.current.addToWatchlist('any-id', 'AAPL');
        });
      }).not.toThrow();
    });

    it('should maintain state consistency across multiple operations', () => {
      const { result } = renderHook(() => useWatchlistStore());

      let id1: string = '';

      // Create list and add items
      act(() => {
        id1 = result.current.createWatchlist('List 1');
      });

      act(() => {
        result.current.addToWatchlist(id1, 'AAPL');
      });

      act(() => {
        result.current.addToWatchlist(id1, 'TSLA');
      });

      // Verify we have 2 items
      expect(result.current.watchlists[0]?.items).toHaveLength(2);
      const symbols = result.current.watchlists[0]?.items.map((item: any) => item.symbol);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('TSLA');

      // Remove TSLA
      act(() => {
        result.current.removeFromWatchlist(id1, 'TSLA');
      });

      // Verify only AAPL remains
      expect(result.current.watchlists[0]?.items).toHaveLength(1);
      expect(result.current.watchlists[0]?.items[0]?.symbol).toBe('AAPL');
    });

    it('should handle feature flag toggle gracefully', () => {
      const { result } = renderHook(() => useWatchlistStore());

      let watchlistId: string = '';
      act(() => {
        watchlistId = result.current.createWatchlist('Test');
        result.current.addToWatchlist(watchlistId, 'AAPL');
      });

      expect(result.current.watchlists).toHaveLength(1);

      act(() => {
        setDevFlag('watchlist', false);
      });

      // Operations should be no-ops when feature disabled
      act(() => {
        result.current.createWatchlist('Should not create');
        result.current.addToWatchlist(watchlistId, 'TSLA');
        result.current.removeFromWatchlist(watchlistId, 'AAPL');
      });

      // State should remain unchanged
      expect(result.current.watchlists).toHaveLength(1);
      expect(result.current.watchlists[0]?.items).toHaveLength(1);
    });
  });
});
