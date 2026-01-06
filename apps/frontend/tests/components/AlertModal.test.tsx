/**
 * Tests for AlertModal Component
 *
 * Covers the alert creation modal UI:
 * - Rendering and initial state
 * - Alert type selection (cross, fib-cross, region-touch, time)
 * - Form inputs (note, cooldown, max triggers, sound)
 * - Conditional inputs (fib level for fib-cross, datetime for time)
 * - Alert creation submission
 * - Modal close behavior
 *
 * Session 131: Test coverage for AlertModal component
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AlertModal from '../../src/components/AlertModal';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    alerts: [],
    drawings: [],
    selection: new Set<string>(),
  });
};

// Mock drawing factory
const createMockDrawing = (
  kind: 'hline' | 'trendline' | 'arrow' | 'fib' | 'rect',
  overrides: Record<string, unknown> = {}
) => ({
  id: crypto.randomUUID(),
  kind,
  points: [],
  style: { color: '#fff', width: 1 },
  ...overrides,
});

describe('AlertModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('rendering', () => {
    it('should not render when open is false', () => {
      render(<AlertModal open={false} onClose={mockOnClose} />);
      expect(screen.queryByText('Create Alert')).not.toBeInTheDocument();
    });

    it('should render when open is true', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Create Alert')).toBeInTheDocument();
    });

    it('should render type selector', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Type')).toBeInTheDocument();
      // Multiple comboboxes (type, sound)
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    });

    it('should render note input', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Note')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Alert')).toBeInTheDocument();
    });

    it('should render cooldown input', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Cooldown')).toBeInTheDocument();
      expect(screen.getByDisplayValue('60000')).toBeInTheDocument();
    });

    it('should render max triggers input', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Max triggers')).toBeInTheDocument();
    });

    it('should render sound selector', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Sound')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Ping')).toBeInTheDocument();
    });

    it('should render cancel button', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render create button', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('should render backdrop overlay', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Alert Type Options Tests
  // ==========================================================================

  describe('alert type options', () => {
    it('should have all alert type options', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.getByRole('option', { name: 'Line cross' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Fib level cross' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Region touch' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Time reminder' })).toBeInTheDocument();
    });

    it('should default to "cross" type', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const select = screen.getAllByRole('combobox')[0];
      expect(select).toHaveValue('cross');
    });

    it('should disable line cross when no hline/trendline/arrow selected', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const crossOption = screen.getByRole('option', { name: 'Line cross' });
      expect(crossOption).toBeDisabled();
    });

    it('should enable line cross when hline is selected', () => {
      const drawing = createMockDrawing('hline');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const crossOption = screen.getByRole('option', { name: 'Line cross' });
      expect(crossOption).not.toBeDisabled();
    });

    it('should enable line cross when trendline is selected', () => {
      const drawing = createMockDrawing('trendline');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const crossOption = screen.getByRole('option', { name: 'Line cross' });
      expect(crossOption).not.toBeDisabled();
    });

    it('should enable line cross when arrow is selected', () => {
      const drawing = createMockDrawing('arrow');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const crossOption = screen.getByRole('option', { name: 'Line cross' });
      expect(crossOption).not.toBeDisabled();
    });

    it('should disable fib level cross when no fib drawing selected', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const fibOption = screen.getByRole('option', { name: 'Fib level cross' });
      expect(fibOption).toBeDisabled();
    });

    it('should enable fib level cross when fib drawing is selected', () => {
      const drawing = createMockDrawing('fib');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const fibOption = screen.getByRole('option', { name: 'Fib level cross' });
      expect(fibOption).not.toBeDisabled();
    });

    it('should disable region touch when no rect drawing selected', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const regionOption = screen.getByRole('option', { name: 'Region touch' });
      expect(regionOption).toBeDisabled();
    });

    it('should enable region touch when rect drawing is selected', () => {
      const drawing = createMockDrawing('rect');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const regionOption = screen.getByRole('option', { name: 'Region touch' });
      expect(regionOption).not.toBeDisabled();
    });

    it('should always enable time reminder option', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const timeOption = screen.getByRole('option', { name: 'Time reminder' });
      expect(timeOption).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Form Input Tests
  // ==========================================================================

  describe('form inputs', () => {
    it('should update note value on input change', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const noteInput = screen.getByDisplayValue('Alert');

      await act(async () => {
        fireEvent.change(noteInput, { target: { value: 'My custom alert' } });
      });

      expect(screen.getByDisplayValue('My custom alert')).toBeInTheDocument();
    });

    it('should update cooldown value on input change', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const cooldownInput = screen.getByDisplayValue('60000');

      await act(async () => {
        fireEvent.change(cooldownInput, { target: { value: '30000' } });
      });

      expect(screen.getByDisplayValue('30000')).toBeInTheDocument();
    });

    it('should update max triggers value on input change', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      // Max triggers is the second spinbutton (after cooldown)
      const spinButtons = screen.getAllByRole('spinbutton');
      const maxTriggersInput = spinButtons[1];

      await act(async () => {
        fireEvent.change(maxTriggersInput, { target: { value: '5' } });
      });

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should update sound value on select change', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const soundSelect = screen.getByDisplayValue('Ping');

      await act(async () => {
        fireEvent.change(soundSelect, { target: { value: 'none' } });
      });

      expect(screen.getByDisplayValue('None')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Conditional Input Tests
  // ==========================================================================

  describe('conditional inputs', () => {
    it('should not show fib level input for non-fib alert type', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.queryByText('Fib level')).not.toBeInTheDocument();
    });

    it('should show fib level input when fib-cross type is selected', async () => {
      const drawing = createMockDrawing('fib');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'fib-cross' } });
      });

      expect(screen.getByText('Fib level')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.618')).toBeInTheDocument();
    });

    it('should not show when input for non-time alert type', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      expect(screen.queryByText('When')).not.toBeInTheDocument();
    });

    it('should show when input for time alert type', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'time' } });
      });

      expect(screen.getByText('When')).toBeInTheDocument();
    });

    it('should update fib level value on change', async () => {
      const drawing = createMockDrawing('fib');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'fib-cross' } });
      });

      const fibInput = screen.getByDisplayValue('0.618');

      await act(async () => {
        fireEvent.change(fibInput, { target: { value: '0.5' } });
      });

      expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Modal Close Tests
  // ==========================================================================

  describe('modal close', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const cancelButton = screen.getByText('Cancel');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const backdrop = document.querySelector('.bg-black\\/50');

      await act(async () => {
        fireEvent.click(backdrop!);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Alert Creation Tests
  // ==========================================================================

  describe('alert creation', () => {
    it('should disable create button when no drawing selected for cross type', () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when drawing is selected', () => {
      const drawing = createMockDrawing('hline');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');
      expect(createButton).not.toBeDisabled();
    });

    it('should enable create button for time type without drawing', async () => {
      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'time' } });
      });

      const createButton = screen.getByText('Create');
      expect(createButton).not.toBeDisabled();
    });

    it('should create cross alert and close modal', async () => {
      const drawing = createMockDrawing('hline');
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'cross',
          drawingId: drawing.id,
          note: 'Alert',
          sound: 'ping',
          cooldownMs: 60000,
        })
      );
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should create fib-cross alert with fib level', async () => {
      const drawing = createMockDrawing('fib');
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'fib-cross' } });
      });

      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'fib-cross',
          drawingId: drawing.id,
          fibLevel: 0.618,
        })
      );
    });

    it('should create region-touch alert', async () => {
      const drawing = createMockDrawing('rect');
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'region-touch' } });
      });

      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'region-touch',
          drawingId: drawing.id,
        })
      );
    });

    it('should create time alert with datetime', async () => {
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');
      const futureDate = '2024-12-31T12:00';

      act(() => {
        useChartStore.setState({
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'time' } });
      });

      const whenInput = document.querySelector('input[type="datetime-local"]');

      await act(async () => {
        fireEvent.change(whenInput!, { target: { value: futureDate } });
      });

      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'time',
          when: new Date(futureDate).getTime(),
        })
      );
    });

    it('should not create time alert without datetime', async () => {
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const typeSelect = screen.getAllByRole('combobox')[0];

      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'time' } });
      });

      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should include max triggers when set', async () => {
      const drawing = createMockDrawing('hline');
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);

      // Find max triggers input (third spinbutton - after cooldown)
      const spinButtons = screen.getAllByRole('spinbutton');
      const maxTriggersInput = spinButtons[1]; // Second spinbutton is max triggers

      await act(async () => {
        fireEvent.change(maxTriggersInput, { target: { value: '10' } });
      });

      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTriggers: 10,
        })
      );
    });

    it('should not include max triggers when empty', async () => {
      const drawing = createMockDrawing('hline');
      const addAlertSpy = vi.spyOn(useChartStore.getState(), 'addAlert');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          addAlert: addAlertSpy,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      expect(addAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTriggers: undefined,
        })
      );
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe('selection handling', () => {
    it('should use first selected drawing when multiple selected', () => {
      const drawing1 = createMockDrawing('hline', { id: 'drawing-1' });
      const drawing2 = createMockDrawing('rect', { id: 'drawing-2' });

      act(() => {
        useChartStore.setState({
          drawings: [drawing1, drawing2],
          selection: new Set(['drawing-1', 'drawing-2']),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);

      // Line cross should be enabled because first selection is hline
      const crossOption = screen.getByRole('option', { name: 'Line cross' });
      expect(crossOption).not.toBeDisabled();

      // Region touch should be disabled because primary is not rect
      const regionOption = screen.getByRole('option', { name: 'Region touch' });
      expect(regionOption).toBeDisabled();
    });

    it('should handle empty selection set', () => {
      act(() => {
        useChartStore.setState({
          selection: new Set(),
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('should handle undefined selection', () => {
      act(() => {
        useChartStore.setState({
          selection: undefined,
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should add alert to store on submit', async () => {
      const drawing = createMockDrawing('hline');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          alerts: [],
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);
      const createButton = screen.getByText('Create');

      await act(async () => {
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(useChartStore.getState().alerts.length).toBeGreaterThan(0);
      });
    });

    it('should handle full workflow - select type, fill form, submit', async () => {
      const drawing = createMockDrawing('fib');

      act(() => {
        useChartStore.setState({
          drawings: [drawing],
          selection: new Set([drawing.id]),
          alerts: [],
        });
      });

      render(<AlertModal open={true} onClose={mockOnClose} />);

      // Select fib-cross type
      const typeSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'fib-cross' } });
      });

      // Update note
      const noteInput = screen.getByDisplayValue('Alert');
      await act(async () => {
        fireEvent.change(noteInput, { target: { value: 'Fib alert' } });
      });

      // Update fib level
      const fibInput = screen.getByDisplayValue('0.618');
      await act(async () => {
        fireEvent.change(fibInput, { target: { value: '0.5' } });
      });

      // Change sound
      const soundSelect = screen.getByDisplayValue('Ping');
      await act(async () => {
        fireEvent.change(soundSelect, { target: { value: 'none' } });
      });

      // Submit
      const createButton = screen.getByText('Create');
      await act(async () => {
        fireEvent.click(createButton);
      });

      // Verify alert was created with correct values
      await waitFor(() => {
        const alerts = useChartStore.getState().alerts;
        expect(alerts.length).toBeGreaterThan(0);
        const alert = alerts[0];
        expect(alert.kind).toBe('fib-cross');
        expect(alert.note).toBe('Fib alert');
        expect(alert.sound).toBe('none');
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
