import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWatchlistStore } from '../lib/watchlist';
import { useTemplatesStore } from '../lib/templates';
import { FLAGS } from '../lib/featureFlags';

// Mock feature flags
vi.mock('../lib/featureFlags', () => ({
  FLAGS: {
    watchlist: true,
    templates: true,
    imgExport: true,
    alertsV2: true,
    corpActions: true
  }
}));

describe('Watchlist Store (G2)', () => {
  beforeEach(() => {
    // Reset store state
    useWatchlistStore.getState().watchlists = [];
    useWatchlistStore.getState().activeWatchlistId = null;
  });

  describe('Watchlist Management', () => {
    it('should create a new watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        expect(id).toBeTruthy();
        expect(result.current.watchlists).toHaveLength(1);
        expect(result.current.watchlists[0].name).toBe('Test Watchlist');
        expect(result.current.activeWatchlistId).toBe(id);
      });
    });

    it('should add symbols to watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL', 'Test note');
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        expect(watchlist?.items).toHaveLength(1);
        expect(watchlist?.items[0].symbol).toBe('AAPL');
        expect(watchlist?.items[0].notes).toBe('Test note');
      });
    });

    it('should prevent duplicate symbols', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL');
        result.current.addToWatchlist(id, 'AAPL'); // Duplicate
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        expect(watchlist?.items).toHaveLength(1);
      });
    });

    it('should remove symbols from watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL');
        result.current.addToWatchlist(id, 'GOOGL');
        result.current.removeFromWatchlist(id, 'AAPL');
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        expect(watchlist?.items).toHaveLength(1);
        expect(watchlist?.items[0].symbol).toBe('GOOGL');
      });
    });
  });

  describe('Alert Management', () => {
    it('should add alerts to watchlist items', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL');
        result.current.addAlert(id, 'AAPL', {
          condition: 'above',
          value: 150,
          field: 'price',
          isActive: true
        });
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        const item = watchlist?.items[0];
        expect(item?.alerts).toHaveLength(1);
        expect(item?.alerts?.[0].condition).toBe('above');
        expect(item?.alerts?.[0].value).toBe(150);
      });
    });

    it('should toggle alert activation', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL');
        result.current.addAlert(id, 'AAPL', {
          condition: 'above',
          value: 150,
          field: 'price',
          isActive: true
        });
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        const alertId = watchlist?.items[0].alerts?.[0].id;
        expect(alertId).toBeTruthy();
        
        result.current.toggleAlert(id, 'AAPL', alertId!);
        
        const updatedWatchlist = result.current.watchlists.find((w: any) => w.id === id);
        const alert = updatedWatchlist?.items[0].alerts?.[0];
        expect(alert?.isActive).toBe(false);
      });
    });
  });

  describe('Screener Functionality', () => {
    it('should add and remove screener filters', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        result.current.addScreenerFilter({
          field: 'changePercent',
          operator: 'gt',
          value: 5,
          label: 'Change > 5%'
        });
        
        expect(result.current.screenerQuery.filters).toHaveLength(1);
        expect(result.current.screenerQuery.filters[0].field).toBe('changePercent');
        
        const filterId = result.current.screenerQuery.filters[0].id;
        result.current.removeScreenerFilter(filterId);
        
        expect(result.current.screenerQuery.filters).toHaveLength(0);
      });
    });

    it('should update screener query parameters', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        result.current.updateScreenerQuery({
          sortBy: 'volume',
          sortOrder: 'asc',
          limit: 25
        });
        
        expect(result.current.screenerQuery.sortBy).toBe('volume');
        expect(result.current.screenerQuery.sortOrder).toBe('asc');
        expect(result.current.screenerQuery.limit).toBe(25);
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should import symbols into new watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.importWatchlist(['AAPL', 'GOOGL', 'MSFT']);
        
        const watchlist = result.current.watchlists.find((w: any) => w.id === id);
        expect(watchlist?.items).toHaveLength(3);
        expect(watchlist?.name).toBe('Imported Watchlist');
      });
    });

    it('should export watchlist symbols', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const id = result.current.createWatchlist('Test Watchlist');
        result.current.addToWatchlist(id, 'AAPL');
        result.current.addToWatchlist(id, 'GOOGL');
        
        const symbols = result.current.exportWatchlist(id);
        expect(symbols).toEqual(['AAPL', 'GOOGL']);
      });
    });
  });
});

