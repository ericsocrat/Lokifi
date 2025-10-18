import ShareBar from '@/components/ShareBar';
import * as collabApi from '@/lib/api/collab';
import * as pdfUtils from '@/lib/utils/pdf';
import * as shareUtils from '@/lib/utils/share';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/api/collab', () => ({
  startCollab: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock('@/lib/utils/pdf', () => ({
  exportReportPDF: vi.fn(),
}));

vi.mock('@/lib/utils/share', () => ({
  makeShareURL: vi.fn(() => 'https://lokifi.com/share#abc123'),
  tryLoadFromURL: vi.fn(() => null),
}));

// Mock chart store
const mockSetAll = vi.fn();

vi.mock('@/state/store', () => ({
  useChartStore: () => ({
    drawings: [],
    theme: 'dark',
    timeframe: '1D',
    setAll: mockSetAll,
  }),
}));

describe('ShareBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock toast
    (window as any).__lokifi_toast = vi.fn();
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
    // Mock history API
    Object.defineProperty(window, 'history', {
      writable: true,
      configurable: true,
      value: { replaceState: vi.fn() },
    });
  });

  afterEach(() => {
    delete (window as any).__lokifi_toast;
  });

  describe('Initial Render', () => {
    it('should render the ShareBar component', () => {
      render(<ShareBar />);
      expect(screen.getByText('Share & Collaborate')).toBeInTheDocument();
    });

    it('should render Copy Share Link button', () => {
      render(<ShareBar />);
      expect(screen.getByText('Copy Share Link')).toBeInTheDocument();
    });

    it('should render Export PDF button', () => {
      render(<ShareBar />);
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
    });

    it('should render room input field', () => {
      render(<ShareBar />);
      expect(screen.getByPlaceholderText(/Room ID/i)).toBeInTheDocument();
    });

    it('should render Start Collab button initially', () => {
      render(<ShareBar />);
      expect(screen.getByText('Start Collab')).toBeInTheDocument();
    });

    it('should display collaboration info text', () => {
      render(<ShareBar />);
      expect(screen.getByText(/Collab uses public demo server/i)).toBeInTheDocument();
      expect(screen.getByText(/demos.yjs.dev/i)).toBeInTheDocument();
    });
  });

  describe('Share Link Functionality', () => {
    it('should call makeShareURL when Copy Share Link is clicked', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect(shareUtils.makeShareURL).toHaveBeenCalledWith(
        expect.objectContaining({
          v: 1,
          t: 'readOnly',
          drawings: expect.any(Array),
          theme: 'dark',
          timeframe: '1D',
          createdAt: expect.any(Number),
        })
      );
    });

    it('should copy URL to clipboard', async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect(writeTextSpy).toHaveBeenCalledWith('https://lokifi.com/share#abc123');
    });

    it('should show toast notification after copying link', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Share link copied');
    });

    it('should handle missing toast function gracefully', async () => {
      delete (window as any).__lokifi_toast;

      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');

      // Should not throw error
      await expect(user.click(shareButton)).resolves.not.toThrow();
    });

    it('should include current drawings in share URL', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect(shareUtils.makeShareURL).toHaveBeenCalledWith(
        expect.objectContaining({
          drawings: expect.any(Array),
        })
      );
    });

    it('should include current theme in share URL', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect(shareUtils.makeShareURL).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      );
    });

    it('should include current timeframe in share URL', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await user.click(shareButton);

      expect(shareUtils.makeShareURL).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '1D',
        })
      );
    });
  });

  describe('PDF Export Functionality', () => {
    it('should call exportReportPDF when Export PDF is clicked', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const exportButton = screen.getByText('Export PDF');
      await user.click(exportButton);

      expect(pdfUtils.exportReportPDF).toHaveBeenCalled();
    });

    it('should call exportReportPDF without arguments', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const exportButton = screen.getByText('Export PDF');
      await user.click(exportButton);

      expect(pdfUtils.exportReportPDF).toHaveBeenCalledWith();
    });
  });

  describe('Room Input Management', () => {
    it('should allow typing in room input', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'lokifi-dev');

      expect(input).toHaveValue('lokifi-dev');
    });

    it('should update room value on every keystroke', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'test');

      expect(input).toHaveValue('test');
    });

    it('should start with empty room value', () => {
      render(<ShareBar />);
      const input = screen.getByPlaceholderText(/Room ID/i);
      expect(input).toHaveValue('');
    });

    it('should allow clearing room input', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-123');
      await user.clear(input);

      expect(input).toHaveValue('');
    });
  });

  describe('Collaboration - Starting', () => {
    it('should start collaboration when Start Collab is clicked with room ID', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'lokifi-dev');

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      expect(collabApi.startCollab).toHaveBeenCalledWith('lokifi-dev');
    });

    it('should not start collaboration if room ID is empty', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      expect(collabApi.startCollab).not.toHaveBeenCalled();
    });

    it('should trim whitespace from room ID', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, '  lokifi-dev  ');

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      expect(collabApi.startCollab).toHaveBeenCalledWith('lokifi-dev');
    });

    it('should show toast notification after starting collab', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-1');

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Collab started');
    });

    it('should change button text to Stop Collab after starting', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-test');

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Stop Collab')).toBeInTheDocument();
      });
    });

    it('should not start collab with only whitespace room ID', async () => {
      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, '   ');

      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      expect(collabApi.startCollab).not.toHaveBeenCalled();
    });
  });

  describe('Collaboration - Stopping', () => {
    it('should stop collaboration when Stop Collab is clicked', async () => {
      const mockStop = vi.fn();
      vi.mocked(collabApi.startCollab).mockReturnValue({ stop: mockStop });

      const user = userEvent.setup();
      render(<ShareBar />);

      // Start collab first
      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-1');
      const startButton = screen.getByText('Start Collab');
      await user.click(startButton);

      // Stop collab
      const stopButton = await screen.findByText('Stop Collab');
      await user.click(stopButton);

      expect(mockStop).toHaveBeenCalled();
    });

    it('should show toast notification after stopping collab', async () => {
      const mockStop = vi.fn();
      vi.mocked(collabApi.startCollab).mockReturnValue({ stop: mockStop });

      const user = userEvent.setup();
      render(<ShareBar />);

      // Start collab
      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-1');
      await user.click(screen.getByText('Start Collab'));

      // Clear previous toast calls
      vi.clearAllMocks();

      // Stop collab
      const stopButton = await screen.findByText('Stop Collab');
      await user.click(stopButton);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Collab stopped');
    });

    it('should change button back to Start Collab after stopping', async () => {
      const mockStop = vi.fn();
      vi.mocked(collabApi.startCollab).mockReturnValue({ stop: mockStop });

      const user = userEvent.setup();
      render(<ShareBar />);

      // Start collab
      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-1');
      await user.click(screen.getByText('Start Collab'));

      // Stop collab
      const stopButton = await screen.findByText('Stop Collab');
      await user.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText('Start Collab')).toBeInTheDocument();
      });
    });
  });

  describe('URL Loading on Mount', () => {
    it('should call tryLoadFromURL on component mount', () => {
      render(<ShareBar />);
      expect(shareUtils.tryLoadFromURL).toHaveBeenCalled();
    });

    it('should load data from URL if snapshot exists', () => {
      const mockSnapshot = {
        drawings: [{ type: 'line' }],
        theme: 'light',
        timeframe: '5M',
      };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      render(<ShareBar />);

      expect(mockSetAll).toHaveBeenCalledWith({
        drawings: [{ type: 'line' }],
        theme: 'light',
        timeframe: '5M',
      });
    });

    it('should show toast when loading from share link', () => {
      const mockSnapshot = {
        drawings: [],
        theme: 'dark',
        timeframe: '1D',
      };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      render(<ShareBar />);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Loaded from share link');
    });

    it('should use default theme if not in snapshot', () => {
      const mockSnapshot = {
        drawings: [],
        timeframe: '1D',
      };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      render(<ShareBar />);

      expect(mockSetAll).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark', // Default from store
        })
      );
    });

    it('should use default timeframe if not in snapshot', () => {
      const mockSnapshot = {
        drawings: [],
        theme: 'light',
      };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      render(<ShareBar />);

      expect(mockSetAll).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: '1D', // Default from store
        })
      );
    });

    it('should clear URL hash after loading', () => {
      const mockSnapshot = {
        drawings: [],
        theme: 'dark',
        timeframe: '1D',
      };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      render(<ShareBar />);

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', expect.any(String));
    });

    it('should not update state if no snapshot from URL', () => {
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(null);

      render(<ShareBar />);

      expect(mockSetAll).not.toHaveBeenCalled();
    });

    it('should not show toast if no snapshot from URL', () => {
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(null);

      render(<ShareBar />);

      expect((window as any).__lokifi_toast).not.toHaveBeenCalled();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct container styling', () => {
      const { container } = render(<ShareBar />);
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('rounded-2xl', 'border', 'border-white/15', 'p-3', 'space-y-3');
    });

    it('should have proper grid layout for buttons', () => {
      render(<ShareBar />);
      const shareButton = screen.getByText('Copy Share Link');
      const buttonContainer = shareButton.parentElement;
      expect(buttonContainer).toHaveClass('grid', 'grid-cols-3', 'gap-2');
    });

    it('should span 2 columns for Copy Share Link button', () => {
      render(<ShareBar />);
      const shareButton = screen.getByText('Copy Share Link');
      expect(shareButton).toHaveClass('col-span-2');
    });

    it('should span 2 columns for room input', () => {
      render(<ShareBar />);
      const input = screen.getByPlaceholderText(/Room ID/i);
      expect(input).toHaveClass('col-span-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing toast function on share', async () => {
      delete (window as any).__lokifi_toast;

      const user = userEvent.setup();
      render(<ShareBar />);

      const shareButton = screen.getByText('Copy Share Link');
      await expect(user.click(shareButton)).resolves.not.toThrow();
    });

    it('should handle missing toast function on collab start', async () => {
      delete (window as any).__lokifi_toast;

      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room');

      const startButton = screen.getByText('Start Collab');
      await expect(user.click(startButton)).resolves.not.toThrow();
    });

    it('should handle missing toast function on URL load', () => {
      delete (window as any).__lokifi_toast;

      const mockSnapshot = { drawings: [], theme: 'dark', timeframe: '1D' };
      vi.mocked(shareUtils.tryLoadFromURL).mockReturnValue(mockSnapshot as any);

      expect(() => render(<ShareBar />)).not.toThrow();
    });

    it('should allow restarting collaboration after stopping', async () => {
      const mockStop = vi.fn();
      vi.mocked(collabApi.startCollab).mockReturnValue({ stop: mockStop });

      const user = userEvent.setup();
      render(<ShareBar />);

      const input = screen.getByPlaceholderText(/Room ID/i);
      await user.type(input, 'room-restart');

      // Start
      await user.click(screen.getByText('Start Collab'));

      // Stop
      const stopButton = await screen.findByText('Stop Collab');
      await user.click(stopButton);

      // Start again
      const startButton = await screen.findByText('Start Collab');
      await user.click(startButton);

      expect(collabApi.startCollab).toHaveBeenCalledTimes(2);
    });
  });
});
