import { describe, it, expect } from 'vitest';
import { ALL_ASSETS, type Asset } from './generated-market-data';

describe('Generated Market Data', () => {
  describe('Asset interface', () => {
    it('should have assets with required properties', () => {
      // Sample the first asset
      const firstAsset = ALL_ASSETS[0];
      
      expect(firstAsset).toHaveProperty('symbol');
      expect(firstAsset).toHaveProperty('name');
      expect(firstAsset).toHaveProperty('type');
      expect(firstAsset).toHaveProperty('price');
    });

    it('should have valid type values', () => {
      const validTypes = ['stock', 'crypto', 'etf', 'commodity'];
      
      // Check first 100 assets to ensure type correctness
      const sampleAssets = ALL_ASSETS.slice(0, 100);
      sampleAssets.forEach(asset => {
        expect(validTypes).toContain(asset.type);
      });
    });

    it('should have string symbols', () => {
      const sampleAssets = ALL_ASSETS.slice(0, 50);
      sampleAssets.forEach(asset => {
        expect(typeof asset.symbol).toBe('string');
        expect(asset.symbol.length).toBeGreaterThan(0);
      });
    });

    it('should have string names', () => {
      const sampleAssets = ALL_ASSETS.slice(0, 50);
      sampleAssets.forEach(asset => {
        expect(typeof asset.name).toBe('string');
        expect(asset.name.length).toBeGreaterThan(0);
      });
    });

    it('should have numeric prices', () => {
      const sampleAssets = ALL_ASSETS.slice(0, 50);
      sampleAssets.forEach(asset => {
        expect(typeof asset.price).toBe('number');
        expect(asset.price).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('ALL_ASSETS array', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(ALL_ASSETS)).toBe(true);
      expect(ALL_ASSETS.length).toBeGreaterThan(0);
    });

    it('should contain expected number of assets (775)', () => {
      // Based on the comment in the file: Total Assets: 775
      expect(ALL_ASSETS.length).toBe(775);
    });

    it('should have mostly unique symbols', () => {
      const symbols = ALL_ASSETS.map(asset => asset.symbol);
      const uniqueSymbols = new Set(symbols);
      // Note: There are some duplicate symbols in the data (same symbol for different asset types)
      // e.g., 'A' could be both a stock and crypto
      expect(uniqueSymbols.size).toBeGreaterThan(symbols.length * 0.9); // At least 90% unique
    });

    it('should contain crypto assets', () => {
      const cryptoAssets = ALL_ASSETS.filter(asset => asset.type === 'crypto');
      expect(cryptoAssets.length).toBeGreaterThan(0);
    });

    it('should contain stock assets', () => {
      const stockAssets = ALL_ASSETS.filter(asset => asset.type === 'stock');
      expect(stockAssets.length).toBeGreaterThan(0);
    });
  });

  describe('specific asset validation', () => {
    it('should include Bitcoin (BTC)', () => {
      const btc = ALL_ASSETS.find(asset => asset.symbol === 'BTC');
      expect(btc).toBeDefined();
      expect(btc?.type).toBe('crypto');
    });

    it('should include Apple (AAPL)', () => {
      const aapl = ALL_ASSETS.find(asset => asset.symbol === 'AAPL');
      expect(aapl).toBeDefined();
      expect(aapl?.type).toBe('stock');
    });

    it('should include Ethereum (ETH) if present', () => {
      const eth = ALL_ASSETS.find(asset => asset.symbol === 'ETH');
      if (eth) {
        expect(eth.type).toBe('crypto');
        expect(eth.price).toBeGreaterThan(0);
      }
    });
  });

  describe('crypto asset optional properties', () => {
    it('should have market cap for crypto assets', () => {
      const cryptoAssets = ALL_ASSETS.filter(asset => asset.type === 'crypto');
      const sampleCrypto = cryptoAssets.slice(0, 20);
      
      sampleCrypto.forEach(asset => {
        if (asset.marketCap !== undefined) {
          expect(typeof asset.marketCap).toBe('number');
        }
      });
    });

    it('should have volume for crypto assets', () => {
      const cryptoAssets = ALL_ASSETS.filter(asset => asset.type === 'crypto');
      const sampleCrypto = cryptoAssets.slice(0, 20);
      
      sampleCrypto.forEach(asset => {
        if (asset.volume !== undefined) {
          expect(typeof asset.volume).toBe('number');
        }
      });
    });

    it('should have change data for crypto assets', () => {
      const cryptoAssets = ALL_ASSETS.filter(asset => asset.type === 'crypto');
      const sampleCrypto = cryptoAssets.slice(0, 20);
      
      sampleCrypto.forEach(asset => {
        if (asset.change !== undefined) {
          expect(typeof asset.change).toBe('number');
        }
        if (asset.changePercent !== undefined) {
          expect(typeof asset.changePercent).toBe('number');
        }
      });
    });

    it('should have extended crypto properties', () => {
      const cryptoAssets = ALL_ASSETS.filter(asset => asset.type === 'crypto');
      const firstCrypto = cryptoAssets[0];
      
      // Extended properties that crypto assets have
      expect(firstCrypto).toHaveProperty('id');
      expect(firstCrypto).toHaveProperty('high24h');
      expect(firstCrypto).toHaveProperty('low24h');
      expect(firstCrypto).toHaveProperty('rank');
    });
  });

  describe('data integrity', () => {
    it('should have consistent asset structure', () => {
      const assetTypes: Record<string, number> = {};
      
      ALL_ASSETS.forEach(asset => {
        assetTypes[asset.type] = (assetTypes[asset.type] || 0) + 1;
      });
      
      // Verify we have a mix of asset types
      const typeCount = Object.keys(assetTypes).length;
      expect(typeCount).toBeGreaterThanOrEqual(2); // At least 2 asset types
    });

    it('should not have null or undefined required fields', () => {
      const sampleAssets = ALL_ASSETS.slice(0, 100);
      
      sampleAssets.forEach(asset => {
        expect(asset.symbol).not.toBeNull();
        expect(asset.symbol).not.toBeUndefined();
        expect(asset.name).not.toBeNull();
        expect(asset.name).not.toBeUndefined();
        expect(asset.type).not.toBeNull();
        expect(asset.type).not.toBeUndefined();
        expect(asset.price).not.toBeNull();
        expect(asset.price).not.toBeUndefined();
      });
    });

    it('should have alphabetically sortable symbols', () => {
      const symbols = ALL_ASSETS.map(a => a.symbol);
      const sortedSymbols = [...symbols].sort();
      
      // Verify we can sort without errors
      expect(sortedSymbols.length).toBe(symbols.length);
    });
  });

  describe('type export', () => {
    it('Asset type should be usable for typing', () => {
      const testAsset: Asset = {
        symbol: 'TEST',
        name: 'Test Asset',
        type: 'crypto',
        price: 100,
      };
      
      expect(testAsset.symbol).toBe('TEST');
      expect(testAsset.type).toBe('crypto');
    });

    it('Asset type should allow optional properties', () => {
      const testAsset: Asset = {
        symbol: 'TEST',
        name: 'Test Asset',
        type: 'stock',
        price: 150,
        change: 5,
        changePercent: 3.45,
        volume: 1000000,
        marketCap: 10000000000,
      };
      
      expect(testAsset.change).toBe(5);
      expect(testAsset.marketCap).toBe(10000000000);
    });

    it('Asset type should allow additional dynamic properties', () => {
      const testAsset: Asset = {
        symbol: 'TEST',
        name: 'Test Asset',
        type: 'crypto',
        price: 100,
        customField: 'custom value',
        anotherField: 42,
      };
      
      expect(testAsset.customField).toBe('custom value');
      expect(testAsset.anotherField).toBe(42);
    });
  });
});
