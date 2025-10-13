import type { PortfolioSummary, Position } from '@/lib/utils/portfolio';

/**
 * Mock portfolio positions
 */
export const mockPositions: Position[] = [
  {
    id: 1,
    symbol: 'BTC',
    qty: 0.5,
    cost_basis: 40000,
    tags: ['hodl', 'long-term'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    symbol: 'ETH',
    qty: 5.0,
    cost_basis: 2000,
    tags: ['trading'],
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    symbol: 'SOL',
    qty: 50.0,
    cost_basis: 80,
    tags: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

/**
 * Mock portfolio summary
 */
export const mockPortfolioSummary: PortfolioSummary = {
  handle: 'testuser',
  total_value: 32500,
  total_cost: 30000,
  total_pl: 2500,
  total_pl_pct: 8.33,
  by_symbol: {
    BTC: {
      qty: 0.5,
      cost_basis: 40000,
      cost_value: 20000,
      current_price: 45000,
      market_value: 22500,
      unrealized_pl: 2500,
      pl_pct: 12.5,
    },
    ETH: {
      qty: 5.0,
      cost_basis: 2000,
      cost_value: 10000,
      current_price: 2500,
      market_value: 12500,
      unrealized_pl: 2500,
      pl_pct: 25.0,
    },
  },
};

/**
 * Mock empty portfolio
 */
export const mockEmptyPortfolio: Position[] = [];

/**
 * Mock portfolio CSV data
 */
export const mockPortfolioCSV = `symbol,qty,cost_basis,tags
BTC,0.5,40000,"hodl,long-term"
ETH,5.0,2000,trading
SOL,50.0,80,`;
