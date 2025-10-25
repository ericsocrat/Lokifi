/**
 * Tests for sorting functionality
 */
import { describe, expect, it } from 'vitest';
import { sortGaps } from './utils';

describe('sortGaps', () => {
  const mockGaps = [
    {
      file: 'utils/b.ts',
      priority: 'MEDIUM',
      coverage: 45.5,
      metrics: { impact: 150, complexity: 8 },
    },
    {
      file: 'components/a.tsx',
      priority: 'HIGH',
      coverage: 30.2,
      metrics: { impact: 250, complexity: 12 },
    },
    {
      file: 'services/c.ts',
      priority: 'LOW',
      coverage: 75.8,
      metrics: { impact: 50, complexity: 3 },
    },
    {
      file: 'hooks/d.ts',
      priority: 'HIGH',
      coverage: 20.0,
      metrics: { impact: 300, complexity: 15 },
    },
  ];

  describe('Priority Sorting', () => {
    it('should sort by priority (HIGH > MEDIUM > LOW)', () => {
      const result = sortGaps(mockGaps, 'priority');

      expect(result[0].priority).toBe('HIGH');
      expect(result[1].priority).toBe('HIGH');
      expect(result[2].priority).toBe('MEDIUM');
      expect(result[3].priority).toBe('LOW');
    });

    it('should maintain relative order for same priority', () => {
      const result = sortGaps(mockGaps, 'priority');
      const highPriorityFiles = result.filter((g) => g.priority === 'HIGH').map((g) => g.file);

      expect(highPriorityFiles).toEqual(['components/a.tsx', 'hooks/d.ts']);
    });
  });

  describe('Impact Sorting', () => {
    it('should sort by impact descending', () => {
      const result = sortGaps(mockGaps, 'impact-desc');

      expect(result[0].metrics.impact).toBe(300);
      expect(result[1].metrics.impact).toBe(250);
      expect(result[2].metrics.impact).toBe(150);
      expect(result[3].metrics.impact).toBe(50);
    });

    it('should sort by impact ascending', () => {
      const result = sortGaps(mockGaps, 'impact-asc');

      expect(result[0].metrics.impact).toBe(50);
      expect(result[1].metrics.impact).toBe(150);
      expect(result[2].metrics.impact).toBe(250);
      expect(result[3].metrics.impact).toBe(300);
    });

    it('should handle missing impact metrics', () => {
      const gapsWithMissing = [
        ...mockGaps,
        { file: 'test.ts', priority: 'LOW', coverage: 50, metrics: {} },
      ];

      const result = sortGaps(gapsWithMissing, 'impact-desc');

      expect(result[result.length - 1].file).toBe('test.ts');
    });
  });

  describe('Complexity Sorting', () => {
    it('should sort by complexity descending', () => {
      const result = sortGaps(mockGaps, 'complexity-desc');

      expect(result[0].metrics.complexity).toBe(15);
      expect(result[3].metrics.complexity).toBe(3);
    });

    it('should sort by complexity ascending', () => {
      const result = sortGaps(mockGaps, 'complexity-asc');

      expect(result[0].metrics.complexity).toBe(3);
      expect(result[3].metrics.complexity).toBe(15);
    });
  });

  describe('Coverage Sorting', () => {
    it('should sort by coverage ascending', () => {
      const result = sortGaps(mockGaps, 'coverage-asc');

      expect(result[0].coverage).toBe(20.0);
      expect(result[1].coverage).toBe(30.2);
      expect(result[2].coverage).toBe(45.5);
      expect(result[3].coverage).toBe(75.8);
    });

    it('should sort by coverage descending', () => {
      const result = sortGaps(mockGaps, 'coverage-desc');

      expect(result[0].coverage).toBe(75.8);
      expect(result[3].coverage).toBe(20.0);
    });
  });

  describe('Filename Sorting', () => {
    it('should sort alphabetically by filename', () => {
      const result = sortGaps(mockGaps, 'filename');

      expect(result[0].file).toBe('components/a.tsx');
      expect(result[1].file).toBe('hooks/d.ts');
      expect(result[2].file).toBe('services/c.ts');
      expect(result[3].file).toBe('utils/b.ts');
    });

    it('should handle case-insensitive sorting', () => {
      const mixed = [
        { file: 'Zebra.ts', priority: 'LOW', coverage: 50 },
        { file: 'apple.ts', priority: 'LOW', coverage: 50 },
        { file: 'Banana.ts', priority: 'LOW', coverage: 50 },
      ];

      const result = sortGaps(mixed, 'filename');

      // localeCompare() is case-insensitive by default, so 'apple' < 'Banana' < 'Zebra'
      expect(result[0].file).toBe('apple.ts');
      expect(result[1].file).toBe('Banana.ts');
      expect(result[2].file).toBe('Zebra.ts');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = sortGaps([], 'priority');

      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const single = [mockGaps[0]];
      const result = sortGaps(single, 'coverage-desc');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockGaps[0]);
    });

    it('should not mutate original array', () => {
      const original = [...mockGaps];
      sortGaps(mockGaps, 'coverage-asc');

      expect(mockGaps).toEqual(original);
    });

    it('should handle unknown sort type gracefully', () => {
      const result = sortGaps(mockGaps, 'unknown-sort');

      // Should return array unchanged
      expect(result).toHaveLength(mockGaps.length);
    });
  });
});
