import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('App Folder Structure Validation', () => {
  const appDir = join(process.cwd(), 'app');

  describe('Next.js App Router Structure', () => {
    it('should have app directory', () => {
      expect(existsSync(appDir)).toBe(true);
    });

    it('should have root layout.tsx', () => {
      const layoutPath = join(appDir, 'layout.tsx');
      expect(existsSync(layoutPath)).toBe(true);
      expect(statSync(layoutPath).size).toBeGreaterThan(0);
    });

    it('should have root page.tsx', () => {
      const pagePath = join(appDir, 'page.tsx');
      expect(existsSync(pagePath)).toBe(true);
      expect(statSync(pagePath).size).toBeGreaterThan(0);
    });

    it('should NOT have _app.tsx (App Router conflict)', () => {
      const appPath = join(appDir, '_app.tsx');
      expect(existsSync(appPath)).toBe(false);
    });

    it('should NOT have _document.tsx (App Router handles this)', () => {
      const documentPath = join(appDir, '_document.tsx');
      expect(existsSync(documentPath)).toBe(false);
    });
  });

  describe('Route Structure Validation', () => {
    const routeDirectories = [
      'dashboard',
      'markets',
      'portfolio',
      'profile',
      'notifications',
      'login',
      'asset/[symbol]',
      'chart/[symbol]',
    ];

    routeDirectories.forEach((route) => {
      it(`should have valid ${route} route structure`, () => {
        const routePath = join(appDir, route);
        expect(existsSync(routePath)).toBe(true);

        const pagePath = join(routePath, 'page.tsx');
        expect(existsSync(pagePath)).toBe(true);
        expect(statSync(pagePath).size).toBeGreaterThan(0);
      });
    });
  });

  describe('No Empty or Development Files', () => {
    it('should not have any empty page.tsx files', () => {
      function findEmptyPages(dir: string): string[] {
        const emptyPages: string[] = [];
        const items = readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dir, item.name);

          if (item.isDirectory()) {
            emptyPages.push(...findEmptyPages(fullPath));
          } else if (item.name === 'page.tsx' && statSync(fullPath).size === 0) {
            emptyPages.push(fullPath);
          }
        }

        return emptyPages;
      }

      const emptyPages = findEmptyPages(appDir);
      expect(emptyPages).toHaveLength(0);
    });

    it('should not have development artifact files', () => {
      // Check for old dashboard file (should be removed)
      const oldDashboardFile = join(appDir, 'dashboard', 'assets', 'page-old.tsx');
      expect(existsSync(oldDashboardFile)).toBe(false);

      // Check that only the main page.tsx exists in asset/[symbol]
      const assetDir = join(appDir, 'asset', '[symbol]');
      if (existsSync(assetDir)) {
        const files = readdirSync(assetDir);
        const cleanFiles = files.filter((f) => f === 'page.tsx');
        expect(cleanFiles.length).toBe(1);
        expect(cleanFiles[0]).toBe('page.tsx');
      }
    });
  });

  describe('API Routes Structure', () => {
    it('should have valid api directory structure', () => {
      const apiDir = join(appDir, 'api');
      expect(existsSync(apiDir)).toBe(true);
    });

    it('should have health check route', () => {
      const healthRoute = join(appDir, 'api', 'health', 'route.ts');
      expect(existsSync(healthRoute)).toBe(true);
      expect(statSync(healthRoute).size).toBeGreaterThan(0);
    });
  });
});
