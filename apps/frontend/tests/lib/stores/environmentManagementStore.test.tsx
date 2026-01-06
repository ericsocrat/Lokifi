import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Environment,
  EnvironmentConfig,
  EnvironmentCredentials,
  EnvironmentSyncJob,
  EnvironmentTemplate,
  EnvironmentType,
  ServiceInstance,
  SyncScope,
} from '../../../src/lib/stores/environmentManagementStore';
import { useEnvironmentManagementStore } from '../../../src/lib/stores/environmentManagementStore';
import { setDevFlag } from '../../../src/lib/stores/featureFlags';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {};
  }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Helper to create test environment config
const createTestConfig = (): EnvironmentConfig => ({
  infrastructure: {
    provider: 'aws',
    compute: {
      instanceType: 't3.micro',
      minInstances: 1,
      maxInstances: 3,
      cpu: 1,
      memory: 2,
      storage: 20,
    },
    database: {
      engine: 'postgresql',
      version: '14',
      instanceClass: 'db.t3.micro',
      storage: 20,
      multiAZ: false,
      encrypted: true,
    },
  },
  networking: {
    dns: {
      domain: 'test.lokifi.com',
      ssl: true,
    },
    firewall: [
      {
        id: 'rule-1',
        name: 'Allow HTTPS',
        direction: 'inbound',
        protocol: 'TCP',
        port: 443,
        source: '0.0.0.0/0',
        action: 'allow',
        priority: 100,
      },
    ],
  },
  security: {
    authentication: {
      provider: 'internal',
      config: {},
    },
    authorization: {
      rbac: true,
      policies: [],
    },
    encryption: {
      inTransit: true,
      atRest: true,
      keyManagement: 'kms',
    },
    compliance: {
      standards: ['SOC2'],
      auditing: true,
      dataRetention: 90,
    },
  },
  monitoring: {
    metrics: {
      provider: 'prometheus',
      retention: 30,
      customMetrics: [],
    },
    logging: {
      level: 'info',
      aggregation: true,
      retention: 30,
      destinations: ['stdout'],
    },
    alerting: {
      enabled: true,
      channels: ['slack'],
      rules: [],
    },
    healthChecks: [],
  },
  backup: {
    database: {
      automated: true,
      schedule: '0 2 * * *',
      retention: 7,
      crossRegion: false,
      encryption: true,
    },
  },
  scaling: {
    autoScaling: {
      enabled: true,
      minInstances: 1,
      maxInstances: 3,
      targetCPU: 70,
      targetMemory: 80,
      scaleUpCooldown: 300,
      scaleDownCooldown: 300,
    },
    loadBalancing: {
      algorithm: 'round_robin',
      stickySessions: false,
      healthCheckGracePeriod: 30,
    },
  },
  customSettings: {},
});

// Helper to create test environment data (without generated fields)
const createTestEnvironmentData = (
  overrides: Partial<Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'deploymentHistory'>> = {}
): Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'deploymentHistory'> => ({
  name: 'Test Environment',
  type: 'development' as EnvironmentType,
  description: 'Test environment description',
  config: createTestConfig(),
  status: 'active',
  health: {
    overall: 'healthy',
    services: [],
    infrastructure: {
      compute: { status: 'healthy', cpuUsage: 20, memoryUsage: 30, diskUsage: 15 },
      network: { status: 'healthy', latency: 50, throughput: 1000, packetLoss: 0 },
    },
    lastCheck: new Date(),
    issues: [],
  },
  resources: {
    compute: { current: 20, limit: 100, unit: '%', utilization: 20, history: [] },
    storage: { current: 5, limit: 20, unit: 'GB', utilization: 25, history: [] },
    network: { inbound: 10, outbound: 15, connections: 50, history: [] },
    costs: { current: 50, projected: 50, currency: 'USD', breakdown: [] },
  },
  services: [],
  endpoints: [],
  credentials: [],
  tags: ['test'],
  owner: 'test-team',
  region: 'us-east-1',
  provider: 'aws',
  ...overrides,
});

