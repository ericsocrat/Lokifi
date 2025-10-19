/**
 * Tests for CSV and JSON export functionality
 */
import { describe, expect, it } from 'vitest';
import { generateCSV, generateJSON } from './utils';

describe('CSV Export', () => {
  const mockGaps = [
    {
      file: 'src/utils/helper.ts',
      priority: 'HIGH',
      coverage: 45.5,
      metrics: { impact: 250, complexity: 12 },
    },
    {
      file: 'components/Button.tsx',
      priority: 'MEDIUM',
      coverage: 75.2,
      metrics: { impact: 150, complexity: 6 },
    },
  ];

  describe('Basic CSV Generation', () => {
    it('should generate valid CSV with headers', () => {
      const csv = generateCSV(mockGaps);

      expect(csv).toContain('File,Coverage %,Priority,Uncovered Lines,Complexity,Impact');
      const lines = csv.split('\n').filter((line) => line.trim()); // Filter empty lines
      expect(lines.length).toBeGreaterThanOrEqual(4); // Timestamp + Header + 2 rows + footer
    });

    it('should format data rows correctly', () => {
      const csv = generateCSV(mockGaps);
      const lines = csv.split('\n');

      // Find the data rows (skip timestamp and header)
      const dataLines = lines.filter((line) => !line.startsWith('#') && line.includes(','));
      expect(dataLines[1]).toContain('src/utils/helper.ts,45.5,HIGH');
      expect(dataLines[2]).toContain('components/Button.tsx,75.2,MEDIUM');
    });

    it('should handle commas in filenames', () => {
      const gapsWithCommas = [
        {
          file: 'folder,with,commas/file.ts',
          priority: 'LOW',
          coverage: 50.0,
          metrics: { impact: 100, complexity: 5 },
        },
      ];

      const csv = generateCSV(gapsWithCommas);

      expect(csv).toContain('"folder,with,commas/file.ts"');
    });

    it('should format coverage with 2 decimal places', () => {
      const gaps = [
        {
          file: 'test.ts',
          priority: 'HIGH',
          coverage: 33.333333,
          metrics: { impact: 100, complexity: 5 },
        },
      ];

      const csv = generateCSV(gaps);

      expect(csv).toContain('test.ts,33.333333,HIGH'); // No % formatting, raw number
    });
  });

  describe('CSV Options', () => {
    it('should include metadata when requested', () => {
      const csv = generateCSV(mockGaps, { includeMetadata: true });

      expect(csv).toContain('# Average Coverage:');
    });

    it('should include timestamp when requested', () => {
      const csv = generateCSV(mockGaps, { includeTimestamp: true });

      expect(csv).toMatch(/# Generated:/);
      expect(csv).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format
    });

    it('should handle both metadata and timestamp', () => {
      const csv = generateCSV(mockGaps, {
        includeMetadata: true,
        includeTimestamp: true,
      });

      expect(csv).toContain('# Average Coverage:');
      expect(csv).toContain('# Generated:');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty gaps array', () => {
      const csv = generateCSV([]);

      expect(csv).toContain('File,Coverage %,Priority');
      expect(csv).toContain('# Total Gaps: 0');
    });

    it('should handle missing metrics', () => {
      const gapsWithMissing = [
        {
          file: 'test.ts',
          priority: 'LOW',
          coverage: 50.0,
          metrics: {},
        },
      ];

      const csv = generateCSV(gapsWithMissing);

      expect(csv).toContain('test.ts,50,LOW,0,0,0');
    });

    it('should handle zero coverage', () => {
      const gaps = [
        {
          file: 'uncovered.ts',
          priority: 'HIGH',
          coverage: 0,
          metrics: { impact: 200, complexity: 10 },
        },
      ];

      const csv = generateCSV(gaps);

      expect(csv).toContain('uncovered.ts,0,HIGH');
    });
  });
});

describe('JSON Export', () => {
  const mockGaps = [
    {
      file: 'src/utils/helper.ts',
      priority: 'HIGH',
      coverage: 45.5,
      metrics: { impact: 250, complexity: 12 },
    },
    {
      file: 'components/Button.tsx',
      priority: 'MEDIUM',
      coverage: 75.2,
      metrics: { impact: 150, complexity: 6 },
    },
  ];

  describe('Basic JSON Generation', () => {
    it('should generate valid JSON', () => {
      const result = generateJSON(mockGaps);

      expect(result).toHaveProperty('gaps');
      expect(Array.isArray(result.gaps)).toBe(true);
    });

    it('should include all gap data', () => {
      const result = generateJSON(mockGaps);

      expect(result.gaps).toHaveLength(2);
      expect(result.gaps[0].file).toBe('src/utils/helper.ts');
      expect(result.gaps[0].priority).toBe('HIGH');
      expect(result.gaps[0].coverage).toBe(45.5);
    });

    it('should preserve metrics object', () => {
      const result = generateJSON(mockGaps);

      expect(result.gaps[0].metrics).toEqual({
        impact: 250,
        complexity: 12,
      });
    });

    it('should format JSON with indentation', () => {
      const result = generateJSON(mockGaps);
      const json = JSON.stringify(result, null, 2);

      expect(json).toContain('  "gaps"');
      expect(json).toContain('    {');
    });
  });

  describe('JSON Metadata', () => {
    it('should include metadata when requested', () => {
      const result = generateJSON(mockGaps, { includeMetadata: true });

      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('totalFiles');
      expect(result.metadata).toHaveProperty('averageCoverage');
      expect(result.metadata).toHaveProperty('highPriorityCount');
    });

    it('should calculate statistics correctly', () => {
      const result = generateJSON(mockGaps, { includeMetadata: true });

      expect(result.metadata.totalFiles).toBe(2);
      expect(result.metadata.averageCoverage).toBe(60.35); // (45.5 + 75.2) / 2
      expect(result.metadata.highPriorityCount).toBe(1);
      expect(result.metadata.mediumPriorityCount).toBe(1);
      expect(result.metadata.lowPriorityCount).toBe(0);
    });

    it('should calculate total metrics', () => {
      const result = generateJSON(mockGaps, { includeMetadata: true });

      expect(result.metadata.totalImpact).toBe(400); // 250 + 150
      expect(result.metadata.totalComplexity).toBe(18); // 12 + 6
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty gaps array', () => {
      const result = generateJSON([]);

      expect(result.gaps).toEqual([]);
      expect(result.gaps).toHaveLength(0);
    });

    it('should handle empty gaps with metadata', () => {
      const result = generateJSON([], { includeMetadata: true });

      expect(result.metadata.totalFiles).toBe(0);
      expect(result.metadata.averageCoverage).toBe(0);
      expect(result.metadata.totalImpact).toBe(0);
    });

    it('should handle missing metrics gracefully', () => {
      const gapsWithMissing = [
        {
          file: 'test.ts',
          priority: 'LOW',
          coverage: 50.0,
          metrics: {},
        },
      ];

      const result = generateJSON(gapsWithMissing, { includeMetadata: true });

      expect(result.metadata.totalImpact).toBe(0);
      expect(result.metadata.totalComplexity).toBe(0);
    });

    it('should round average coverage to 2 decimals', () => {
      const gaps = [
        {
          file: 'a.ts',
          priority: 'LOW',
          coverage: 33.333,
          metrics: { impact: 100, complexity: 5 },
        },
        {
          file: 'b.ts',
          priority: 'LOW',
          coverage: 66.666,
          metrics: { impact: 100, complexity: 5 },
        },
      ];

      const result = generateJSON(gaps, { includeMetadata: true });

      expect(result.metadata.averageCoverage).toBe(50.0);
    });
  });

  describe('Round-trip Consistency', () => {
    it('should preserve data through parse/stringify cycle', () => {
      const result = generateJSON(mockGaps);
      const stringified = JSON.stringify(result);
      const reparsed = JSON.parse(stringified);

      expect(reparsed.gaps).toEqual(mockGaps);
    });
  });
});
