import DrawingSettings from '@/components/DrawingSettings';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the chart store
const mockSetDrawingSettings = vi.fn();
const mockStoreState = {
  snapEnabled: true,
  snapStep: 10,
  showHandles: true,
};

vi.mock('@/state/store', () => ({
  useChartStore: (selector: any) => {
    const state = {
      drawingSettings: mockStoreState,
      setDrawingSettings: mockSetDrawingSettings,
    };
    return selector(state);
  },
}));

describe('DrawingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state to defaults
    mockStoreState.snapEnabled = true;
    mockStoreState.snapStep = 10;
    mockStoreState.showHandles = true;
  });

  describe('Initial Rendering', () => {
    it('should render the component title', () => {
      render(<DrawingSettings />);
      expect(screen.getByText('Drawing Settings')).toBeInTheDocument();
    });

    it('should render all three settings controls', () => {
      render(<DrawingSettings />);

      // Check for labels
      expect(screen.getByText('Snap to grid')).toBeInTheDocument();
      expect(screen.getByText('Snap step (px)')).toBeInTheDocument();
      expect(screen.getByText('Show handles')).toBeInTheDocument();
    });

    it('should render keyboard shortcut tip', () => {
      render(<DrawingSettings />);
      expect(screen.getByText(/press/i)).toBeInTheDocument();
      expect(screen.getByText('S')).toBeInTheDocument();
      expect(screen.getByText(/to toggle snapping/i)).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      render(<DrawingSettings />);

      // Title should be h2
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('Drawing Settings');
    });
  });

  describe('Snap to Grid Control', () => {
    it('should display current snap enabled state', () => {
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      expect(checkbox).toBeChecked();
    });

    it('should display unchecked state when snapEnabled is false', () => {
      mockStoreState.snapEnabled = false;
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle snap enabled when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      await user.click(checkbox);

      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ snapEnabled: false });
    });

    it('should call setDrawingSettings with opposite value', async () => {
      const user = userEvent.setup();
      mockStoreState.snapEnabled = false;
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      await user.click(checkbox);

      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ snapEnabled: true });
    });
  });

  describe('Snap Step Control', () => {
    it('should display current snap step value', () => {
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });
      expect(input).toHaveValue(10);
    });

    it('should display different snap step values', () => {
      mockStoreState.snapStep = 25;
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });
      expect(input).toHaveValue(25);
    });

    it('should update snap step when value changes', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });

      // Type a new value
      await user.clear(input);
      await user.type(input, '20');

      // Verify setDrawingSettings was called (typing "20" fires onChange for each character)
      expect(mockSetDrawingSettings).toHaveBeenCalled();

      // The function should be called with snapStep as a number
      const calls = mockSetDrawingSettings.mock.calls;
      const hasSnapStepCall = calls.some(
        (call) => call[0].hasOwnProperty('snapStep') && typeof call[0].snapStep === 'number'
      );
      expect(hasSnapStepCall).toBe(true);
    });

    it('should have min and max constraints', () => {
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i }) as HTMLInputElement;
      expect(input.min).toBe('2');
      expect(input.max).toBe('100');
      expect(input.step).toBe('1');
    });

    it('should default to 10 when empty or invalid', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });
      await user.clear(input);
      await user.tab(); // Trigger onChange with empty value

      // Should parse empty string as 10
      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ snapStep: 10 });
    });
  });

  describe('Show Handles Control', () => {
    it('should display current show handles state', () => {
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /show handles/i });
      expect(checkbox).toBeChecked();
    });

    it('should display unchecked state when showHandles is false', () => {
      mockStoreState.showHandles = false;
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /show handles/i });
      expect(checkbox).not.toBeChecked();
    });

    it('should toggle show handles when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /show handles/i });
      await user.click(checkbox);

      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ showHandles: false });
    });

    it('should call setDrawingSettings with opposite value', async () => {
      const user = userEvent.setup();
      mockStoreState.showHandles = false;
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /show handles/i });
      await user.click(checkbox);

      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ showHandles: true });
    });
  });

  describe('User Interactions', () => {
    it('should handle multiple setting changes in sequence', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      // Toggle snap enabled
      const snapCheckbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      await user.click(snapCheckbox);
      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ snapEnabled: false });

      // Change snap step
      const stepInput = screen.getByRole('spinbutton', { name: /snap step/i });
      await user.clear(stepInput);
      await user.type(stepInput, '15');

      // Verify snap step was changed (should have snapStep property in some call)
      const hasSnapStepCall = mockSetDrawingSettings.mock.calls.some((call) =>
        call[0].hasOwnProperty('snapStep')
      );
      expect(hasSnapStepCall).toBe(true);

      // Toggle show handles
      const handlesCheckbox = screen.getByRole('checkbox', { name: /show handles/i });
      await user.click(handlesCheckbox);
      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ showHandles: false });
    });

    it('should handle rapid checkbox toggles', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });

      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(mockSetDrawingSettings).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all settings disabled', () => {
      mockStoreState.snapEnabled = false;
      mockStoreState.showHandles = false;
      render(<DrawingSettings />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should handle extreme snap step values', () => {
      mockStoreState.snapStep = 100; // max value
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });
      expect(input).toHaveValue(100);
    });

    it('should handle minimum snap step value', () => {
      mockStoreState.snapStep = 2; // min value
      render(<DrawingSettings />);

      const input = screen.getByRole('spinbutton', { name: /snap step/i });
      expect(input).toHaveValue(2);
    });
  });

  describe('Accessibility', () => {
    it('should associate labels with inputs', () => {
      render(<DrawingSettings />);

      // Each label should be associated with its input
      const snapCheckbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      expect(snapCheckbox).toBeInTheDocument();

      const stepInput = screen.getByRole('spinbutton', { name: /snap step/i });
      expect(stepInput).toBeInTheDocument();

      const handlesCheckbox = screen.getByRole('checkbox', { name: /show handles/i });
      expect(handlesCheckbox).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      // Tab through controls
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /snap to grid/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('spinbutton', { name: /snap step/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /show handles/i })).toHaveFocus();
    });

    it('should toggle checkboxes with space key', async () => {
      const user = userEvent.setup();
      render(<DrawingSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /snap to grid/i });
      checkbox.focus();

      await user.keyboard(' ');
      expect(mockSetDrawingSettings).toHaveBeenCalledWith({ snapEnabled: false });
    });
  });
});
