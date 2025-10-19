/**
 * Tests for pagination calculations
 */
import { describe, expect, it } from 'vitest';
import { calculatePagination } from './utils';

describe('calculatePagination', () => {
  describe('Standard Pagination', () => {
    it('should calculate correct pagination for first page', () => {
      const result = calculatePagination(50, 1, 10);

      expect(result).toEqual({
        totalPages: 5,
        startIndex: 0,
        endIndex: 10,
        startItem: 1,
        endItem: 10,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should calculate correct pagination for middle page', () => {
      const result = calculatePagination(50, 3, 10);

      expect(result).toEqual({
        totalPages: 5,
        startIndex: 20,
        endIndex: 30,
        startItem: 21,
        endItem: 30,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should calculate correct pagination for last page', () => {
      const result = calculatePagination(50, 5, 10);

      expect(result).toEqual({
        totalPages: 5,
        startIndex: 40,
        endIndex: 50,
        startItem: 41,
        endItem: 50,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });
  });

  describe('Last Page with Remainder', () => {
    it('should handle last page with partial items', () => {
      const result = calculatePagination(47, 5, 10);

      expect(result).toEqual({
        totalPages: 5,
        startIndex: 40,
        endIndex: 47,
        startItem: 41,
        endItem: 47,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should calculate correct total pages with remainder', () => {
      const result = calculatePagination(23, 1, 10);

      expect(result.totalPages).toBe(3);
      expect(result.endItem).toBe(10);
    });

    it('should handle single item on last page', () => {
      const result = calculatePagination(21, 3, 10);

      expect(result.totalPages).toBe(3);
      expect(result.startItem).toBe(21);
      expect(result.endItem).toBe(21);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero items', () => {
      const result = calculatePagination(0, 1, 10);

      expect(result).toEqual({
        totalPages: 0,
        startIndex: 0,
        endIndex: 0,
        startItem: 0, // When there are no items, startItem should be 0
        endItem: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle single item', () => {
      const result = calculatePagination(1, 1, 10);

      expect(result).toEqual({
        totalPages: 1,
        startIndex: 0,
        endIndex: 1,
        startItem: 1,
        endItem: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle items equal to page size', () => {
      const result = calculatePagination(10, 1, 10);

      expect(result).toEqual({
        totalPages: 1,
        startIndex: 0,
        endIndex: 10,
        startItem: 1,
        endItem: 10,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle very large datasets', () => {
      const result = calculatePagination(10000, 500, 20);

      expect(result.totalPages).toBe(500);
      expect(result.startIndex).toBe(9980);
      expect(result.endIndex).toBe(10000);
      expect(result.startItem).toBe(9981);
      expect(result.endItem).toBe(10000);
    });
  });

  describe('Different Page Sizes', () => {
    it('should work with page size of 5', () => {
      const result = calculatePagination(23, 2, 5);

      expect(result.totalPages).toBe(5);
      expect(result.startItem).toBe(6);
      expect(result.endItem).toBe(10);
    });

    it('should work with page size of 25', () => {
      const result = calculatePagination(100, 3, 25);

      expect(result.totalPages).toBe(4);
      expect(result.startItem).toBe(51);
      expect(result.endItem).toBe(75);
    });

    it('should work with page size of 1', () => {
      const result = calculatePagination(5, 3, 1);

      expect(result.totalPages).toBe(5);
      expect(result.startItem).toBe(3);
      expect(result.endItem).toBe(3);
    });
  });

  describe('Navigation Flags', () => {
    it('should correctly set hasNextPage and hasPrevPage', () => {
      const page1 = calculatePagination(50, 1, 10);
      const page3 = calculatePagination(50, 3, 10);
      const page5 = calculatePagination(50, 5, 10);

      expect(page1.hasNextPage).toBe(true);
      expect(page1.hasPrevPage).toBe(false);

      expect(page3.hasNextPage).toBe(true);
      expect(page3.hasPrevPage).toBe(true);

      expect(page5.hasNextPage).toBe(false);
      expect(page5.hasPrevPage).toBe(true);
    });

    it('should have no navigation on single page', () => {
      const result = calculatePagination(5, 1, 10);

      expect(result.hasNextPage).toBe(false);
      expect(result.hasPrevPage).toBe(false);
    });
  });
});
