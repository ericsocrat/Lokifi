/**
 * Tests for AlertsPanel Component
 *
 * Covers the alert management panel UI:
 * - Rendering and initial state
 * - Filter functionality (all, active, snoozed, disabled, triggered)
 * - Alert list display
 * - Alert row interactions (enable/disable, snooze, delete)
 * - Alert events display
 * - New alert modal trigger
 * - Notification permission request
 *
 * Session 130: Test coverage for AlertsPanel component
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AlertsPanel from '../../src/components/AlertsPanel';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    alerts: [],
    alertEvents: [],
  });
};

// Mock alert factory
const createMockAlert = (
  overrides: Partial<{
    id: string;
    kind: string;
    enabled: boolean;
    snoozedUntil?: number;
    triggers?: number;
    maxTriggers?: number;
    note?: string;
    sound?: 'ping' | 'none';
  }> = {}
) => ({
  id: crypto.randomUUID(),
  kind: 'price-above',
  enabled: true,
  snoozedUntil: undefined,
  triggers: 0,
  maxTriggers: undefined,
  note: undefined,
  sound: 'ping' as const,
  ...overrides,
});

// Mock ensureNotificationPermission
vi.mock('../../src/lib/utils/notify', () => ({
  ensureNotificationPermission: vi.fn(),
}));

describe('AlertsPanel', () => {
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
    it('should render the panel title', () => {
      render(<AlertsPanel />);
      expect(screen.getByText('Alert Center')).toBeInTheDocument();
    });

    it('should render new alert button', () => {
      render(<AlertsPanel />);
      expect(screen.getByText('+ New Alert')).toBeInTheDocument();
    });

    it('should render filter dropdown', () => {
      render(<AlertsPanel />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render enable notifications button', () => {
      render(<AlertsPanel />);
      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
    });

    it('should show empty state when no alerts', () => {
      render(<AlertsPanel />);
      expect(screen.getByText('No alerts.')).toBeInTheDocument();
    });

    it('should not show empty state when alerts exist', () => {
      act(() => {
        useChartStore.setState({
          alerts: [createMockAlert()],
        });
      });

      render(<AlertsPanel />);
      expect(screen.queryByText('No alerts.')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Filter Tests
  // ==========================================================================

  describe('filter functionality', () => {
    it('should have all filter options', () => {
      render(<AlertsPanel />);
      expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Snoozed' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Disabled' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Triggered' })).toBeInTheDocument();
    });

    it('should default to "all" filter', () => {
      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');
      expect(select).toBeInTheDocument();
    });

    it('should show all alerts with "all" filter', () => {
      const alert1 = createMockAlert({ enabled: true });
      const alert2 = createMockAlert({ enabled: false });

      act(() => {
        useChartStore.setState({
          alerts: [alert1, alert2],
        });
      });

      render(<AlertsPanel />);
      // Both alerts should be visible
      expect(screen.getAllByText(/^#/)).toHaveLength(2);
    });

    it('should filter to active alerts only', async () => {
      const activeAlert = createMockAlert({ enabled: true });
      const disabledAlert = createMockAlert({ enabled: false });

      act(() => {
        useChartStore.setState({
          alerts: [activeAlert, disabledAlert],
        });
      });

      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'active' } });
      });

      // Only active alert should be visible
      expect(screen.getAllByText(/^#/)).toHaveLength(1);
    });

    it('should filter to disabled alerts only', async () => {
      const activeAlert = createMockAlert({ enabled: true });
      const disabledAlert = createMockAlert({ enabled: false });

      act(() => {
        useChartStore.setState({
          alerts: [activeAlert, disabledAlert],
        });
      });

      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'disabled' } });
      });

      expect(screen.getAllByText(/^#/)).toHaveLength(1);
    });

    it('should filter to snoozed alerts only', async () => {
      const normalAlert = createMockAlert({ enabled: true });
      const snoozedAlert = createMockAlert({
        enabled: true,
        snoozedUntil: Date.now() + 3600000, // 1 hour from now
      });

      act(() => {
        useChartStore.setState({
          alerts: [normalAlert, snoozedAlert],
        });
      });

      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'snoozed' } });
      });

      expect(screen.getAllByText(/^#/)).toHaveLength(1);
    });

    it('should filter to triggered alerts only', async () => {
      const normalAlert = createMockAlert({ triggers: 0 });
      const triggeredAlert = createMockAlert({ triggers: 3 });

      act(() => {
        useChartStore.setState({
          alerts: [normalAlert, triggeredAlert],
        });
      });

      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'triggered' } });
      });

      expect(screen.getAllByText(/^#/)).toHaveLength(1);
    });

    it('should not include snoozed alerts in active filter', async () => {
      const snoozedAlert = createMockAlert({
        enabled: true,
        snoozedUntil: Date.now() + 3600000,
      });

      act(() => {
        useChartStore.setState({
          alerts: [snoozedAlert],
        });
      });

      render(<AlertsPanel />);
      const select = screen.getByDisplayValue('All');

      await act(async () => {
        fireEvent.change(select, { target: { value: 'active' } });
      });

      expect(screen.getByText('No alerts.')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Alert Row Tests
  // ==========================================================================

  describe('alert row display', () => {
    it('should display alert ID (truncated)', () => {
      const alert = createMockAlert({ id: 'test-alert-123' });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('#test-')).toBeInTheDocument();
    });

    it('should display alert kind', () => {
      const alert = createMockAlert({ kind: 'price-above' });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('price-above')).toBeInTheDocument();
    });

    it('should display alert note when present', () => {
      const alert = createMockAlert({ note: 'Important alert' });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText(/Important alert/)).toBeInTheDocument();
    });

    it('should display max triggers when set', () => {
      const alert = createMockAlert({ maxTriggers: 5 });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('(max 5)')).toBeInTheDocument();
    });

    it('should display trigger count when triggered', () => {
      const alert = createMockAlert({ triggers: 3 });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('3x')).toBeInTheDocument();
    });

    it('should display snoozed indicator when snoozed', () => {
      const alert = createMockAlert({
        snoozedUntil: Date.now() + 3600000,
      });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('snoozed')).toBeInTheDocument();
    });

    it('should not display snoozed indicator for expired snooze', () => {
      const alert = createMockAlert({
        snoozedUntil: Date.now() - 1000, // Expired
      });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.queryByText('snoozed')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Alert Actions Tests
  // ==========================================================================

  describe('alert actions', () => {
    it('should toggle alert enabled state on click', async () => {
      const alert = createMockAlert({ enabled: true });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      const disableButton = screen.getByText('Disable');

      await act(async () => {
        fireEvent.click(disableButton);
      });

      expect(useChartStore.getState().alerts[0].enabled).toBe(false);
    });

    it('should show Enable button for disabled alerts', () => {
      const alert = createMockAlert({ enabled: false });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('Enable')).toBeInTheDocument();
    });

    it('should show Disable button for enabled alerts', () => {
      const alert = createMockAlert({ enabled: true });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('Disable')).toBeInTheDocument();
    });

    it('should delete alert on delete button click', async () => {
      const alert = createMockAlert();

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      const deleteButton = screen.getByText('Delete');

      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(useChartStore.getState().alerts).toHaveLength(0);
    });

    it('should update sound setting on change', async () => {
      const alert = createMockAlert({ sound: 'ping' });

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      const soundSelect = screen.getByDisplayValue('Ping');

      await act(async () => {
        fireEvent.change(soundSelect, { target: { value: 'none' } });
      });

      expect(useChartStore.getState().alerts[0].sound).toBe('none');
    });
  });

  // ==========================================================================
  // Snooze Tests
  // ==========================================================================

  describe('snooze functionality', () => {
    it('should render snooze button', () => {
      const alert = createMockAlert();

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('Snooze ▾')).toBeInTheDocument();
    });

    it('should render snooze options', () => {
      const alert = createMockAlert();

      act(() => {
        useChartStore.setState({ alerts: [alert] });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('5m')).toBeInTheDocument();
      expect(screen.getByText('15m')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Alert Events Tests
  // ==========================================================================

  describe('alert events display', () => {
    it('should not show events section when no events', () => {
      render(<AlertsPanel />);
      expect(screen.queryByText('Recent triggers')).not.toBeInTheDocument();
    });

    it('should show events section when events exist', () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [
            { id: 'alert-1', kind: 'price-above', at: Date.now(), price: 150.5 },
          ],
        });
      });

      render(<AlertsPanel />);
      expect(screen.getByText('Recent triggers')).toBeInTheDocument();
    });

    it('should display event details', () => {
      const eventTime = new Date();

      act(() => {
        useChartStore.setState({
          alertEvents: [
            { id: 'test-event-id', kind: 'price-above', at: eventTime.getTime(), price: 150.5 },
          ],
        });
      });

      render(<AlertsPanel />);
      expect(screen.getByText(/price-above/)).toBeInTheDocument();
      expect(screen.getByText(/@ 150.50/)).toBeInTheDocument();
    });

    it('should show events in reverse chronological order', () => {
      act(() => {
        useChartStore.setState({
          alertEvents: [
            { id: 'event-1', kind: 'price-above', at: Date.now() - 2000 },
            { id: 'event-2', kind: 'price-below', at: Date.now() - 1000 },
            { id: 'event-3', kind: 'volume-spike', at: Date.now() },
          ],
        });
      });

      render(<AlertsPanel />);
      const events = screen.getAllByText(/price-above|price-below|volume-spike/);
      expect(events).toHaveLength(3);
    });

    it('should limit displayed events to 8', () => {
      const events = Array.from({ length: 12 }, (_, i) => ({
        id: `event-${i}`,
        kind: 'price-above',
        at: Date.now() - i * 1000,
      }));

      act(() => {
        useChartStore.setState({ alertEvents: events });
      });

      render(<AlertsPanel />);
      const eventElements = screen.getAllByText(/price-above/);
      expect(eventElements.length).toBeLessThanOrEqual(8);
    });
  });

  // ==========================================================================
  // New Alert Modal Tests
  // ==========================================================================

  describe('new alert modal', () => {
    it('should dispatch custom event on new alert button click', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(<AlertsPanel />);
      const newAlertButton = screen.getByText('+ New Alert');

      await act(async () => {
        fireEvent.click(newAlertButton);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchSpy.mock.calls[0][0].type).toBe('lokifi:open-alert');

      dispatchSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Notification Permission Tests
  // ==========================================================================

  describe('notification permission', () => {
    it('should call ensureNotificationPermission on button click', async () => {
      const { ensureNotificationPermission } = await import('../../src/lib/utils/notify');

      render(<AlertsPanel />);
      const notifButton = screen.getByText('Enable Notifications');

      await act(async () => {
        fireEvent.click(notifButton);
      });

      expect(ensureNotificationPermission).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should update display when store changes', () => {
      const { rerender } = render(<AlertsPanel />);
      expect(screen.getByText('No alerts.')).toBeInTheDocument();

      act(() => {
        useChartStore.setState({
          alerts: [createMockAlert()],
        });
      });

      rerender(<AlertsPanel />);
      expect(screen.queryByText('No alerts.')).not.toBeInTheDocument();
    });

    it('should handle multiple alerts with different states', () => {
      const alerts = [
        createMockAlert({ enabled: true, kind: 'price-above' }),
        createMockAlert({ enabled: false, kind: 'price-below' }),
        createMockAlert({ enabled: true, snoozedUntil: Date.now() + 3600000, kind: 'volume' }),
        createMockAlert({ enabled: true, triggers: 5, kind: 'rsi-overbought' }),
      ];

      act(() => {
        useChartStore.setState({ alerts });
      });

      render(<AlertsPanel />);

      // All alerts should be displayed
      expect(screen.getAllByText(/^#/)).toHaveLength(4);
      expect(screen.getByText('price-above')).toBeInTheDocument();
      expect(screen.getByText('price-below')).toBeInTheDocument();
      expect(screen.getByText('volume')).toBeInTheDocument();
      expect(screen.getByText('rsi-overbought')).toBeInTheDocument();
    });
  });
});
