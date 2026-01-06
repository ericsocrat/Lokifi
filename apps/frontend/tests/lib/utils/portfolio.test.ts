/**
 * Tests for portfolio utility - API client for portfolio operations
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPosition,
  deletePosition,
  getPortfolioSummary,
  importCsvText,
  listPortfolio,
  type Position,
  type PortfolioSummary,
} from '@/lib/utils/portfolio';

// Mock apiFetch
vi.mock('@/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/api/apiFetch';

const mockPosition: Position = {
  id: 1,
  symbol: 'BTC',
  qty: 0.5,
  cost_basis: 30000,
  tags: ['crypto', 'long-term'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  current_price: 45000,
  market_value: 22500,
  cost_value: 15000,
  unrealized_pl: 7500,
  pl_pct: 50,
};

const mockSummary: PortfolioSummary = {
  handle: 'testuser',
  total_cost: 50000,
  total_value: 75000,
  total_pl: 25000,
  total_pl_pct: 50,
  by_symbol: {
    BTC: {
      qty: 0.5,
      cost_basis: 30000,
      cost_value: 15000,
      current_price: 45000,
      market_value: 22500,
      unrealized_pl: 7500,
      pl_pct: 50,
    },
    ETH: {
      qty: 10,
      cost_basis: 2000,
      cost_value: 20000,
      current_price: 3500,
      market_value: 35000,
      unrealized_pl: 15000,
      pl_pct: 75,
    },
  },
};

describe('portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('listPortfolio', () => {
    it('should fetch all portfolio positions', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => [mockPosition],
      } as Response);
      
      const positions = await listPortfolio();
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio', { method: 'GET' });
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('BTC');
    });
    
    it('should return empty array when no positions', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => [],
      } as Response);
      
      const positions = await listPortfolio();
      
      expect(positions).toEqual([]);
    });
  });
  
  describe('addPosition', () => {
    it('should add a new position', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockPosition,
      } as Response);
      
      const position = await addPosition({
        symbol: 'BTC',
        qty: 0.5,
        cost_basis: 30000,
      });
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/position', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'BTC',
          qty: 0.5,
          cost_basis: 30000,
          tags: [],
        }),
      });
      expect(position.id).toBe(1);
    });
    
    it('should add position with tags', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockPosition,
      } as Response);
      
      await addPosition({
        symbol: 'ETH',
        qty: 5,
        cost_basis: 2500,
        tags: ['defi', 'staking'],
      });
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/position', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'ETH',
          qty: 5,
          cost_basis: 2500,
          tags: ['defi', 'staking'],
        }),
      });
    });
    
    it('should add position with create_alerts flag', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockPosition,
      } as Response);
      
      await addPosition({
        symbol: 'SOL',
        qty: 10,
        cost_basis: 100,
        create_alerts: true,
      });
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/position?create_alerts=true', {
        method: 'POST',
        body: JSON.stringify({
          symbol: 'SOL',
          qty: 10,
          cost_basis: 100,
          tags: [],
        }),
      });
    });
  });
  
  describe('deletePosition', () => {
    it('should delete a position by ID', async () => {
      vi.mocked(apiFetch).mockResolvedValue({} as Response);
      
      await deletePosition(123);
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/123', { method: 'DELETE' });
    });
    
    it('should call apiFetch with correct path for different IDs', async () => {
      vi.mocked(apiFetch).mockResolvedValue({} as Response);
      
      await deletePosition(456);
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/456', { method: 'DELETE' });
    });
  });
  
  describe('importCsvText', () => {
    it('should import CSV text', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => ({ ok: true, added: 5 }),
      } as Response);
      
      const result = await importCsvText('symbol,qty,cost_basis\nBTC,0.5,30000');
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/import_text', {
        method: 'POST',
        body: JSON.stringify({ csv_text: 'symbol,qty,cost_basis\nBTC,0.5,30000' }),
      });
      expect(result.ok).toBe(true);
      expect(result.added).toBe(5);
    });
    
    it('should import CSV with create_alerts flag', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => ({ ok: true, added: 3 }),
      } as Response);
      
      await importCsvText('symbol,qty\nETH,10', true);
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/import_text?create_alerts=true', {
        method: 'POST',
        body: JSON.stringify({ csv_text: 'symbol,qty\nETH,10' }),
      });
    });
    
    it('should return import result', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => ({ ok: false, added: 0 }),
      } as Response);
      
      const result = await importCsvText('invalid');
      
      expect(result.ok).toBe(false);
      expect(result.added).toBe(0);
    });
  });
  
  describe('getPortfolioSummary', () => {
    it('should fetch portfolio summary', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockSummary,
      } as Response);
      
      const summary = await getPortfolioSummary();
      
      expect(apiFetch).toHaveBeenCalledWith('/portfolio/summary', { method: 'GET' });
      expect(summary.handle).toBe('testuser');
      expect(summary.total_cost).toBe(50000);
      expect(summary.total_value).toBe(75000);
    });
    
    it('should return by_symbol breakdown', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockSummary,
      } as Response);
      
      const summary = await getPortfolioSummary();
      
      expect(summary.by_symbol).toBeDefined();
      expect(summary.by_symbol.BTC).toBeDefined();
      expect(summary.by_symbol.BTC.qty).toBe(0.5);
      expect(summary.by_symbol.ETH.pl_pct).toBe(75);
    });
    
    it('should include profit/loss metrics', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        json: async () => mockSummary,
      } as Response);
      
      const summary = await getPortfolioSummary();
      
      expect(summary.total_pl).toBe(25000);
      expect(summary.total_pl_pct).toBe(50);
    });
  });
});
