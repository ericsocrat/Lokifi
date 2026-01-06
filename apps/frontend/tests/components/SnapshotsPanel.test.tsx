/**
 * Tests for SnapshotsPanel Component
 *
 * Covers the snapshot management panel UI:
 * - Rendering and initial state
 * - Save snapshot functionality
 * - Load snapshot functionality
 * - Delete snapshot functionality
 * - Keyboard shortcuts (Alt+Left/Right)
 * - Empty state display
 *
 * Session 131: Test coverage for SnapshotsPanel component
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SnapshotsPanel from '../../src/components/SnapshotsPanel';
import { useChartStore } from '../../src/state/store';

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Reset store between tests
const resetStore = () => {
  useChartStore.setState({
    snapshots: [],
  });
};

// Mock snapshot factory
const createMockSnapshot = (
  overrides: Partial<{
    id: string;
    name: string;
    createdAt: number;
  }> = {}
) => ({
  id: crypto.randomUUID(),
  name: 'Test Snapshot',
  createdAt: Date.now(),
  ...overrides,
});

describe('SnapshotsPanel', () => {
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
      render(<SnapshotsPanel />);
      expect(screen.getByText('Snapshots')).toBeInTheDocument();
    });

    it('should render name input with default value', () => {
      render(<SnapshotsPanel />);
      expect(screen.getByDisplayValue('Snapshot')).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<SnapshotsPanel />);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should render keyboard shortcut tips', () => {
      render(<SnapshotsPanel />);
      expect(screen.getByText(/Tips:/)).toBeInTheDocument();
      expect(screen.getByText('Alt')).toBeInTheDocument();
    });

    it('should render empty state when no snapshots', () => {
      render(<SnapshotsPanel />);
      expect(screen.getByText('No snapshots yet.')).toBeInTheDocument();
    });

    it('should not render empty state when snapshots exist', () => {
      const snapshot = createMockSnapshot();

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      expect(screen.queryByText('No snapshots yet.')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Save Snapshot Tests
  // ==========================================================================

  describe('save snapshot', () => {
    it('should update name input on change', async () => {
      render(<SnapshotsPanel />);
      const nameInput = screen.getByDisplayValue('Snapshot');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'My Snapshot' } });
      });

      expect(screen.getByDisplayValue('My Snapshot')).toBeInTheDocument();
    });

    it('should save snapshot with entered name', async () => {
      const saveSnapshotSpy = vi.spyOn(useChartStore.getState(), 'saveSnapshot');

      render(<SnapshotsPanel />);
      const nameInput = screen.getByDisplayValue('Snapshot');
      const saveButton = screen.getByText('Save');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Custom Name' } });
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(saveSnapshotSpy).toHaveBeenCalledWith('Custom Name');
    });

    it('should not save snapshot with empty name', async () => {
      const saveSnapshotSpy = vi.spyOn(useChartStore.getState(), 'saveSnapshot');

      render(<SnapshotsPanel />);
      const nameInput = screen.getByDisplayValue('Snapshot');
      const saveButton = screen.getByText('Save');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: '' } });
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(saveSnapshotSpy).not.toHaveBeenCalled();
    });

    it('should not save snapshot with whitespace-only name', async () => {
      const saveSnapshotSpy = vi.spyOn(useChartStore.getState(), 'saveSnapshot');

      render(<SnapshotsPanel />);
      const nameInput = screen.getByDisplayValue('Snapshot');
      const saveButton = screen.getByText('Save');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: '   ' } });
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(saveSnapshotSpy).not.toHaveBeenCalled();
    });

    it('should trim whitespace from name when saving', async () => {
      const saveSnapshotSpy = vi.spyOn(useChartStore.getState(), 'saveSnapshot');

      render(<SnapshotsPanel />);
      const nameInput = screen.getByDisplayValue('Snapshot');
      const saveButton = screen.getByText('Save');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: '  Trimmed Name  ' } });
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(saveSnapshotSpy).toHaveBeenCalledWith('Trimmed Name');
    });
  });

  // ==========================================================================
  // Snapshot Display Tests
  // ==========================================================================

  describe('snapshot display', () => {
    it('should display snapshot name', () => {
      const snapshot = createMockSnapshot({ name: 'Main View' });

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      expect(screen.getByText(/Main View/)).toBeInTheDocument();
    });

    it('should display truncated snapshot ID', () => {
      const snapshot = createMockSnapshot({ id: 'abcdefghijklmnop' });

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      expect(screen.getByText('#abcde')).toBeInTheDocument();
    });

    it('should display snapshot creation date', () => {
      const createdAt = new Date('2024-01-15T10:30:00').getTime();
      const snapshot = createMockSnapshot({ createdAt });

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      // Date format will vary by locale, just check it contains the date
      const dateText = new Date(createdAt).toLocaleString();
      expect(screen.getByText(new RegExp(dateText.split(',')[0]))).toBeInTheDocument();
    });

    it('should display load button for each snapshot', () => {
      const snapshot = createMockSnapshot();

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      expect(screen.getByText('Load')).toBeInTheDocument();
    });

    it('should display delete button for each snapshot', () => {
      const snapshot = createMockSnapshot();

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should display multiple snapshots', () => {
      const snapshots = [
        createMockSnapshot({ name: 'First' }),
        createMockSnapshot({ name: 'Second' }),
        createMockSnapshot({ name: 'Third' }),
      ];

      act(() => {
        useChartStore.setState({ snapshots });
      });

      render(<SnapshotsPanel />);
      expect(screen.getByText(/First/)).toBeInTheDocument();
      expect(screen.getByText(/Second/)).toBeInTheDocument();
      expect(screen.getByText(/Third/)).toBeInTheDocument();
      expect(screen.getAllByText('Load')).toHaveLength(3);
      expect(screen.getAllByText('Delete')).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Load Snapshot Tests
  // ==========================================================================

  describe('load snapshot', () => {
    it('should call loadSnapshot on load button click', async () => {
      const snapshot = createMockSnapshot({ id: 'test-id' });
      const loadSnapshotSpy = vi.spyOn(useChartStore.getState(), 'loadSnapshot');

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      const loadButton = screen.getByText('Load');

      await act(async () => {
        fireEvent.click(loadButton);
      });

      expect(loadSnapshotSpy).toHaveBeenCalledWith('test-id');
    });

    it('should load correct snapshot when multiple exist', async () => {
      const snapshot1 = createMockSnapshot({ id: 'id-1', name: 'First' });
      const snapshot2 = createMockSnapshot({ id: 'id-2', name: 'Second' });
      const loadSnapshotSpy = vi.spyOn(useChartStore.getState(), 'loadSnapshot');

      act(() => {
        useChartStore.setState({ snapshots: [snapshot1, snapshot2] });
      });

      render(<SnapshotsPanel />);
      const loadButtons = screen.getAllByText('Load');

      // Click second load button
      await act(async () => {
        fireEvent.click(loadButtons[1]);
      });

      expect(loadSnapshotSpy).toHaveBeenCalledWith('id-2');
    });
  });

  // ==========================================================================
  // Delete Snapshot Tests
  // ==========================================================================

  describe('delete snapshot', () => {
    it('should call deleteSnapshot on delete button click', async () => {
      const snapshot = createMockSnapshot({ id: 'test-id' });
      const deleteSnapshotSpy = vi.spyOn(useChartStore.getState(), 'deleteSnapshot');

      act(() => {
        useChartStore.setState({ snapshots: [snapshot] });
      });

      render(<SnapshotsPanel />);
      const deleteButton = screen.getByText('Delete');

      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(deleteSnapshotSpy).toHaveBeenCalledWith('test-id');
    });

    it('should delete correct snapshot when multiple exist', async () => {
      const snapshot1 = createMockSnapshot({ id: 'id-1', name: 'First' });
      const snapshot2 = createMockSnapshot({ id: 'id-2', name: 'Second' });
      const deleteSnapshotSpy = vi.spyOn(useChartStore.getState(), 'deleteSnapshot');

      act(() => {
        useChartStore.setState({ snapshots: [snapshot1, snapshot2] });
      });

      render(<SnapshotsPanel />);
      const deleteButtons = screen.getAllByText('Delete');

      // Click first delete button
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(deleteSnapshotSpy).toHaveBeenCalledWith('id-1');
    });
  });

  // ==========================================================================
  // Keyboard Shortcut Tests
  // ==========================================================================

  describe('keyboard shortcuts', () => {
    it('should cycle to previous snapshot on Alt+Left', async () => {
      const cycleSnapshotSpy = vi.spyOn(useChartStore.getState(), 'cycleSnapshot');

      render(<SnapshotsPanel />);

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
      });

      expect(cycleSnapshotSpy).toHaveBeenCalledWith(-1);
    });

    it('should cycle to next snapshot on Alt+Right', async () => {
      const cycleSnapshotSpy = vi.spyOn(useChartStore.getState(), 'cycleSnapshot');

      render(<SnapshotsPanel />);

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true });
      });

      expect(cycleSnapshotSpy).toHaveBeenCalledWith(1);
    });

    it('should not cycle without Alt key', async () => {
      const cycleSnapshotSpy = vi.spyOn(useChartStore.getState(), 'cycleSnapshot');

      render(<SnapshotsPanel />);

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: false });
      });

      expect(cycleSnapshotSpy).not.toHaveBeenCalled();
    });

    it('should not respond to other keys with Alt', async () => {
      const cycleSnapshotSpy = vi.spyOn(useChartStore.getState(), 'cycleSnapshot');

      render(<SnapshotsPanel />);

      await act(async () => {
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true });
      });

      expect(cycleSnapshotSpy).not.toHaveBeenCalled();
    });

    it('should cleanup keyboard listener on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<SnapshotsPanel />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should update display when store changes', () => {
      render(<SnapshotsPanel />);
      expect(screen.getByText('No snapshots yet.')).toBeInTheDocument();

      act(() => {
        useChartStore.setState({
          snapshots: [createMockSnapshot({ name: 'New Snapshot' })],
        });
      });

      expect(screen.queryByText('No snapshots yet.')).not.toBeInTheDocument();
      expect(screen.getByText(/New Snapshot/)).toBeInTheDocument();
    });

    it('should handle full snapshot workflow', async () => {
      render(<SnapshotsPanel />);

      // Initially empty
      expect(screen.getByText('No snapshots yet.')).toBeInTheDocument();

      // Simulate adding a snapshot to the store (as if save worked)
      act(() => {
        useChartStore.setState({
          snapshots: [createMockSnapshot({ id: 'snap-1', name: 'Test Snapshot' })],
        });
      });

      // Snapshot should be visible
      expect(screen.getByText(/Test Snapshot/)).toBeInTheDocument();

      // Click load
      const loadButton = screen.getByText('Load');
      const loadSnapshotSpy = vi.spyOn(useChartStore.getState(), 'loadSnapshot');

      await act(async () => {
        fireEvent.click(loadButton);
      });

      expect(loadSnapshotSpy).toHaveBeenCalledWith('snap-1');

      // Click delete
      const deleteButton = screen.getByText('Delete');
      const deleteSnapshotSpy = vi.spyOn(useChartStore.getState(), 'deleteSnapshot');

      await act(async () => {
        fireEvent.click(deleteButton);
      });

      expect(deleteSnapshotSpy).toHaveBeenCalledWith('snap-1');
    });
  });
});
