import { describe, it, expect, beforeEach } from 'vitest';
import { totalValue, addAssets, loadPortfolio } from '@/lib/portfolioStorage';

// Simple mock for preferences context consumption by hook (we'll directly test logic via Intl here)

describe('portfolioStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('migrates legacy portfolioAssets into v2 structure', () => {
    localStorage.setItem('portfolioAssets', JSON.stringify([
      { id:'old1', name:'Test Stock', symbol:'TST', type:'stock', shares:10, value:500 }
    ]));
    const data = loadPortfolio();
    expect(data.version).toBe(2);
    expect(data.sections.length).toBeGreaterThan(0);
    expect(data.sections[0].assets[0].symbol).toBe('TST');
  });
  it('adds assets and updates total value', () => {
    addAssets([{ name:'Gold', symbol:'XAU', type:'metal', shares:1, value:1234 }]);
    expect(totalValue()).toBeGreaterThan(0);
  });
});

// Currency formatting basic smoke test using Intl directly (since hook needs provider)
describe('currency formatting (Intl)', () => {
  it('formats EUR without fraction digits', () => {
    const formatted = new Intl.NumberFormat('en-US', { style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0 }).format(1234);
    expect(formatted).toMatch(/1,234/);
  });
});
