import type {
  Environment,
  EnvironmentConfig,
  EnvironmentResources,
  EnvironmentTemplate,
  EnvironmentType,
  ServiceInstance,
} from '@/lib/stores/environmentManagementStore';
import { useEnvironmentManagementStore } from '@/lib/stores/environmentManagementStore';
import { FLAGS } from '@/lib/stores/featureFlags';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock feature flag
vi.mock('@/lib/stores/featureFlags', () => ({
  FLAGS: {
    environmentManagement: true,
  },
}));

describe('environmentManagementStore', () => {
  beforeEach(() => {
    // Reset store state before each test using setState
    useEnvironmentManagementStore.setState({
      environments: [],
      templates: [],
      syncJobs: [],
      comparisons: [],
      selectedEnvironment: null,
      isMonitoring: false,
      sidebarCollapsed: false,
      selectedTab: 'environments',
      error: null,
      isLoading: false,
      lastUpdate: null,
    });

    // Ensure feature flag is enabled
    FLAGS.environmentManagement = true;
  });

  // ============================================================================
  // Initial State
  // ============================================================================
  describe('Initial State', () => {
    it('should have empty environments array', () => {
      const { environments } = useEnvironmentManagementStore.getState();
      expect(environments).toEqual([]);
    });

    it('should have null selected environment', () => {
      const { selectedEnvironment } = useEnvironmentManagementStore.getState();
      expect(selectedEnvironment).toBeNull();
    });

    it('should have empty templates array', () => {
      const { templates } = useEnvironmentManagementStore.getState();
      expect(templates).toEqual([]);
    });

    it('should have empty sync jobs array', () => {
      const { syncJobs } = useEnvironmentManagementStore.getState();
      expect(syncJobs).toEqual([]);
    });

    it('should have default settings', () => {
      const { settings } = useEnvironmentManagementStore.getState();
      expect(settings.enableEnvironmentManagement).toBe(true);
      expect(settings.defaultRegion).toBe('us-east-1');
      expect(settings.defaultProvider).toBe('aws');
      expect(settings.healthCheckInterval).toBe(60);
      expect(settings.enforceEncryption).toBe(true);
    });

    it('should have sidebar not collapsed', () => {
      const { sidebarCollapsed } = useEnvironmentManagementStore.getState();
      expect(sidebarCollapsed).toBe(false);
    });

    it('should have environments tab selected by default', () => {
      const { selectedTab } = useEnvironmentManagementStore.getState();
      expect(selectedTab).toBe('environments');
    });
  });

  // ============================================================================
  // Environment Management
  // ============================================================================
  describe('Environment Management', () => {
    const mockEnvironment: Omit<
      Environment,
      'id' | 'createdAt' | 'updatedAt' | 'deploymentHistory'
    > = {
      name: 'Test Environment',
      type: 'development',
      description: 'Test environment for unit tests',
      config: {
        infrastructure: {
          provider: 'aws',
          compute: {
            instanceType: 't3.micro',
            minInstances: 1,
            maxInstances: 2,
            cpu: 1,
            memory: 1,
            storage: 20,
          },
        },
        networking: {
          dns: { domain: 'test.lokifi.com', ssl: true },
          firewall: [],
        },
        security: {
          authentication: { provider: 'internal', config: {} },
          authorization: { rbac: false, policies: [] },
          encryption: { inTransit: true, atRest: true, keyManagement: 'internal' },
          compliance: { standards: [], auditing: false, dataRetention: 30 },
        },
        monitoring: {
          metrics: { provider: 'internal', retention: 7, customMetrics: [] },
          logging: { level: 'info', aggregation: false, retention: 7, destinations: [] },
          alerting: { enabled: false, channels: [], rules: [] },
          healthChecks: [],
        },
        backup: {},
        scaling: {
          autoScaling: {
            enabled: false,
            minInstances: 1,
            maxInstances: 2,
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
      },
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
        costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
      },
      services: [],
      endpoints: [],
      credentials: [],
      tags: ['test'],
      owner: 'test-user',
      region: 'us-east-1',
      provider: 'aws',
    };

    it('should create environment', () => {
      const { createEnvironment, environments } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);

      expect(environmentId).toBeTruthy();
      expect(environmentId.startsWith('env_')).toBe(true);

      const updatedEnvironments = useEnvironmentManagementStore.getState().environments;
      expect(updatedEnvironments).toHaveLength(1);
      expect(updatedEnvironments[0].name).toBe('Test Environment');
      expect(updatedEnvironments[0].type).toBe('development');
    });

    it('should update environment', () => {
      const { createEnvironment, updateEnvironment } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);

      updateEnvironment(environmentId, {
        name: 'Updated Environment',
        description: 'Updated description',
      });

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.name).toBe('Updated Environment');
      expect(environment?.description).toBe('Updated description');
    });

    it('should delete environment', () => {
      const { createEnvironment, deleteEnvironment } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);
      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(1);

      deleteEnvironment(environmentId);
      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(0);
    });

    it('should clone environment', () => {
      const { createEnvironment, cloneEnvironment } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);
      const clonedId = cloneEnvironment(environmentId, 'Cloned Environment', 'testing');

      expect(clonedId).toBeTruthy();
      expect(clonedId).not.toBe(environmentId);

      const environments = useEnvironmentManagementStore.getState().environments;
      expect(environments).toHaveLength(2);

      const cloned = environments.find((e) => e.id === clonedId);
      expect(cloned?.name).toBe('Cloned Environment');
      expect(cloned?.type).toBe('testing');
      expect(cloned?.status).toBe('inactive');
    });

    it('should set selected environment', () => {
      const { createEnvironment, setSelectedEnvironment } =
        useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);
      setSelectedEnvironment(environmentId);

      expect(useEnvironmentManagementStore.getState().selectedEnvironment).toBe(environmentId);
    });

    it('should clear selected environment when deleting', () => {
      const { createEnvironment, setSelectedEnvironment, deleteEnvironment } =
        useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment(mockEnvironment);
      setSelectedEnvironment(environmentId);
      expect(useEnvironmentManagementStore.getState().selectedEnvironment).toBe(environmentId);

      deleteEnvironment(environmentId);
      expect(useEnvironmentManagementStore.getState().selectedEnvironment).toBeNull();
    });
  });

  // ============================================================================
  // Environment Operations
  // ============================================================================
  describe('Environment Operations', () => {
    let environmentId: string;

    beforeEach(() => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();
      environmentId = createEnvironment({
        name: 'Test Environment',
        type: 'development',
        description: 'Test environment',
        config: {} as EnvironmentConfig,
        status: 'inactive',
        health: {
          overall: 'unknown',
          services: [],
          infrastructure: {
            compute: { status: 'unknown', cpuUsage: 0, memoryUsage: 0, diskUsage: 0 },
            network: { status: 'unknown', latency: 0, throughput: 0, packetLoss: 0 },
          },
          lastCheck: new Date(),
          issues: [],
        },
        resources: {
          compute: { current: 0, limit: 100, unit: '%', utilization: 0, history: [] },
          storage: { current: 0, limit: 100, unit: 'GB', utilization: 0, history: [] },
          network: { inbound: 0, outbound: 0, connections: 0, history: [] },
          costs: { current: 0, projected: 0, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });
    });

    it('should start environment', async () => {
      const { startEnvironment } = useEnvironmentManagementStore.getState();

      await startEnvironment(environmentId);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.status).toBe('active');
      expect(environment?.health.overall).toBe('healthy');
    }, 10000);

    it('should stop environment', async () => {
      const { startEnvironment, stopEnvironment } = useEnvironmentManagementStore.getState();

      // Start first
      await startEnvironment(environmentId);
      let environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.status).toBe('active');

      // Then stop
      await stopEnvironment(environmentId);
      environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.status).toBe('inactive');
    }, 15000);

    it('should restart environment', async () => {
      const { startEnvironment, restartEnvironment } = useEnvironmentManagementStore.getState();

      // Start first
      await startEnvironment(environmentId);

      // Then restart
      await restartEnvironment(environmentId);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.status).toBe('active');
    }, 20000);

    it('should check environment health', async () => {
      const { checkEnvironmentHealth } = useEnvironmentManagementStore.getState();

      const health = await checkEnvironmentHealth(environmentId);

      expect(health).toBeDefined();
      expect(['healthy', 'warning', 'critical', 'unknown']).toContain(health.overall);
      expect(health.infrastructure).toBeDefined();
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should update resource usage', () => {
      const { updateResourceUsage } = useEnvironmentManagementStore.getState();

      const resources: EnvironmentResources = {
        compute: { current: 50, limit: 100, unit: '%', utilization: 50, history: [] },
        storage: { current: 30, limit: 100, unit: 'GB', utilization: 30, history: [] },
        network: { inbound: 50, outbound: 75, connections: 200, history: [] },
        costs: { current: 100, projected: 120, currency: 'USD', breakdown: [] },
      };

      updateResourceUsage(environmentId, resources);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.resources.compute.current).toBe(50);
      expect(environment?.resources.storage.utilization).toBe(30);
    });
  });

  // ============================================================================
  // Service Management
  // ============================================================================
  describe('Service Management', () => {
    let environmentId: string;

    beforeEach(() => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();
      environmentId = createEnvironment({
        name: 'Test Environment',
        type: 'development',
        description: 'Test',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });
    });

    it('should add service to environment', () => {
      const { addService } = useEnvironmentManagementStore.getState();

      const service: Omit<ServiceInstance, 'id'> = {
        name: 'API Service',
        type: 'api',
        version: '1.0.0',
        status: 'running',
        health: {
          serviceName: 'API Service',
          status: 'healthy',
          responseTime: 100,
          errorRate: 0.5,
          availability: 99.9,
          lastCheck: new Date(),
        },
        config: {
          environment: { NODE_ENV: 'development' },
          ports: [{ containerPort: 8000, protocol: 'TCP' }],
          volumes: [],
          resources: { cpu: '1', memory: '2Gi' },
        },
        instances: [],
      };

      const serviceId = addService(environmentId, service);

      expect(serviceId).toBeTruthy();
      expect(serviceId.startsWith('service_')).toBe(true);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.services).toHaveLength(1);
      expect(environment?.services[0].name).toBe('API Service');
    });

    it('should update service', () => {
      const { addService, updateService } = useEnvironmentManagementStore.getState();

      const serviceId = addService(environmentId, {
        name: 'API Service',
        type: 'api',
        version: '1.0.0',
        status: 'running',
        health: {
          serviceName: 'API Service',
          status: 'healthy',
          responseTime: 100,
          errorRate: 0.5,
          availability: 99.9,
          lastCheck: new Date(),
        },
        config: {
          environment: {},
          ports: [],
          volumes: [],
          resources: { cpu: '1', memory: '2Gi' },
        },
        instances: [],
      });

      updateService(environmentId, serviceId, {
        version: '1.1.0',
        status: 'stopped',
      });

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      const service = environment?.services.find((s) => s.id === serviceId);
      expect(service?.version).toBe('1.1.0');
      expect(service?.status).toBe('stopped');
    });

    it('should remove service', () => {
      const { addService, removeService } = useEnvironmentManagementStore.getState();

      const serviceId = addService(environmentId, {
        name: 'API Service',
        type: 'api',
        version: '1.0.0',
        status: 'running',
        health: {
          serviceName: 'API Service',
          status: 'healthy',
          responseTime: 100,
          errorRate: 0.5,
          availability: 99.9,
          lastCheck: new Date(),
        },
        config: {
          environment: {},
          ports: [],
          volumes: [],
          resources: { cpu: '1', memory: '2Gi' },
        },
        instances: [],
      });

      let environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.services).toHaveLength(1);

      removeService(environmentId, serviceId);

      environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.services).toHaveLength(0);
    });

    it('should restart service', async () => {
      const { addService, restartService } = useEnvironmentManagementStore.getState();

      const serviceId = addService(environmentId, {
        name: 'API Service',
        type: 'api',
        version: '1.0.0',
        status: 'running',
        health: {
          serviceName: 'API Service',
          status: 'healthy',
          responseTime: 100,
          errorRate: 0.5,
          availability: 99.9,
          lastCheck: new Date(),
        },
        config: {
          environment: {},
          ports: [],
          volumes: [],
          resources: { cpu: '1', memory: '2Gi' },
        },
        instances: [
          {
            id: 'inst1',
            hostname: 'api-1',
            ip: '10.0.0.1',
            port: 8000,
            status: 'running',
            uptime: 3600,
            resources: { cpu: 25, memory: 40 },
            lastHealthCheck: new Date(),
          },
        ],
      });

      await restartService(environmentId, serviceId);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      const service = environment?.services.find((s) => s.id === serviceId);
      expect(service?.status).toBe('running');
      expect(service?.instances[0].uptime).toBe(0);
    });
  });

  // ============================================================================
  // Template Management
  // ============================================================================
  describe('Template Management', () => {
    const mockTemplate: Omit<EnvironmentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> =
      {
        name: 'Test Template',
        description: 'Template for testing',
        type: 'development',
        config: {
          infrastructure: {
            provider: 'aws',
            compute: {
              instanceType: 't3.micro',
              minInstances: 1,
              maxInstances: 2,
              cpu: 1,
              memory: 1,
              storage: 20,
            },
          },
          networking: {
            dns: { domain: 'test.lokifi.com', ssl: true },
            firewall: [],
          },
          security: {
            authentication: { provider: 'internal', config: {} },
            authorization: { rbac: false, policies: [] },
            encryption: { inTransit: true, atRest: true, keyManagement: 'internal' },
            compliance: { standards: [], auditing: false, dataRetention: 30 },
          },
          monitoring: {
            metrics: { provider: 'internal', retention: 7, customMetrics: [] },
            logging: { level: 'info', aggregation: false, retention: 7, destinations: [] },
            alerting: { enabled: false, channels: [], rules: [] },
            healthChecks: [],
          },
          backup: {},
          scaling: {
            autoScaling: {
              enabled: false,
              minInstances: 1,
              maxInstances: 2,
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
        },
        variables: [
          {
            name: 'REGION',
            description: 'AWS region',
            type: 'string',
            defaultValue: 'us-east-1',
            required: true,
          },
        ],
      };

    it('should create template', () => {
      const { createTemplate } = useEnvironmentManagementStore.getState();

      const templateId = createTemplate(mockTemplate);

      expect(templateId).toBeTruthy();
      expect(templateId.startsWith('template_')).toBe(true);

      const templates = useEnvironmentManagementStore.getState().templates;
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Test Template');
      expect(templates[0].usageCount).toBe(0);
    });

    it('should update template', () => {
      const { createTemplate, updateTemplate } = useEnvironmentManagementStore.getState();

      const templateId = createTemplate(mockTemplate);

      updateTemplate(templateId, {
        name: 'Updated Template',
        description: 'Updated description',
      });

      const template = useEnvironmentManagementStore
        .getState()
        .templates.find((t) => t.id === templateId);
      expect(template?.name).toBe('Updated Template');
      expect(template?.description).toBe('Updated description');
    });

    it('should delete template', () => {
      const { createTemplate, deleteTemplate } = useEnvironmentManagementStore.getState();

      const templateId = createTemplate(mockTemplate);
      expect(useEnvironmentManagementStore.getState().templates).toHaveLength(1);

      deleteTemplate(templateId);
      expect(useEnvironmentManagementStore.getState().templates).toHaveLength(0);
    });

    it('should apply template and increment usage count', async () => {
      const { createTemplate, applyTemplate } = useEnvironmentManagementStore.getState();

      const templateId = createTemplate(mockTemplate);

      const environmentId = await applyTemplate(templateId, { name: 'From Template' });

      expect(environmentId).toBeTruthy();

      // Check environment created
      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.name).toBe('From Template');
      expect(environment?.type).toBe('development');

      // Check usage count incremented
      const template = useEnvironmentManagementStore
        .getState()
        .templates.find((t) => t.id === templateId);
      expect(template?.usageCount).toBe(1);
    });
  });

  // ============================================================================
  // Environment Comparison
  // ============================================================================
  describe('Environment Comparison', () => {
    it('should compare environments', async () => {
      const { createEnvironment, compareEnvironments } = useEnvironmentManagementStore.getState();

      const env1 = createEnvironment({
        name: 'Environment 1',
        type: 'development',
        description: 'Test',
        config: {
          infrastructure: {
            provider: 'aws',
            compute: {
              instanceType: 't3.micro',
              minInstances: 1,
              maxInstances: 2,
              cpu: 1,
              memory: 1,
              storage: 20,
            },
          },
          networking: { dns: { domain: 'env1.lokifi.com', ssl: true }, firewall: [] },
          security: {
            authentication: { provider: 'internal', config: {} },
            authorization: { rbac: false, policies: [] },
            encryption: { inTransit: true, atRest: true, keyManagement: 'internal' },
            compliance: { standards: [], auditing: false, dataRetention: 30 },
          },
          monitoring: {
            metrics: { provider: 'internal', retention: 7, customMetrics: [] },
            logging: { level: 'info', aggregation: false, retention: 7, destinations: [] },
            alerting: { enabled: false, channels: [], rules: [] },
            healthChecks: [],
          },
          backup: {},
          scaling: {
            autoScaling: {
              enabled: false,
              minInstances: 1,
              maxInstances: 2,
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
        },
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });

      const env2 = createEnvironment({
        name: 'Environment 2',
        type: 'production',
        description: 'Test',
        config: {
          infrastructure: {
            provider: 'aws',
            compute: {
              instanceType: 't3.large',
              minInstances: 3,
              maxInstances: 10,
              cpu: 2,
              memory: 8,
              storage: 100,
            },
          },
          networking: { dns: { domain: 'env2.lokifi.com', ssl: true }, firewall: [] },
          security: {
            authentication: { provider: 'internal', config: {} },
            authorization: { rbac: false, policies: [] },
            encryption: { inTransit: true, atRest: true, keyManagement: 'internal' },
            compliance: { standards: [], auditing: false, dataRetention: 30 },
          },
          monitoring: {
            metrics: { provider: 'internal', retention: 7, customMetrics: [] },
            logging: { level: 'info', aggregation: false, retention: 7, destinations: [] },
            alerting: { enabled: false, channels: [], rules: [] },
            healthChecks: [],
          },
          backup: {},
          scaling: {
            autoScaling: {
              enabled: false,
              minInstances: 1,
              maxInstances: 2,
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
        },
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });

      const comparison = await compareEnvironments([env1, env2]);

      expect(comparison).toBeDefined();
      expect(comparison.environments).toEqual([env1, env2]);
      expect(comparison.differences).toBeDefined();
      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(100);
      expect(comparison.generatedAt).toBeInstanceOf(Date);

      // Check comparisons stored
      const comparisons = useEnvironmentManagementStore.getState().comparisons;
      expect(comparisons).toHaveLength(1);
    });
  });

  // ============================================================================
  // Sync Job Management
  // ============================================================================
  describe('Sync Job Management', () => {
    let sourceEnvId: string;
    let targetEnvId: string;

    beforeEach(() => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();

      sourceEnvId = createEnvironment({
        name: 'Source',
        type: 'development',
        description: 'Source environment',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });

      targetEnvId = createEnvironment({
        name: 'Target',
        type: 'staging',
        description: 'Target environment',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });
    });

    it('should create sync job', () => {
      const { createSyncJob } = useEnvironmentManagementStore.getState();

      const jobId = createSyncJob({
        name: 'Test Sync',
        sourceEnvironment: sourceEnvId,
        targetEnvironments: [targetEnvId],
        syncScope: ['config', 'services'],
        status: 'idle',
        settings: {
          dryRun: false,
          confirmChanges: false,
          rollbackOnFailure: true,
          ignorePatterns: [],
          transformations: [],
        },
      });

      expect(jobId).toBeTruthy();
      expect(jobId.startsWith('sync_')).toBe(true);

      const syncJobs = useEnvironmentManagementStore.getState().syncJobs;
      expect(syncJobs).toHaveLength(1);
      expect(syncJobs[0].name).toBe('Test Sync');
    });

    it('should update sync job', () => {
      const { createSyncJob, updateSyncJob } = useEnvironmentManagementStore.getState();

      const jobId = createSyncJob({
        name: 'Test Sync',
        sourceEnvironment: sourceEnvId,
        targetEnvironments: [targetEnvId],
        syncScope: ['config'],
        status: 'idle',
        settings: {
          dryRun: false,
          confirmChanges: false,
          rollbackOnFailure: true,
          ignorePatterns: [],
          transformations: [],
        },
      });

      updateSyncJob(jobId, {
        name: 'Updated Sync',
        schedule: '0 0 * * *',
      });

      const job = useEnvironmentManagementStore.getState().syncJobs.find((j) => j.id === jobId);
      expect(job?.name).toBe('Updated Sync');
      expect(job?.schedule).toBe('0 0 * * *');
    });

    it('should delete sync job', () => {
      const { createSyncJob, deleteSyncJob } = useEnvironmentManagementStore.getState();

      const jobId = createSyncJob({
        name: 'Test Sync',
        sourceEnvironment: sourceEnvId,
        targetEnvironments: [targetEnvId],
        syncScope: ['config'],
        status: 'idle',
        settings: {
          dryRun: false,
          confirmChanges: false,
          rollbackOnFailure: true,
          ignorePatterns: [],
          transformations: [],
        },
      });

      expect(useEnvironmentManagementStore.getState().syncJobs).toHaveLength(1);

      deleteSyncJob(jobId);
      expect(useEnvironmentManagementStore.getState().syncJobs).toHaveLength(0);
    });

    it('should run sync job', async () => {
      const { createSyncJob, runSyncJob } = useEnvironmentManagementStore.getState();

      const jobId = createSyncJob({
        name: 'Test Sync',
        sourceEnvironment: sourceEnvId,
        targetEnvironments: [targetEnvId],
        syncScope: ['config'],
        status: 'idle',
        settings: {
          dryRun: false,
          confirmChanges: false,
          rollbackOnFailure: true,
          ignorePatterns: [],
          transformations: [],
        },
      });

      const executionId = await runSyncJob(jobId);

      expect(executionId).toBeTruthy();
      expect(executionId.startsWith('exec_')).toBe(true);

      const job = useEnvironmentManagementStore.getState().syncJobs.find((j) => j.id === jobId);
      expect(job?.history).toHaveLength(1);
      expect(['completed', 'failed']).toContain(job?.status);
      expect(job?.lastRun).toBeInstanceOf(Date);
    }, 10000);
  });

  // ============================================================================
  // Configuration Management
  // ============================================================================
  describe('Configuration Management', () => {
    let environmentId: string;

    beforeEach(() => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();
      environmentId = createEnvironment({
        name: 'Test Environment',
        type: 'development',
        description: 'Test',
        config: {
          infrastructure: {
            provider: 'aws',
            compute: {
              instanceType: 't3.micro',
              minInstances: 1,
              maxInstances: 2,
              cpu: 1,
              memory: 1,
              storage: 20,
            },
          },
          networking: { dns: { domain: 'test.lokifi.com', ssl: true }, firewall: [] },
          security: {
            authentication: { provider: 'internal', config: {} },
            authorization: { rbac: false, policies: [] },
            encryption: { inTransit: false, atRest: false, keyManagement: 'internal' },
            compliance: { standards: [], auditing: false, dataRetention: 30 },
          },
          monitoring: {
            metrics: { provider: 'internal', retention: 7, customMetrics: [] },
            logging: { level: 'info', aggregation: false, retention: 7, destinations: [] },
            alerting: { enabled: false, channels: [], rules: [] },
            healthChecks: [],
          },
          backup: {},
          scaling: {
            autoScaling: {
              enabled: false,
              minInstances: 1,
              maxInstances: 2,
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
        },
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });
    });

    it('should update environment config', () => {
      const { updateEnvironmentConfig } = useEnvironmentManagementStore.getState();

      updateEnvironmentConfig(environmentId, {
        security: {
          authentication: { provider: 'oauth', config: {} },
          authorization: { rbac: true, policies: [] },
          encryption: { inTransit: true, atRest: true, keyManagement: 'kms' },
          compliance: { standards: ['SOC2'], auditing: true, dataRetention: 90 },
        },
      });

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.config.security.encryption.inTransit).toBe(true);
      expect(environment?.config.security.encryption.atRest).toBe(true);
    });

    it('should validate config and return issues', async () => {
      const { validateConfig } = useEnvironmentManagementStore.getState();

      const issues = await validateConfig(environmentId);

      expect(Array.isArray(issues)).toBe(true);
      // Expect at least one validation issue due to encryption being disabled
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain('Encryption in transit');
    });
  });

  // ============================================================================
  // Credentials Management
  // ============================================================================
  describe('Credentials Management', () => {
    let environmentId: string;

    beforeEach(() => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();
      environmentId = createEnvironment({
        name: 'Test Environment',
        type: 'development',
        description: 'Test',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });
    });

    it('should add credentials', () => {
      const { addCredentials } = useEnvironmentManagementStore.getState();

      const credentialsId = addCredentials(environmentId, {
        name: 'Database Credentials',
        type: 'database',
        description: 'PostgreSQL database credentials',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(credentialsId).toBeTruthy();
      expect(credentialsId.startsWith('cred_')).toBe(true);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.credentials).toHaveLength(1);
      expect(environment?.credentials[0].name).toBe('Database Credentials');
    });

    it('should update credentials', () => {
      const { addCredentials, updateCredentials } = useEnvironmentManagementStore.getState();

      const credentialsId = addCredentials(environmentId, {
        name: 'API Key',
        type: 'api_key',
        description: 'API access key',
      });

      updateCredentials(environmentId, credentialsId, {
        description: 'Updated API access key',
        rotationSchedule: '0 0 1 * *',
      });

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      const credentials = environment?.credentials.find((c) => c.id === credentialsId);
      expect(credentials?.description).toBe('Updated API access key');
      expect(credentials?.rotationSchedule).toBe('0 0 1 * *');
    });

    it('should remove credentials', () => {
      const { addCredentials, removeCredentials } = useEnvironmentManagementStore.getState();

      const credentialsId = addCredentials(environmentId, {
        name: 'Test Credentials',
        type: 'token',
        description: 'Test',
      });

      let environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.credentials).toHaveLength(1);

      removeCredentials(environmentId, credentialsId);

      environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.credentials).toHaveLength(0);
    });

    it('should rotate credentials', async () => {
      const { addCredentials, rotateCredentials } = useEnvironmentManagementStore.getState();

      const credentialsId = addCredentials(environmentId, {
        name: 'API Key',
        type: 'api_key',
        description: 'API access key',
      });

      await rotateCredentials(environmentId, credentialsId);

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      const credentials = environment?.credentials.find((c) => c.id === credentialsId);
      expect(credentials?.lastRotated).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // Monitoring
  // ============================================================================
  describe('Monitoring', () => {
    it('should start monitoring', () => {
      const { startMonitoring } = useEnvironmentManagementStore.getState();

      startMonitoring();

      expect(useEnvironmentManagementStore.getState().isMonitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      const { startMonitoring, stopMonitoring } = useEnvironmentManagementStore.getState();

      startMonitoring();
      expect(useEnvironmentManagementStore.getState().isMonitoring).toBe(true);

      stopMonitoring();
      expect(useEnvironmentManagementStore.getState().isMonitoring).toBe(false);
    });
  });

  // ============================================================================
  // UI State Management
  // ============================================================================
  describe('UI State Management', () => {
    it('should toggle sidebar', () => {
      const { setSidebarCollapsed } = useEnvironmentManagementStore.getState();

      setSidebarCollapsed(true);
      expect(useEnvironmentManagementStore.getState().sidebarCollapsed).toBe(true);

      setSidebarCollapsed(false);
      expect(useEnvironmentManagementStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should change selected tab', () => {
      const { setSelectedTab } = useEnvironmentManagementStore.getState();

      setSelectedTab('templates');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('templates');

      setSelectedTab('sync');
      expect(useEnvironmentManagementStore.getState().selectedTab).toBe('sync');
    });
  });

  // ============================================================================
  // Settings Management
  // ============================================================================
  describe('Settings Management', () => {
    it('should update settings', () => {
      const { updateSettings } = useEnvironmentManagementStore.getState();

      updateSettings({
        healthCheckInterval: 120,
        enableAutoHealing: false,
        enforceEncryption: false,
      });

      const settings = useEnvironmentManagementStore.getState().settings;
      expect(settings.healthCheckInterval).toBe(120);
      expect(settings.enableAutoHealing).toBe(false);
      expect(settings.enforceEncryption).toBe(false);
    });

    it('should preserve other settings when updating', () => {
      const { updateSettings } = useEnvironmentManagementStore.getState();

      const originalRegion = useEnvironmentManagementStore.getState().settings.defaultRegion;

      updateSettings({
        healthCheckInterval: 90,
      });

      const settings = useEnvironmentManagementStore.getState().settings;
      expect(settings.healthCheckInterval).toBe(90);
      expect(settings.defaultRegion).toBe(originalRegion);
    });
  });

  // ============================================================================
  // Import/Export
  // ============================================================================
  describe('Import/Export', () => {
    it('should export environment', async () => {
      const { createEnvironment, exportEnvironment } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment({
        name: 'Export Test',
        type: 'development',
        description: 'Test export',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });

      const blob = await exportEnvironment(environmentId);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should import environment', async () => {
      const { importEnvironment } = useEnvironmentManagementStore.getState();

      const environmentData = {
        environment: {
          name: 'Imported Environment',
          type: 'development' as EnvironmentType,
          description: 'Imported from file',
          config: {} as EnvironmentConfig,
          status: 'inactive' as const,
          health: {
            overall: 'unknown' as const,
            services: [],
            infrastructure: {
              compute: { status: 'unknown' as const, cpuUsage: 0, memoryUsage: 0, diskUsage: 0 },
              network: { status: 'unknown' as const, latency: 0, throughput: 0, packetLoss: 0 },
            },
            lastCheck: new Date(),
            issues: [],
          },
          resources: {
            compute: { current: 0, limit: 100, unit: '%', utilization: 0, history: [] },
            storage: { current: 0, limit: 100, unit: 'GB', utilization: 0, history: [] },
            network: { inbound: 0, outbound: 0, connections: 0, history: [] },
            costs: { current: 0, projected: 0, currency: 'USD', breakdown: [] },
          },
          services: [],
          endpoints: [],
          credentials: [],
          tags: [],
          owner: 'test',
          region: 'us-east-1',
          provider: 'aws',
        },
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const file = { text: async () => JSON.stringify(environmentData) } as File;

      const environmentId = await importEnvironment(file);

      expect(environmentId).toBeTruthy();

      const environment = useEnvironmentManagementStore
        .getState()
        .environments.find((e) => e.id === environmentId);
      expect(environment?.name).toBe('Imported Environment');
    });

    it('should export template', async () => {
      const { createTemplate, exportTemplate } = useEnvironmentManagementStore.getState();

      const templateId = createTemplate({
        name: 'Export Test Template',
        description: 'Test export',
        type: 'development',
        config: {} as EnvironmentConfig,
        variables: [],
      });

      const blob = await exportTemplate(templateId);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should import template', async () => {
      const { importTemplate } = useEnvironmentManagementStore.getState();

      const templateData = {
        template: {
          name: 'Imported Template',
          description: 'Imported from file',
          type: 'development' as EnvironmentType,
          config: {} as EnvironmentConfig,
          variables: [],
        },
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const file = { text: async () => JSON.stringify(templateData) } as File;

      const templateId = await importTemplate(file);

      expect(templateId).toBeTruthy();

      const template = useEnvironmentManagementStore
        .getState()
        .templates.find((t) => t.id === templateId);
      expect(template?.name).toBe('Imported Template');
    });
  });

  // ============================================================================
  // Initialization
  // ============================================================================
  describe('Initialization', () => {
    it('should initialize with default environments', async () => {
      const { initialize } = useEnvironmentManagementStore.getState();

      await initialize();

      const environments = useEnvironmentManagementStore.getState().environments;
      expect(environments.length).toBeGreaterThan(0);
      expect(environments.some((e) => e.name === 'Development')).toBe(true);
      expect(environments.some((e) => e.name === 'Production')).toBe(true);
    });

    it('should create default development and production environments', () => {
      const { createDefaultEnvironments } = useEnvironmentManagementStore.getState();

      createDefaultEnvironments();

      const environments = useEnvironmentManagementStore.getState().environments;
      expect(environments).toHaveLength(2);

      const devEnv = environments.find((e) => e.type === 'development');
      expect(devEnv).toBeDefined();
      expect(devEnv?.name).toBe('Development');
      expect(devEnv?.status).toBe('active');

      const prodEnv = environments.find((e) => e.type === 'production');
      expect(prodEnv).toBeDefined();
      expect(prodEnv?.name).toBe('Production');
      expect(prodEnv?.config.security.encryption.inTransit).toBe(true);
    });
  });

  // ============================================================================
  // Feature Flag Protection
  // ============================================================================
  describe('Feature Flag Protection', () => {
    beforeEach(() => {
      FLAGS.environmentManagement = false;
    });

    afterEach(() => {
      FLAGS.environmentManagement = true;
    });

    it('should not create environment when feature flag is off', () => {
      const { createEnvironment } = useEnvironmentManagementStore.getState();

      const environmentId = createEnvironment({
        name: 'Test',
        type: 'development',
        description: 'Test',
        config: {} as EnvironmentConfig,
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
          costs: { current: 45, projected: 50, currency: 'USD', breakdown: [] },
        },
        services: [],
        endpoints: [],
        credentials: [],
        tags: [],
        owner: 'test',
        region: 'us-east-1',
        provider: 'aws',
      });

      expect(environmentId).toBe('');
      expect(useEnvironmentManagementStore.getState().environments).toHaveLength(0);
    });

    it('should not update settings when feature flag is off', () => {
      const { updateSettings } = useEnvironmentManagementStore.getState();

      const originalInterval =
        useEnvironmentManagementStore.getState().settings.healthCheckInterval;

      updateSettings({ healthCheckInterval: 999 });

      expect(useEnvironmentManagementStore.getState().settings.healthCheckInterval).toBe(
        originalInterval
      );
    });
  });
});