describe('Templates Store (G4)', () => {
  beforeEach(() => {
    // Reset store state
    useTemplatesStore.getState().templates = [];
    useTemplatesStore.getState().activeTemplate = null;
  });

  describe('Template Management', () => {
    it('should create a template with configuration', async () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      const mockConfig = {
        chartType: 'candlestick' as const,
        timeframe: '1D',
        theme: 'dark' as const,
        indicators: [],
        drawings: [],
        showVolume: true,
        showGrid: true,
        showCrosshair: true,
        showLegend: true,
        priceScaleMode: 'normal' as const,
        priceLines: [],
        timeScaleOptions: {
          rightOffset: 12,
          barSpacing: 6,
          minBarSpacing: 0.5
        },
        colors: {
          upColor: '#00ff00',
          downColor: '#ff0000',
          backgroundColor: '#000000',
          gridColor: '#333333',
          textColor: '#ffffff'
        }
      };

      await act(async () => {
        const id = await result.current.createTemplate('Test Template', mockConfig);
        
        expect(id).toBeTruthy();
        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].name).toBe('Test Template');
        expect(result.current.templates[0].config.chartType).toBe('candlestick');
        expect(result.current.activeTemplate?.id).toBe(id);
      });
    });

    it('should duplicate existing template', async () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      const mockConfig = {
        chartType: 'line' as const,
        timeframe: '4H',
        theme: 'light' as const,
        indicators: [],
        drawings: [],
        showVolume: false,
        showGrid: true,
        showCrosshair: true,
        showLegend: false,
        priceScaleMode: 'normal' as const,
        priceLines: [],
        timeScaleOptions: {
          rightOffset: 12,
          barSpacing: 6,
          minBarSpacing: 0.5
        },
        colors: {
          upColor: '#26a69a',
          downColor: '#ef5350',
          backgroundColor: '#ffffff',
          gridColor: '#e1e1e1',
          textColor: '#000000'
        }
      };

      await act(async () => {
        const originalId = await result.current.createTemplate('Original Template', mockConfig);
        const duplicateId = await result.current.duplicateTemplate(originalId, 'Duplicate Template');
        
        expect(result.current.templates).toHaveLength(2);
        
        const duplicate = result.current.templates.find((t: any) => t.id === duplicateId);
        expect(duplicate?.name).toBe('Duplicate Template');
        expect(duplicate?.config.chartType).toBe('line');
        expect(duplicate?.config.timeframe).toBe('4H');
      });
    });

    it('should apply template to chart', () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = vi.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });

      const mockTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        tags: ['test'],
        isPublic: false,
        usageCount: 0,
        config: {
          chartType: 'candlestick' as const,
          timeframe: '1D',
          theme: 'dark' as const,
          indicators: [],
          drawings: [],
          showVolume: true,
          showGrid: true,
          showCrosshair: true,
          showLegend: true,
          priceScaleMode: 'normal' as const,
          priceLines: [],
          timeScaleOptions: {
            rightOffset: 12,
            barSpacing: 6,
            minBarSpacing: 0.5
          },
          colors: {
            upColor: '#00ff00',
            downColor: '#ff0000',
            backgroundColor: '#000000',
            gridColor: '#333333',
            textColor: '#ffffff'
          }
        }
      };

      act(() => {
        result.current.templates.push(mockTemplate);
        result.current.applyTemplate('test-template', 'AAPL');
        
        expect(result.current.activeTemplate?.id).toBe('test-template');
        expect(result.current.templates[0].usageCount).toBe(1);
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'templateApplied',
            detail: { template: mockTemplate, symbol: 'AAPL' }
          })
        );
      });
    });
  });

  describe('Template Search and Filtering', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      // Add test templates
      const templates = [
        { name: 'Scalping Template', tags: ['scalping', 'short-term'] },
        { name: 'Swing Trading Template', tags: ['swing', 'medium-term'] },
        { name: 'Long Term Analysis', tags: ['long-term', 'investing'] }
      ];

      for (const template of templates) {
        await act(async () => {
          const id = await result.current.createTemplate(template.name, {
            chartType: 'candlestick' as const,
            timeframe: '1D',
            theme: 'dark' as const,
            indicators: [],
            drawings: [],
            showVolume: true,
            showGrid: true,
            showCrosshair: true,
            showLegend: true,
            priceScaleMode: 'normal' as const,
            priceLines: [],
            timeScaleOptions: { rightOffset: 12, barSpacing: 6, minBarSpacing: 0.5 },
            colors: {
              upColor: '#00ff00', downColor: '#ff0000', backgroundColor: '#000000',
              gridColor: '#333333', textColor: '#ffffff'
            }
          });
          
          // Update template with tags
          result.current.updateTemplate(id, { tags: template.tags });
        });
      }
    });

    it('should filter templates by search query', () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      act(() => {
        result.current.setSearchQuery('scalping');
      });
      
      expect(result.current.searchQuery).toBe('scalping');
      
      // Note: useFilteredTemplates would need to be tested in a component context
      // or we need to test the filtering logic directly
    });

    it('should filter templates by tags', () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      act(() => {
        result.current.toggleTag('short-term');
        result.current.toggleTag('swing');
      });
      
      expect(result.current.selectedTags).toContain('short-term');
      expect(result.current.selectedTags).toContain('swing');
      
      // Toggle off
      act(() => {
        result.current.toggleTag('short-term');
      });
      
      expect(result.current.selectedTags).not.toContain('short-term');
      expect(result.current.selectedTags).toContain('swing');
    });

    it('should update sort options', () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      act(() => {
        result.current.setSortOptions('usage', 'asc');
      });
      
      expect(result.current.sortBy).toBe('usage');
      expect(result.current.sortOrder).toBe('asc');
    });
  });

  describe('Import/Export Functionality', () => {
    it('should export template data', async () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      const mockConfig = {
        chartType: 'candlestick' as const,
        timeframe: '1H',
        theme: 'dark' as const,
        indicators: [],
        drawings: [],
        showVolume: true,
        showGrid: true,
        showCrosshair: true,
        showLegend: true,
        priceScaleMode: 'normal' as const,
        priceLines: [],
        timeScaleOptions: { rightOffset: 12, barSpacing: 6, minBarSpacing: 0.5 },
        colors: {
          upColor: '#00ff00', downColor: '#ff0000', backgroundColor: '#000000',
          gridColor: '#333333', textColor: '#ffffff'
        }
      };

      await act(async () => {
        const id = await result.current.createTemplate('Export Test', mockConfig);
        const exported = result.current.exportTemplate(id);
        
        expect(exported.name).toBe('Export Test');
        expect(exported.config.chartType).toBe('candlestick');
        expect(exported.createdBy).toBe('exported');
        expect(exported.usageCount).toBe(0);
      });
    });

    it('should import template data', async () => {
      const { result } = renderHook(() => useTemplatesStore());
      
      const templateData = {
        name: 'Imported Template',
        config: {
          chartType: 'line' as const,
          timeframe: '15m',
          theme: 'light' as const,
          indicators: [],
          drawings: [],
          showVolume: false,
          showGrid: true,
          showCrosshair: true,
          showLegend: true,
          priceScaleMode: 'normal' as const,
          priceLines: [],
          timeScaleOptions: { rightOffset: 12, barSpacing: 6, minBarSpacing: 0.5 },
          colors: {
            upColor: '#26a69a', downColor: '#ef5350', backgroundColor: '#ffffff',
            gridColor: '#e1e1e1', textColor: '#000000'
          }
        }
      };

      await act(async () => {
        const id = await result.current.importTemplate(templateData);
        
        expect(id).toBeTruthy();
        const imported = result.current.templates.find((t: any) => t.id === id);
        expect(imported?.name).toBe('Imported Template');
        expect(imported?.config.chartType).toBe('line');
      });
    });
  });
});

describe('Feature Flag Integration', () => {
  it('should respect feature flags for watchlist operations', () => {
    // Mock flags disabled
    vi.mocked(FLAGS).watchlist = false;
    
    const { result } = renderHook(() => useWatchlistStore());
    
    act(() => {
      const id = result.current.createWatchlist('Should Not Create');
      expect(id).toBe('');
      expect(result.current.watchlists).toHaveLength(0);
    });
    
    // Re-enable for cleanup
    vi.mocked(FLAGS).watchlist = true;
  });

  it('should respect feature flags for template operations', async () => {
    // Mock flags disabled
    vi.mocked(FLAGS).templates = false;
    
    const { result } = renderHook(() => useTemplatesStore());
    
    await act(async () => {
      const id = await result.current.createTemplate('Should Not Create', {} as any);
      expect(id).toBe('');
      expect(result.current.templates).toHaveLength(0);
    });
    
    // Re-enable for cleanup
    vi.mocked(FLAGS).templates = true;
  });
});
