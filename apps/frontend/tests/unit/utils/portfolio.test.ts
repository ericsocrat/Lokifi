import * as apiFetchModule from '@/lib/api/apiFetch';
import {
  addPosition,
  deletePosition,
  getPortfolioSummary,
  importCsvText,
  listPortfolio,
  type PortfolioSummary,
  type Position,
} from '@/lib/utils/portfolio';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiFetch
vi.mock('@/lib/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

describe('Portfolio API', () => {
  const mockApiFetch = apiFetchModule.apiFetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPortfolio', () => {
    it('fetches portfolio positions successfully', async () => {
      const mockPositions: Position[] = [
        {
          id: 1,
          symbol: 'BTC',
          qty: 2.5,
          cost_basis: 30000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          current_price: 45000,
          market_value: 112500,
          cost_value: 75000,
          unrealized_pl: 37500,
          pl_pct: 50,
        },
        {
          id: 2,
          symbol: 'ETH',
          qty: 10,
          cost_basis: 2000,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          current_price: 2500,
          market_value: 25000,
          cost_value: 20000,
          unrealized_pl: 5000,
          pl_pct: 25,
        },
      ];

      mockApiFetch.mockResolvedValue({
        json: async () => mockPositions,
      } as Response);

      const result = await listPortfolio();

      expect(mockApiFetch).toHaveBeenCalledWith('/portfolio', { method: 'GET' });
      expect(result).toEqual(mockPositions);
      expect(result).toHaveLength(2);
      expect(result[0]?.symbol).toBe('BTC');
    });

    it('handles empty portfolio', async () => {
      mockApiFetch.mockResolvedValue({
        json: async () => [],
      } as Response);

      const result = await listPortfolio();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('handles API errors', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      await expect(listPortfolio()).rejects.toThrow('Network error');
    });
  });

  describe('addPosition', () => {
    it('adds a new position successfully', async () => {
      const mockPosition: Position = {
        id: 1,
        symbol: 'BTC',
        qty: 1.5,
        cost_basis: 40000,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockPosition,
      } as Response);

      const params = {
        symbol: 'BTC',
        qty: 1.5,
        cost_basis: 40000,
      };

      const result = await addPosition(params);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/portfolio/position',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            symbol: 'BTC',
            qty: 1.5,
            cost_basis: 40000,
            tags: [],
          }),
        })
      );
      expect(result).toEqual(mockPosition);
    });

    it('adds position with tags', async () => {
      const mockPosition: Position = {
        id: 1,
        symbol: 'ETH',
        qty: 5,
        cost_basis: 2500,
        tags: ['crypto', 'long-term'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockPosition,
      } as Response);

      const params = {
        symbol: 'ETH',
        qty: 5,
        cost_basis: 2500,
        tags: ['crypto', 'long-term'],
      };

      const result = await addPosition(params);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/portfolio/position',
        expect.objectContaining({
          body: JSON.stringify({
            symbol: 'ETH',
            qty: 5,
            cost_basis: 2500,
            tags: ['crypto', 'long-term'],
          }),
        })
      );
      expect(result.tags).toEqual(['crypto', 'long-term']);
    });

    it('adds position with create_alerts flag', async () => {
      const mockPosition: Position = {
        id: 1,
        symbol: 'SOL',
        qty: 100,
        cost_basis: 50,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockPosition,
      } as Response);

      const params = {
        symbol: 'SOL',
        qty: 100,
        cost_basis: 50,
        create_alerts: true,
      };

      await addPosition(params);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/portfolio/position?create_alerts=true',
        expect.any(Object)
      );
    });

    it('handles validation errors', async () => {
      mockApiFetch.mockRejectedValue(new Error('Invalid symbol'));

      await expect(addPosition({ symbol: 'INVALID', qty: 1, cost_basis: 100 })).rejects.toThrow(
        'Invalid symbol'
      );
    });
  });

  describe('deletePosition', () => {
    it('deletes a position successfully', async () => {
      mockApiFetch.mockResolvedValue({} as Response);

      await deletePosition(123);

      expect(mockApiFetch).toHaveBeenCalledWith('/portfolio/123', { method: 'DELETE' });
    });

    it('handles deletion errors', async () => {
      mockApiFetch.mockRejectedValue(new Error('Position not found'));

      await expect(deletePosition(999)).rejects.toThrow('Position not found');
    });

    it('handles network errors during deletion', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(deletePosition(1)).rejects.toThrow('Network timeout');
    });
  });

  describe('importCsvText', () => {
    it('imports CSV text successfully', async () => {
      const mockResponse = {
        ok: true,
        added: 3,
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const csvText = 'symbol,qty,cost_basis\nBTC,1,40000\nETH,5,2000\nSOL,100,50';
      const result = await importCsvText(csvText);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/portfolio/import_text',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ csv_text: csvText }),
        })
      );
      expect(result.ok).toBe(true);
      expect(result.added).toBe(3);
    });

    it('imports CSV with create_alerts flag', async () => {
      mockApiFetch.mockResolvedValue({
        json: async () => ({ ok: true, added: 1 }),
      } as Response);

      const csvText = 'symbol,qty,cost_basis\nBTC,1,40000';
      await importCsvText(csvText, true);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/portfolio/import_text?create_alerts=true',
        expect.any(Object)
      );
    });

    it('handles malformed CSV', async () => {
      mockApiFetch.mockRejectedValue(new Error('Invalid CSV format'));

      const malformedCsv = 'invalid,csv\ndata';
      await expect(importCsvText(malformedCsv)).rejects.toThrow('Invalid CSV format');
    });

    it('handles empty CSV', async () => {
      const mockResponse = {
        ok: true,
        added: 0,
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await importCsvText('');

      expect(result.added).toBe(0);
    });
  });

  describe('getPortfolioSummary', () => {
    it('fetches portfolio summary successfully', async () => {
      const mockSummary: PortfolioSummary = {
        handle: 'testuser',
        total_cost: 100000,
        total_value: 150000,
        total_pl: 50000,
        total_pl_pct: 50,
        by_symbol: {
          BTC: {
            qty: 2,
            cost_basis: 40000,
            cost_value: 80000,
            current_price: 45000,
            market_value: 90000,
            unrealized_pl: 10000,
            pl_pct: 12.5,
          },
          ETH: {
            qty: 10,
            cost_basis: 2000,
            cost_value: 20000,
            current_price: 3000,
            market_value: 30000,
            unrealized_pl: 10000,
            pl_pct: 50,
          },
        },
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockSummary,
      } as Response);

      const result = await getPortfolioSummary();

      expect(mockApiFetch).toHaveBeenCalledWith('/portfolio/summary', { method: 'GET' });
      expect(result).toEqual(mockSummary);
      expect(result.total_pl_pct).toBe(50);
      expect(result.by_symbol['BTC']?.pl_pct).toBe(12.5);
      expect(result.by_symbol['ETH']?.pl_pct).toBe(50);
    });

    it('handles portfolio with no positions', async () => {
      const mockSummary: PortfolioSummary = {
        handle: 'testuser',
        total_cost: 0,
        total_value: 0,
        total_pl: 0,
        total_pl_pct: 0,
        by_symbol: {},
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockSummary,
      } as Response);

      const result = await getPortfolioSummary();

      expect(result.total_cost).toBe(0);
      expect(result.by_symbol).toEqual({});
    });

    it('handles portfolio with null prices', async () => {
      const mockSummary: PortfolioSummary = {
        handle: 'testuser',
        total_cost: 50000,
        total_value: 50000,
        total_pl: 0,
        total_pl_pct: 0,
        by_symbol: {
          CUSTOM: {
            qty: 100,
            cost_basis: 500,
            cost_value: 50000,
            current_price: null,
            market_value: null,
            unrealized_pl: null,
            pl_pct: null,
          },
        },
      };

      mockApiFetch.mockResolvedValue({
        json: async () => mockSummary,
      } as Response);

      const result = await getPortfolioSummary();

      expect(result.by_symbol['CUSTOM']?.current_price).toBeNull();
      expect(result.by_symbol['CUSTOM']?.market_value).toBeNull();
    });

    it('handles API errors', async () => {
      mockApiFetch.mockRejectedValue(new Error('Unauthorized'));

      await expect(getPortfolioSummary()).rejects.toThrow('Unauthorized');
    });
  });
});

