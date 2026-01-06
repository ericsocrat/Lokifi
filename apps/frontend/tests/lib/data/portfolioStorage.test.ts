import {
  addAssets,
  addSection,
  deleteAsset,
  loadPortfolio,
  savePortfolio,
  totalValue,
  type Asset,
  type PortfolioSection,
} from '@/lib/data/portfolioStorage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('portfolioStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadPortfolio', () => {
    it('should return empty array when no portfolio stored', () => {
      const result = loadPortfolio();
      expect(result).toEqual([]);
    });

    it('should return stored portfolio', () => {
      const mockPortfolio: PortfolioSection[] = [
        {
          title: 'Crypto',
          assets: [{ id: '1', symbol: 'BTC', name: 'Bitcoin', shares: 1, value: 50000, change: 5 }],
        },
      ];
      localStorageMock.setItem('portfolio', JSON.stringify(mockPortfolio));

      const result = loadPortfolio();
      expect(result).toEqual(mockPortfolio);
    });

    it('should handle parse errors gracefully', () => {
      localStorageMock.setItem('portfolio', 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = loadPortfolio();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('savePortfolio', () => {
    it('should save portfolio to localStorage', () => {
      const portfolio: PortfolioSection[] = [
        {
          title: 'Stocks',
          assets: [{ id: '1', symbol: 'AAPL', name: 'Apple', shares: 10, value: 1500, change: 2 }],
        },
      ];

      savePortfolio(portfolio);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('portfolio', JSON.stringify(portfolio));
    });

    it('should overwrite existing portfolio', () => {
      const portfolio1: PortfolioSection[] = [{ title: 'Section1', assets: [] }];
      const portfolio2: PortfolioSection[] = [{ title: 'Section2', assets: [] }];

      savePortfolio(portfolio1);
      savePortfolio(portfolio2);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored).toEqual(portfolio2);
    });
  });

  describe('addAssets', () => {
    it('should add assets to existing section', () => {
      const initialPortfolio: PortfolioSection[] = [{ title: 'Crypto', assets: [] }];
      localStorageMock.setItem('portfolio', JSON.stringify(initialPortfolio));

      const newAsset: Asset = {
        id: '1',
        symbol: 'BTC',
        name: 'Bitcoin',
        shares: 1,
        value: 50000,
        change: 5,
      };

      addAssets('Crypto', [newAsset]);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored[0].assets).toContainEqual(newAsset);
    });

    it('should create new section if not exists', () => {
      localStorageMock.setItem('portfolio', JSON.stringify([]));

      const newAsset: Asset = {
        id: '1',
        symbol: 'ETH',
        name: 'Ethereum',
        shares: 5,
        value: 10000,
        change: -2,
      };

      addAssets('Altcoins', [newAsset]);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('Altcoins');
      expect(stored[0].assets).toContainEqual(newAsset);
    });

    it('should add multiple assets at once', () => {
      const initialPortfolio: PortfolioSection[] = [{ title: 'Stocks', assets: [] }];
      localStorageMock.setItem('portfolio', JSON.stringify(initialPortfolio));

      const newAssets: Asset[] = [
        { id: '1', symbol: 'AAPL', name: 'Apple', shares: 10, value: 1500, change: 2 },
        { id: '2', symbol: 'GOOGL', name: 'Google', shares: 5, value: 7500, change: 1 },
      ];

      addAssets('Stocks', newAssets);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored[0].assets).toHaveLength(2);
    });
  });

  describe('addSection', () => {
    it('should add a new section', () => {
      localStorageMock.setItem('portfolio', JSON.stringify([]));

      const newSection: PortfolioSection = {
        title: 'Real Estate',
        assets: [
          { id: '1', symbol: 'HOME', name: 'Primary Home', shares: 1, value: 500000, change: 3 },
        ],
      };

      addSection(newSection);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(newSection);
    });

    it('should append to existing sections', () => {
      const existing: PortfolioSection[] = [{ title: 'Section1', assets: [] }];
      localStorageMock.setItem('portfolio', JSON.stringify(existing));

      const newSection: PortfolioSection = { title: 'Section2', assets: [] };
      addSection(newSection);

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored).toHaveLength(2);
      expect(stored[1].title).toBe('Section2');
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset from section', () => {
      const portfolio: PortfolioSection[] = [
        {
          title: 'Crypto',
          assets: [
            { id: '1', symbol: 'BTC', name: 'Bitcoin', shares: 1, value: 50000, change: 5 },
            { id: '2', symbol: 'ETH', name: 'Ethereum', shares: 10, value: 20000, change: -2 },
          ],
        },
      ];
      localStorageMock.setItem('portfolio', JSON.stringify(portfolio));

      deleteAsset('Crypto', '1');

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored[0].assets).toHaveLength(1);
      expect(stored[0].assets[0].symbol).toBe('ETH');
    });

    it('should do nothing if section not found', () => {
      const portfolio: PortfolioSection[] = [{ title: 'Crypto', assets: [] }];
      localStorageMock.setItem('portfolio', JSON.stringify(portfolio));

      deleteAsset('Stocks', '1');

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored).toEqual(portfolio);
    });

    it('should do nothing if asset not found', () => {
      const portfolio: PortfolioSection[] = [
        {
          title: 'Crypto',
          assets: [{ id: '1', symbol: 'BTC', name: 'Bitcoin', shares: 1, value: 50000, change: 5 }],
        },
      ];
      localStorageMock.setItem('portfolio', JSON.stringify(portfolio));

      deleteAsset('Crypto', 'nonexistent');

      const stored = JSON.parse(localStorageMock.getItem('portfolio') || '[]');
      expect(stored[0].assets).toHaveLength(1);
    });
  });

  describe('totalValue', () => {
    it('should return 0 for empty portfolio', () => {
      localStorageMock.setItem('portfolio', JSON.stringify([]));
      expect(totalValue()).toBe(0);
    });

    it('should calculate total value across all sections', () => {
      const portfolio: PortfolioSection[] = [
        {
          title: 'Crypto',
          assets: [
            { id: '1', symbol: 'BTC', name: 'Bitcoin', shares: 1, value: 50000, change: 5 },
            { id: '2', symbol: 'ETH', name: 'Ethereum', shares: 10, value: 20000, change: -2 },
          ],
        },
        {
          title: 'Stocks',
          assets: [{ id: '3', symbol: 'AAPL', name: 'Apple', shares: 10, value: 1500, change: 2 }],
        },
      ];
      localStorageMock.setItem('portfolio', JSON.stringify(portfolio));

      expect(totalValue()).toBe(71500);
    });

    it('should handle empty sections', () => {
      const portfolio: PortfolioSection[] = [
        { title: 'Empty Section', assets: [] },
        {
          title: 'Crypto',
          assets: [{ id: '1', symbol: 'BTC', name: 'Bitcoin', shares: 1, value: 50000, change: 5 }],
        },
      ];
      localStorageMock.setItem('portfolio', JSON.stringify(portfolio));

      expect(totalValue()).toBe(50000);
    });
  });

  describe('types', () => {
    it('Asset type should have required properties', () => {
      const asset: Asset = {
        id: 'test-id',
        symbol: 'TEST',
        name: 'Test Asset',
        shares: 100,
        value: 5000,
        change: 10.5,
      };

      expect(asset.id).toBeDefined();
      expect(asset.symbol).toBeDefined();
      expect(asset.name).toBeDefined();
      expect(asset.shares).toBeDefined();
      expect(asset.value).toBeDefined();
      expect(asset.change).toBeDefined();
    });

    it('PortfolioSection type should have required properties', () => {
      const section: PortfolioSection = {
        title: 'Test Section',
        assets: [],
      };

      expect(section.title).toBeDefined();
      expect(section.assets).toBeDefined();
    });
  });
});
