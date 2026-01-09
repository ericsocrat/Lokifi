/**
 * @file ChartIndexPage.test.tsx
 * @description Tests for the chart index page - redirects to default symbol
 * @session 140 - Page testing coverage
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

import ChartIndexPage from '../../app/chart/page';

describe('ChartIndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the loading state', () => {
      render(<ChartIndexPage />);
      expect(screen.getByText(/loading chart/i)).toBeInTheDocument();
    });

    it('displays a loading spinner', () => {
      render(<ChartIndexPage />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to default symbol BTCUSD on mount', () => {
      render(<ChartIndexPage />);
      expect(mockReplace).toHaveBeenCalledWith('/chart/BTCUSD');
    });

    it('only calls replace once', () => {
      render(<ChartIndexPage />);
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Export', () => {
    it('exports ChartIndexPage as default', () => {
      expect(ChartIndexPage).toBeDefined();
      expect(typeof ChartIndexPage).toBe('function');
    });
  });
});
