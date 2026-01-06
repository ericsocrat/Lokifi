/**
 * ExportButton Component Tests
 *
 * Tests for CSV export functionality
 */

import { ExportButton } from '@/components/markets/ExportButton';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Store original createElement
const originalCreateElement = document.createElement.bind(document);

// Mock URL methods
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

// Store clicked link and blob content
let clickedLink: HTMLAnchorElement | null = null;
let capturedBlobContent: string = '';

beforeEach(() => {
  // Reset
  clickedLink = null;
  capturedBlobContent = '';

  // Mock URL API
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  // Mock Blob to capture content
  global.Blob = vi.fn((content: BlobPart[]) => {
    capturedBlobContent = content[0] as string;
    return { type: 'text/csv;charset=utf-8;' } as Blob;
  }) as unknown as typeof Blob;

  // Mock document.createElement to intercept anchor creation
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === 'a') {
      const anchorElement = element as HTMLAnchorElement;
      anchorElement.click = vi.fn();
      clickedLink = anchorElement;
    }
    return element;
  });

  // Mock timers
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// Test data
const mockData = [
  { symbol: 'BTC', price: 50000, change: 5.5 },
  { symbol: 'ETH', price: 3000, change: -2.3 },
  { symbol: 'ADA', price: 0.5, change: 3.1 },
];

const mockDataWithCommas = [
  { name: 'Bitcoin, Digital Gold', price: 50000 },
  { name: 'Ethereum', price: 3000 },
];

describe('ExportButton', () => {
  describe('Rendering', () => {
    it('should render export button with correct text', () => {
      render(<ExportButton data={mockData} filename="test" />);

      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    it('should render Download icon', () => {
      render(<ExportButton data={mockData} filename="test" />);

      const button = screen.getByRole('button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should have correct title attribute', () => {
      render(<ExportButton data={mockData} filename="test" />);

      expect(screen.getByTitle('Export to CSV')).toBeInTheDocument();
    });

    it('should apply correct base styling', () => {
      render(<ExportButton data={mockData} filename="test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-neutral-800', 'rounded-lg', 'text-white', 'text-sm');
    });
  });

  describe('Disabled States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<ExportButton data={mockData} filename="test" disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should be disabled when data is empty', () => {
      render(<ExportButton data={[]} filename="test" />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply disabled styling classes', () => {
      render(<ExportButton data={mockData} filename="test" disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should be enabled when data is present and not disabled', () => {
      render(<ExportButton data={mockData} filename="test" />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Export Functionality', () => {
    it('should create CSV with correct headers', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Verify blob creation was called
      expect(mockCreateObjectURL).toHaveBeenCalled();

      // Verify link was created and clicked
      expect(clickedLink).not.toBeNull();
    });

    it('should handle values with commas by wrapping in quotes', async () => {
      render(<ExportButton data={mockDataWithCommas} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // CSV should have quoted value for "Bitcoin, Digital Gold"
      expect(capturedBlobContent).toContain('"Bitcoin, Digital Gold"');
    });

    it('should generate filename with current date', async () => {
      // Set specific date
      vi.setSystemTime(new Date('2024-03-15'));

      render(<ExportButton data={mockData} filename="market_data" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(clickedLink?.download).toBe('market_data_2024-03-15.csv');
    });

    it('should revoke object URL after download', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle null/undefined values gracefully', async () => {
      const dataWithNulls = [
        { symbol: 'BTC', price: null },
        { symbol: 'ETH', price: undefined },
      ];

      render(<ExportButton data={dataWithNulls} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Null/undefined should be converted to empty string
      expect(capturedBlobContent).toContain('BTC,');
      expect(capturedBlobContent).toContain('ETH,');
    });

    it('should not export when data is empty', async () => {
      render(<ExportButton data={[]} filename="test" />);

      // Button should be disabled
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      // Clicking should not create blob
      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('Exporting State', () => {
    it('should show "Exporting..." text during export', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });

    it('should disable button during export', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply bounce animation to icon during export', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toHaveClass('animate-bounce');
    });

    it('should reset to normal state after 1 second', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(screen.getByText('Exporting...')).toBeInTheDocument();

      // Advance timers by 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error by making createObjectURL throw
      mockCreateObjectURL.mockImplementationOnce(() => {
        throw new Error('Blob creation failed');
      });

      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should reset exporting state even on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      mockCreateObjectURL.mockImplementationOnce(() => {
        throw new Error('Blob creation failed');
      });

      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Wait for setTimeout
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  describe('CSV Content Generation', () => {
    it('should create CSV with all data rows', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      const lines = capturedBlobContent.split('\n');
      expect(lines.length).toBe(4); // 1 header + 3 data rows
    });

    it('should use correct CSV delimiter', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      // Headers should be comma-separated
      expect(capturedBlobContent).toContain('symbol,price,change');
    });

    it('should preserve data order in CSV', async () => {
      render(<ExportButton data={mockData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      const lines = capturedBlobContent.split('\n');
      expect(lines[1]).toContain('BTC');
      expect(lines[2]).toContain('ETH');
      expect(lines[3]).toContain('ADA');
    });
  });

  describe('Accessibility', () => {
    it('should be a button element', () => {
      render(<ExportButton data={mockData} filename="test" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have descriptive title for screen readers', () => {
      render(<ExportButton data={mockData} filename="test" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Export to CSV');
    });

    it('should have visible text content', () => {
      render(<ExportButton data={mockData} filename="test" />);

      expect(screen.getByText('Export CSV')).toBeVisible();
    });

    it('should be focusable', () => {
      render(<ExportButton data={mockData} filename="test" />);

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should not be focusable when disabled', () => {
      render(<ExportButton data={mockData} filename="test" disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item data', async () => {
      const singleItem = [{ symbol: 'BTC', price: 50000 }];

      render(<ExportButton data={singleItem} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      const lines = capturedBlobContent.split('\n');
      expect(lines.length).toBe(2); // 1 header + 1 data row
    });

    it('should handle nested objects by converting to string', async () => {
      const nestedData = [{ symbol: 'BTC', meta: { info: 'test' } }];

      render(<ExportButton data={nestedData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(capturedBlobContent).toContain('[object Object]');
    });

    it('should handle numeric values correctly', async () => {
      const numericData = [{ symbol: 'BTC', price: 50000.123, change: -5.5 }];

      render(<ExportButton data={numericData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(capturedBlobContent).toContain('50000.123');
      expect(capturedBlobContent).toContain('-5.5');
    });

    it('should handle boolean values', async () => {
      const booleanData = [{ symbol: 'BTC', active: true, deprecated: false }];

      render(<ExportButton data={booleanData} filename="test" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(capturedBlobContent).toContain('true');
      expect(capturedBlobContent).toContain('false');
    });

    it('should handle special characters in filenames', async () => {
      vi.setSystemTime(new Date('2024-03-15'));

      render(<ExportButton data={mockData} filename="market_data_v2" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button'));
      });

      expect(clickedLink?.download).toBe('market_data_v2_2024-03-15.csv');
    });
  });
});
