import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getTotalNetWorth,
  getStats,
  getAllocationByCategory,
  getAllocationByAssetType,
  getTopHoldings,
  getNetWorthTrend,
  getNetWorthChange,
  hasAssets,
  getAssetCount,
  type DashboardStats,
  type AllocationItem,
  type NetWorthTrend,
  type TopHolding,
} from '@/lib/data/dashboardData';
import * as portfolioStorage from '@/lib/data/portfolioStorage';

// Mock portfolioStorage module
vi.mock('@/lib/data/portfolioStorage', () => ({
  loadPortfolio: vi.fn(),
  totalValue: vi.fn(),
}));

describe('dashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTotalNetWorth', () => {
    it('returns total net worth from totalValue', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(150000);

      const netWorth = getTotalNetWorth();

      expect(netWorth).toBe(150000);
      expect(portfolioStorage.totalValue).toHaveBeenCalledOnce();
    });

    it('returns 0 when portfolio is empty', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(0);

      const netWorth = getTotalNetWorth();

      expect(netWorth).toBe(0);
    });

    it('handles negative values (debts)', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(-5000);

      const netWorth = getTotalNetWorth();

      expect(netWorth).toBe(-5000);
    });
  });

  describe('getStats', () => {
    it('calculates stats for portfolio with investments', () => {
      const mockPortfolio = [
        {
          title: 'Investments',
          assets: [
            { name: 'AAPL', symbol: 'AAPL', value: 50000 },
            { name: 'GOOGL', symbol: 'GOOGL', value: 30000 },
          ],
        },
        {
          title: 'Cash & Checking',
          assets: [{ name: 'Bank Account', value: 10000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats).toEqual({
        netWorth: 90000,
        investableAssets: 80000,
        totalAssets: 90000,
        debts: 0,
        cashOnHand: 10000,
        illiquid: 0,
      });
    });

    it('categorizes stocks correctly', () => {
      const mockPortfolio = [
        {
          title: 'Stock Portfolio',
          assets: [{ name: 'TSLA', value: 25000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.investableAssets).toBe(25000);
      expect(stats.cashOnHand).toBe(0);
    });

    it('categorizes crypto correctly', () => {
      const mockPortfolio = [
        {
          title: 'Crypto Holdings',
          assets: [{ name: 'BTC', value: 40000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.investableAssets).toBe(40000);
    });

    it('categorizes cash correctly', () => {
      const mockPortfolio = [
        {
          title: 'Savings Account',
          assets: [{ name: 'Emergency Fund', value: 15000 }],
        },
        {
          title: 'Checking Account',
          assets: [{ name: 'Daily Expenses', value: 5000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.cashOnHand).toBe(20000);
    });

    it('categorizes real estate as illiquid', () => {
      const mockPortfolio = [
        {
          title: 'Real Estate',
          assets: [{ name: 'Home', value: 500000 }],
        },
        {
          title: 'Property Holdings',
          assets: [{ name: 'Rental', value: 300000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.illiquid).toBe(800000);
    });

    it('categorizes debts correctly', () => {
      const mockPortfolio = [
        {
          title: 'Debts',
          assets: [{ name: 'Student Loan', value: 20000 }],
        },
        {
          title: 'Mortgage',
          assets: [{ name: 'Home Loan', value: 300000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.debts).toBe(320000);
    });

    it('calculates net worth correctly with debts', () => {
      const mockPortfolio = [
        {
          title: 'Investments',
          assets: [{ name: 'Stock', value: 100000 }],
        },
        {
          title: 'Debts',
          assets: [{ name: 'Loan', value: 30000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.netWorth).toBe(70000); // 100000 - 30000
      expect(stats.totalAssets).toBe(100000);
      expect(stats.debts).toBe(30000);
    });

    it('handles empty portfolio', () => {
      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue([]);

      const stats = getStats();

      expect(stats).toEqual({
        netWorth: 0,
        investableAssets: 0,
        totalAssets: 0,
        debts: 0,
        cashOnHand: 0,
        illiquid: 0,
      });
    });

    it('defaults unknown categories to investable assets', () => {
      const mockPortfolio = [
        {
          title: 'Other Assets',
          assets: [{ name: 'Something', value: 10000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      const stats = getStats();

      expect(stats.investableAssets).toBe(10000);
    });
  });

  describe('getAllocationByCategory', () => {
    it('returns allocation breakdown by sections', () => {
      const mockPortfolio = [
        {
          title: 'Stocks',
          assets: [
            { name: 'AAPL', value: 60000 },
            { name: 'GOOGL', value: 40000 },
          ],
        },
        {
          title: 'Crypto',
          assets: [{ name: 'BTC', value: 50000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(150000);

      const allocation = getAllocationByCategory();

      expect(allocation).toHaveLength(2);
      expect(allocation[0]).toMatchObject({
        name: 'Stocks',
        value: 100000,
        percentage: (100000 / 150000) * 100,
      });
      expect(allocation[0].color).toBeDefined();
      expect(allocation[1]).toMatchObject({
        name: 'Crypto',
        value: 50000,
      });
    });

    it('sorts allocations by value descending', () => {
      const mockPortfolio = [
        {
          title: 'Small',
          assets: [{ name: 'A', value: 1000 }],
        },
        {
          title: 'Large',
          assets: [{ name: 'B', value: 10000 }],
        },
        {
          title: 'Medium',
          assets: [{ name: 'C', value: 5000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(16000);

      const allocation = getAllocationByCategory();

      expect(allocation[0].name).toBe('Large');
      expect(allocation[1].name).toBe('Medium');
      expect(allocation[2].name).toBe('Small');
    });

    it('assigns different colors to categories', () => {
      const mockPortfolio = [
        { title: 'A', assets: [{ value: 100 }] },
        { title: 'B', assets: [{ value: 200 }] },
        { title: 'C', assets: [{ value: 300 }] },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(600);

      const allocation = getAllocationByCategory();

      const colors = allocation.map((a) => a.color);
      expect(new Set(colors).size).toBe(3); // All different colors
    });

    it('handles zero total value', () => {
      const mockPortfolio = [
        { title: 'Empty', assets: [] },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(0);

      const allocation = getAllocationByCategory();

      expect(allocation[0].percentage).toBe(0);
    });

    it('cycles through colors for many categories', () => {
      const mockPortfolio = Array.from({ length: 10 }, (_, i) => ({
        title: `Category ${i}`,
        assets: [{ value: 1000 }],
      }));

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(10000);

      const allocation = getAllocationByCategory();

      expect(allocation).toHaveLength(10);
      allocation.forEach((item) => {
        expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('getAllocationByAssetType', () => {
    it('groups assets by symbol/name', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio 1',
          assets: [
            { symbol: 'AAPL', name: 'Apple', value: 30000 },
            { symbol: 'GOOGL', name: 'Google', value: 20000 },
          ],
        },
        {
          title: 'Portfolio 2',
          assets: [
            { symbol: 'AAPL', name: 'Apple', value: 20000 }, // Same symbol
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(70000);

      const allocation = getAllocationByAssetType();

      const appleAllocation = allocation.find((a) => a.name === 'AAPL');
      expect(appleAllocation?.value).toBe(50000); // Combined
    });

    it('uses name when symbol not available', () => {
      const mockPortfolio = [
        {
          title: 'Assets',
          assets: [
            { name: 'Real Estate', value: 500000 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(500000);

      const allocation = getAllocationByAssetType();

      expect(allocation[0].name).toBe('Real Estate');
    });

    it('returns top 10 only', () => {
      const mockPortfolio = [
        {
          title: 'Many Assets',
          assets: Array.from({ length: 20 }, (_, i) => ({
            symbol: `ASSET${i}`,
            name: `Asset ${i}`,
            value: (20 - i) * 1000, // Descending values
          })),
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(210000);

      const allocation = getAllocationByAssetType();

      expect(allocation).toHaveLength(10);
      expect(allocation[0].name).toBe('ASSET0'); // Highest value
      expect(allocation[9].name).toBe('ASSET9');
    });

    it('sorts by value descending', () => {
      const mockPortfolio = [
        {
          title: 'Assets',
          assets: [
            { symbol: 'LOW', value: 1000 },
            { symbol: 'HIGH', value: 10000 },
            { symbol: 'MED', value: 5000 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(16000);

      const allocation = getAllocationByAssetType();

      expect(allocation[0].name).toBe('HIGH');
      expect(allocation[1].name).toBe('MED');
      expect(allocation[2].name).toBe('LOW');
    });

    it('calculates percentages correctly', () => {
      const mockPortfolio = [
        {
          title: 'Assets',
          assets: [
            { symbol: 'A', value: 25000 },
            { symbol: 'B', value: 75000 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const allocation = getAllocationByAssetType();

      expect(allocation[0].percentage).toBe(75); // 75000/100000
      expect(allocation[1].percentage).toBe(25); // 25000/100000
    });
  });

  describe('getTopHoldings', () => {
    it('returns top 5 holdings by default', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: Array.from({ length: 10 }, (_, i) => ({
            symbol: `ASSET${i}`,
            name: `Asset ${i}`,
            value: (10 - i) * 1000,
          })),
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(55000);

      const holdings = getTopHoldings();

      expect(holdings).toHaveLength(5);
    });

    it('returns custom limit of holdings', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: Array.from({ length: 10 }, (_, i) => ({
            symbol: `ASSET${i}`,
            name: `Asset ${i}`,
            value: 1000,
          })),
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(10000);

      const holdings = getTopHoldings(3);

      expect(holdings).toHaveLength(3);
    });

    it('returns holdings with correct structure', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: [
            { symbol: 'AAPL', name: 'Apple Inc.', value: 50000 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const holdings = getTopHoldings(1);

      expect(holdings[0]).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        value: 50000,
        percentage: 50,
      });
    });

    it('sorts holdings by value descending', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: [
            { symbol: 'LOW', name: 'Low', value: 1000 },
            { symbol: 'HIGH', name: 'High', value: 10000 },
            { symbol: 'MED', name: 'Med', value: 5000 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(16000);

      const holdings = getTopHoldings(3);

      expect(holdings[0].symbol).toBe('HIGH');
      expect(holdings[1].symbol).toBe('MED');
      expect(holdings[2].symbol).toBe('LOW');
    });

    it('handles zero total value', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: [{ symbol: 'TEST', name: 'Test', value: 0 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(0);

      const holdings = getTopHoldings();

      expect(holdings[0].percentage).toBe(0);
    });

    it('aggregates holdings across sections', () => {
      const mockPortfolio = [
        {
          title: 'Section 1',
          assets: [{ symbol: 'A', name: 'Asset A', value: 1000 }],
        },
        {
          title: 'Section 2',
          assets: [{ symbol: 'B', name: 'Asset B', value: 2000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(3000);

      const holdings = getTopHoldings(10);

      expect(holdings).toHaveLength(2);
    });
  });

  describe('getNetWorthTrend', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 30 days of trend data by default', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const trend = getNetWorthTrend();

      expect(trend).toHaveLength(30);
    });

    it('returns custom number of days', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const trend = getNetWorthTrend(7);

      expect(trend).toHaveLength(7);
    });

    it('returns trend with correct date format', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const trend = getNetWorthTrend(3);

      expect(trend[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(trend[0].date).toBe('2024-01-13'); // 2 days before Jan 15
    });

    it('last value equals current net worth', () => {
      const currentValue = 150000;
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(currentValue);

      const trend = getNetWorthTrend(5);

      expect(trend[trend.length - 1].value).toBe(currentValue);
    });

    it('values are within reasonable range', () => {
      const currentValue = 100000;
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(currentValue);

      const trend = getNetWorthTrend(30);

      trend.forEach((point, index) => {
        if (index < trend.length - 1) {
          // All except last (which is fixed)
          expect(point.value).toBeGreaterThan(currentValue * 0.95);
          expect(point.value).toBeLessThan(currentValue * 1.05);
        }
      });
    });

    it('returns dates in ascending order', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const trend = getNetWorthTrend(10);

      for (let i = 1; i < trend.length; i++) {
        const prevDate = new Date(trend[i - 1].date);
        const currDate = new Date(trend[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });
  });

  describe('getNetWorthChange', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    it('returns change for 1 day by default', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const change = getNetWorthChange();

      expect(change).toHaveProperty('value');
      expect(change).toHaveProperty('change');
      expect(change).toHaveProperty('changePercent');
      expect(change.value).toBe(100000);
    });

    it('returns change for 7 days', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const change = getNetWorthChange('7d');

      expect(change.value).toBe(100000);
      expect(change.change).toBeDefined();
      expect(change.changePercent).toBeDefined();
    });

    it('returns change for 30 days', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(150000);

      const change = getNetWorthChange('30d');

      expect(change.value).toBe(150000);
    });

    it('returns change for 1 year', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(200000);

      const change = getNetWorthChange('1y');

      expect(change.value).toBe(200000);
    });

    it('returns change for all time', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(250000);

      const change = getNetWorthChange('all');

      expect(change.value).toBe(250000);
    });

    it('rounds change to integer', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const change = getNetWorthChange('1d');

      expect(Number.isInteger(change.change)).toBe(true);
    });

    it('rounds changePercent to 2 decimals', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(100000);

      const change = getNetWorthChange('1d');

      const decimalPlaces = (change.changePercent.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it('handles zero previous value', () => {
      vi.mocked(portfolioStorage.totalValue).mockReturnValue(0);

      const change = getNetWorthChange('1d');

      expect(change.changePercent).toBe(0);
    });
  });

  describe('hasAssets', () => {
    it('returns true when assets exist', () => {
      const mockPortfolio = [
        {
          title: 'Portfolio',
          assets: [{ name: 'Asset', value: 1000 }],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(hasAssets()).toBe(true);
    });

    it('returns false when no assets exist', () => {
      const mockPortfolio = [
        {
          title: 'Empty',
          assets: [],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(hasAssets()).toBe(false);
    });

    it('returns false for empty portfolio', () => {
      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue([]);

      expect(hasAssets()).toBe(false);
    });

    it('returns true if any section has assets', () => {
      const mockPortfolio = [
        {
          title: 'Empty 1',
          assets: [],
        },
        {
          title: 'Has Assets',
          assets: [{ name: 'Something', value: 100 }],
        },
        {
          title: 'Empty 2',
          assets: [],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(hasAssets()).toBe(true);
    });
  });

  describe('getAssetCount', () => {
    it('returns total count of all assets', () => {
      const mockPortfolio = [
        {
          title: 'Section 1',
          assets: [
            { name: 'A', value: 100 },
            { name: 'B', value: 200 },
          ],
        },
        {
          title: 'Section 2',
          assets: [
            { name: 'C', value: 300 },
          ],
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(getAssetCount()).toBe(3);
    });

    it('returns 0 for empty portfolio', () => {
      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue([]);

      expect(getAssetCount()).toBe(0);
    });

    it('returns 0 when sections have no assets', () => {
      const mockPortfolio = [
        { title: 'Empty 1', assets: [] },
        { title: 'Empty 2', assets: [] },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(getAssetCount()).toBe(0);
    });

    it('counts assets across all sections', () => {
      const mockPortfolio = [
        {
          title: 'Section 1',
          assets: Array.from({ length: 5 }, (_, i) => ({
            name: `Asset ${i}`,
            value: 1000,
          })),
        },
        {
          title: 'Section 2',
          assets: Array.from({ length: 3 }, (_, i) => ({
            name: `Asset ${i}`,
            value: 2000,
          })),
        },
      ];

      vi.mocked(portfolioStorage.loadPortfolio).mockReturnValue(mockPortfolio);

      expect(getAssetCount()).toBe(8);
    });
  });
});