// Helper to create test service
const createTestService = (
  overrides: Partial<Omit<ServiceInstance, 'id'>> = {}
): Omit<ServiceInstance, 'id'> => ({
  name: 'test-service',
  type: 'api',
  version: '1.0.0',
  status: 'running',
  health: {
    serviceName: 'test-service',
    status: 'healthy',
    responseTime: 100,
    errorRate: 0.1,
    availability: 99.9,
    lastCheck: new Date(),
  },
  config: {
    image: 'test-service:1.0.0',
    environment: { NODE_ENV: 'test' },
    ports: [{ containerPort: 3000, protocol: 'TCP' }],
    volumes: [],
    resources: { cpu: '500m', memory: '512Mi' },
  },
  instances: [
    {
      id: 'instance-1',
      hostname: 'test-service-1',
      ip: '10.0.0.1',
      port: 3000,
      status: 'running',
      uptime: 86400,
      resources: { cpu: 25, memory: 40 },
      lastHealthCheck: new Date(),
    },
  ],
  ...overrides,
});

// Helper to create test template
const createTestTemplateData = (
  overrides: Partial<
    Omit<EnvironmentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  > = {}
): Omit<EnvironmentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> => ({
  name: 'Test Template',
  description: 'Test template for environment creation',
  type: 'development' as EnvironmentType,
  config: createTestConfig(),
  variables: [
    {
      name: 'name',
      description: 'Environment name',
      type: 'string',
      required: true,
    },
    {
      name: 'region',
      description: 'AWS region',
      type: 'select',
      options: ['us-east-1', 'us-west-2', 'eu-west-1'],
      defaultValue: 'us-east-1',
      required: false,
    },
  ],
  ...overrides,
});

// Helper to create test sync job
const createTestSyncJobData = (
  overrides: Partial<Omit<EnvironmentSyncJob, 'id' | 'history'>> = {}
): Omit<EnvironmentSyncJob, 'id' | 'history'> => ({
  name: 'Test Sync Job',
  sourceEnvironment: 'env-1',
  targetEnvironments: ['env-2', 'env-3'],
  syncScope: ['config', 'services'] as SyncScope[],
  status: 'idle',
  settings: {
    dryRun: false,
    confirmChanges: true,
    rollbackOnFailure: true,
    ignorePatterns: [],
    transformations: [],
  },
  ...overrides,
});

// Helper to create test credentials
const createTestCredentials = (
  overrides: Partial<Omit<EnvironmentCredentials, 'id'>> = {}
): Omit<EnvironmentCredentials, 'id'> => ({
  name: 'Test Credentials',
  type: 'api_key',
  description: 'Test API key for service',
  ...overrides,
});

