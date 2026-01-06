/**
 * Tests for ExportImportPanel Component
 *
 * Covers the export/import functionality UI:
 * - Rendering of all buttons and elements
 * - Export JSON functionality
 * - Import JSON functionality (file upload, parse, error handling)
 * - Export PNG functionality
 * - Share URL functionality
 *
 * Session 131: Test coverage for ExportImportPanel component
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExportImportPanel from '../../src/components/ExportImportPanel';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the utility modules
vi.mock('../../src/lib/utils/io', () => ({
  downloadText: vi.fn(),
  exportPngFromRoot: vi.fn(),
}));

vi.mock('../../src/lib/utils/persist', () => ({
  saveCurrent: vi.fn(),
}));

vi.mock('../../src/lib/utils/share', () => ({
  encodeShare: vi.fn(() => 'encoded-hash'),
}));

// Import mocked functions
import { downloadText, exportPngFromRoot } from '../../src/lib/utils/io';
import { saveCurrent } from '../../src/lib/utils/persist';
import { encodeShare } from '../../src/lib/utils/share';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Helper to create a proper File with text() method (jsdom doesn't support it natively)
const createMockFile = (content: string, filename: string, type: string) => {
  const file = new File([content], filename, { type });
  // Add text() method that jsdom's File doesn't have
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    writable: false,
  });
  return file;
};

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    drawings: [],
    indicators: [],
    indicatorSettings: {},
    theme: 'dark',
    symbol: 'BTCUSD',
    timeframe: '1D',
    selection: new Set<string>(),
  });
};

describe('ExportImportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    // Reset alert mock
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'prompt').mockImplementation(() => null);
  });

  afterEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should render the panel title', () => {
      render(<ExportImportPanel />);
      expect(screen.getByText('Export / Import')).toBeInTheDocument();
    });

    it('should render export JSON button', () => {
      render(<ExportImportPanel />);
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });

    it('should render import JSON label', () => {
      render(<ExportImportPanel />);
      expect(screen.getByText('Import JSON')).toBeInTheDocument();
    });

    it('should render hidden file input for import', () => {
      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should render export PNG button', () => {
      render(<ExportImportPanel />);
      expect(screen.getByText('Export PNG')).toBeInTheDocument();
    });

    it('should render copy share URL button', () => {
      render(<ExportImportPanel />);
      expect(screen.getByText('Copy Share URL')).toBeInTheDocument();
    });

    it('should render help text', () => {
      render(<ExportImportPanel />);
      expect(
        screen.getByText(/JSON includes drawings, indicators, and settings/)
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Export JSON Tests
  // ==========================================================================

  describe('export JSON', () => {
    it('should call downloadText with correct filename pattern on export', async () => {
      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      expect(downloadText).toHaveBeenCalledWith('lokifi-scene-.json', expect.any(String));
    });

    it('should include drawings in exported JSON', async () => {
      const mockDrawings = [{ id: 'draw-1', kind: 'hline' }];

      act(() => {
        useChartStore.setState({ drawings: mockDrawings });
      });

      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(exportedJson);
      expect(parsed.drawings).toEqual(mockDrawings);
    });

    it('should include indicators in exported JSON', async () => {
      const mockIndicators = ['sma', 'ema'];

      act(() => {
        useChartStore.setState({ indicators: mockIndicators });
      });

      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(exportedJson);
      expect(parsed.indicators).toEqual(mockIndicators);
    });

    it('should include indicatorSettings in exported JSON', async () => {
      const mockSettings = { sma: { period: 20 } };

      act(() => {
        useChartStore.setState({ indicatorSettings: mockSettings });
      });

      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(exportedJson);
      expect(parsed.indicatorSettings).toEqual(mockSettings);
    });

    it('should include theme, symbol, timeframe in exported JSON', async () => {
      act(() => {
        useChartStore.setState({
          theme: 'light',
          symbol: 'ETHUSD',
          timeframe: '4H',
        });
      });

      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(exportedJson);
      expect(parsed.theme).toBe('light');
      expect(parsed.symbol).toBe('ETHUSD');
      expect(parsed.timeframe).toBe('4H');
    });

    it('should export pretty-printed JSON', async () => {
      render(<ExportImportPanel />);
      const exportButton = screen.getByText('Export JSON');

      await act(async () => {
        fireEvent.click(exportButton);
      });

      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];
      // Pretty-printed JSON should have newlines
      expect(exportedJson).toContain('\n');
    });
  });

  // ==========================================================================
  // Import JSON Tests
  // ==========================================================================

  describe('import JSON', () => {
    it('should accept JSON file type', () => {
      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput?.accept).toBe('.json,application/json');
    });

    it('should import valid JSON file and update store', async () => {
      const importData = {
        drawings: [{ id: 'imported-1', kind: 'rect' }],
        indicators: ['rsi'],
        indicatorSettings: { rsi: { period: 14 } },
        theme: 'light',
        symbol: 'SOLUSD',
        timeframe: '1H',
      };

      const file = createMockFile(JSON.stringify(importData), 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Imported scene.');
      });

      const state = useChartStore.getState();
      expect(state.drawings).toEqual(importData.drawings);
      expect(state.indicators).toEqual(importData.indicators);
      expect(state.theme).toBe('light');
      expect(state.symbol).toBe('SOLUSD');
    });

    it('should call saveCurrent after import', async () => {
      const importData = {
        drawings: [{ id: 'draw-1' }],
      };

      const file = createMockFile(JSON.stringify(importData), 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(saveCurrent).toHaveBeenCalled();
      });
    });

    it('should show error on invalid JSON', async () => {
      const file = createMockFile('not valid json', 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to import:'));
      });
    });

    it('should use current values for missing properties in import', async () => {
      // Set initial state
      act(() => {
        useChartStore.setState({
          indicators: ['original'],
          theme: 'dark',
          symbol: 'BTCUSD',
        });
      });

      // Import file with only drawings
      const importData = {
        drawings: [{ id: 'draw-1' }],
      };

      const file = createMockFile(JSON.stringify(importData), 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Imported scene.');
      });

      const state = useChartStore.getState();
      expect(state.indicators).toEqual(['original']);
      expect(state.theme).toBe('dark');
      expect(state.symbol).toBe('BTCUSD');
    });

    it('should clear selection on import', async () => {
      act(() => {
        useChartStore.setState({
          selection: new Set(['existing-selection']),
        });
      });

      const importData = {
        drawings: [{ id: 'draw-1' }],
      };

      const file = createMockFile(JSON.stringify(importData), 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const state = useChartStore.getState();
        expect(state.selection.size).toBe(0);
      });
    });

    it('should handle empty drawings array in import', async () => {
      const importData = {
        drawings: [],
      };

      const file = createMockFile(JSON.stringify(importData), 'test.json', 'application/json');

      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Imported scene.');
      });

      expect(useChartStore.getState().drawings).toEqual([]);
    });

    it('should handle no file selected', async () => {
      render(<ExportImportPanel />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      // Should not show alert or change state
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Export PNG Tests
  // ==========================================================================

  describe('export PNG', () => {
    it('should call exportPngFromRoot on PNG export click', async () => {
      // Mock document.querySelector to return an element
      const mockElement = document.createElement('main');
      mockElement.classList.add('relative');
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);

      render(<ExportImportPanel />);
      const pngButton = screen.getByText('Export PNG');

      await act(async () => {
        fireEvent.click(pngButton);
      });

      expect(exportPngFromRoot).toHaveBeenCalledWith(mockElement, 'lokifi-.png');
    });

    it('should show alert when chart area not found', async () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      render(<ExportImportPanel />);
      const pngButton = screen.getByText('Export PNG');

      await act(async () => {
        fireEvent.click(pngButton);
      });

      expect(window.alert).toHaveBeenCalledWith('Chart area not found');
    });

    it('should show alert on PNG export failure', async () => {
      const mockElement = document.createElement('main');
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);
      (exportPngFromRoot as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Export failed')
      );

      render(<ExportImportPanel />);
      const pngButton = screen.getByText('Export PNG');

      await act(async () => {
        fireEvent.click(pngButton);
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(
          'PNG export failed. Make sure the chart is visible.'
        );
      });
    });
  });

  // ==========================================================================
  // Share URL Tests
  // ==========================================================================

  describe('share URL', () => {
    it('should encode share data on copy click', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(<ExportImportPanel />);
      const shareButton = screen.getByText('Copy Share URL');

      await act(async () => {
        fireEvent.click(shareButton);
      });

      expect(encodeShare).toHaveBeenCalledWith(
        expect.objectContaining({
          drawings: expect.any(Array),
          indicators: expect.any(Array),
        })
      );
    });

    it('should copy URL to clipboard', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<ExportImportPanel />);
      const shareButton = screen.getByText('Copy Share URL');

      await act(async () => {
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('#'));
      });
    });

    it('should show success alert on clipboard copy', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      render(<ExportImportPanel />);
      const shareButton = screen.getByText('Copy Share URL');

      await act(async () => {
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Sharable URL copied to clipboard.');
      });
    });

    it('should show prompt fallback when clipboard fails', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
      });

      render(<ExportImportPanel />);
      const shareButton = screen.getByText('Copy Share URL');

      await act(async () => {
        fireEvent.click(shareButton);
      });

      await waitFor(() => {
        expect(window.prompt).toHaveBeenCalledWith('Copy URL:', expect.any(String));
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should export and import round-trip', async () => {
      // Set up initial state
      act(() => {
        useChartStore.setState({
          drawings: [{ id: 'original', kind: 'hline' }],
          indicators: ['sma'],
          theme: 'dark',
        });
      });

      render(<ExportImportPanel />);

      // Export
      const exportButton = screen.getByText('Export JSON');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      // Get exported JSON
      const exportedJson = (downloadText as ReturnType<typeof vi.fn>).mock.calls[0][1];

      // Clear state
      act(() => {
        useChartStore.setState({
          drawings: [],
          indicators: [],
        });
      });

      // Import the exported JSON using mock file helper
      const file = createMockFile(exportedJson, 'roundtrip.json', 'application/json');

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        const state = useChartStore.getState();
        expect(state.drawings).toContainEqual({ id: 'original', kind: 'hline' });
        expect(state.indicators).toContain('sma');
      });
    });
  });
});
