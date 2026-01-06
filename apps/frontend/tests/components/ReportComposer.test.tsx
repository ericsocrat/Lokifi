/**
 * @fileoverview Tests for ReportComposer component
 *
 * ReportComposer is a modal dialog for creating PDF reports from chart data.
 * It allows users to:
 * - Set a report title
 * - Add markdown notes
 * - Include recent alerts
 * - Export to PDF
 *
 * Test categories:
 * 1. Rendering - Modal visibility, form fields, buttons
 * 2. Modal Behavior - Open/close states, backdrop click
 * 3. Form Inputs - Title, notes, checkbox
 * 4. PDF Export - Export flow, success/error handling
 * 5. Report Content - Block generation from store data
 * 6. Integration - Complete export workflow
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportComposer from '@/components/ReportComposer';
import { useChartStore } from '@/state/store';

// Mock the report utility functions
vi.mock('@/lib/utils/report', () => ({
  buildReportPDF: vi.fn(() => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46]))),
  downloadPdf: vi.fn(),
}));

import { buildReportPDF, downloadPdf } from '@/lib/utils/report';

// Mock the store
vi.mock('@/state/store', async () => {
  const { create } = await import('zustand');

  const createMockStore = () => {
    const store = create<{
      snapshots: Array<{ name: string; id: string }>;
      alertEvents: Array<{ at: number; kind: string; price?: number }>;
    }>()(() => ({
      snapshots: [],
      alertEvents: [],
    }));

    return store;
  };

  const mockStore = createMockStore();

  return {
    useChartStore: Object.assign(mockStore, {
      getState: mockStore.getState,
      setState: mockStore.setState,
      subscribe: mockStore.subscribe,
    }),
  };
});

// Mock window global for snapshot PNG
declare global {
  interface Window {
    __lokifi_lastSnapshotPng?: string;
  }
}

describe('ReportComposer', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    act(() => {
      useChartStore.setState({
        snapshots: [],
        alertEvents: [],
      });
    });
    // Clear window global
    delete window.__lokifi_lastSnapshotPng;
    // Reset mocks
    vi.mocked(buildReportPDF).mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should not render when open is false', () => {
      render(<ReportComposer open={false} onClose={mockOnClose} />);
      expect(screen.queryByText('Create Report')).not.toBeInTheDocument();
    });

    it('should render when open is true', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Create Report')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument();
    });

    it('should render title label and input', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lokifi Report')).toBeInTheDocument();
    });

    it('should render notes label and textarea', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Markdown supported (**, *, `code`, [text](url))')
      ).toBeInTheDocument();
    });

    it('should render include recent alerts checkbox', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Include recent alerts')).toBeInTheDocument();
      expect(screen.getByText('Last 12 alerts')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render export PDF button', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
    });

    it('should have checkbox checked by default', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should render backdrop', () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      // The backdrop is a div with black/60 background
      expect(document.querySelector('.bg-black\\/60')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Modal Behavior Tests
  // ==========================================================================

  describe('modal behavior', () => {
    it('should call onClose when close button clicked', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: '✕' });

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button clicked', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const backdrop = document.querySelector('.bg-black\\/60');

      await user.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content clicked', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const modalContent = screen.getByText('Create Report').closest('div.rounded-xl');

      await user.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Form Input Tests
  // ==========================================================================

  describe('form inputs', () => {
    it('should allow changing title', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const titleInput = screen.getByDisplayValue('Lokifi Report');

      await user.clear(titleInput);
      await user.type(titleInput, 'Custom Report Title');

      expect(titleInput).toHaveValue('Custom Report Title');
    });

    it('should allow entering notes', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const notesInput = screen.getByPlaceholderText(
        'Markdown supported (**, *, `code`, [text](url))'
      );

      await user.type(notesInput, 'These are my **markdown** notes.');

      expect(notesInput).toHaveValue('These are my **markdown** notes.');
    });

    it('should allow toggling include recent alerts checkbox', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).toBeChecked();
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should preserve notes content with markdown', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const notesInput = screen.getByPlaceholderText(
        'Markdown supported (**, *, `code`, [text](url))'
      );

      const markdown = '# Heading\n- Item 1\n- Item 2\n\n**Bold** and *italic*';
      await user.type(notesInput, markdown);

      expect(notesInput).toHaveValue(markdown);
    });
  });

  // ==========================================================================
  // PDF Export Tests
  // ==========================================================================

  describe('PDF export', () => {
    it('should call buildReportPDF when export clicked', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(buildReportPDF).toHaveBeenCalled();
      });
    });

    it('should call downloadPdf with correct filename', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(downloadPdf).toHaveBeenCalledWith(expect.any(Uint8Array), 'Lokifi_Report.pdf');
      });
    });

    it('should use custom title in filename', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const titleInput = screen.getByDisplayValue('Lokifi Report');

      await user.clear(titleInput);
      await user.type(titleInput, 'My Trading Analysis');

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(downloadPdf).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          'My_Trading_Analysis.pdf'
        );
      });
    });

    it('should close modal after successful export', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should show exporting state during export', async () => {
      // Make buildReportPDF slow
      vi.mocked(buildReportPDF).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(new Uint8Array([1])), 100))
      );

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      expect(screen.getByText('Exporting…')).toBeInTheDocument();
      expect(exportButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show alert on export failure', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.mocked(buildReportPDF).mockRejectedValue(new Error('PDF generation failed'));

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Failed to export PDF. Check console for details.'
        );
      });

      alertSpy.mockRestore();
    });

    it('should not close modal on export failure', async () => {
      vi.mocked(buildReportPDF).mockRejectedValue(new Error('PDF generation failed'));
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('should re-enable button after failed export', async () => {
      vi.mocked(buildReportPDF).mockRejectedValue(new Error('Failed'));
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(exportButton).not.toBeDisabled();
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Report Content Tests
  // ==========================================================================

  describe('report content', () => {
    it('should include title block when title is set', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(buildReportPDF).toHaveBeenCalledWith(
          expect.arrayContaining([{ kind: 'title', text: 'Lokifi Report' }])
        );
      });
    });

    it('should not include title block when title is empty', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const titleInput = screen.getByDisplayValue('Lokifi Report');

      await user.clear(titleInput);

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        const blocks = vi.mocked(buildReportPDF).mock.calls[0][0];
        expect(blocks.find((b) => b.kind === 'title')).toBeUndefined();
      });
    });

    it('should include notes block when notes are provided', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const notesInput = screen.getByPlaceholderText(
        'Markdown supported (**, *, `code`, [text](url))'
      );

      await user.type(notesInput, 'My trading notes');

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(buildReportPDF).toHaveBeenCalledWith(
          expect.arrayContaining([{ kind: 'text', markdown: 'My trading notes' }])
        );
      });
    });

    it('should include alert events when checkbox is checked and events exist', async () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [
            { at: Date.now() - 60000, kind: 'cross', price: 100.5 },
            { at: Date.now(), kind: 'region-touch', price: 105.25 },
          ],
        });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        const blocks = vi.mocked(buildReportPDF).mock.calls[0][0];
        const alertBlock = blocks.find(
          (b) => b.kind === 'text' && 'markdown' in b && b.markdown.includes('Recent Alerts')
        );
        expect(alertBlock).toBeDefined();
      });
    });

    it('should not include alert events when checkbox is unchecked', async () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [{ at: Date.now(), kind: 'cross', price: 100 }],
        });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        const blocks = vi.mocked(buildReportPDF).mock.calls[0][0];
        const alertBlock = blocks.find(
          (b) => b.kind === 'text' && 'markdown' in b && b.markdown.includes('Recent Alerts')
        );
        expect(alertBlock).toBeUndefined();
      });
    });

    it('should limit alerts to last 12 events', async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        at: Date.now() + i * 1000,
        kind: 'cross',
        price: 100 + i,
      }));

      act(() => {
        useChartStore.setState({ alertEvents: events });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        const blocks = vi.mocked(buildReportPDF).mock.calls[0][0];
        const alertBlock = blocks.find(
          (b) => b.kind === 'text' && 'markdown' in b && b.markdown.includes('Recent Alerts')
        );
        // Count the number of alert lines (should be 12)
        const lines = (alertBlock as { markdown: string })?.markdown.match(/^- /gm);
        expect(lines).toHaveLength(12);
      });
    });

    it('should include snapshot when PNG is available', async () => {
      window.__lokifi_lastSnapshotPng = 'data:image/png;base64,ABC123';

      act(() => {
        useChartStore.setState({
          snapshots: [{ name: 'Snapshot 1', id: 'snap-1' }],
        });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        expect(buildReportPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            {
              kind: 'snapshot',
              title: 'Snapshot 1',
              pngDataUrl: 'data:image/png;base64,ABC123',
            },
          ])
        );
      });
    });

    it('should handle alerts without price', async () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [{ at: Date.now(), kind: 'time' }],
        });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);
      const exportButton = screen.getByRole('button', { name: /export pdf/i });

      await user.click(exportButton);

      await waitFor(() => {
        const blocks = vi.mocked(buildReportPDF).mock.calls[0][0];
        const alertBlock = blocks.find(
          (b) => b.kind === 'text' && 'markdown' in b && b.markdown.includes('time')
        );
        expect(alertBlock).toBeDefined();
        // Should not contain price since it's not defined
        expect((alertBlock as { markdown: string })?.markdown).not.toContain(' @ ');
      });
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should complete full report workflow', async () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [{ at: Date.now(), kind: 'cross', price: 50000 }],
        });
      });

      render(<ReportComposer open={true} onClose={mockOnClose} />);

      // Change title
      const titleInput = screen.getByDisplayValue('Lokifi Report');
      await user.clear(titleInput);
      await user.type(titleInput, 'BTC Analysis');

      // Add notes
      const notesInput = screen.getByPlaceholderText(
        'Markdown supported (**, *, `code`, [text](url))'
      );
      await user.type(notesInput, '## Summary\nBullish trend observed.');

      // Export
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        // Verify PDF was built with correct blocks
        expect(buildReportPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            { kind: 'title', text: 'BTC Analysis' },
            { kind: 'text', markdown: '## Summary\nBullish trend observed.' },
          ])
        );

        // Verify download with correct filename
        expect(downloadPdf).toHaveBeenCalledWith(expect.any(Uint8Array), 'BTC_Analysis.pdf');

        // Verify modal closed
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle empty report gracefully', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);

      // Clear title
      const titleInput = screen.getByDisplayValue('Lokifi Report');
      await user.clear(titleInput);

      // Uncheck alerts
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Export
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        // Should still build PDF with empty blocks
        expect(buildReportPDF).toHaveBeenCalledWith([]);
        expect(downloadPdf).toHaveBeenCalledWith(expect.any(Uint8Array), 'report.pdf');
      });
    });

    it('should trim whitespace from title and notes', async () => {
      render(<ReportComposer open={true} onClose={mockOnClose} />);

      // Clear title and add one with spaces
      const titleInput = screen.getByDisplayValue('Lokifi Report');
      await user.clear(titleInput);
      await user.type(titleInput, '  Spaced Title  ');

      // Add notes with spaces
      const notesInput = screen.getByPlaceholderText(
        'Markdown supported (**, *, `code`, [text](url))'
      );
      await user.type(notesInput, '  Spaced notes  ');

      // Export
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(buildReportPDF).toHaveBeenCalledWith(
          expect.arrayContaining([
            { kind: 'title', text: 'Spaced Title' },
            { kind: 'text', markdown: 'Spaced notes' },
          ])
        );
      });
    });
  });
});
