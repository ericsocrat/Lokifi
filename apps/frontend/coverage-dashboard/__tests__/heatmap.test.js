/**
 * Tests for heatmap color mapping
 */
import { describe, expect, it } from 'vitest';
import { getHeatmapColor } from './utils';

describe('getHeatmapColor', () => {
  describe('Color Ranges', () => {
    it('should return green-500 for 90%+ coverage', () => {
      expect(getHeatmapColor(90)).toBe('rgb(34, 197, 94)');
      expect(getHeatmapColor(95)).toBe('rgb(34, 197, 94)');
      expect(getHeatmapColor(100)).toBe('rgb(34, 197, 94)');
    });

    it('should return green-400 for 80-89% coverage', () => {
      expect(getHeatmapColor(80)).toBe('rgb(74, 222, 128)');
      expect(getHeatmapColor(85)).toBe('rgb(74, 222, 128)');
      expect(getHeatmapColor(89)).toBe('rgb(74, 222, 128)');
    });

    it('should return lime-500 for 70-79% coverage', () => {
      expect(getHeatmapColor(70)).toBe('rgb(132, 204, 22)');
      expect(getHeatmapColor(75)).toBe('rgb(132, 204, 22)');
      expect(getHeatmapColor(79)).toBe('rgb(132, 204, 22)');
    });

    it('should return yellow-500 for 60-69% coverage', () => {
      expect(getHeatmapColor(60)).toBe('rgb(234, 179, 8)');
      expect(getHeatmapColor(65)).toBe('rgb(234, 179, 8)');
      expect(getHeatmapColor(69)).toBe('rgb(234, 179, 8)');
    });

    it('should return orange-400 for 50-59% coverage', () => {
      expect(getHeatmapColor(50)).toBe('rgb(251, 146, 60)');
      expect(getHeatmapColor(55)).toBe('rgb(251, 146, 60)');
      expect(getHeatmapColor(59)).toBe('rgb(251, 146, 60)');
    });

    it('should return orange-500 for 40-49% coverage', () => {
      expect(getHeatmapColor(40)).toBe('rgb(249, 115, 22)');
      expect(getHeatmapColor(45)).toBe('rgb(249, 115, 22)');
      expect(getHeatmapColor(49)).toBe('rgb(249, 115, 22)');
    });

    it('should return red-500 for 30-39% coverage', () => {
      expect(getHeatmapColor(30)).toBe('rgb(239, 68, 68)');
      expect(getHeatmapColor(35)).toBe('rgb(239, 68, 68)');
      expect(getHeatmapColor(39)).toBe('rgb(239, 68, 68)');
    });

    it('should return red-600 for 20-29% coverage', () => {
      expect(getHeatmapColor(20)).toBe('rgb(220, 38, 38)');
      expect(getHeatmapColor(25)).toBe('rgb(220, 38, 38)');
      expect(getHeatmapColor(29)).toBe('rgb(220, 38, 38)');
    });

    it('should return red-700 for 10-19% coverage', () => {
      expect(getHeatmapColor(10)).toBe('rgb(185, 28, 28)');
      expect(getHeatmapColor(15)).toBe('rgb(185, 28, 28)');
      expect(getHeatmapColor(19)).toBe('rgb(185, 28, 28)');
    });

    it('should return red-900 for <10% coverage', () => {
      expect(getHeatmapColor(0)).toBe('rgb(153, 27, 27)');
      expect(getHeatmapColor(5)).toBe('rgb(153, 27, 27)');
      expect(getHeatmapColor(9)).toBe('rgb(153, 27, 27)');
    });
  });

  describe('Boundary Values', () => {
    it('should handle exact boundary values correctly', () => {
      expect(getHeatmapColor(100)).toBe('rgb(34, 197, 94)'); // Max
      expect(getHeatmapColor(90)).toBe('rgb(34, 197, 94)'); // Boundary
      expect(getHeatmapColor(89.99)).toBe('rgb(74, 222, 128)'); // Just below
      expect(getHeatmapColor(80)).toBe('rgb(74, 222, 128)'); // Boundary
      expect(getHeatmapColor(70)).toBe('rgb(132, 204, 22)'); // Boundary
      expect(getHeatmapColor(60)).toBe('rgb(234, 179, 8)'); // Boundary
      expect(getHeatmapColor(50)).toBe('rgb(251, 146, 60)'); // Boundary
      expect(getHeatmapColor(40)).toBe('rgb(249, 115, 22)'); // Boundary
      expect(getHeatmapColor(30)).toBe('rgb(239, 68, 68)'); // Boundary
      expect(getHeatmapColor(20)).toBe('rgb(220, 38, 38)'); // Boundary
      expect(getHeatmapColor(10)).toBe('rgb(185, 28, 28)'); // Boundary
      expect(getHeatmapColor(0)).toBe('rgb(153, 27, 27)'); // Min
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal percentages', () => {
      expect(getHeatmapColor(95.5)).toBe('rgb(34, 197, 94)');
      expect(getHeatmapColor(85.3)).toBe('rgb(74, 222, 128)');
      expect(getHeatmapColor(75.7)).toBe('rgb(132, 204, 22)');
      expect(getHeatmapColor(65.1)).toBe('rgb(234, 179, 8)');
    });

    it('should handle values above 100%', () => {
      expect(getHeatmapColor(101)).toBe('rgb(34, 197, 94)');
      expect(getHeatmapColor(150)).toBe('rgb(34, 197, 94)');
    });

    it('should handle negative values', () => {
      expect(getHeatmapColor(-1)).toBe('rgb(153, 27, 27)');
      expect(getHeatmapColor(-50)).toBe('rgb(153, 27, 27)');
    });
  });

  describe('Color Progression', () => {
    it('should show color progression from red to green', () => {
      const colors = [
        getHeatmapColor(5), // red-900
        getHeatmapColor(15), // red-700
        getHeatmapColor(25), // red-600
        getHeatmapColor(35), // red-500
        getHeatmapColor(45), // orange-500
        getHeatmapColor(55), // orange-400
        getHeatmapColor(65), // yellow-500
        getHeatmapColor(75), // lime-500
        getHeatmapColor(85), // green-400
        getHeatmapColor(95), // green-500
      ];

      // Verify all colors are different (proper gradient)
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(10);

      // Verify progression goes from red to green
      expect(colors[0]).toContain('153'); // Darkest red
      expect(colors[9]).toContain('34'); // Greenest
    });
  });
});
