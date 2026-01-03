import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FLAGS } from '../../src/lib/stores/featureFlags';
import {
  type RollbackPlan,
  type RollbackSettings,
  type RollbackSnapshot,
  type RollbackStep,
  type RollbackTrigger,
  useRollbackStore,
} from '../../src/lib/stores/rollbackStore';

vi.mock('../../src/lib/stores/featureFlags', () => ({
  FLAGS: {
    rollback: false,
  },
}));

describe('rollbackStore', () => {
  const baseSettings: RollbackSettings = {
    enableAutoRollback: true,
    defaultTimeout: 3600,
    maxConcurrentRollbacks: 3,
    autoCreateSnapshots: true,
    snapshotRetentionDays: 30,
    maxSnapshotsPerVersion: 5,
    snapshotCompressionEnabled: true,
    enablePreValidation: true,
    enablePostValidation: true,
    validationTimeout: 300,
    enableNotifications: true,
    defaultNotificationChannels: ['email', 'slack'],
    notificationCooldown: 300,
    requireApprovalForCritical: true,
    allowedRoles: ['admin', 'devops'],
    auditAllActions: true,
    enableProgressTracking: true,
    logLevel: 'info',
    enableRecoveryMode: true,
    maxRecoveryAttempts: 3,
    recoveryDelay: 30,
  };

  const resetStore = () => {
    act(() => {
      useRollbackStore.setState({
        snapshots: [],
        selectedSnapshot: null,
        plans: [],
        activePlan: null,
        executions: [],
        currentExecution: null,
        sidebarCollapsed: false,
        selectedTab: 'snapshots',
        settings: { ...baseSettings },
        isExecuting: false,
        error: null,
        lastSync: null,
      });
    });
  };

  const createSnapshotInput = (
    overrides: Partial<
      Omit<RollbackSnapshot, 'id' | 'createdAt' | 'checksum' | 'isVerified' | 'lastVerified'>
    > = {}
  ) => ({
    name: 'Test Snapshot',
    version: '1.0.0',
    applicationState: {
      userPreferences: {},
      sessionData: {},
      cachedData: {},
      featureFlags: {},
      dashboardLayouts: {},
      chartConfigurations: {},
      customSettings: {},
    },
    databaseState: {
      schemaVersion: '1.0.0',
      tables: [],
      recordCounts: {},
      dataSize: 0,
      backupPath: '/backup.sql',
      backupFormat: 'sql',
      isCompressed: true,
    },
    configurationState: {
      environment: {},
      appConfig: {},
      serviceConfigs: {},
      securityConfig: {},
    },
    tags: ['test'],
    description: 'Snapshot for testing',
    createdBy: 'tester',
    status: 'active' as const,
    size: 1024,
    ...overrides,
  });

  const planSettings: RollbackPlan['settings'] = {
    autoExecute: false,
    executionTimeout: 3600,
    parallelSteps: false,
    validateBeforeRollback: true,
    validateAfterRollback: true,
    stopOnValidationFailure: true,
    notifyOnStart: true,
    notifyOnSuccess: true,
    notifyOnFailure: true,
    notificationChannels: ['slack'],
    createRecoverySnapshot: true,
    allowNestedRollbacks: false,
    maxRollbackDepth: 3,
  };

  const createPlanData = (
    overrides: Partial<
      Omit<RollbackPlan, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'>
    > = {}
  ) => ({
    name: 'Test Plan',
    description: 'Plan description',
    targetSnapshot: 'snapshot-1',
    rollbackSteps: [],
    triggers: [],
    prerequisites: [],
    settings: { ...planSettings },
    isEnabled: true,
    ...overrides,
  });

  const createStepData = (
    overrides: Partial<Omit<RollbackStep, 'id'>> = {}
  ): Omit<RollbackStep, 'id'> => ({
    name: 'Service restart',
    type: 'service_restart',
    config: {
      serviceRestart: {
        services: ['api-server'],
        restartMode: 'rolling',
        waitTime: 10,
      },
    },
    order: 1,
    isRequired: true,
    timeout: 300,
    canRollback: true,
    dependsOn: [],
    ...overrides,
  });

  const createTriggerData = (
    overrides: Partial<Omit<RollbackTrigger, 'id' | 'triggerCount' | 'lastTriggered'>> = {}
  ): Omit<RollbackTrigger, 'id' | 'triggerCount' | 'lastTriggered'> => ({
    name: 'Error rate',
    type: 'error_rate_threshold',
    config: {
      errorRate: {
        threshold: 5,
        timeWindow: 5,
        errorTypes: ['5xx'],
      },
    },
    isEnabled: true,
    cooldown: 60,
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    FLAGS.rollback = true;
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty collections and defaults', () => {
      const state = useRollbackStore.getState();
      expect(state.snapshots).toHaveLength(0);
      expect(state.plans).toHaveLength(0);
      expect(state.executions).toHaveLength(0);
      expect(state.selectedTab).toBe('snapshots');
      expect(state.settings.enableAutoRollback).toBe(true);
      expect(state.settings.maxSnapshotsPerVersion).toBe(5);
    });
  });

  describe('Snapshot Management', () => {
    it('should create snapshots and enforce maxSnapshotsPerVersion', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      act(() => {
        useRollbackStore.setState((state) => ({
          settings: { ...state.settings, maxSnapshotsPerVersion: 1 },
        }));
      });

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const first = useRollbackStore
        .getState()
        .createSnapshot(createSnapshotInput({ version: '1.0.0' }));
      await vi.runAllTimersAsync();
      const firstId = await first;

      vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
      const second = useRollbackStore
        .getState()
        .createSnapshot(createSnapshotInput({ version: '1.0.0' }));
      await vi.runAllTimersAsync();
      const secondId = await second;

      const { snapshots } = useRollbackStore.getState();
      expect(snapshots).toHaveLength(1);
      expect(snapshots.find((s) => s.id === secondId)).toBeDefined();
      expect(firstId).not.toBe(secondId);
      randomSpy.mockRestore();
    });

    it('should verify snapshot and mark failures as corrupted', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0.05);
      act(() => {
        useRollbackStore.setState((state) => ({
          snapshots: [
            {
              ...createSnapshotInput(),
              id: 'snap-1',
              createdAt: new Date(),
              checksum: 'abc',
              isVerified: false,
            },
          ],
        }));
      });

      const verification = useRollbackStore.getState().verifySnapshot('snap-1');
      await vi.runAllTimersAsync();
      const result = await verification;

      const snapshot = useRollbackStore.getState().snapshots[0];
      expect(result).toBe(false);
      expect(snapshot.isVerified).toBe(false);
      expect(snapshot.status).toBe('corrupted');
      expect(snapshot.lastVerified).toBeInstanceOf(Date);
      randomSpy.mockRestore();
    });
  });

  describe('Plan Management', () => {
    it('should create plan with metadata', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
      });

      const plan = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(plan).toBeDefined();
      expect(plan?.executionHistory).toEqual([]);
      expect(plan?.createdAt).toBeInstanceOf(Date);
      expect(plan?.updatedAt).toBeInstanceOf(Date);
    });

    it('should update plan and refresh updatedAt', () => {
      let planId = '';
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
      });

      const before = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(before).toBeDefined();

      vi.setSystemTime(new Date('2024-01-01T00:10:00Z'));
      act(() => {
        useRollbackStore
          .getState()
          .updatePlan(planId, { description: 'Updated', isEnabled: false });
      });
      const updated = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(updated?.description).toBe('Updated');
      expect(updated?.isEnabled).toBe(false);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(before?.updatedAt.getTime() ?? 0);
    });

    it('should delete plan and clear activePlan', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
        useRollbackStore.getState().setActivePlan(planId);
      });

      act(() => {
        useRollbackStore.getState().deletePlan(planId);
      });

      const { plans, activePlan } = useRollbackStore.getState();
      expect(plans).toHaveLength(0);
      expect(activePlan).toBeNull();
    });

    it('should clone plan with new id and disabled state', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData({ isEnabled: true }));
      });

      let cloneId = '';
      act(() => {
        cloneId = useRollbackStore.getState().clonePlan(planId, 'Clone');
      });

      const original = useRollbackStore.getState().plans.find((p) => p.id === planId);
      const clone = useRollbackStore.getState().plans.find((p) => p.id === cloneId);
      expect(clone?.name).toBe('Clone');
      expect(clone?.isEnabled).toBe(false);
      expect(original?.id).not.toBe(clone?.id);
    });

    it('should set active plan id', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
        useRollbackStore.getState().setActivePlan(planId);
      });

      expect(useRollbackStore.getState().activePlan).toBe(planId);
    });
  });

  describe('Plan Configuration', () => {
    it('should add, update, and remove steps', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
      });

      let stepId = '';
      act(() => {
        stepId = useRollbackStore.getState().addStep(planId, createStepData());
      });

      const withStep = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(withStep?.rollbackSteps).toHaveLength(1);

      act(() => {
        useRollbackStore.getState().updateStep(planId, stepId, { name: 'Updated Step', order: 2 });
      });

      const updated = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(updated?.rollbackSteps[0].name).toBe('Updated Step');
      expect(updated?.rollbackSteps[0].order).toBe(2);

      act(() => {
        useRollbackStore.getState().removeStep(planId, stepId);
      });

      const afterRemoval = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(afterRemoval?.rollbackSteps).toHaveLength(0);
    });

    it('should reorder steps to match provided ids', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
      });

      let firstStep = '';
      let secondStep = '';
      act(() => {
        firstStep = useRollbackStore
          .getState()
          .addStep(planId, createStepData({ order: 1, name: 'First' }));
        secondStep = useRollbackStore
          .getState()
          .addStep(planId, createStepData({ order: 2, name: 'Second' }));
      });

      act(() => {
        useRollbackStore.getState().reorderSteps(planId, [secondStep, firstStep]);
      });

      const plan = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(plan?.rollbackSteps.map((s) => s.name)).toEqual(['Second', 'First']);
    });

    it('should add, update, and remove triggers', () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData());
      });

      let triggerId = '';
      act(() => {
        triggerId = useRollbackStore.getState().addTrigger(planId, createTriggerData());
      });

      const withTrigger = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(withTrigger?.triggers[0].triggerCount).toBe(0);

      act(() => {
        useRollbackStore
          .getState()
          .updateTrigger(planId, triggerId, { isEnabled: false, cooldown: 120 });
      });

      const updated = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(updated?.triggers[0].isEnabled).toBe(false);
      expect(updated?.triggers[0].cooldown).toBe(120);

      act(() => {
        useRollbackStore.getState().removeTrigger(planId, triggerId);
      });

      const afterRemoval = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(afterRemoval?.triggers).toHaveLength(0);
    });
  });

  describe('Execution', () => {
    it('should execute rollback and complete successfully', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      act(() => {
        useRollbackStore.setState({
          plans: [
            {
              id: 'plan-1',
              name: 'Executable Plan',
              description: 'exec',
              createdAt: new Date(),
              updatedAt: new Date(),
              targetSnapshot: 'snapshot-1',
              rollbackSteps: [
                { id: 's1', ...createStepData({ order: 1, name: 'Step 1' }) },
                { id: 's2', ...createStepData({ order: 2, name: 'Step 2' }) },
              ],
              triggers: [],
              prerequisites: [],
              settings: { ...planSettings },
              isEnabled: true,
              executionHistory: [],
            },
          ],
        });
      });

      const execution = useRollbackStore.getState().executeRollback('plan-1', 'Manual test');
      await vi.runAllTimersAsync();
      const executionId = await execution;

      const state = useRollbackStore.getState();
      const exec = state.executions.find((e) => e.id === executionId);
      expect(state.isExecuting).toBe(false);
      expect(state.currentExecution).toBeNull();
      expect(exec?.status).toBe('completed');
      expect(exec?.stepsExecuted).toHaveLength(2);
      expect(exec?.stepsExecuted.every((s) => s.status === 'completed')).toBe(true);

      const plan = state.plans.find((p) => p.id === 'plan-1');
      expect(plan?.executionHistory).toHaveLength(1);
      expect(plan?.lastExecuted).toBeInstanceOf(Date);
      randomSpy.mockRestore();
    });

    it('should fail execution when required step fails', async () => {
      const randomSpy = vi
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.5) // execution id
        .mockReturnValueOnce(0.5) // delay for step
        .mockReturnValueOnce(0.05) // failure for step
        .mockReturnValue(0.5);

      act(() => {
        useRollbackStore.setState({
          plans: [
            {
              id: 'plan-fail',
              name: 'Failing Plan',
              description: 'fail',
              createdAt: new Date(),
              updatedAt: new Date(),
              targetSnapshot: 'snapshot-1',
              rollbackSteps: [{ id: 's1', ...createStepData({ name: 'Failing' }) }],
              triggers: [],
              prerequisites: [],
              settings: { ...planSettings },
              isEnabled: true,
              executionHistory: [],
            },
          ],
        });
      });

      const execution = useRollbackStore.getState().executeRollback('plan-fail');
      execution.catch(() => {});
      await vi.runAllTimersAsync();
      await expect(execution).rejects.toThrow("Required step 'Failing' failed");

      const state = useRollbackStore.getState();
      const exec = state.executions.find((e) => e.planId === 'plan-fail');
      expect(exec?.status).toBe('failed');
      expect(state.isExecuting).toBe(false);
      expect(state.currentExecution).toBeNull();
      expect(state.error).toBe("Required step 'Failing' failed");
      randomSpy.mockRestore();
    });

    it('should cancel a running execution and clear state', () => {
      const startedAt = new Date('2024-01-01T00:00:00Z');
      act(() => {
        useRollbackStore.setState({
          executions: [
            {
              id: 'exec-1',
              planId: 'plan-1',
              startedAt,
              status: 'running',
              stepsExecuted: [],
              triggeredBy: 'user',
              triggerType: 'manual',
              environment: 'production',
              version: '1.0.0',
              executionContext: {},
            },
          ],
          currentExecution: 'exec-1',
          isExecuting: true,
        });
      });

      act(() => {
        useRollbackStore.getState().cancelExecution('exec-1');
      });

      const state = useRollbackStore.getState();
      const exec = state.executions.find((e) => e.id === 'exec-1');
      expect(exec?.status).toBe('cancelled');
      expect(exec?.completedAt).toBeInstanceOf(Date);
      expect(state.currentExecution).toBeNull();
      expect(state.isExecuting).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate plan and return results', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      act(() => {
        useRollbackStore.setState({
          plans: [
            {
              id: 'plan-1',
              name: 'Validation Plan',
              description: 'plan',
              createdAt: new Date(),
              updatedAt: new Date(),
              targetSnapshot: 'snapshot-1',
              rollbackSteps: [
                {
                  id: 'step-1',
                  ...createStepData({
                    preValidation: [
                      {
                        id: 'rule-1',
                        name: 'Check DB',
                        type: 'database_integrity',
                        severity: 'high',
                      },
                    ],
                  }),
                },
              ],
              triggers: [],
              prerequisites: [],
              settings: { ...planSettings },
              isEnabled: true,
              executionHistory: [],
            },
          ],
        });
      });

      const validation = useRollbackStore.getState().validatePlan('plan-1');
      await vi.runAllTimersAsync();
      const results = await validation;

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('passed');
      randomSpy.mockRestore();
    });

    it('should validate snapshot and include default checks', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
      act(() => {
        useRollbackStore.setState({
          snapshots: [
            {
              ...createSnapshotInput(),
              id: 'snap-1',
              createdAt: new Date(),
              checksum: 'abc',
              isVerified: true,
            },
          ],
        });
      });

      const validation = useRollbackStore.getState().validateSnapshot('snap-1');
      await vi.runAllTimersAsync();
      const results = await validation;

      expect(results).toHaveLength(4);
      expect(results.every((r) => r.status === 'passed')).toBe(true);
      randomSpy.mockRestore();
    });
  });

  describe('UI and Settings', () => {
    it('should update UI state', () => {
      act(() => {
        useRollbackStore.getState().setSidebarCollapsed(true);
        useRollbackStore.getState().setSelectedTab('plans');
      });

      const state = useRollbackStore.getState();
      expect(state.sidebarCollapsed).toBe(true);
      expect(state.selectedTab).toBe('plans');
    });

    it('should merge settings updates', () => {
      act(() => {
        useRollbackStore
          .getState()
          .updateSettings({ enableAutoRollback: false, maxRecoveryAttempts: 5 });
      });

      const { settings } = useRollbackStore.getState();
      expect(settings.enableAutoRollback).toBe(false);
      expect(settings.maxRecoveryAttempts).toBe(5);
      expect(settings.defaultTimeout).toBe(baseSettings.defaultTimeout);
    });
  });

  describe('Data Management', () => {
    it('should export plan as Blob and reject missing plans', async () => {
      let planId = '';
      act(() => {
        planId = useRollbackStore.getState().createPlan(createPlanData({ name: 'Export Plan' }));
      });

      const blob = await useRollbackStore.getState().exportPlan(planId);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);

      await expect(useRollbackStore.getState().exportPlan('missing')).rejects.toThrow(
        'Plan not found'
      );
    });

    it('should import plan from file', async () => {
      const planPayload = {
        plan: {
          ...createPlanData({ name: 'Imported Plan' }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionHistory: [],
        },
      };

      const mockFile = {
        text: async () => JSON.stringify(planPayload),
      } as unknown as File;

      const planId = await useRollbackStore.getState().importPlan(mockFile);

      const plan = useRollbackStore.getState().plans.find((p) => p.id === planId);
      expect(plan).toBeDefined();
      expect(plan?.name).toBe('Imported Plan');
    });

    it('should export snapshot as Blob', async () => {
      act(() => {
        useRollbackStore.setState({
          snapshots: [
            {
              ...createSnapshotInput(),
              id: 'snap-1',
              createdAt: new Date(),
              checksum: 'abc',
              isVerified: true,
            },
          ],
        });
      });

      const blob = await useRollbackStore.getState().exportSnapshot('snap-1');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('System', () => {
    it('should sync and set lastSync timestamp', async () => {
      const syncPromise = useRollbackStore.getState().sync();
      await vi.runAllTimersAsync();
      await syncPromise;

      const { lastSync, error } = useRollbackStore.getState();
      expect(lastSync).toBeInstanceOf(Date);
      expect(error).toBeNull();
    });

    it('should initialize sample data when empty', async () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const initPromise = useRollbackStore.getState().initialize();
      await vi.runAllTimersAsync();
      await initPromise;

      const state = useRollbackStore.getState();
      expect(state.snapshots.length).toBeGreaterThan(0);
      expect(state.plans.length).toBeGreaterThan(0);
      expect(state.activePlan).not.toBeNull();
      randomSpy.mockRestore();
    });
  });

  describe('Feature Flag Guards', () => {
    it('should throw on snapshot creation when disabled', async () => {
      FLAGS.rollback = false;
      await expect(
        useRollbackStore.getState().createSnapshot(createSnapshotInput())
      ).rejects.toThrow('Rollback not enabled');
    });

    it('should skip mutations when disabled', () => {
      FLAGS.rollback = false;
      act(() => {
        useRollbackStore.getState().setActivePlan('plan-x');
        useRollbackStore.getState().updateSettings({ enableAutoRollback: false });
      });

      const state = useRollbackStore.getState();
      expect(state.activePlan).toBeNull();
      expect(state.settings.enableAutoRollback).toBe(baseSettings.enableAutoRollback);
    });
  });
});
