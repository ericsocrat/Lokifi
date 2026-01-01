import { enableMapSet } from 'immer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as featureFlags from './featureFlags';
import type {
  Deployment,
  DeploymentMetrics,
  DeploymentStrategy,
  DeploymentStrategyType,
  PhaseExecution,
} from './progressiveDeploymentStore';
import { useProgressiveDeploymentStore } from './progressiveDeploymentStore';

// Enable Map/Set support for Immer
enableMapSet();

// Mock feature flags
vi.mock('./featureFlags', () => ({
  FLAGS: {
    progressiveDeployment: true,
  },
}));

/**
 * Mock Factory Helpers
 */

const createMockStrategy = (
  overrides: Partial<DeploymentStrategy> = {}
): Omit<DeploymentStrategy, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> => ({
  name: 'Test Strategy',
  type: 'blue_green' as DeploymentStrategyType,
  description: 'Test deployment strategy',
  config: {
    blueGreen: {
      switchStrategy: 'instant',
      warmupTime: 300,
      verificationTime: 600,
      keepOldEnvironment: true,
      oldEnvironmentTTL: 24,
    },
  },
  environments: ['staging', 'production'],
  services: ['api', 'web'],
  rolloutPlan: {
    id: 'plan-1',
    name: 'Test Plan',
    description: 'Test rollout plan',
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        description: 'Deploy to staging',
        order: 1,
        targetPercent: 50,
        duration: 300,
        startConditions: [],
        exitConditions: [],
        preActions: [],
        postActions: [],
        status: 'pending',
      },
      {
        id: 'phase-2',
        name: 'Phase 2',
        description: 'Deploy to production',
        order: 2,
        targetPercent: 100,
        duration: 300,
        startConditions: [],
        exitConditions: [],
        preActions: [],
        postActions: [],
        status: 'pending',
      },
    ],
    settings: {
      autoPromote: false,
      autoRollback: true,
      pauseOnFailure: true,
      phaseTimeout: 1800,
      stabilizationTime: 300,
      notifyOnPhaseStart: true,
      notifyOnPhaseComplete: true,
      notifyOnFailure: true,
      notificationChannels: ['slack', 'email'],
    },
  },
  healthChecks: [
    {
      id: 'http-check',
      name: 'HTTP Health Check',
      type: 'http',
      config: { url: '/health', expectedStatus: 200 },
      interval: 30,
      timeout: 10,
      retries: 3,
      successRate: 95,
      responseTime: 1000,
    },
  ],
  successCriteria: [
    {
      id: 'error-rate',
      name: 'Error Rate',
      type: 'error_rate',
      threshold: 1.0,
      operator: '<',
      timeWindow: 10,
      evaluationInterval: 30,
      weight: 40,
      severity: 'high',
    },
  ],
  rollbackTriggers: [
    {
      id: 'error-spike',
      name: 'Error Rate Spike',
      type: 'error_spike',
      config: { threshold: 5.0, timeWindow: 5 },
      isEnabled: true,
      sensitivity: 80,
      triggerCount: 0,
    },
  ],
  isActive: true,
  tags: ['test'],
  owner: 'test-team',
  ...overrides,
});

const createMockDeployment = (
  overrides: Partial<Deployment> = {}
): Omit<Deployment, 'id' | 'createdAt' | 'status' | 'phaseHistory' | 'metrics'> => ({
  strategyId: 'strategy-1',
  version: '1.0.0',
  environment: 'production',
  currentPhase: 0,
  overallProgress: 0,
  trafficPercent: 0,
  ...overrides,
});

const createMockMetrics = (overrides: Partial<DeploymentMetrics> = {}): DeploymentMetrics => ({
  errorRate: 0.5,
  responseTime: 150,
  throughput: 1200,
  availability: 99.9,
  customMetrics: {},
  baseline: {
    errorRate: 0.3,
    responseTime: 120,
    throughput: 1000,
    availability: 99.8,
    customMetrics: {},
    // any required: Nested baseline metrics (recursive structure)
    baseline: {} as any,
    improvement: {},
  },
  improvement: {
    errorRate: -0.2,
    responseTime: -30,
    throughput: 200,
    availability: 0.1,
  },
  ...overrides,
});

