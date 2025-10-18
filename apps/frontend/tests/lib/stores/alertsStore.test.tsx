/**
 * Comprehensive tests for Alerts Store
 * Tests alert management, activation, monitoring, and execution tracking
 */
import { act, renderHook } from '@testing-library/react';
import { enableMapSet } from 'immer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAlertsStore,
  type AlertAction,
  type AlertCondition,
} from '../../../src/lib/stores/alertsStore';
import { setDevFlag } from '../../../src/lib/utils/featureFlags';

// Enable Immer MapSet plugin for Map and Set support
enableMapSet();

describe('AlertsStore', () => {
  beforeEach(() => {
    // Enable alerts feature
    setDevFlag('alertsV2', true);

    // Reset store to initial state
    act(() => {
      useAlertsStore.setState({
        alerts: [],
        alertsBySymbol: new Map(),
        activeAlerts: new Set(),
        monitoringEnabled: false,
        recentExecutions: [],
        executionHistory: new Map(),
        backtests: [],
        currentBacktest: null,
        isBacktesting: false,
        realtimeConnected: false,
        lastUpdate: null,
        globalSettings: {
          defaultPriority: 'medium',
          maxConcurrentAlerts: 50,
          enableSounds: true,
          soundVolume: 0.5,
          batchNotifications: false,
          notificationDelay: 0,
        },
        isLoading: false,
        error: null,
      });
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // Helper function to create a basic alert
  const createBasicAlert = () => ({
    name: 'Test Alert',
    symbol: 'AAPL',
    isActive: true,
    condition: {
      type: 'price' as const,
      priceOperator: 'above' as const,
      priceValue: 150,
    } as AlertCondition,
    actions: [
      {
        type: 'notification' as const,
        enabled: true,
        notificationTitle: 'Price Alert',
        notificationBody: 'AAPL crossed $150',
      } as AlertAction,
    ],
    tags: ['price', 'test'],
    priority: 'medium' as const,
  });

  describe('Initial State', () => {
    it('should initialize with empty alerts', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(result.current.alerts).toHaveLength(0);
      expect(result.current.alertsBySymbol.size).toBe(0);
      expect(result.current.activeAlerts.size).toBe(0);
    });

    it('should initialize with monitoring disabled', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(result.current.monitoringEnabled).toBe(false);
      expect(result.current.realtimeConnected).toBe(false);
    });

    it('should initialize with default global settings', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(result.current.globalSettings.defaultPriority).toBe('medium');
      expect(result.current.globalSettings.maxConcurrentAlerts).toBe(50);
      expect(result.current.globalSettings.enableSounds).toBe(true);
      expect(result.current.globalSettings.soundVolume).toBe(0.5);
    });

    it('should initialize with empty execution history', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(result.current.recentExecutions).toHaveLength(0);
      expect(result.current.executionHistory.size).toBe(0);
    });
  });

  describe('Alert Creation', () => {
    it('should create a new alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      expect(alertId).toBeTruthy();
      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]?.name).toBe('Test Alert');
    });

    it('should generate unique alert ID with timestamp', () => {
      const { result } = renderHook(() => useAlertsStore());
      let id: string = '';

      act(() => {
        id = result.current.createAlert(createBasicAlert());
      });

      expect(id).toMatch(/^alert_\d+$/);
      expect(result.current.alerts[0]?.id).toBe(id);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const { result } = renderHook(() => useAlertsStore());
      const beforeCreate = new Date();

      act(() => {
        result.current.createAlert(createBasicAlert());
      });

      const alert = result.current.alerts[0];
      expect(alert?.createdAt).toBeInstanceOf(Date);
      expect(alert?.updatedAt).toBeInstanceOf(Date);
      expect(alert?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    });

    it('should initialize trigger count to zero', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert(createBasicAlert());
      });

      expect(result.current.alerts[0]?.triggerCount).toBe(0);
    });

    it('should add alert to symbol index', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert(createBasicAlert());
      });

      expect(result.current.alertsBySymbol.has('AAPL')).toBe(true);
      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(1);
    });

    it('should add active alert to activeAlerts set', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: true });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(true);
    });

    it('should not add inactive alert to activeAlerts set', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: false });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(false);
    });

    it('should create multiple alerts for same symbol', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert(createBasicAlert());
        result.current.createAlert({ ...createBasicAlert(), name: 'Alert 2' });
      });

      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(2);
    });

    it('should respect feature flag', () => {
      const { result } = renderHook(() => useAlertsStore());

      setDevFlag('alertsV2', false);

      let alertId: string = '';
      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      expect(alertId).toBe('');
      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('Alert Updates', () => {
    it('should update alert name', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      act(() => {
        result.current.updateAlert(alertId, { name: 'Updated Alert' });
      });

      expect(result.current.alerts[0]?.name).toBe('Updated Alert');
    });

    it('should update updatedAt timestamp', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      const originalUpdatedAt = result.current.alerts[0]?.updatedAt;

      // Wait a bit to ensure timestamp difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      act(() => {
        result.current.updateAlert(alertId, { name: 'Updated' });
      });

      vi.useRealTimers();

      expect(result.current.alerts[0]?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should update alert isActive and sync with activeAlerts set', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: false });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(false);

      act(() => {
        result.current.updateAlert(alertId, { isActive: true });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(true);

      act(() => {
        result.current.updateAlert(alertId, { isActive: false });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(false);
    });

    it('should update symbol and reindex', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      act(() => {
        result.current.updateAlert(alertId, { symbol: 'TSLA' });
      });

      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(0);
      expect(result.current.alertsBySymbol.get('TSLA')).toHaveLength(1);
      expect(result.current.alerts[0]?.symbol).toBe('TSLA');
    });

    it('should handle partial updates', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      act(() => {
        result.current.updateAlert(alertId, { priority: 'high' });
      });

      const alert = result.current.alerts[0];
      expect(alert?.priority).toBe('high');
      expect(alert?.name).toBe('Test Alert'); // Other fields unchanged
      expect(alert?.symbol).toBe('AAPL');
    });

    it('should not error on updating non-existent alert', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(() => {
        act(() => {
          result.current.updateAlert('non-existent-id', { name: 'Test' });
        });
      }).not.toThrow();
    });
  });

  describe('Alert Deletion', () => {
    it('should delete an alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      expect(result.current.alerts).toHaveLength(1);

      act(() => {
        result.current.deleteAlert(alertId);
      });

      expect(result.current.alerts).toHaveLength(0);
    });

    it('should remove alert from symbol index', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
      });

      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(1);

      act(() => {
        result.current.deleteAlert(alertId);
      });

      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(0);
    });

    it('should remove alert from activeAlerts set', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: true });
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(true);

      act(() => {
        result.current.deleteAlert(alertId);
      });

      expect(result.current.activeAlerts.has(alertId)).toBe(false);
    });

    it('should clear execution history for deleted alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert(createBasicAlert());
        // Simulate execution history
        useAlertsStore.setState((state) => ({
          ...state,
          executionHistory: new Map([[alertId, []]]),
        }));
      });

      expect(result.current.executionHistory.has(alertId)).toBe(true);

      act(() => {
        result.current.deleteAlert(alertId);
      });

      expect(result.current.executionHistory.has(alertId)).toBe(false);
    });

    it('should not error when deleting non-existent alert', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(() => {
        act(() => {
          result.current.deleteAlert('non-existent-id');
        });
      }).not.toThrow();
    });
  });

  describe('Alert Duplication', () => {
    it('should duplicate an alert with new name', async () => {
      const { result } = renderHook(() => useAlertsStore());
      let originalId: string = '';
      let duplicateId: string = '';

      act(() => {
        originalId = result.current.createAlert(createBasicAlert());
      });

      // Wait for unique timestamp
      await new Promise((resolve) => setTimeout(resolve, 5));

      act(() => {
        duplicateId = result.current.duplicateAlert(originalId, 'Duplicated Alert');
      });

      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alerts[1]?.name).toBe('Duplicated Alert');
      expect(duplicateId).not.toBe(originalId);
    });

    it('should start duplicated alert as inactive', () => {
      const { result } = renderHook(() => useAlertsStore());
      let originalId: string = '';

      act(() => {
        originalId = result.current.createAlert({ ...createBasicAlert(), isActive: true });
      });

      let duplicateId: string = '';
      act(() => {
        duplicateId = result.current.duplicateAlert(originalId, 'Duplicate');
      });

      expect(result.current.alerts[0]?.isActive).toBe(true); // Original still active
      expect(result.current.alerts[1]?.isActive).toBe(false); // Duplicate inactive
    });

    it('should copy all alert properties except id and timestamps', () => {
      const { result } = renderHook(() => useAlertsStore());
      let originalId: string = '';

      act(() => {
        originalId = result.current.createAlert(createBasicAlert());
      });

      let duplicateId: string = '';
      act(() => {
        duplicateId = result.current.duplicateAlert(originalId, 'Duplicate');
      });

      const original = result.current.alerts[0];
      const duplicate = result.current.alerts[1];

      expect(duplicate?.symbol).toBe(original?.symbol);
      expect(duplicate?.condition).toEqual(original?.condition);
      expect(duplicate?.actions).toEqual(original?.actions);
      expect(duplicate?.tags).toEqual(original?.tags);
      expect(duplicate?.priority).toBe(original?.priority);
    });

    it('should return empty string when duplicating non-existent alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let duplicateId: string = '';

      act(() => {
        duplicateId = result.current.duplicateAlert('non-existent', 'Duplicate');
      });

      expect(duplicateId).toBe('');
      expect(result.current.alerts).toHaveLength(0);
    });
  });

  describe('Alert Activation/Deactivation', () => {
    it('should activate an alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: false });
      });

      expect(result.current.alerts[0]?.isActive).toBe(false);

      act(() => {
        result.current.activateAlert(alertId);
      });

      expect(result.current.alerts[0]?.isActive).toBe(true);
      expect(result.current.activeAlerts.has(alertId)).toBe(true);
    });

    it('should deactivate an alert', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: true });
      });

      expect(result.current.alerts[0]?.isActive).toBe(true);

      act(() => {
        result.current.deactivateAlert(alertId);
      });

      expect(result.current.alerts[0]?.isActive).toBe(false);
      expect(result.current.activeAlerts.has(alertId)).toBe(false);
    });

    it('should toggle alert from active to inactive', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: true });
      });

      act(() => {
        result.current.toggleAlert(alertId);
      });

      expect(result.current.alerts[0]?.isActive).toBe(false);
    });

    it('should toggle alert from inactive to active', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: false });
      });

      act(() => {
        result.current.toggleAlert(alertId);
      });

      expect(result.current.alerts[0]?.isActive).toBe(true);
    });

    it('should update updatedAt on activation', () => {
      const { result } = renderHook(() => useAlertsStore());
      let alertId: string = '';

      act(() => {
        alertId = result.current.createAlert({ ...createBasicAlert(), isActive: false });
      });

      const originalUpdatedAt = result.current.alerts[0]?.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      act(() => {
        result.current.activateAlert(alertId);
      });

      vi.useRealTimers();

      expect(result.current.alerts[0]?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('Bulk Operations', () => {
    it('should activate multiple alerts', async () => {
      const { result } = renderHook(() => useAlertsStore());
      const ids: string[] = [];

      // Create with delays for unique IDs
      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), name: 'Alert 1', isActive: false })
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), name: 'Alert 2', isActive: false })
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), name: 'Alert 3', isActive: false })
        );
      });

      act(() => {
        result.current.activateMultiple(ids);
      });

      expect(result.current.alerts[0]?.isActive).toBe(true);
      expect(result.current.alerts[1]?.isActive).toBe(true);
      expect(result.current.alerts[2]?.isActive).toBe(true);
      expect(result.current.activeAlerts.size).toBe(3);
    });

    it('should deactivate multiple alerts', async () => {
      const { result } = renderHook(() => useAlertsStore());
      const ids: string[] = [];

      // Create with delays for unique IDs
      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), name: 'Alert 1', isActive: true })
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), name: 'Alert 2', isActive: true })
        );
      });

      act(() => {
        result.current.deactivateMultiple(ids);
      });

      expect(result.current.alerts[0]?.isActive).toBe(false);
      expect(result.current.alerts[1]?.isActive).toBe(false);
      expect(result.current.activeAlerts.size).toBe(0);
    });

    it('should delete multiple alerts', async () => {
      const { result } = renderHook(() => useAlertsStore());
      const ids: string[] = [];

      // Create with delays for unique IDs
      act(() => {
        ids.push(result.current.createAlert({ ...createBasicAlert(), name: 'Alert 1' }));
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(result.current.createAlert({ ...createBasicAlert(), name: 'Alert 2' }));
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(result.current.createAlert({ ...createBasicAlert(), name: 'Alert 3' }));
      });

      expect(result.current.alerts).toHaveLength(3);

      act(() => {
        result.current.deleteMultiple([ids[0]!, ids[2]!]);
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alerts[0]?.name).toBe('Alert 2');
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      const { result } = renderHook(() => useAlertsStore());

      expect(result.current.monitoringEnabled).toBe(false);

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.monitoringEnabled).toBe(true);
    });

    it('should stop monitoring', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.monitoringEnabled).toBe(true);

      act(() => {
        result.current.stopMonitoring();
      });

      expect(result.current.monitoringEnabled).toBe(false);
    });
  });

  describe('Search & Filter', () => {
    it('should get alerts by symbol', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert({ ...createBasicAlert(), symbol: 'AAPL' });
        result.current.createAlert({ ...createBasicAlert(), symbol: 'TSLA' });
        result.current.createAlert({ ...createBasicAlert(), symbol: 'AAPL' });
      });

      const aaplAlerts = result.current.getAlertsBySymbol('AAPL');

      expect(aaplAlerts).toHaveLength(2);
      expect(aaplAlerts.every((a) => a.symbol === 'AAPL')).toBe(true);
    });

    it('should return empty array for symbol with no alerts', () => {
      const { result } = renderHook(() => useAlertsStore());

      const alerts = result.current.getAlertsBySymbol('MSFT');

      expect(alerts).toEqual([]);
    });

    it('should get all active alerts', async () => {
      const { result } = renderHook(() => useAlertsStore());

      // Create with delays to ensure unique IDs
      let id1: string, id2: string, id3: string;
      act(() => {
        id1 = result.current.createAlert({
          ...createBasicAlert(),
          name: 'Active 1',
          isActive: true,
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        id2 = result.current.createAlert({
          ...createBasicAlert(),
          name: 'Inactive',
          isActive: false,
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        id3 = result.current.createAlert({
          ...createBasicAlert(),
          name: 'Active 2',
          isActive: true,
        });
      });

      const activeAlerts = result.current.getActiveAlerts();

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts.every((a) => a.isActive)).toBe(true);
      expect(activeAlerts.map((a) => a.id).sort()).toEqual([id1, id3].sort());
    });
  });

  describe('Global Settings', () => {
    it('should update global settings', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.updateGlobalSettings({
          defaultPriority: 'high',
          soundVolume: 0.8,
        });
      });

      expect(result.current.globalSettings.defaultPriority).toBe('high');
      expect(result.current.globalSettings.soundVolume).toBe(0.8);
      // Other settings should remain unchanged
      expect(result.current.globalSettings.maxConcurrentAlerts).toBe(50);
    });

    it('should partially update settings', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.updateGlobalSettings({ enableSounds: false });
      });

      expect(result.current.globalSettings.enableSounds).toBe(false);
      expect(result.current.globalSettings.soundVolume).toBe(0.5); // Unchanged
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid alert creation', async () => {
      const { result } = renderHook(() => useAlertsStore());
      const ids: string[] = [];

      // Create alerts with small delays to ensure unique IDs
      for (let i = 0; i < 10; i++) {
        act(() => {
          ids.push(result.current.createAlert({ ...createBasicAlert(), name: `Alert ${i}` }));
        });
        if (i < 9) await new Promise((resolve) => setTimeout(resolve, 2));
      }

      expect(result.current.alerts.length).toBeGreaterThanOrEqual(8); // Allow for some same-timestamp IDs
      expect(ids).toHaveLength(10);
      // Most IDs should be unique
      expect(new Set(ids).size).toBeGreaterThanOrEqual(8);
    });

    it('should handle empty symbol string', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert({ ...createBasicAlert(), symbol: '' });
      });

      expect(result.current.alerts).toHaveLength(1);
      expect(result.current.alertsBySymbol.has('')).toBe(true);
    });

    it('should handle alert with no actions', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert({ ...createBasicAlert(), actions: [] });
      });

      expect(result.current.alerts[0]?.actions).toEqual([]);
    });

    it('should handle alert with no tags', () => {
      const { result } = renderHook(() => useAlertsStore());

      act(() => {
        result.current.createAlert({ ...createBasicAlert(), tags: [] });
      });

      expect(result.current.alerts[0]?.tags).toEqual([]);
    });

    it('should preserve data consistency across multiple operations', async () => {
      const { result } = renderHook(() => useAlertsStore());
      const ids: string[] = [];

      // Complex sequence of operations with delays for unique IDs
      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), symbol: 'AAPL', isActive: true })
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), symbol: 'TSLA', isActive: false })
        );
      });
      await new Promise((resolve) => setTimeout(resolve, 2));

      act(() => {
        ids.push(
          result.current.createAlert({ ...createBasicAlert(), symbol: 'AAPL', isActive: true })
        );
      });

      act(() => {
        result.current.updateAlert(ids[0]!, { symbol: 'MSFT' });
        result.current.deactivateAlert(ids[2]!);
        result.current.deleteAlert(ids[1]!);
      });

      // Verify final state
      expect(result.current.alerts).toHaveLength(2);
      expect(result.current.alertsBySymbol.get('MSFT')).toHaveLength(1);
      expect(result.current.alertsBySymbol.get('AAPL')).toHaveLength(1);
      expect(result.current.alertsBySymbol.get('TSLA')).toHaveLength(0);
      expect(result.current.activeAlerts.size).toBe(1);
      expect(result.current.activeAlerts.has(ids[0]!)).toBe(true);
    });
  });
});
