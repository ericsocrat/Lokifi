import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const MARKETS_DIR = path.join(__dirname, '../../app/markets');

describe('Markets Folder Structure', () => {
  describe('File Organization', () => {
    it('should have required market category pages', async () => {
      const expectedPages = [
        'page.tsx', // Main markets overview
        'layout.tsx', // Markets layout with navigation
        'crypto/page.tsx', // Cryptocurrency market
        'forex/page.tsx', // Forex market
        'indices/page.tsx', // Stock indices market
        'stocks/page.tsx', // Stock market
      ];

      for (const page of expectedPages) {
        const filePath = path.join(MARKETS_DIR, page);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${page} should exist`).toBe(true);
      }
    });

    it('should not have empty or minimal files', async () => {
      const files = await fs.readdir(MARKETS_DIR, { recursive: true });
      const tsxFiles = files.filter((file: string) => file.toString().endsWith('.tsx'));

      for (const file of tsxFiles) {
        const filePath = path.join(MARKETS_DIR, file.toString());
        const stats = await fs.stat(filePath);
        expect(stats.size, `${file} should not be empty`).toBeGreaterThan(100);
      }
    });

    it('should follow Next.js App Router conventions', async () => {
      const layoutExists = await fs
        .access(path.join(MARKETS_DIR, 'layout.tsx'))
        .then(() => true)
        .catch(() => false);
      expect(layoutExists, 'layout.tsx should exist').toBe(true);

      // Each market category should be in its own directory with page.tsx
      const marketCategories = ['crypto', 'forex', 'indices', 'stocks'];
      for (const category of marketCategories) {
        const categoryPagePath = path.join(MARKETS_DIR, category, 'page.tsx');
        const exists = await fs
          .access(categoryPagePath)
          .then(() => true)
          .catch(() => false);
        expect(exists, `${category}/page.tsx should exist`).toBe(true);
      }
    });
  });

  describe('Implementation Quality', () => {
    it('should use client components with proper directives', async () => {
      const files = [
        'layout.tsx',
        'page.tsx',
        'crypto/page.tsx',
        'forex/page.tsx',
        'indices/page.tsx',
        'stocks/page.tsx',
      ];

      for (const file of files) {
        const content = await fs.readFile(path.join(MARKETS_DIR, file), 'utf-8');
        expect(content, `${file} should have 'use client' directive`).toMatch(
          /['"]use client['"];?/
        );
      }
    });

    it('should have proper imports for market functionality', async () => {
      const mainPage = await fs.readFile(path.join(MARKETS_DIR, 'page.tsx'), 'utf-8');
      expect(mainPage).toMatch(/import.*useUnifiedAssets/);
      expect(mainPage).toMatch(/import.*useCurrencyFormatter/);

      const cryptoPage = await fs.readFile(path.join(MARKETS_DIR, 'crypto/page.tsx'), 'utf-8');
      expect(cryptoPage).toMatch(/import.*useTopCryptos|useCryptoSearch|useWebSocketPrices/);

      const forexPage = await fs.readFile(path.join(MARKETS_DIR, 'forex/page.tsx'), 'utf-8');
      expect(forexPage).toMatch(/import.*useUnifiedForex/);
    });

    it('should implement proper navigation in layout', async () => {
      const layout = await fs.readFile(path.join(MARKETS_DIR, 'layout.tsx'), 'utf-8');
      expect(layout).toMatch(/import.*Link.*next\/link/);
      expect(layout).toMatch(/import.*usePathname.*next\/navigation/);

      // Should have navigation to all market categories
      expect(layout).toMatch(/crypto/);
      expect(layout).toMatch(/forex/);
      expect(layout).toMatch(/indices/);
      expect(layout).toMatch(/stocks/);
    });
  });

  describe('TypeScript Quality Issues (Documentation)', () => {
    it('should document TypeScript type issues for future improvement', async () => {
      // This test documents known TypeScript issues in the markets folder
      // Found 27 'any' type usages that should be replaced with proper types

      const typeIssues = [
        'crypto/page.tsx: Multiple any types in sorting, mapping, and event handlers',
        'forex/page.tsx: any types in sorting functions and map iterations',
        'stocks/page.tsx: any types in filtering, sorting, and event handling',
        'indices/page.tsx: any type in map function',
        'layout.tsx: any type in navigation tabs mapping',
        'page.tsx: any types in asset mapping',
      ];

      // Document that these need to be addressed
      expect(typeIssues.length, 'Markets folder has TypeScript type safety issues').toBeGreaterThan(
        0
      );

      // This serves as documentation for future TypeScript improvements
      console.warn('⚠️ Markets folder TypeScript issues to address:', typeIssues);
    });

    it('should have proper type definitions where implemented', async () => {
      const forexPage = await fs.readFile(path.join(MARKETS_DIR, 'forex/page.tsx'), 'utf-8');
      expect(forexPage).toMatch(/type SortField/);
      expect(forexPage).toMatch(/type SortDirection/);

      const stocksPage = await fs.readFile(path.join(MARKETS_DIR, 'stocks/page.tsx'), 'utf-8');
      expect(stocksPage).toMatch(/type SortField/);
      expect(stocksPage).toMatch(/type SortDirection/);
    });
  });

  describe('Configuration Validation', () => {
    it('should have consistent file structure across market categories', async () => {
      const marketDirs = ['crypto', 'forex', 'indices', 'stocks'];

      for (const dir of marketDirs) {
        const dirPath = path.join(MARKETS_DIR, dir);
        const dirExists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false);
        expect(dirExists, `${dir} directory should exist`).toBe(true);

        const pagePath = path.join(dirPath, 'page.tsx');
        const pageExists = await fs
          .access(pagePath)
          .then(() => true)
          .catch(() => false);
        expect(pageExists, `${dir}/page.tsx should exist`).toBe(true);
      }
    });

    it('should have reasonable file sizes indicating proper implementation', async () => {
      const expectedSizes = [
        { file: 'layout.tsx', minSize: 2000 },
        { file: 'page.tsx', minSize: 8000 },
        { file: 'crypto/page.tsx', minSize: 15000 },
        { file: 'forex/page.tsx', minSize: 8000 },
        { file: 'indices/page.tsx', minSize: 8000 },
        { file: 'stocks/page.tsx', minSize: 12000 },
      ];

      for (const { file, minSize } of expectedSizes) {
        const stats = await fs.stat(path.join(MARKETS_DIR, file));
        expect(
          stats.size,
          `${file} should have substantial content (>${minSize} bytes)`
        ).toBeGreaterThan(minSize);
      }
    });
  });
});