describe('progressiveDeploymentStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useProgressiveDeploymentStore.setState({
      strategies: [],
      deployments: [],
      selectedStrategy: null,
      activeDeployment: null,
      isMonitoring: false,
      sidebarCollapsed: false,
      selectedTab: 'strategies',
      settings: {
        defaultStrategy: null,
        enableNotifications: true,
        notificationChannels: ['slack', 'email'],
        autoRollbackEnabled: true,
        rollbackSensitivity: 80,
        monitoringInterval: 30,
        retentionDays: 90,
      },
      lastMetricsUpdate: undefined,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Reset feature flag to enabled
    vi.mocked(featureFlags.FLAGS).progressiveDeployment = true;
  });

  describe('Initial State', () => {
    it('should have empty strategies array', () => {
      const { strategies } = useProgressiveDeploymentStore.getState();
      expect(strategies).toEqual([]);
    });

    it('should have empty deployments array', () => {
      const { deployments } = useProgressiveDeploymentStore.getState();
      expect(deployments).toEqual([]);
    });

    it('should have no selected strategy', () => {
      const { selectedStrategy } = useProgressiveDeploymentStore.getState();
      expect(selectedStrategy).toBeNull();
    });

    it('should have no active deployment', () => {
      const { activeDeployment } = useProgressiveDeploymentStore.getState();
      expect(activeDeployment).toBeNull();
    });

    it('should not be monitoring', () => {
      const { isMonitoring } = useProgressiveDeploymentStore.getState();
      expect(isMonitoring).toBe(false);
    });

    it('should have default UI state', () => {
      const { sidebarCollapsed, selectedTab } = useProgressiveDeploymentStore.getState();
      expect(sidebarCollapsed).toBe(false);
      expect(selectedTab).toBe('strategies');
    });

    it('should have default settings', () => {
      const { settings } = useProgressiveDeploymentStore.getState();
      expect(settings).toEqual({
        defaultStrategy: null,
        enableNotifications: true,
        notificationChannels: ['slack', 'email'],
        autoRollbackEnabled: true,
        rollbackSensitivity: 80,
        monitoringInterval: 30,
        retentionDays: 90,
      });
    });
  });

  describe('Strategy Management', () => {
    describe('createStrategy', () => {
      it('should create a new strategy', () => {
        const { createStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();

        const id = createStrategy(strategyData);

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(id).toBeTruthy();
        expect(strategies).toHaveLength(1);
        expect(strategies[0]).toMatchObject({
          ...strategyData,
          id,
          usageCount: 0,
        });
        expect(strategies[0].createdAt).toBeInstanceOf(Date);
        expect(strategies[0].updatedAt).toBeInstanceOf(Date);
      });

      it('should create strategy with unique ID', () => {
        const { createStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();

        const id1 = createStrategy(strategyData);
        const id2 = createStrategy(strategyData);

        expect(id1).not.toBe(id2);
      });

      it('should support canary deployment type', () => {
        const { createStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({
          type: 'canary',
          config: {
            canary: {
              initialTrafficPercent: 5,
              incrementStep: 25,
              incrementInterval: 300,
              maxTrafficPercent: 100,
              observationTime: 180,
            },
          },
        });

        const id = createStrategy(strategyData);
        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].id).toBe(id);
        expect(strategies[0].type).toBe('canary');
        expect(strategies[0].config.canary?.initialTrafficPercent).toBe(5);
      });

      it('should support rolling deployment type', () => {
        const { createStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({
          type: 'rolling',
          config: {
            rolling: {
              batchSize: 2,
              batchDelay: 60,
              maxConcurrent: 5,
              healthCheckDelay: 30,
            },
          },
        });

        const id = createStrategy(strategyData);
        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].type).toBe('rolling');
        expect(strategies[0].config.rolling?.batchSize).toBe(2);
      });

      it('should support feature flag deployment type', () => {
        const { createStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({
          type: 'feature_flag',
          config: {
            featureFlag: {
              flagName: 'new_feature',
              targetPercentage: 50,
              userTargeting: ['beta_users'],
            },
          },
        });

        const id = createStrategy(strategyData);
        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].type).toBe('feature_flag');
        expect(strategies[0].config.featureFlag?.flagName).toBe('new_feature');
      });
    });

    describe('updateStrategy', () => {
      it('should update existing strategy', () => {
        const { createStrategy, updateStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);

        updateStrategy(id, { name: 'Updated Strategy' });

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].name).toBe('Updated Strategy');
      });

      it('should update strategy updatedAt timestamp', () => {
        const { createStrategy, updateStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);

        const originalTimestamp = useProgressiveDeploymentStore.getState().strategies[0].updatedAt;

        // Wait a bit to ensure timestamp changes
        vi.useFakeTimers();
        vi.advanceTimersByTime(1000);

        updateStrategy(id, { name: 'Updated' });

        vi.useRealTimers();

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
      });

      it('should not update non-existent strategy', () => {
        const { updateStrategy } = useProgressiveDeploymentStore.getState();

        updateStrategy('non-existent', { name: 'Updated' });

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies).toHaveLength(0);
      });

      it('should update multiple properties', () => {
        const { createStrategy, updateStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);

        updateStrategy(id, {
          name: 'Updated Strategy',
          description: 'Updated description',
          isActive: false,
        });

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].name).toBe('Updated Strategy');
        expect(strategies[0].description).toBe('Updated description');
        expect(strategies[0].isActive).toBe(false);
      });
    });

    describe('deleteStrategy', () => {
      it('should delete existing strategy', () => {
        const { createStrategy, deleteStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);

        deleteStrategy(id);

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies).toHaveLength(0);
      });

      it('should clear selectedStrategy if deleted', () => {
        const { createStrategy, setSelectedStrategy, deleteStrategy } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);
        setSelectedStrategy(id);

        deleteStrategy(id);

        const { selectedStrategy } = useProgressiveDeploymentStore.getState();
        expect(selectedStrategy).toBeNull();
      });

      it('should not affect selectedStrategy if different strategy deleted', () => {
        const { createStrategy, setSelectedStrategy, deleteStrategy } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id1 = createStrategy(strategyData);
        const id2 = createStrategy(strategyData);
        setSelectedStrategy(id1);

        deleteStrategy(id2);

        const { selectedStrategy } = useProgressiveDeploymentStore.getState();
        expect(selectedStrategy).toBe(id1);
      });

      it('should handle deleting non-existent strategy', () => {
        const { deleteStrategy } = useProgressiveDeploymentStore.getState();

        expect(() => deleteStrategy('non-existent')).not.toThrow();
      });
    });

    describe('cloneStrategy', () => {
      it('should clone existing strategy with new name', () => {
        const { createStrategy, cloneStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({ name: 'Original Strategy' });
        const id = createStrategy(strategyData);

        const clonedId = cloneStrategy(id, 'Cloned Strategy');

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies).toHaveLength(2);
        expect(clonedId).toBeTruthy();
        expect(clonedId).not.toBe(id);
        expect(strategies[1].name).toBe('Cloned Strategy');
        expect(strategies[1].type).toBe(strategies[0].type);
      });

      it('should set cloned strategy to inactive', () => {
        const { createStrategy, cloneStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({ isActive: true });
        const id = createStrategy(strategyData);

        const clonedId = cloneStrategy(id, 'Clone');

        const { strategies } = useProgressiveDeploymentStore.getState();
        const cloned = strategies.find((s) => s.id === clonedId);
        expect(cloned?.isActive).toBe(false);
      });

      it('should return empty string for non-existent strategy', () => {
        const { cloneStrategy } = useProgressiveDeploymentStore.getState();

        const result = cloneStrategy('non-existent', 'Clone');

        expect(result).toBe('');
      });
    });

    describe('setSelectedStrategy', () => {
      it('should set selected strategy', () => {
        const { createStrategy, setSelectedStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);

        setSelectedStrategy(id);

        const { selectedStrategy } = useProgressiveDeploymentStore.getState();
        expect(selectedStrategy).toBe(id);
      });

      it('should clear selected strategy', () => {
        const { createStrategy, setSelectedStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const id = createStrategy(strategyData);
        setSelectedStrategy(id);

        setSelectedStrategy(null);

        const { selectedStrategy } = useProgressiveDeploymentStore.getState();
        expect(selectedStrategy).toBeNull();
      });
    });
  });

  describe('Deployment Management', () => {
    describe('createDeployment', () => {
      it('should create a new deployment', () => {
        const { createStrategy, createDeployment } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });

        const id = createDeployment(deploymentData);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(id).toBeTruthy();
        expect(deployments).toHaveLength(1);
        expect(deployments[0]).toMatchObject({
          ...deploymentData,
          id,
          status: 'pending',
          currentPhase: 0,
          overallProgress: 0,
          trafficPercent: 0,
        });
        expect(deployments[0].createdAt).toBeInstanceOf(Date);
        expect(deployments[0].phaseHistory).toEqual([]);
        expect(deployments[0].metrics).toBeDefined();
      });

      it('should create deployment with initial metrics', () => {
        const { createStrategy, createDeployment } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });

        const id = createDeployment(deploymentData);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].metrics).toMatchObject({
          errorRate: 0,
          responseTime: 0,
          throughput: 0,
          availability: 100,
        });
      });

      it('should create deployment with unique ID', () => {
        const { createStrategy, createDeployment } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });

        const id1 = createDeployment(deploymentData);
        const id2 = createDeployment(deploymentData);

        expect(id1).not.toBe(id2);
      });
    });

    describe('startDeployment', () => {
      it('should start deployment and update status', async () => {
        const { createStrategy, createDeployment, startDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        // Mock executeDeploymentPhases to avoid long-running test
        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();

        await startDeployment(deploymentId);

        const { deployments, isMonitoring } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('running');
        expect(deployments[0].startedAt).toBeInstanceOf(Date);
        expect(isMonitoring).toBe(true);
      });

      it('should increment strategy usage count', async () => {
        const { createStrategy, createDeployment, startDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();

        await startDeployment(deploymentId);

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies[0].usageCount).toBe(1);
        expect(strategies[0].lastUsed).toBeInstanceOf(Date);
      });

      it('should handle deployment failure', async () => {
        const { createStrategy, createDeployment, startDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        const error = new Error('Deployment failed');
        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockRejectedValue(error);

        // Add small delay before failure to ensure duration > 0
        await new Promise((resolve) => setTimeout(resolve, 10));
        await expect(startDeployment(deploymentId)).rejects.toThrow('Deployment failed');

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('failed');
        expect(deployments[0].error).toBe('Deployment failed');
        expect(deployments[0].completedAt).toBeInstanceOf(Date);
        expect(deployments[0].duration).toBeGreaterThanOrEqual(0);
      });

      it('should not start non-existent deployment', async () => {
        const { startDeployment } = useProgressiveDeploymentStore.getState();

        await expect(startDeployment('non-existent')).resolves.toBeUndefined();
      });
    });

    describe('pauseDeployment', () => {
      it('should pause running deployment', async () => {
        const { createStrategy, createDeployment, startDeployment, pauseDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();
        await startDeployment(deploymentId);

        pauseDeployment(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('paused');
      });

      it('should not pause non-running deployment', () => {
        const { createStrategy, createDeployment, pauseDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        pauseDeployment(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('pending');
      });
    });

    describe('resumeDeployment', () => {
      it('should resume paused deployment', async () => {
        const {
          createStrategy,
          createDeployment,
          startDeployment,
          pauseDeployment,
          resumeDeployment,
        } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();
        await startDeployment(deploymentId);
        pauseDeployment(deploymentId);

        resumeDeployment(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('running');
      });

      it('should not resume non-paused deployment', () => {
        const { createStrategy, createDeployment, resumeDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        resumeDeployment(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('pending');
      });
    });

    describe('cancelDeployment', () => {
      it('should cancel deployment', async () => {
        const { createStrategy, createDeployment, startDeployment, cancelDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();
        await startDeployment(deploymentId);

        // Add small delay to ensure duration > 0
        await new Promise((resolve) => setTimeout(resolve, 10));
        cancelDeployment(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('cancelled');
        expect(deployments[0].completedAt).toBeInstanceOf(Date);
        expect(deployments[0].duration).toBeGreaterThanOrEqual(0);
      });

      it('should calculate duration correctly', () => {
        const { createStrategy, createDeployment, cancelDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        // Manually set startedAt using setState
        useProgressiveDeploymentStore.setState((state) => {
          const deployment = state.deployments.find((d) => d.id === deploymentId);
          if (deployment) {
            deployment.startedAt = new Date(Date.now() - 5000); // 5 seconds ago
          }
        });

        cancelDeployment(deploymentId);

        const deployment = useProgressiveDeploymentStore.getState().deployments[0];
        expect(deployment.duration).toBeGreaterThanOrEqual(4.9);
        expect(deployment.duration).toBeLessThanOrEqual(5.1);
      });
    });

    describe('rollbackDeployment', () => {
      it('should rollback deployment with reason', async () => {
        const { createStrategy, createDeployment, rollbackDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.useFakeTimers();
        const rollbackPromise = rollbackDeployment(deploymentId, 'Error rate exceeded');
        vi.advanceTimersByTime(5000);
        await rollbackPromise;
        vi.useRealTimers();

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('rolled_back');
        expect(deployments[0].rollbackReason).toBe('Error rate exceeded');
        expect(deployments[0].trafficPercent).toBe(0);
        expect(deployments[0].completedAt).toBeInstanceOf(Date);
      });

      it('should use default rollback reason', async () => {
        const { createStrategy, createDeployment, rollbackDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.useFakeTimers();
        const rollbackPromise = rollbackDeployment(deploymentId);
        vi.advanceTimersByTime(5000);
        await rollbackPromise;
        vi.useRealTimers();

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].rollbackReason).toBe('Manual rollback');
      });

      it('should set status to rolling_back initially', async () => {
        const { createStrategy, createDeployment, rollbackDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        const rollbackPromise = rollbackDeployment(deploymentId);

        // Check status before rollback completes
        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('rolling_back');

        vi.useFakeTimers();
        vi.advanceTimersByTime(5000);
        await rollbackPromise;
        vi.useRealTimers();
      });
    });

    describe('promotePhase', () => {
      it('should promote phase by resuming paused deployment', async () => {
        const { createStrategy, createDeployment, startDeployment, pauseDeployment, promotePhase } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'executeDeploymentPhases'
        ).mockResolvedValue();
        await startDeployment(deploymentId);
        pauseDeployment(deploymentId);

        await promotePhase(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('running');
      });

      it('should not promote non-paused deployment', async () => {
        const { createStrategy, createDeployment, promotePhase } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        await promotePhase(deploymentId);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].status).toBe('pending');
      });
    });

    describe('skipPhase', () => {
      it('should skip phase in phase history', () => {
        const { createStrategy, createDeployment, skipPhase } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        // Add a phase execution manually using setState
        const phaseExecution: PhaseExecution = {
          phaseId: 'phase-1',
          startedAt: new Date(),
          status: 'running',
          trafficPercent: 50,
          metrics: createMockMetrics(),
        };
        useProgressiveDeploymentStore.setState((state) => {
          const deployment = state.deployments.find((d) => d.id === deploymentId);
          if (deployment) {
            deployment.phaseHistory = [phaseExecution];
          }
        });

        skipPhase(deploymentId, 'phase-1');

        const deployment = useProgressiveDeploymentStore.getState().deployments[0];
        expect(deployment.phaseHistory[0].status).toBe('skipped');
        expect(deployment.phaseHistory[0].completedAt).toBeInstanceOf(Date);
      });

      it('should not affect other phases', () => {
        const { createStrategy, createDeployment, skipPhase } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        // Add multiple phase executions using setState
        useProgressiveDeploymentStore.setState((state) => {
          const deployment = state.deployments.find((d) => d.id === deploymentId);
          if (deployment) {
            deployment.phaseHistory = [
              {
                phaseId: 'phase-1',
                startedAt: new Date(),
                status: 'running',
                trafficPercent: 50,
                metrics: createMockMetrics(),
              },
              {
                phaseId: 'phase-2',
                startedAt: new Date(),
                status: 'pending',
                trafficPercent: 100,
                metrics: createMockMetrics(),
              },
            ];
          }
        });

        skipPhase(deploymentId, 'phase-1');

        const deployment = useProgressiveDeploymentStore.getState().deployments[0];
        expect(deployment.phaseHistory[0].status).toBe('skipped');
        expect(deployment.phaseHistory[1].status).toBe('pending');
      });
    });

    describe('adjustTraffic', () => {
      it('should adjust traffic percent', () => {
        const { createStrategy, createDeployment, adjustTraffic } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        adjustTraffic(deploymentId, 75);

        const { deployments } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].trafficPercent).toBe(75);
      });

      it('should clamp traffic to 0-100 range', () => {
        const { createStrategy, createDeployment, adjustTraffic } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        adjustTraffic(deploymentId, 150);
        expect(useProgressiveDeploymentStore.getState().deployments[0].trafficPercent).toBe(100);

        adjustTraffic(deploymentId, -50);
        expect(useProgressiveDeploymentStore.getState().deployments[0].trafficPercent).toBe(0);
      });
    });
  });

  describe('Monitoring', () => {
    describe('startMonitoring', () => {
      it('should start monitoring', () => {
        const { startMonitoring } = useProgressiveDeploymentStore.getState();

        startMonitoring();

        const { isMonitoring } = useProgressiveDeploymentStore.getState();
        expect(isMonitoring).toBe(true);
      });
    });

    describe('stopMonitoring', () => {
      it('should stop monitoring', () => {
        const { startMonitoring, stopMonitoring } = useProgressiveDeploymentStore.getState();
        startMonitoring();

        stopMonitoring();

        const { isMonitoring } = useProgressiveDeploymentStore.getState();
        expect(isMonitoring).toBe(false);
      });
    });

    describe('updateMetrics', () => {
      it('should update deployment metrics', () => {
        const { createStrategy, createDeployment, updateMetrics } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        const newMetrics = createMockMetrics({
          errorRate: 1.5,
          responseTime: 200,
        });

        updateMetrics(deploymentId, newMetrics);

        const { deployments, lastMetricsUpdate } = useProgressiveDeploymentStore.getState();
        expect(deployments[0].metrics).toEqual(newMetrics);
        expect(lastMetricsUpdate).toBeInstanceOf(Date);
      });

      it('should not update non-existent deployment', () => {
        const { updateMetrics } = useProgressiveDeploymentStore.getState();

        const newMetrics = createMockMetrics();
        updateMetrics('non-existent', newMetrics);

        const { lastMetricsUpdate } = useProgressiveDeploymentStore.getState();
        expect(lastMetricsUpdate).toBeUndefined();
      });
    });

    describe('runHealthCheck', () => {
      it('should run health check successfully', async () => {
        const { runHealthCheck } = useProgressiveDeploymentStore.getState();

        vi.useFakeTimers();
        const checkPromise = runHealthCheck('deployment-1', 'check-1');
        vi.advanceTimersByTime(2000);
        const result = await checkPromise;
        vi.useRealTimers();

        expect(typeof result).toBe('boolean');
      });

      it('should return health check result', async () => {
        const { runHealthCheck } = useProgressiveDeploymentStore.getState();

        // Mock Math.random to control result
        const originalRandom = Math.random;
        Math.random = vi.fn(() => 0.5);

        vi.useFakeTimers();
        const checkPromise = runHealthCheck('deployment-1', 'check-1');
        vi.advanceTimersByTime(2000);
        const result = await checkPromise;
        vi.useRealTimers();

        expect(result).toBe(true);

        Math.random = originalRandom;
      });
    });
  });

  describe('Analysis', () => {
    describe('compareDeployments', () => {
      it('should compare two deployments', () => {
        const { createStrategy, createDeployment, updateMetrics, compareDeployments } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);

        const id1 = createDeployment(createMockDeployment({ strategyId }));
        const id2 = createDeployment(createMockDeployment({ strategyId }));

        updateMetrics(id1, createMockMetrics({ errorRate: 0.5, responseTime: 150 }));
        updateMetrics(id2, createMockMetrics({ errorRate: 1.0, responseTime: 200 }));

        const comparison = compareDeployments(id1, id2);

        expect(comparison).toMatchObject({
          errorRate: {
            deployment1: 0.5,
            deployment2: 1.0,
            difference: 0.5,
          },
          responseTime: {
            deployment1: 150,
            deployment2: 200,
            difference: 50,
          },
        });
      });

      it('should return null if deployment not found', () => {
        const { compareDeployments } = useProgressiveDeploymentStore.getState();

        const result = compareDeployments('non-existent-1', 'non-existent-2');

        expect(result).toBeNull();
      });

      it('should return null if one deployment not found', () => {
        const { createStrategy, createDeployment, compareDeployments } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const id1 = createDeployment(createMockDeployment({ strategyId }));

        const result = compareDeployments(id1, 'non-existent');

        expect(result).toBeNull();
      });
    });

    describe('generateReport', () => {
      it('should generate deployment report', async () => {
        const { createStrategy, createDeployment, generateReport } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        // Set deployment properties using setState
        useProgressiveDeploymentStore.setState((state) => {
          const deployment = state.deployments.find((d) => d.id === deploymentId);
          if (deployment) {
            deployment.duration = 1000;
            deployment.phaseHistory = [
              {
                phaseId: 'phase-1',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'completed',
                trafficPercent: 100,
                metrics: createMockMetrics(),
              },
            ];
          }
        });

        const blob = await generateReport(deploymentId);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');

        // Read blob content using FileReader (blob.text() not available in test env)
        const text = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(blob);
        });
        const report = JSON.parse(text);
        expect(report.deployment.id).toBe(deploymentId);
        expect(report.summary.duration).toBe(1000);
        expect(report.summary.phases).toBe(1);
        expect(report.summary.successRate).toBe(100);
      });

      it('should throw error if deployment not found', async () => {
        const { generateReport } = useProgressiveDeploymentStore.getState();

        await expect(generateReport('non-existent')).rejects.toThrow('Deployment not found');
      });
    });
  });

  describe('UI Actions', () => {
    describe('setSidebarCollapsed', () => {
      it('should collapse sidebar', () => {
        const { setSidebarCollapsed } = useProgressiveDeploymentStore.getState();

        setSidebarCollapsed(true);

        const { sidebarCollapsed } = useProgressiveDeploymentStore.getState();
        expect(sidebarCollapsed).toBe(true);
      });

      it('should expand sidebar', () => {
        const { setSidebarCollapsed } = useProgressiveDeploymentStore.getState();
        setSidebarCollapsed(true);

        setSidebarCollapsed(false);

        const { sidebarCollapsed } = useProgressiveDeploymentStore.getState();
        expect(sidebarCollapsed).toBe(false);
      });
    });

    describe('setSelectedTab', () => {
      it('should set selected tab', () => {
        const { setSelectedTab } = useProgressiveDeploymentStore.getState();

        setSelectedTab('deployments');

        const { selectedTab } = useProgressiveDeploymentStore.getState();
        expect(selectedTab).toBe('deployments');
      });

      it('should support all tab types', () => {
        const { setSelectedTab } = useProgressiveDeploymentStore.getState();

        const tabs: Array<'strategies' | 'deployments' | 'monitoring'> = [
          'strategies',
          'deployments',
          'monitoring',
        ];

        tabs.forEach((tab) => {
          setSelectedTab(tab);
          const { selectedTab } = useProgressiveDeploymentStore.getState();
          expect(selectedTab).toBe(tab);
        });
      });
    });

    describe('setActiveDeployment', () => {
      it('should set active deployment', () => {
        const { createStrategy, createDeployment, setActiveDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);

        setActiveDeployment(deploymentId);

        const { activeDeployment } = useProgressiveDeploymentStore.getState();
        expect(activeDeployment).toBe(deploymentId);
      });

      it('should clear active deployment', () => {
        const { createStrategy, createDeployment, setActiveDeployment } =
          useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);
        const deploymentData = createMockDeployment({ strategyId });
        const deploymentId = createDeployment(deploymentData);
        setActiveDeployment(deploymentId);

        setActiveDeployment(null);

        const { activeDeployment } = useProgressiveDeploymentStore.getState();
        expect(activeDeployment).toBeNull();
      });
    });
  });

  describe('Settings', () => {
    describe('updateSettings', () => {
      it('should update settings', () => {
        const { updateSettings } = useProgressiveDeploymentStore.getState();

        updateSettings({ enableNotifications: false });

        const { settings } = useProgressiveDeploymentStore.getState();
        expect(settings.enableNotifications).toBe(false);
      });

      it('should update multiple settings', () => {
        const { updateSettings } = useProgressiveDeploymentStore.getState();

        updateSettings({
          enableNotifications: false,
          monitoringInterval: 60,
          retentionDays: 30,
        });

        const { settings } = useProgressiveDeploymentStore.getState();
        expect(settings.enableNotifications).toBe(false);
        expect(settings.monitoringInterval).toBe(60);
        expect(settings.retentionDays).toBe(30);
      });

      it('should not overwrite unchanged settings', () => {
        const { updateSettings } = useProgressiveDeploymentStore.getState();

        updateSettings({ monitoringInterval: 60 });

        const { settings } = useProgressiveDeploymentStore.getState();
        expect(settings.enableNotifications).toBe(true); // Original value
        expect(settings.monitoringInterval).toBe(60); // Updated value
      });
    });
  });

  describe('Data Management', () => {
    describe('exportStrategy', () => {
      it('should export strategy as JSON blob', async () => {
        const { createStrategy, exportStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        const strategyId = createStrategy(strategyData);

        const blob = await exportStrategy(strategyId);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');

        // Read blob content using FileReader (blob.text() not available in test env)
        const text = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(blob);
        });
        const data = JSON.parse(text);
        expect(data.strategy.id).toBe(strategyId);
        expect(data.version).toBe('1.0');
        expect(data.exportedAt).toBeDefined();
      });

      it('should throw error if strategy not found', async () => {
        const { exportStrategy } = useProgressiveDeploymentStore.getState();

        await expect(exportStrategy('non-existent')).rejects.toThrow('Strategy not found');
      });
    });

    describe('importStrategy', () => {
      it('should import strategy from file', async () => {
        const { importStrategy } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy({ name: 'Imported Strategy' });

        const exportData = {
          strategy: {
            ...strategyData,
            id: 'old-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 5,
          },
          exportedAt: new Date().toISOString(),
          version: '1.0',
        };

        const fileContent = JSON.stringify(exportData);
        // Create a file mock with text() method
        const file = {
          name: 'strategy.json',
          type: 'application/json',
          text: vi.fn().mockResolvedValue(fileContent),
        } as unknown as File;

        const newId = await importStrategy(file);

        expect(newId).toBeTruthy();
        expect(newId).not.toBe('old-id'); // Should get new ID

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies).toHaveLength(1);
        expect(strategies[0].name).toBe('Imported Strategy');
      });

      it('should handle invalid JSON', async () => {
        const { importStrategy } = useProgressiveDeploymentStore.getState();

        // Create a file mock with invalid JSON
        const file = {
          name: 'strategy.json',
          type: 'application/json',
          text: vi.fn().mockResolvedValue('invalid json'),
        } as unknown as File;

        await expect(importStrategy(file)).rejects.toThrow();
      });
    });
  });

  describe('Initialization', () => {
    describe('initialize', () => {
      it('should create default strategies if none exist', async () => {
        const { initialize } = useProgressiveDeploymentStore.getState();

        await initialize();

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies.length).toBeGreaterThan(0);
      });

      it('should not create default strategies if some exist', async () => {
        const { createStrategy, initialize } = useProgressiveDeploymentStore.getState();
        const strategyData = createMockStrategy();
        createStrategy(strategyData);

        await initialize();

        const { strategies } = useProgressiveDeploymentStore.getState();
        expect(strategies).toHaveLength(1); // Only the one we created
      });

      it('should handle initialization error', async () => {
        const { initialize } = useProgressiveDeploymentStore.getState();

        // Mock createDefaultStrategies to throw
        vi.spyOn(
          useProgressiveDeploymentStore.getState(),
          'createDefaultStrategies'
        ).mockImplementation(() => {
          throw new Error('Init failed');
        });

        await initialize();

        const { error } = useProgressiveDeploymentStore.getState();
        expect(error).toBe('Init failed');
      });
    });

    describe('createDefaultStrategies', () => {
      it('should create blue-green strategy', () => {
        const { createDefaultStrategies } = useProgressiveDeploymentStore.getState();

        createDefaultStrategies();

        const { strategies } = useProgressiveDeploymentStore.getState();
        const blueGreen = strategies.find((s) => s.type === 'blue_green');
        expect(blueGreen).toBeDefined();
        expect(blueGreen?.name).toBe('Blue-Green Deployment');
      });

      it('should create canary strategy', () => {
        const { createDefaultStrategies } = useProgressiveDeploymentStore.getState();

        createDefaultStrategies();

        const { strategies } = useProgressiveDeploymentStore.getState();
        const canary = strategies.find((s) => s.type === 'canary');
        expect(canary).toBeDefined();
        expect(canary?.name).toBe('Canary Deployment');
      });

      it('should set default strategy', () => {
        const { createDefaultStrategies } = useProgressiveDeploymentStore.getState();

        createDefaultStrategies();

        const { settings, strategies } = useProgressiveDeploymentStore.getState();
        expect(settings.defaultStrategy).toBe(strategies[0].id);
      });
    });
  });

  describe('Feature Flag Disabled', () => {
    beforeEach(() => {
      // Disable feature flag
      vi.mocked(featureFlags.FLAGS).progressiveDeployment = false;
    });

    afterEach(() => {
      // Re-enable feature flag
      vi.mocked(featureFlags.FLAGS).progressiveDeployment = true;
    });

    it('should return empty string from createStrategy', () => {
      const { createStrategy } = useProgressiveDeploymentStore.getState();
      const strategyData = createMockStrategy();

      const id = createStrategy(strategyData);

      expect(id).toBe('');
    });

    it('should return empty string from cloneStrategy', () => {
      const { cloneStrategy } = useProgressiveDeploymentStore.getState();

      const id = cloneStrategy('strategy-1', 'Clone');

      expect(id).toBe('');
    });

    it('should return empty string from createDeployment', () => {
      const { createDeployment } = useProgressiveDeploymentStore.getState();
      const deploymentData = createMockDeployment({ strategyId: 'strategy-1' });

      const id = createDeployment(deploymentData);

      expect(id).toBe('');
    });

    it('should return false from runHealthCheck', async () => {
      const { runHealthCheck } = useProgressiveDeploymentStore.getState();

      const result = await runHealthCheck('deployment-1', 'check-1');

      expect(result).toBe(false);
    });

    it('should return null from compareDeployments', () => {
      const { compareDeployments } = useProgressiveDeploymentStore.getState();

      const result = compareDeployments('deployment-1', 'deployment-2');

      expect(result).toBeNull();
    });

    it('should throw error from generateReport', async () => {
      const { generateReport } = useProgressiveDeploymentStore.getState();

      await expect(generateReport('deployment-1')).rejects.toThrow(
        'Progressive deployment not enabled'
      );
    });

    it('should throw error from exportStrategy', async () => {
      const { exportStrategy } = useProgressiveDeploymentStore.getState();

      await expect(exportStrategy('strategy-1')).rejects.toThrow(
        'Progressive deployment not enabled'
      );
    });

    it('should throw error from importStrategy', async () => {
      const { importStrategy } = useProgressiveDeploymentStore.getState();

      // Create a file with mocked text() method
      const fileContent = '{}';
      const file = {
        name: 'strategy.json',
        type: 'application/json',
        text: vi.fn().mockResolvedValue(fileContent),
      } as unknown as File;

      await expect(importStrategy(file)).rejects.toThrow('Progressive deployment not enabled');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent deployments', () => {
      const { createStrategy, createDeployment } = useProgressiveDeploymentStore.getState();
      const strategyData = createMockStrategy();
      const strategyId = createStrategy(strategyData);

      const id1 = createDeployment(createMockDeployment({ strategyId }));
      const id2 = createDeployment(createMockDeployment({ strategyId }));

      const { deployments } = useProgressiveDeploymentStore.getState();
      expect(deployments).toHaveLength(2);
      expect(id1).not.toBe(id2);
    });

    it('should handle invalid deployment ID gracefully', () => {
      const { updateMetrics, adjustTraffic } = useProgressiveDeploymentStore.getState();

      expect(() => updateMetrics('invalid', createMockMetrics())).not.toThrow();
      expect(() => adjustTraffic('invalid', 50)).not.toThrow();
    });

    it('should handle empty phaseHistory', () => {
      const { createStrategy, createDeployment, skipPhase } =
        useProgressiveDeploymentStore.getState();
      const strategyData = createMockStrategy();
      const strategyId = createStrategy(strategyData);
      const deploymentId = createDeployment(createMockDeployment({ strategyId }));

      expect(() => skipPhase(deploymentId, 'phase-1')).not.toThrow();
    });

    it('should handle strategy with no rollout phases', () => {
      const { createStrategy, createDeployment, startDeployment } =
        useProgressiveDeploymentStore.getState();
      const strategyData = createMockStrategy({
        rolloutPlan: {
          id: 'plan-1',
          name: 'Empty Plan',
          description: 'No phases',
          phases: [],
          settings: {
            autoPromote: false,
            autoRollback: true,
            pauseOnFailure: true,
            phaseTimeout: 1800,
            stabilizationTime: 300,
            notifyOnPhaseStart: true,
            notifyOnPhaseComplete: true,
            notifyOnFailure: true,
            notificationChannels: ['slack'],
          },
        },
      });
      const strategyId = createStrategy(strategyData);
      const deploymentId = createDeployment(createMockDeployment({ strategyId }));

      vi.spyOn(
        useProgressiveDeploymentStore.getState(),
        'executeDeploymentPhases'
      ).mockResolvedValue();

      expect(() => startDeployment(deploymentId)).not.toThrow();
    });
  });
});
