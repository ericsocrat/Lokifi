import { FLAGS } from '@/lib/stores/featureFlags';
import type {
  ReportFormat,
  TestCase,
  TestPipeline,
  TestSuite,
} from '@/lib/stores/integrationTestingStore';
import { useIntegrationTestingStore } from '@/lib/stores/integrationTestingStore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock feature flags
vi.mock('@/lib/stores/featureFlags', () => ({
  FLAGS: {
    integrationTesting: true,
  },
}));

describe('integrationTestingStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useIntegrationTestingStore.setState({
      testSuites: [],
      selectedTestSuite: null,
      executions: [],
      activeExecutions: [],
      pipelines: [],
      selectedPipeline: null,
      environmentHealth: [],
      sidebarCollapsed: false,
      selectedTab: 'suites',
      searchQuery: '',
      filters: {
        suiteTypes: [],
        statuses: [],
        environments: [],
        tags: [],
        priorities: [],
      },
      isRunning: false,
      isHealthChecking: false,
      lastUpdate: null,
      error: null,
      settings: {
        enableIntegrationTesting: true,
        defaultTimeout: 300,
        defaultRetryCount: 3,
        maxConcurrentTests: 5,
        enableParallelExecution: true,
        enableHealthChecks: true,
        healthCheckInterval: 60,
        enableDetailedReporting: true,
        retainReports: 30,
        enableScreenshots: true,
        enableVideos: false,
        enablePerformanceTracking: true,
        performanceThresholds: {
          response_time: 1000,
          throughput: 100,
        },
        enableNotifications: true,
        notificationChannels: [],
        notifyOnFailure: true,
        notifyOnSuccess: false,
        enableTestDataManagement: true,
        cleanupTestData: true,
        testDataRetention: 7,
        enableSecurityTesting: false,
        maskSensitiveData: true,
        enableCIIntegration: false,
        enableCoverageTracking: false,
        coverageThreshold: 80,
      },
    });
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should have empty test suites array', () => {
      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites).toEqual([]);
    });

    it('should have no selected test suite', () => {
      const { selectedTestSuite } = useIntegrationTestingStore.getState();
      expect(selectedTestSuite).toBeNull();
    });

    it('should have empty executions array', () => {
      const { executions } = useIntegrationTestingStore.getState();
      expect(executions).toEqual([]);
    });

    it('should have empty active executions array', () => {
      const { activeExecutions } = useIntegrationTestingStore.getState();
      expect(activeExecutions).toEqual([]);
    });

    it('should have empty pipelines array', () => {
      const { pipelines } = useIntegrationTestingStore.getState();
      expect(pipelines).toEqual([]);
    });

    it('should have default sidebar not collapsed', () => {
      const { sidebarCollapsed } = useIntegrationTestingStore.getState();
      expect(sidebarCollapsed).toBe(false);
    });

    it('should have default selected tab as suites', () => {
      const { selectedTab } = useIntegrationTestingStore.getState();
      expect(selectedTab).toBe('suites');
    });

    it('should have default settings', () => {
      const { settings } = useIntegrationTestingStore.getState();
      expect(settings.enableIntegrationTesting).toBe(true);
      expect(settings.defaultTimeout).toBe(300);
      expect(settings.defaultRetryCount).toBe(3);
      expect(settings.maxConcurrentTests).toBe(5);
      expect(settings.healthCheckInterval).toBe(60);
    });
  });

  // ============================================================================
  // Test Suite Management Tests
  // ============================================================================

  describe('Test Suite Management', () => {
    it('should create a new test suite', () => {
      const { createTestSuite } = useIntegrationTestingStore.getState();

      const suiteData: Omit<
        TestSuite,
        'id' | 'createdAt' | 'updatedAt' | 'version' | 'executionIds'
      > = {
        name: 'API Integration Tests',
        description: 'Test API endpoints',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: ['api-gateway'],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: ['api', 'integration'],
        lastExecutionId: undefined,
      };

      const suiteId = createTestSuite(suiteData);

      expect(suiteId).toBeTruthy();
      expect(suiteId).toMatch(/^suite_/);

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites).toHaveLength(1);
      expect(testSuites[0].name).toBe('API Integration Tests');
      expect(testSuites[0].type).toBe('api');
      expect(testSuites[0].executionIds).toEqual([]);
    });

    it('should update an existing test suite', () => {
      const { createTestSuite, updateTestSuite } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Original Suite',
        description: 'Original description',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      updateTestSuite(suiteId, {
        name: 'Updated Suite',
        description: 'Updated description',
        status: 'inactive',
      });

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);

      expect(suite?.name).toBe('Updated Suite');
      expect(suite?.description).toBe('Updated description');
      expect(suite?.status).toBe('inactive');
      expect(suite?.version).toBe(2);
    });

    it('should delete a test suite', () => {
      const { createTestSuite, deleteTestSuite } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Suite to Delete',
        description: 'This will be deleted',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      deleteTestSuite(suiteId);

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites).toHaveLength(0);
    });

    it('should clone a test suite with new name', () => {
      const { createTestSuite, cloneTestSuite } = useIntegrationTestingStore.getState();

      const originalId = createTestSuite({
        name: 'Original Suite',
        description: 'Original description',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: ['original'],
        lastExecutionId: undefined,
      });

      const clonedId = cloneTestSuite(originalId, 'Cloned Suite');

      expect(clonedId).toBeTruthy();
      expect(clonedId).not.toBe(originalId);

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites).toHaveLength(2);

      const clonedSuite = testSuites.find((s) => s.id === clonedId);
      expect(clonedSuite?.name).toBe('Cloned Suite');
      expect(clonedSuite?.status).toBe('draft');
      expect(clonedSuite?.tags).toEqual(['original']);
    });

    it('should set selected test suite', () => {
      const { createTestSuite, setSelectedTestSuite } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      setSelectedTestSuite(suiteId);

      const { selectedTestSuite } = useIntegrationTestingStore.getState();
      expect(selectedTestSuite).toBe(suiteId);
    });

    it('should clear selected test suite', () => {
      const { createTestSuite, setSelectedTestSuite } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      setSelectedTestSuite(suiteId);
      setSelectedTestSuite(null);

      const { selectedTestSuite } = useIntegrationTestingStore.getState();
      expect(selectedTestSuite).toBeNull();
    });
  });

  // ============================================================================
  // Test Case Management Tests
  // ============================================================================

  describe('Test Case Management', () => {
    it('should add a test case to a suite', () => {
      const { createTestSuite, addTestCase } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      const testCaseData: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Login Test',
        description: 'Test user login',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: ['auth'],
        testData: [],
        priority: 'high',
        estimatedDuration: 30,
      };

      const testCaseId = addTestCase(suiteId, testCaseData);

      expect(testCaseId).toBeTruthy();
      expect(testCaseId).toMatch(/^test_/);

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);

      expect(suite?.tests).toHaveLength(1);
      expect(suite?.tests[0].name).toBe('Login Test');
      expect(suite?.tests[0].priority).toBe('high');
    });

    it('should update a test case', () => {
      const { createTestSuite, addTestCase, updateTestCase } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      const testCaseId = addTestCase(suiteId, {
        name: 'Original Test',
        description: 'Original',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'medium',
        estimatedDuration: 30,
      });

      updateTestCase(suiteId, testCaseId, {
        name: 'Updated Test',
        priority: 'critical',
      });

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);
      const testCase = suite?.tests.find((t) => t.id === testCaseId);

      expect(testCase?.name).toBe('Updated Test');
      expect(testCase?.priority).toBe('critical');
    });

    it('should remove a test case from a suite', () => {
      const { createTestSuite, addTestCase, removeTestCase } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      const testCaseId = addTestCase(suiteId, {
        name: 'Test to Remove',
        description: 'Will be removed',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'low',
        estimatedDuration: 30,
      });

      removeTestCase(suiteId, testCaseId);

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);

      expect(suite?.tests).toHaveLength(0);
    });
  });

  // ============================================================================
  // Test Execution Tests (Async Operations)
  // ============================================================================

  describe('Test Execution', () => {
    it(
      'should run a test suite and track execution',
      async () => {
        const { createTestSuite, addTestCase, runTestSuite } =
          useIntegrationTestingStore.getState();

        const suiteId = createTestSuite({
          name: 'Test Suite',
          description: 'Test',
          type: 'api',
          category: 'integration',
          config: {
            timeout: 300,
            retryCount: 3,
            parallelExecution: true,
            maxConcurrency: 5,
            setupScripts: [],
            teardownScripts: [],
            environmentVariables: {},
            requiredServices: [],
            dataSeeds: [],
            reportFormat: ['json' as ReportFormat],
            notificationChannels: [],
            successThreshold: 95,
            performanceThresholds: [],
            customSettings: {},
          },
          tests: [],
          targetEnvironments: ['staging'],
          prerequisites: [],
          isEnabled: true,
          status: 'active',
          createdBy: 'test-user',
          tags: [],
          lastExecutionId: undefined,
        });

        // Add test cases
        addTestCase(suiteId, {
          name: 'Test 1',
          description: 'First test',
          type: 'api_test',
          steps: [
            {
              id: 'step1',
              name: 'Step 1',
              type: 'http_request',
              action: 'GET',
              parameters: {},
              continueOnFailure: false,
              order: 1,
            },
          ],
          assertions: [
            {
              id: 'assert1',
              name: 'Assertion 1',
              type: 'response_status',
              target: 'status',
              operator: 'equals',
              expected: 200,
              severity: 'error',
            },
          ],
          timeout: 60,
          retryCount: 2,
          isEnabled: true,
          dependsOn: [],
          tags: [],
          testData: [],
          priority: 'high',
          estimatedDuration: 30,
        });

        const executionId = await runTestSuite(suiteId, 'staging');

        expect(executionId).toBeTruthy();
        expect(executionId).toMatch(/^exec_/);

        const { executions, testSuites } = useIntegrationTestingStore.getState();
        const execution = executions.find((e) => e.id === executionId);
        const suite = testSuites.find((s) => s.id === suiteId);

        expect(execution).toBeDefined();
        expect(execution?.status).toBe('completed');
        expect(execution?.environment).toBe('staging');
        expect(execution?.results).toHaveLength(1);
        expect(suite?.lastExecutionId).toBe(executionId);
        expect(suite?.executionIds).toContain(executionId);
      },
      { timeout: 15000 }
    );

    it(
      'should run a single test case',
      async () => {
        const { createTestSuite, addTestCase, runTestCase } = useIntegrationTestingStore.getState();

        const suiteId = createTestSuite({
          name: 'Test Suite',
          description: 'Test',
          type: 'api',
          category: 'integration',
          config: {
            timeout: 300,
            retryCount: 3,
            parallelExecution: true,
            maxConcurrency: 5,
            setupScripts: [],
            teardownScripts: [],
            environmentVariables: {},
            requiredServices: [],
            dataSeeds: [],
            reportFormat: ['json' as ReportFormat],
            notificationChannels: [],
            successThreshold: 95,
            performanceThresholds: [],
            customSettings: {},
          },
          tests: [],
          targetEnvironments: ['staging'],
          prerequisites: [],
          isEnabled: true,
          status: 'active',
          createdBy: 'test-user',
          tags: [],
          lastExecutionId: undefined,
        });

        const testCaseId = addTestCase(suiteId, {
          name: 'Single Test',
          description: 'Test',
          type: 'api_test',
          steps: [],
          assertions: [],
          timeout: 60,
          retryCount: 2,
          isEnabled: true,
          dependsOn: [],
          tags: [],
          testData: [],
          priority: 'medium',
          estimatedDuration: 30,
        });

        const result = await runTestCase(suiteId, testCaseId, 'staging');

        expect(result).toBeDefined();
        expect(result.testCaseId).toBe(testCaseId);
        expect(['passed', 'failed']).toContain(result.status);
      },
      { timeout: 10000 }
    );

    it('should cancel a running execution', async () => {
      const { createTestSuite, addTestCase, cancelExecution } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      addTestCase(suiteId, {
        name: 'Long Test',
        description: 'Test',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'low',
        estimatedDuration: 30,
      });

      // Create a mock running execution directly
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      useIntegrationTestingStore.setState((draft) => {
        draft.executions.push({
          id: executionId,
          suiteId,
          startedAt: new Date(),
          status: 'running',
          triggeredBy: 'manual',
          triggerType: 'manual',
          environment: 'staging',
          version: 'v1.0.0',
          results: [],
          summary: {
            totalTests: 1,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            errorTests: 0,
            passRate: 0,
            failRate: 0,
            totalDuration: 0,
            averageDuration: 0,
          },
          artifacts: [],
          logs: [],
          performanceMetrics: [],
          errors: [],
          warnings: [],
        });
        draft.activeExecutions.push(executionId);
        draft.isRunning = true;
      });

      // Cancel execution
      await cancelExecution(executionId);

      const { executions } = useIntegrationTestingStore.getState();
      const execution = executions.find((e) => e.id === executionId);

      expect(execution?.status).toBe('cancelled');
      expect(execution?.completedAt).toBeDefined();
    });
  });

  // ============================================================================
  // Pipeline Management Tests
  // ============================================================================

  describe('Pipeline Management', () => {
    it('should create a new pipeline', () => {
      const { createPipeline } = useIntegrationTestingStore.getState();

      const pipelineData: Omit<
        TestPipeline,
        'id' | 'createdAt' | 'updatedAt' | 'version' | 'executions'
      > = {
        name: 'CI/CD Pipeline',
        description: 'Continuous integration pipeline',
        stages: [
          {
            id: 'stage1',
            name: 'Unit Tests',
            type: 'test_execution',
            order: 1,
            testSuites: [],
            conditions: [],
            runInParallel: true,
            continueOnFailure: false,
            timeout: 600,
            approvalRequired: false,
            approvers: [],
            environmentOverrides: {},
          },
        ],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      };

      const pipelineId = createPipeline(pipelineData);

      expect(pipelineId).toBeTruthy();
      expect(pipelineId).toMatch(/^pipeline_/);

      const { pipelines } = useIntegrationTestingStore.getState();
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].name).toBe('CI/CD Pipeline');
    });

    it('should update an existing pipeline', () => {
      const { createPipeline, updatePipeline } = useIntegrationTestingStore.getState();

      const pipelineId = createPipeline({
        name: 'Original Pipeline',
        description: 'Original',
        stages: [],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      });

      updatePipeline(pipelineId, {
        name: 'Updated Pipeline',
        isEnabled: false,
      });

      const { pipelines } = useIntegrationTestingStore.getState();
      const pipeline = pipelines.find((p) => p.id === pipelineId);

      expect(pipeline?.name).toBe('Updated Pipeline');
      expect(pipeline?.isEnabled).toBe(false);
      expect(pipeline?.version).toBe(2);
    });

    it('should delete a pipeline', () => {
      const { createPipeline, deletePipeline } = useIntegrationTestingStore.getState();

      const pipelineId = createPipeline({
        name: 'Pipeline to Delete',
        description: 'Will be deleted',
        stages: [],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      });

      deletePipeline(pipelineId);

      const { pipelines } = useIntegrationTestingStore.getState();
      expect(pipelines).toHaveLength(0);
    });

    it('should set selected pipeline', () => {
      const { createPipeline, setSelectedPipeline } = useIntegrationTestingStore.getState();

      const pipelineId = createPipeline({
        name: 'Test Pipeline',
        description: 'Test',
        stages: [],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      });

      setSelectedPipeline(pipelineId);

      const { selectedPipeline } = useIntegrationTestingStore.getState();
      expect(selectedPipeline).toBe(pipelineId);
    });
  });

  // ============================================================================
  // Pipeline Execution Tests
  // ============================================================================

  describe('Pipeline Execution', () => {
    it(
      'should run a pipeline successfully',
      async () => {
        const { createPipeline, runPipeline } = useIntegrationTestingStore.getState();

        const pipelineId = createPipeline({
          name: 'Test Pipeline',
          description: 'Test',
          stages: [
            {
              id: 'stage1',
              name: 'Tests',
              type: 'test_execution',
              order: 1,
              testSuites: [],
              conditions: [],
              runInParallel: false,
              continueOnFailure: false,
              timeout: 600,
              approvalRequired: false,
              approvers: [],
              environmentOverrides: {},
            },
          ],
          triggers: [],
          environments: ['staging'],
          notifications: [],
          isEnabled: true,
          status: 'idle',
          createdBy: 'test-user',
        });

        const executionId = await runPipeline(pipelineId, 'staging');

        expect(executionId).toBeTruthy();
        expect(executionId).toMatch(/^pipeline_exec_/);

        const { pipelines } = useIntegrationTestingStore.getState();
        const pipeline = pipelines.find((p) => p.id === pipelineId);
        const execution = pipeline?.executions.find((e) => e.id === executionId);

        expect(execution).toBeDefined();
        expect(execution?.status).toBe('completed');
        expect(execution?.environment).toBe('staging');
      },
      { timeout: 20000 }
    );

    it('should approve a pipeline stage', () => {
      const { createPipeline, approvePipelineStage } = useIntegrationTestingStore.getState();

      const pipelineId = createPipeline({
        name: 'Test Pipeline',
        description: 'Test',
        stages: [
          {
            id: 'stage1',
            name: 'Approval Stage',
            type: 'approval',
            order: 1,
            testSuites: [],
            conditions: [],
            runInParallel: false,
            continueOnFailure: false,
            timeout: 86400,
            approvalRequired: true,
            approvers: ['manager'],
            environmentOverrides: {},
          },
        ],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      });

      // Create a mock execution
      useIntegrationTestingStore.setState((draft) => {
        const pipeline = draft.pipelines.find((p) => p.id === pipelineId);
        if (pipeline) {
          pipeline.executions.push({
            id: 'exec_123',
            pipelineId,
            startedAt: new Date(),
            status: 'waiting_approval',
            triggeredBy: 'manual',
            triggerType: 'manual',
            stageExecutions: [],
            environment: 'staging',
            version: 'v1.0.0',
            summary: {
              totalStages: 1,
              completedStages: 0,
              failedStages: 0,
              skippedStages: 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              overallPassRate: 0,
              totalDuration: 0,
            },
            approvals: [],
          });
        }
      });

      approvePipelineStage('exec_123', 'stage1', 'manager', 'Approved for deployment');

      const { pipelines } = useIntegrationTestingStore.getState();
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      const execution = pipeline?.executions.find((e) => e.id === 'exec_123');

      expect(execution?.approvals).toHaveLength(1);
      expect(execution?.approvals[0].status).toBe('approved');
      expect(execution?.approvals[0].approverId).toBe('manager');
    });

    it('should reject a pipeline stage', () => {
      const { createPipeline, rejectPipelineStage } = useIntegrationTestingStore.getState();

      const pipelineId = createPipeline({
        name: 'Test Pipeline',
        description: 'Test',
        stages: [
          {
            id: 'stage1',
            name: 'Approval Stage',
            type: 'approval',
            order: 1,
            testSuites: [],
            conditions: [],
            runInParallel: false,
            continueOnFailure: false,
            timeout: 86400,
            approvalRequired: true,
            approvers: ['manager'],
            environmentOverrides: {},
          },
        ],
        triggers: [],
        environments: ['staging'],
        notifications: [],
        isEnabled: true,
        status: 'idle',
        createdBy: 'test-user',
      });

      // Create a mock execution
      useIntegrationTestingStore.setState((draft) => {
        const pipeline = draft.pipelines.find((p) => p.id === pipelineId);
        if (pipeline) {
          pipeline.executions.push({
            id: 'exec_123',
            pipelineId,
            startedAt: new Date(),
            status: 'waiting_approval',
            triggeredBy: 'manual',
            triggerType: 'manual',
            stageExecutions: [],
            environment: 'staging',
            version: 'v1.0.0',
            summary: {
              totalStages: 1,
              completedStages: 0,
              failedStages: 0,
              skippedStages: 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              overallPassRate: 0,
              totalDuration: 0,
            },
            approvals: [],
          });
        }
      });

      rejectPipelineStage('exec_123', 'stage1', 'manager', 'Tests did not meet criteria');

      const { pipelines } = useIntegrationTestingStore.getState();
      const pipeline = pipelines.find((p) => p.id === pipelineId);
      const execution = pipeline?.executions.find((e) => e.id === 'exec_123');

      expect(execution?.approvals).toHaveLength(1);
      expect(execution?.approvals[0].status).toBe('rejected');
      expect(execution?.status).toBe('failed');
    });
  });

  // ============================================================================
  // Environment Health Tests
  // ============================================================================

  describe('Environment Health', () => {
    it(
      'should check environment health',
      async () => {
        const { checkEnvironmentHealth } = useIntegrationTestingStore.getState();

        const healthData = await checkEnvironmentHealth('staging');

        expect(healthData).toHaveLength(1);
        expect(healthData[0].environmentId).toBe('staging');
        expect(['healthy', 'warning', 'critical', 'unknown']).toContain(healthData[0].status);
        expect(healthData[0].services).toBeDefined();
        expect(healthData[0].resources).toBeDefined();
        expect(healthData[0].testReadiness.overallReady).toBe(true);

        const { environmentHealth } = useIntegrationTestingStore.getState();
        expect(environmentHealth).toEqual(healthData);
      },
      { timeout: 10000 }
    );

    it('should start health monitoring', () => {
      const { startHealthMonitoring } = useIntegrationTestingStore.getState();

      startHealthMonitoring();

      const { isHealthChecking } = useIntegrationTestingStore.getState();
      expect(isHealthChecking).toBe(true);
    });

    it('should stop health monitoring', () => {
      const { startHealthMonitoring, stopHealthMonitoring } = useIntegrationTestingStore.getState();

      startHealthMonitoring();
      stopHealthMonitoring();

      const { isHealthChecking } = useIntegrationTestingStore.getState();
      expect(isHealthChecking).toBe(false);
    });
  });

  // ============================================================================
  // Test Data Management Tests
  // ============================================================================

  describe('Test Data Management', () => {
    it('should create test data for a suite', () => {
      const { createTestSuite, addTestCase, createTestData } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      addTestCase(suiteId, {
        name: 'Test Case',
        description: 'Test',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'medium',
        estimatedDuration: 30,
      });

      const dataId = createTestData(suiteId, {
        name: 'User Data',
        type: 'static',
        format: 'json',
        value: { username: 'testuser', email: 'test@example.com' },
        isEncrypted: false,
      });

      expect(dataId).toBeTruthy();
      expect(dataId).toMatch(/^data_/);

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);
      const testData = suite?.tests[0]?.testData?.find((d) => d.id === dataId);

      expect(testData).toBeDefined();
      expect(testData?.name).toBe('User Data');
    });

    it('should update test data', () => {
      const { createTestSuite, addTestCase, createTestData, updateTestData } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      addTestCase(suiteId, {
        name: 'Test Case',
        description: 'Test',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'medium',
        estimatedDuration: 30,
      });

      const dataId = createTestData(suiteId, {
        name: 'Original Data',
        type: 'static',
        format: 'json',
        value: { key: 'value' },
        isEncrypted: false,
      });

      updateTestData(suiteId, dataId, {
        name: 'Updated Data',
        isEncrypted: true,
      });

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);
      const testData = suite?.tests[0]?.testData?.find((d) => d.id === dataId);

      expect(testData?.name).toBe('Updated Data');
      expect(testData?.isEncrypted).toBe(true);
    });

    it('should delete test data', () => {
      const { createTestSuite, addTestCase, createTestData, deleteTestData } =
        useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      addTestCase(suiteId, {
        name: 'Test Case',
        description: 'Test',
        type: 'api_test',
        steps: [],
        assertions: [],
        timeout: 60,
        retryCount: 2,
        isEnabled: true,
        dependsOn: [],
        tags: [],
        testData: [],
        priority: 'medium',
        estimatedDuration: 30,
      });

      const dataId = createTestData(suiteId, {
        name: 'Data to Delete',
        type: 'static',
        format: 'json',
        value: {},
        isEncrypted: false,
      });

      deleteTestData(suiteId, dataId);

      const { testSuites } = useIntegrationTestingStore.getState();
      const suite = testSuites.find((s) => s.id === suiteId);
      const testData = suite?.tests[0]?.testData?.find((d) => d.id === dataId);

      expect(testData).toBeUndefined();
    });
  });

  // ============================================================================
  // Reporting Tests
  // ============================================================================

  describe('Reporting', () => {
    it(
      'should generate HTML report',
      async () => {
        const { createTestSuite, addTestCase, runTestSuite, generateReport } =
          useIntegrationTestingStore.getState();

        const suiteId = createTestSuite({
          name: 'Test Suite',
          description: 'Test',
          type: 'api',
          category: 'integration',
          config: {
            timeout: 300,
            retryCount: 3,
            parallelExecution: true,
            maxConcurrency: 5,
            setupScripts: [],
            teardownScripts: [],
            environmentVariables: {},
            requiredServices: [],
            dataSeeds: [],
            reportFormat: ['html' as ReportFormat],
            notificationChannels: [],
            successThreshold: 95,
            performanceThresholds: [],
            customSettings: {},
          },
          tests: [],
          targetEnvironments: ['staging'],
          prerequisites: [],
          isEnabled: true,
          status: 'active',
          createdBy: 'test-user',
          tags: [],
          lastExecutionId: undefined,
        });

        addTestCase(suiteId, {
          name: 'Test',
          description: 'Test',
          type: 'api_test',
          steps: [],
          assertions: [],
          timeout: 60,
          retryCount: 2,
          isEnabled: true,
          dependsOn: [],
          tags: [],
          testData: [],
          priority: 'medium',
          estimatedDuration: 30,
        });

        const executionId = await runTestSuite(suiteId, 'staging');
        const report = await generateReport(executionId, 'html');

        expect(report).toBeInstanceOf(Blob);
        expect(report.type).toBe('text/html');
        expect(report.size).toBeGreaterThan(0);
      },
      { timeout: 20000 }
    );

    it(
      'should export results as JSON',
      async () => {
        const { createTestSuite, addTestCase, runTestSuite, exportResults } =
          useIntegrationTestingStore.getState();

        const suiteId = createTestSuite({
          name: 'Test Suite',
          description: 'Test',
          type: 'api',
          category: 'integration',
          config: {
            timeout: 300,
            retryCount: 3,
            parallelExecution: true,
            maxConcurrency: 5,
            setupScripts: [],
            teardownScripts: [],
            environmentVariables: {},
            requiredServices: [],
            dataSeeds: [],
            reportFormat: ['json' as ReportFormat],
            notificationChannels: [],
            successThreshold: 95,
            performanceThresholds: [],
            customSettings: {},
          },
          tests: [],
          targetEnvironments: ['staging'],
          prerequisites: [],
          isEnabled: true,
          status: 'active',
          createdBy: 'test-user',
          tags: [],
          lastExecutionId: undefined,
        });

        addTestCase(suiteId, {
          name: 'Test',
          description: 'Test',
          type: 'api_test',
          steps: [],
          assertions: [],
          timeout: 60,
          retryCount: 2,
          isEnabled: true,
          dependsOn: [],
          tags: [],
          testData: [],
          priority: 'medium',
          estimatedDuration: 30,
        });

        const executionId = await runTestSuite(suiteId, 'staging');
        const exportBlob = await exportResults([executionId], 'json');

        expect(exportBlob).toBeInstanceOf(Blob);
        expect(exportBlob.type).toBe('application/json');
        expect(exportBlob.size).toBeGreaterThan(0);
      },
      { timeout: 20000 }
    );

    it(
      'should export results as CSV',
      async () => {
        const { createTestSuite, addTestCase, runTestSuite, exportResults } =
          useIntegrationTestingStore.getState();

        const suiteId = createTestSuite({
          name: 'Test Suite',
          description: 'Test',
          type: 'api',
          category: 'integration',
          config: {
            timeout: 300,
            retryCount: 3,
            parallelExecution: true,
            maxConcurrency: 5,
            setupScripts: [],
            teardownScripts: [],
            environmentVariables: {},
            requiredServices: [],
            dataSeeds: [],
            reportFormat: ['json' as ReportFormat],
            notificationChannels: [],
            successThreshold: 95,
            performanceThresholds: [],
            customSettings: {},
          },
          tests: [],
          targetEnvironments: ['staging'],
          prerequisites: [],
          isEnabled: true,
          status: 'active',
          createdBy: 'test-user',
          tags: [],
          lastExecutionId: undefined,
        });

        addTestCase(suiteId, {
          name: 'Test',
          description: 'Test',
          type: 'api_test',
          steps: [],
          assertions: [],
          timeout: 60,
          retryCount: 2,
          isEnabled: true,
          dependsOn: [],
          tags: [],
          testData: [],
          priority: 'medium',
          estimatedDuration: 30,
        });

        const executionId = await runTestSuite(suiteId, 'staging');
        const exportBlob = await exportResults([executionId], 'csv');

        expect(exportBlob).toBeInstanceOf(Blob);
        expect(exportBlob.type).toBe('text/csv');
        expect(exportBlob.size).toBeGreaterThan(0);
      },
      { timeout: 20000 }
    );
  });

  // ============================================================================
  // Search & Filtering Tests
  // ============================================================================

  describe('Search & Filtering', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useIntegrationTestingStore.getState();

      setSearchQuery('api tests');

      const { searchQuery } = useIntegrationTestingStore.getState();
      expect(searchQuery).toBe('api tests');
    });

    it('should set filters', () => {
      const { setFilters } = useIntegrationTestingStore.getState();

      setFilters({
        suiteTypes: ['api', 'integration'],
        statuses: ['active'],
        tags: ['critical'],
      });

      const { filters } = useIntegrationTestingStore.getState();
      expect(filters.suiteTypes).toEqual(['api', 'integration']);
      expect(filters.statuses).toEqual(['active']);
      expect(filters.tags).toEqual(['critical']);
    });

    it('should clear all filters and search', () => {
      const { setSearchQuery, setFilters, clearFilters } = useIntegrationTestingStore.getState();

      setSearchQuery('test');
      setFilters({ suiteTypes: ['api'], statuses: ['active'] });

      clearFilters();

      const { searchQuery, filters } = useIntegrationTestingStore.getState();
      expect(searchQuery).toBe('');
      expect(filters.suiteTypes).toEqual([]);
      expect(filters.statuses).toEqual([]);
    });
  });

  // ============================================================================
  // UI State Management Tests
  // ============================================================================

  describe('UI State Management', () => {
    it('should toggle sidebar collapsed state', () => {
      const { setSidebarCollapsed } = useIntegrationTestingStore.getState();

      setSidebarCollapsed(true);

      let { sidebarCollapsed } = useIntegrationTestingStore.getState();
      expect(sidebarCollapsed).toBe(true);

      setSidebarCollapsed(false);

      ({ sidebarCollapsed } = useIntegrationTestingStore.getState());
      expect(sidebarCollapsed).toBe(false);
    });

    it('should change selected tab', () => {
      const { setSelectedTab } = useIntegrationTestingStore.getState();

      setSelectedTab('executions');

      let { selectedTab } = useIntegrationTestingStore.getState();
      expect(selectedTab).toBe('executions');

      setSelectedTab('pipelines');

      ({ selectedTab } = useIntegrationTestingStore.getState());
      expect(selectedTab).toBe('pipelines');
    });
  });

  // ============================================================================
  // Settings Management Tests
  // ============================================================================

  describe('Settings Management', () => {
    it('should update settings', () => {
      const { updateSettings } = useIntegrationTestingStore.getState();

      updateSettings({
        defaultTimeout: 600,
        enableScreenshots: false,
        notifyOnSuccess: true,
      });

      const { settings } = useIntegrationTestingStore.getState();
      expect(settings.defaultTimeout).toBe(600);
      expect(settings.enableScreenshots).toBe(false);
      expect(settings.notifyOnSuccess).toBe(true);
    });

    it('should preserve other settings on partial update', () => {
      const { updateSettings } = useIntegrationTestingStore.getState();

      const originalRetryCount = useIntegrationTestingStore.getState().settings.defaultRetryCount;

      updateSettings({ defaultTimeout: 500 });

      const { settings } = useIntegrationTestingStore.getState();
      expect(settings.defaultTimeout).toBe(500);
      expect(settings.defaultRetryCount).toBe(originalRetryCount);
    });
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with default test suites', async () => {
      const { initialize } = useIntegrationTestingStore.getState();

      await initialize();

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites.length).toBeGreaterThan(0);

      const apiSuite = testSuites.find((s) => s.type === 'api');
      expect(apiSuite).toBeDefined();
      expect(apiSuite?.name).toContain('API');
    });

    it('should initialize with default pipelines', async () => {
      const { initialize } = useIntegrationTestingStore.getState();

      await initialize();

      const { pipelines } = useIntegrationTestingStore.getState();
      expect(pipelines.length).toBeGreaterThan(0);

      const deploymentPipeline = pipelines.find((p) => p.name.includes('Deployment'));
      expect(deploymentPipeline).toBeDefined();
      expect(deploymentPipeline?.stages.length).toBeGreaterThan(0);
    });

    it('should create default test suites manually', () => {
      const { createDefaultTestSuites } = useIntegrationTestingStore.getState();

      createDefaultTestSuites();

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites.length).toBeGreaterThan(0);

      const apiSuite = testSuites.find((s) => s.name.includes('API Integration'));
      const dbSuite = testSuites.find((s) => s.name.includes('Database'));

      expect(apiSuite).toBeDefined();
      expect(dbSuite).toBeDefined();
    });

    it('should create default pipelines manually', () => {
      const { createDefaultPipelines } = useIntegrationTestingStore.getState();

      createDefaultPipelines();

      const { pipelines } = useIntegrationTestingStore.getState();
      expect(pipelines.length).toBeGreaterThan(0);

      const pipeline = pipelines[0];
      expect(pipeline.name).toContain('Deployment');
      expect(pipeline.stages.length).toBe(3);
    });
  });

  // ============================================================================
  // Feature Flag Protection Tests
  // ============================================================================

  describe('Feature Flag Protection', () => {
    it('should not create test suite when feature flag is disabled', () => {
      FLAGS.integrationTesting = false;

      const { createTestSuite } = useIntegrationTestingStore.getState();

      const suiteId = createTestSuite({
        name: 'Test Suite',
        description: 'Test',
        type: 'api',
        category: 'integration',
        config: {
          timeout: 300,
          retryCount: 3,
          parallelExecution: true,
          maxConcurrency: 5,
          setupScripts: [],
          teardownScripts: [],
          environmentVariables: {},
          requiredServices: [],
          dataSeeds: [],
          reportFormat: ['json' as ReportFormat],
          notificationChannels: [],
          successThreshold: 95,
          performanceThresholds: [],
          customSettings: {},
        },
        tests: [],
        targetEnvironments: ['staging'],
        prerequisites: [],
        isEnabled: true,
        status: 'active',
        createdBy: 'test-user',
        tags: [],
        lastExecutionId: undefined,
      });

      expect(suiteId).toBe('');

      const { testSuites } = useIntegrationTestingStore.getState();
      expect(testSuites).toHaveLength(0);

      FLAGS.integrationTesting = true;
    });

    it('should not run test suite when feature flag is disabled', async () => {
      FLAGS.integrationTesting = false;

      const { runTestSuite } = useIntegrationTestingStore.getState();

      const executionId = await runTestSuite('suite_123', 'staging');

      expect(executionId).toBe('');

      FLAGS.integrationTesting = true;
    });
  });
});