describe('environmentManagementStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Enable the feature flag
    setDevFlag('environmentManagement', true);

    // Reset store state
    useEnvironmentManagementStore.setState({
      environments: [],
      selectedEnvironment: null,
      templates: [],
      syncJobs: [],
      comparisons: [],
      sidebarCollapsed: false,
      selectedTab: 'environments',
      isMonitoring: false,
      lastUpdate: null,
      settings: {
        enableEnvironmentManagement: true,
        defaultRegion: 'us-east-1',
        defaultProvider: 'aws',
        healthCheckInterval: 60,
        healthCheckTimeout: 30,
        enableAutoHealing: true,
        metricsRetention: 30,
        enableRealTimeMonitoring: true,
        alertingEnabled: true,
        enableAutoSync: false,
        syncInterval: 24,
        maxSyncRetries: 3,
        enforceEncryption: true,
        requireApprovalForProdChanges: true,
        enableAuditLogging: true,
        costTrackingEnabled: true,
        budgetAlerts: true,
        costOptimizationEnabled: false,
        enableAutoBackups: true,
        backupRetention: 30,
        enableAutoScaling: true,
        resourceOptimizationEnabled: false,
      },
      error: null,
      isLoading: false,
    });
  });

  describe('feature flag gating', () => {
    it('should block operations when environmentManagement flag is disabled', () => {
      setDevFlag('environmentManagement', false);
      const store = useEnvironmentManagementStore.getState();

      const envId = store.createEnvironment(createTestEnvironmentData());
      expect(envId).toBe('');

      const templateId = store.createTemplate(createTestTemplateData());
      expect(templateId).toBe('');

      const syncJobId = store.createSyncJob(createTestSyncJobData());
      expect(syncJobId).toBe('');
    });

    it('should allow operations when environmentManagement flag is enabled', () => {
      const store = useEnvironmentManagementStore.getState();

      const envId = store.createEnvironment(createTestEnvironmentData());
      expect(envId).toBeTruthy();
      expect(envId.startsWith('env_')).toBe(true);
    });
  });

  describe('environment management', () => {
    it('should create an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envData = createTestEnvironmentData({ name: 'New Env' });

      const envId = store.createEnvironment(envData);

      expect(envId).toBeTruthy();
      const state = useEnvironmentManagementStore.getState();
      expect(state.environments).toHaveLength(1);
      expect(state.environments[0].name).toBe('New Env');
      expect(state.environments[0].id).toBe(envId);
      expect(state.environments[0].createdAt).toBeDefined();
      expect(state.environments[0].updatedAt).toBeDefined();
      expect(state.environments[0].deploymentHistory).toEqual([]);
    });

    it('should update an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      store.updateEnvironment(envId, { name: 'Updated Name', description: 'Updated description' });

      const state = useEnvironmentManagementStore.getState();
      const env = state.environments.find((e) => e.id === envId);
      expect(env?.name).toBe('Updated Name');
      expect(env?.description).toBe('Updated description');
    });

    it('should delete an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(1);

      store.deleteEnvironment(envId);

      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(0);
    });

    it('should clear selected environment when deleting it', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      store.setSelectedEnvironment(envId);

      store.deleteEnvironment(envId);

      expect(useEnvironmentManagementStore.getState().selectedEnvironment).toBeNull();
    });

    it('should clone an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const originalId = store.createEnvironment(createTestEnvironmentData({ name: 'Original' }));

      const clonedId = store.cloneEnvironment(originalId, 'Cloned', 'staging');

      expect(clonedId).toBeTruthy();
      expect(clonedId).not.toBe(originalId);

      const state = useEnvironmentManagementStore.getState();
      expect(state.environments).toHaveLength(2);

      const cloned = state.environments.find((e) => e.id === clonedId);
      expect(cloned?.name).toBe('Cloned');
      expect(cloned?.type).toBe('staging');
      expect(cloned?.status).toBe('inactive');
    });

    it('should return empty string when cloning non-existent environment', () => {
      const store = useEnvironmentManagementStore.getState();

      const result = store.cloneEnvironment('non-existent', 'Clone', 'development');

      expect(result).toBe('');
    });

    it('should set selected environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      store.setSelectedEnvironment(envId);

      expect(useEnvironmentManagementStore.getState().selectedEnvironment).toBe(envId);
    });
  });

  describe('environment operations', () => {
    it('should start an inactive environment', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData({ status: 'inactive' }));

      const startPromise = store.startEnvironment(envId);

      // Check deploying status
      expect(useEnvironmentManagementStore.getState().environments[0].status).toBe('deploying');

      // Advance timer and complete
      vi.advanceTimersByTime(10000);
      await startPromise;

      expect(useEnvironmentManagementStore.getState().environments[0].status).toBe('active');
      expect(useEnvironmentManagementStore.getState().environments[0].health.overall).toBe(
        'healthy'
      );

      vi.useRealTimers();
    });

    it('should stop an active environment', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData({ status: 'active' }));

      const stopPromise = store.stopEnvironment(envId);

      // Check terminating status
      expect(useEnvironmentManagementStore.getState().environments[0].status).toBe('terminating');

      // Advance timer and complete
      vi.advanceTimersByTime(6000);
      await stopPromise;

      expect(useEnvironmentManagementStore.getState().environments[0].status).toBe('inactive');

      vi.useRealTimers();
    });

    it('should restart an active environment', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData({ status: 'active' }));

      const restartPromise = store.restartEnvironment(envId);

      // Advance through stop (6s max) + pause (1s) + start (10s max)
      vi.advanceTimersByTime(6000);
      await vi.advanceTimersByTimeAsync(1000);
      vi.advanceTimersByTime(10000);
      await restartPromise;

      expect(useEnvironmentManagementStore.getState().environments[0].status).toBe('active');

      vi.useRealTimers();
    }, 10000);

    it('should check environment health', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      const healthPromise = store.checkEnvironmentHealth(envId);
      vi.advanceTimersByTime(4000);
      const health = await healthPromise;

      expect(health).toBeDefined();
      expect(['healthy', 'warning']).toContain(health.overall);
      expect(health.infrastructure).toBeDefined();
      expect(health.lastCheck).toBeDefined();

      vi.useRealTimers();
    });

    it('should throw when checking health of non-existent environment', async () => {
      const store = useEnvironmentManagementStore.getState();

      await expect(store.checkEnvironmentHealth('non-existent')).rejects.toThrow(
        'Environment not found'
      );
    });

    it('should update resource usage', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      const newResources = {
        compute: { current: 50, limit: 100, unit: '%', utilization: 50, history: [] },
        storage: { current: 10, limit: 20, unit: 'GB', utilization: 50, history: [] },
        network: { inbound: 20, outbound: 30, connections: 100, history: [] },
        costs: { current: 100, projected: 120, currency: 'USD', breakdown: [] },
      };

      store.updateResourceUsage(envId, newResources);

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.resources.compute.utilization).toBe(50);
      expect(env.resources.costs.projected).toBe(120);
    });
  });

  describe('service management', () => {
    it('should add a service to an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const serviceData = createTestService();

      const serviceId = store.addService(envId, serviceData);

      expect(serviceId).toBeTruthy();
      expect(serviceId.startsWith('service_')).toBe(true);

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.services).toHaveLength(1);
      expect(env.services[0].name).toBe('test-service');
    });

    it('should update a service', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const serviceId = store.addService(envId, createTestService());

      store.updateService(envId, serviceId, { version: '2.0.0', status: 'stopped' });

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.services[0].version).toBe('2.0.0');
      expect(env.services[0].status).toBe('stopped');
    });

    it('should remove a service', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const serviceId = store.addService(envId, createTestService());

      store.removeService(envId, serviceId);

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.services).toHaveLength(0);
    });

    it('should restart a service', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const serviceId = store.addService(envId, createTestService({ status: 'running' }));

      const restartPromise = store.restartService(envId, serviceId);

      // Check starting status
      expect(useEnvironmentManagementStore.getState().environments[0].services[0].status).toBe(
        'starting'
      );

      vi.advanceTimersByTime(5000);
      await restartPromise;

      expect(useEnvironmentManagementStore.getState().environments[0].services[0].status).toBe(
        'running'
      );

      vi.useRealTimers();
    });
  });

  describe('template management', () => {
    it('should create a template', () => {
      const store = useEnvironmentManagementStore.getState();
      const templateData = createTestTemplateData();

      const templateId = store.createTemplate(templateData);

      expect(templateId).toBeTruthy();
      expect(templateId.startsWith('template_')).toBe(true);

      const state = useEnvironmentManagementStore.getState();
      expect(state.templates).toHaveLength(1);
      expect(state.templates[0].name).toBe('Test Template');
      expect(state.templates[0].usageCount).toBe(0);
    });

    it('should update a template', () => {
      const store = useEnvironmentManagementStore.getState();
      const templateId = store.createTemplate(createTestTemplateData());

      store.updateTemplate(templateId, {
        name: 'Updated Template',
        description: 'Updated description',
      });

      const template = useEnvironmentManagementStore.getState().templates[0];
      expect(template.name).toBe('Updated Template');
      expect(template.description).toBe('Updated description');
    });

    it('should delete a template', () => {
      const store = useEnvironmentManagementStore.getState();
      const templateId = store.createTemplate(createTestTemplateData());

      store.deleteTemplate(templateId);

      expect(useEnvironmentManagementStore.getState().templates).toHaveLength(0);
    });

    it('should apply a template to create an environment', async () => {
      const store = useEnvironmentManagementStore.getState();
      const templateId = store.createTemplate(createTestTemplateData());

      const envId = await store.applyTemplate(templateId, { name: 'From Template' });

      expect(envId).toBeTruthy();

      const state = useEnvironmentManagementStore.getState();
      expect(state.environments).toHaveLength(1);
      expect(state.environments[0].name).toBe('From Template');
      expect(state.templates[0].usageCount).toBe(1);
    });

    it('should throw when applying non-existent template', async () => {
      const store = useEnvironmentManagementStore.getState();

      await expect(store.applyTemplate('non-existent', {})).rejects.toThrow('Template not found');
    });
  });

  describe('environment comparison', () => {
    it('should compare two or more environments', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();

      const env1Id = store.createEnvironment(createTestEnvironmentData({ name: 'Env 1' }));
      const env2Id = store.createEnvironment(createTestEnvironmentData({ name: 'Env 2' }));

      const comparePromise = store.compareEnvironments([env1Id, env2Id]);
      vi.advanceTimersByTime(5000);
      const comparison = await comparePromise;

      expect(comparison).toBeDefined();
      expect(comparison.environments).toEqual([env1Id, env2Id]);
      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(100);

      // Comparison should be stored
      expect(useEnvironmentManagementStore.getState().comparisons).toHaveLength(1);

      vi.useRealTimers();
    });

    it('should throw when comparing less than 2 environments', async () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      await expect(store.compareEnvironments([envId])).rejects.toThrow(
        'At least 2 environments required for comparison'
      );
    });
  });

  describe('sync job management', () => {
    it('should create a sync job', () => {
      const store = useEnvironmentManagementStore.getState();
      const jobData = createTestSyncJobData();

      const jobId = store.createSyncJob(jobData);

      expect(jobId).toBeTruthy();
      expect(jobId.startsWith('sync_')).toBe(true);

      const state = useEnvironmentManagementStore.getState();
      expect(state.syncJobs).toHaveLength(1);
      expect(state.syncJobs[0].name).toBe('Test Sync Job');
      expect(state.syncJobs[0].history).toEqual([]);
    });

    it('should update a sync job', () => {
      const store = useEnvironmentManagementStore.getState();
      const jobId = store.createSyncJob(createTestSyncJobData());

      store.updateSyncJob(jobId, { name: 'Updated Job', status: 'running' });

      const job = useEnvironmentManagementStore.getState().syncJobs[0];
      expect(job.name).toBe('Updated Job');
      expect(job.status).toBe('running');
    });

    it('should delete a sync job', () => {
      const store = useEnvironmentManagementStore.getState();
      const jobId = store.createSyncJob(createTestSyncJobData());

      store.deleteSyncJob(jobId);

      expect(useEnvironmentManagementStore.getState().syncJobs).toHaveLength(0);
    });

    it('should run a sync job and record execution', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const jobId = store.createSyncJob(createTestSyncJobData());

      const runPromise = store.runSyncJob(jobId);

      // Check running status
      expect(useEnvironmentManagementStore.getState().syncJobs[0].status).toBe('running');

      vi.advanceTimersByTime(7000);
      const executionId = await runPromise;

      expect(executionId).toBeTruthy();
      expect(executionId.startsWith('exec_')).toBe(true);

      const job = useEnvironmentManagementStore.getState().syncJobs[0];
      expect(job.history).toHaveLength(1);
      expect(job.history[0].id).toBe(executionId);
      expect(['completed', 'failed']).toContain(job.status);

      vi.useRealTimers();
    });

    it('should throw when running non-existent sync job', async () => {
      const store = useEnvironmentManagementStore.getState();

      await expect(store.runSyncJob('non-existent')).rejects.toThrow('Sync job not found');
    });
  });

  describe('configuration management', () => {
    it('should update environment configuration', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      store.updateEnvironmentConfig(envId, {
        infrastructure: {
          ...createTestConfig().infrastructure,
          compute: {
            ...createTestConfig().infrastructure.compute,
            instanceType: 't3.large',
            maxInstances: 10,
          },
        },
      });

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.config.infrastructure.compute.instanceType).toBe('t3.large');
      expect(env.config.infrastructure.compute.maxInstances).toBe(10);
    });

    it('should validate configuration', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();

      // Create environment with invalid config
      const envId = store.createEnvironment(createTestEnvironmentData());
      store.updateEnvironmentConfig(envId, {
        infrastructure: {
          ...createTestConfig().infrastructure,
          compute: {
            ...createTestConfig().infrastructure.compute,
            minInstances: 0, // Invalid - must be at least 1
          },
        },
        security: {
          ...createTestConfig().security,
          encryption: {
            ...createTestConfig().security.encryption,
            inTransit: false, // Warning - should be enabled
          },
        },
      });

      const validatePromise = store.validateConfig(envId);
      vi.advanceTimersByTime(3000);
      const issues = await validatePromise;

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.includes('Minimum instances'))).toBe(true);

      vi.useRealTimers();
    });

    it('should return empty array for valid configuration', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      const validatePromise = store.validateConfig(envId);
      vi.advanceTimersByTime(3000);
      const issues = await validatePromise;

      // Config is valid - minInstances >= 1 and encryption enabled
      expect(issues).not.toContain('Minimum instances must be at least 1');

      vi.useRealTimers();
    });
  });

  describe('credentials management', () => {
    it('should add credentials to an environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      const credId = store.addCredentials(envId, createTestCredentials());

      expect(credId).toBeTruthy();
      expect(credId.startsWith('cred_')).toBe(true);

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.credentials).toHaveLength(1);
      expect(env.credentials[0].name).toBe('Test Credentials');
    });

    it('should update credentials', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const credId = store.addCredentials(envId, createTestCredentials());

      store.updateCredentials(envId, credId, {
        name: 'Updated Credentials',
        description: 'Updated description',
      });

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.credentials[0].name).toBe('Updated Credentials');
    });

    it('should remove credentials', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const credId = store.addCredentials(envId, createTestCredentials());

      store.removeCredentials(envId, credId);

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.credentials).toHaveLength(0);
    });

    it('should rotate credentials', async () => {
      vi.useFakeTimers();
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());
      const credId = store.addCredentials(envId, createTestCredentials());

      const rotatePromise = store.rotateCredentials(envId, credId);
      vi.advanceTimersByTime(5000);
      await rotatePromise;

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.credentials[0].lastRotated).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe('monitoring', () => {
    it('should start monitoring', () => {
      const store = useEnvironmentManagementStore.getState();

      store.startMonitoring();

      expect(useEnvironmentManagementStore.getState().isMonitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      const store = useEnvironmentManagementStore.getState();
      store.startMonitoring();

      store.stopMonitoring();

      expect(useEnvironmentManagementStore.getState().isMonitoring).toBe(false);
    });
  });

  describe('UI state', () => {
    it('should set sidebar collapsed state', () => {
      const store = useEnvironmentManagementStore.getState();

      store.setSidebarCollapsed(true);
      expect(useEnvironmentManagementStore.getState().sidebarCollapsed).toBe(true);

      store.setSidebarCollapsed(false);
      expect(useEnvironmentManagementStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set selected tab', () => {
      const store = useEnvironmentManagementStore.getState();

      store.setSelectedTab('templates');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('templates');

      store.setSelectedTab('sync');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('sync');

      store.setSelectedTab('monitoring');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('monitoring');

      store.setSelectedTab('settings');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('settings');
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      const store = useEnvironmentManagementStore.getState();

      store.updateSettings({
        defaultRegion: 'eu-west-1',
        healthCheckInterval: 30,
        enableAutoScaling: false,
      });

      const settings = useEnvironmentManagementStore.getState().settings;
      expect(settings.defaultRegion).toBe('eu-west-1');
      expect(settings.healthCheckInterval).toBe(30);
      expect(settings.enableAutoScaling).toBe(false);
    });
  });

  describe('data import/export', () => {
    it('should export an environment', async () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData({ name: 'Export Test' }));

      const blob = await store.exportEnvironment(envId);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should throw when exporting non-existent environment', async () => {
      const store = useEnvironmentManagementStore.getState();

      await expect(store.exportEnvironment('non-existent')).rejects.toThrow(
        'Environment not found'
      );
    });

    it('should import an environment from file', async () => {
      const store = useEnvironmentManagementStore.getState();

      const exportData = {
        environment: createTestEnvironmentData({ name: 'Imported Env' }),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Create a mock file object with text() method
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(exportData)),
      } as unknown as File;

      const envId = await store.importEnvironment(mockFile);

      expect(envId).toBeTruthy();
      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.name).toBe('Imported Env');
    });

    it('should export a template', async () => {
      const store = useEnvironmentManagementStore.getState();
      const templateId = store.createTemplate(createTestTemplateData({ name: 'Export Template' }));

      const blob = await store.exportTemplate(templateId);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should throw when exporting non-existent template', async () => {
      const store = useEnvironmentManagementStore.getState();

      await expect(store.exportTemplate('non-existent')).rejects.toThrow('Template not found');
    });

    it('should import a template from file', async () => {
      const store = useEnvironmentManagementStore.getState();

      const exportData = {
        template: createTestTemplateData({ name: 'Imported Template' }),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Create a mock file object with text() method
      const mockFile = {
        text: vi.fn().mockResolvedValue(JSON.stringify(exportData)),
      } as unknown as File;

      const templateId = await store.importTemplate(mockFile);

      expect(templateId).toBeTruthy();
      const template = useEnvironmentManagementStore.getState().templates[0];
      expect(template.name).toBe('Imported Template');
    });
  });

  describe('initialization', () => {
    it('should create default environments on initialize', async () => {
      const store = useEnvironmentManagementStore.getState();

      await store.initialize();

      const state = useEnvironmentManagementStore.getState();
      expect(state.environments.length).toBeGreaterThanOrEqual(2);

      const devEnv = state.environments.find((e) => e.name === 'Development');
      const prodEnv = state.environments.find((e) => e.name === 'Production');

      expect(devEnv).toBeDefined();
      expect(prodEnv).toBeDefined();
      expect(devEnv?.type).toBe('development');
      expect(prodEnv?.type).toBe('production');
    });

    it('should not create defaults if environments already exist', async () => {
      const store = useEnvironmentManagementStore.getState();
      store.createEnvironment(createTestEnvironmentData({ name: 'Existing' }));

      await store.initialize();

      const state = useEnvironmentManagementStore.getState();
      expect(state.environments).toHaveLength(1);
      expect(state.environments[0].name).toBe('Existing');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple environments', () => {
      const store = useEnvironmentManagementStore.getState();

      for (let i = 0; i < 10; i++) {
        store.createEnvironment(createTestEnvironmentData({ name: `Env ${i}` }));
      }

      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(10);
    });

    it('should handle multiple services per environment', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      for (let i = 0; i < 5; i++) {
        store.addService(envId, createTestService({ name: `service-${i}` }));
      }

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.services).toHaveLength(5);
    });

    it('should handle no-op operations gracefully', () => {
      const store = useEnvironmentManagementStore.getState();

      // These should not throw
      store.updateEnvironment('non-existent', { name: 'Updated' });
      store.deleteEnvironment('non-existent');
      store.updateService('non-existent', 'non-existent', {});
      store.removeService('non-existent', 'non-existent');
      store.updateTemplate('non-existent', {});
      store.updateSyncJob('non-existent', {});
      store.updateCredentials('non-existent', 'non-existent', {});
    });

    it('should not proceed with operations when flag is disabled', async () => {
      setDevFlag('environmentManagement', false);
      const store = useEnvironmentManagementStore.getState();

      // These should return early or throw
      await expect(store.checkEnvironmentHealth('any')).rejects.toThrow();
      await expect(store.applyTemplate('any', {})).rejects.toThrow();
      await expect(store.compareEnvironments(['a', 'b'])).rejects.toThrow();
      await expect(store.runSyncJob('any')).rejects.toThrow();
      await expect(store.exportEnvironment('any')).rejects.toThrow();
      await expect(store.importEnvironment(new File(['{}'], 'test.json'))).rejects.toThrow();
    });

    it('should handle concurrent environment updates', () => {
      const store = useEnvironmentManagementStore.getState();
      const envId = store.createEnvironment(createTestEnvironmentData());

      // Simulate concurrent updates
      store.updateEnvironment(envId, { name: 'Update 1' });
      store.updateEnvironment(envId, { description: 'Update 2' });
      store.updateEnvironment(envId, { tags: ['tag1', 'tag2'] });

      const env = useEnvironmentManagementStore.getState().environments[0];
      expect(env.name).toBe('Update 1');
      expect(env.description).toBe('Update 2');
      expect(env.tags).toEqual(['tag1', 'tag2']);
    });
  });
});
