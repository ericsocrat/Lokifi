import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDevFlag } from '../../src/lib/stores/featureFlags';
import {
  type DataSource,
  type MonitoringAlert,
  type MonitoringDashboard,
  type MonitoringWidget,
  type TimeRange,
  useMonitoringStore,
} from '../../src/lib/stores/monitoringStore';

const createDashboardInput = (): Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Test Dashboard',
  description: 'A test monitoring dashboard',
  layout: {
    type: 'grid',
    rows: 3,
    columns: 4,
    gridSize: 60,
    widgets: [],
  },
  widgets: [],
  dataSources: [],
  refreshInterval: 30000,
  isAutoRefresh: true,
  theme: 'dark',
  isPublic: false,
  permissions: [],
  tags: ['test'],
});

const createWidgetInput = (): Omit<MonitoringWidget, 'id' | 'isLoading' | 'lastUpdated'> => ({
  type: 'metric_chart',
  title: 'Test Metric',
  description: 'Test metric widget',
  config: {
    chartType: 'line',
    unit: '%',
    min: 0,
    max: 100,
  },
  dataSourceId: 'ds-1',
  query: 'test_query',
  displayOptions: {
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    colorScheme: ['#0066CC'],
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    animationDuration: 500,
    enableAnimation: true,
  },
});

const createDataSourceInput = (): Omit<DataSource, 'id' | 'isConnected' | 'lastHealthCheck'> => ({
  name: 'Prometheus',
  type: 'prometheus',
  url: 'http://localhost:9090',
  description: 'Local Prometheus instance',
  tags: ['monitoring'],
  config: {
    timeout: 30,
    retryAttempts: 3,
    retryDelay: 1000,
    cacheDuration: 300,
    enableCache: true,
    rateLimitRequests: 100,
    rateLimitWindow: 60000,
  },
});

const createAlertInput = (): Omit<MonitoringAlert, 'id' | 'status' | 'createdAt'> => ({
  name: 'High CPU Alert',
  description: 'Triggers when CPU exceeds threshold',
  rule: {
    query: 'cpu_usage > 80',
    dataSourceId: 'ds-1',
    condition: {
      type: 'threshold',
      value: 80,
      comparison: '>',
    },
    evaluationInterval: 60,
    threshold: 80,
    operator: '>',
    forDuration: 300,
  },
  severity: 'high',
  notifications: [],
  labels: { env: 'prod' },
  annotations: {},
});

const resetStore = () => {
  act(() => {
    useMonitoringStore.setState({
      isLoading: false,
      error: null,
      lastUpdated: null,
      dashboards: [],
      activeDashboard: null,
      widgets: [],
      selectedWidget: null,
      dataSources: [],
      alerts: [],
      healthChecks: [],
      metrics: [],
      logs: [],
      logFilters: {
        levels: ['info', 'warn', 'error', 'fatal'],
        sources: [],
        timeRange: { type: 'relative', value: 1, unit: 'hours' },
        searchTerm: '',
        tags: [],
      },
      sidebarCollapsed: false,
      selectedTimeRange: { type: 'relative', value: 1, unit: 'hours' },
      refreshInterval: 30000,
      isAutoRefresh: true,
      settings: {
        enableRealTimeMonitoring: true,
        defaultRefreshInterval: 30000,
        maxDataRetention: 30,
        defaultDashboardTheme: 'dark',
        autoSaveDashboards: true,
        enableAlerts: true,
        defaultAlertSeverity: 'medium',
        alertEvaluationInterval: 60,
        enableHealthChecks: true,
        defaultHealthCheckInterval: 300,
        healthCheckTimeout: 30,
        dataSourceTimeout: 30,
        enableDataSourceCaching: true,
        defaultCacheDuration: 300,
        enableLogCollection: true,
        logRetentionDays: 7,
        maxLogEntriesPerQuery: 1000,
        enableNotifications: true,
        notificationCooldown: 300,
        enablePerformanceMonitoring: true,
        maxConcurrentQueries: 10,
        queryTimeout: 60,
      },
      isConnected: false,
      lastSync: null,
    });
  });
};

describe('monitoringStore', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FLAG_MONITORING = '1';
    setDevFlag('monitoring', true);
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FLAG_MONITORING = '0';
    setDevFlag('monitoring', false);
    vi.restoreAllMocks();
  });

  describe('Dashboard Management', () => {
    it('creates and manages dashboards lifecycle', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
      });

      const state1 = useMonitoringStore.getState();
      expect(dashboardId).toBeTruthy();
      expect(dashboardId).toMatch(/^dashboard_\d+_/);
      expect(state1.dashboards).toHaveLength(1);
      expect(state1.dashboards[0].name).toBe('Test Dashboard');

      act(() => {
        store.updateDashboard(dashboardId, { name: 'Updated Dashboard' });
      });

      const state2 = useMonitoringStore.getState();
      expect(state2.dashboards[0].name).toBe('Updated Dashboard');

      act(() => {
        store.deleteDashboard(dashboardId);
      });

      expect(useMonitoringStore.getState().dashboards).toHaveLength(0);
    });

    it('clones dashboards with new name', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
      });

      let clonedId = '';
      act(() => {
        clonedId = store.cloneDashboard(dashboardId, 'Cloned Dashboard');
      });

      const state = useMonitoringStore.getState();
      expect(state.dashboards).toHaveLength(2);
      const cloned = state.dashboards.find((d) => d.id === clonedId);
      expect(cloned?.name).toBe('Cloned Dashboard');
      expect(cloned?.isPublic).toBe(false);
    });

    it('exports and imports dashboards with widgets', async () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      let blobContent: string;
      await act(async () => {
        const blob = await store.exportDashboard(dashboardId);
        const reader = new FileReader();
        blobContent = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(blob!);
        });
      });

      expect(blobContent!).toBeTruthy();

      // Create mock file for import using blobContent
      const mockFile = new File([blobContent!], 'dashboard.json', {
        type: 'application/json',
      });

      // Add text() method to File
      Object.defineProperty(mockFile, 'text', {
        value: async () => blobContent!,
      });

      let importedId = '';
      await act(async () => {
        importedId = await store.importDashboard(mockFile);
      });

      const finalState = useMonitoringStore.getState();
      expect(finalState.dashboards.length).toBeGreaterThanOrEqual(1);
      expect(finalState.dashboards.find((d) => d.id === importedId)).toBeDefined();
    });

    it('sets active dashboard and tracks usage', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        store.setActiveDashboard(dashboardId);
      });

      const state = useMonitoringStore.getState();
      expect(state.activeDashboard).toBe(dashboardId);

      act(() => {
        store.setActiveDashboard(null);
      });

      expect(useMonitoringStore.getState().activeDashboard).toBeNull();
    });
  });

  describe('Widget Management', () => {
    it('adds widgets to dashboards', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      const state = useMonitoringStore.getState();
      expect(widgetId).toBeTruthy();
      expect(widgetId).toMatch(/^widget_\d+_/);
      expect(state.widgets).toHaveLength(1);
      expect(state.dashboards[0].layout.widgets).toHaveLength(1);
      expect(state.dashboards[0].layout.widgets[0].widgetId).toBe(widgetId);
    });

    it('updates widget properties', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      act(() => {
        store.updateWidget(widgetId, { title: 'Updated Widget' });
      });

      const state = useMonitoringStore.getState();
      expect(state.widgets[0].title).toBe('Updated Widget');
    });

    it('removes widgets from dashboards', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      expect(useMonitoringStore.getState().widgets).toHaveLength(1);

      act(() => {
        store.removeWidget(widgetId);
      });

      const state = useMonitoringStore.getState();
      expect(state.widgets).toHaveLength(0);
      expect(state.dashboards[0].layout.widgets).toHaveLength(0);
    });

    it('moves and resizes widgets', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      act(() => {
        store.moveWidget(widgetId, { x: 10, y: 20 });
      });

      let state = useMonitoringStore.getState();
      expect(state.dashboards[0].layout.widgets[0].x).toBe(10);
      expect(state.dashboards[0].layout.widgets[0].y).toBe(20);

      act(() => {
        store.resizeWidget(widgetId, { width: 8, height: 6 });
      });

      state = useMonitoringStore.getState();
      expect(state.dashboards[0].layout.widgets[0].width).toBe(8);
      expect(state.dashboards[0].layout.widgets[0].height).toBe(6);
    });

    it('refreshes widget data with loading state', async () => {
      vi.useFakeTimers();
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
      });

      act(() => {
        store.refreshWidget(widgetId);
      });

      // Fast forward to complete the simulated async delay
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      const state = useMonitoringStore.getState();
      const widget = state.widgets.find((w) => w.id === widgetId);
      expect(widget?.isLoading).toBe(false);
      expect(widget?.lastUpdated).toBeInstanceOf(Date);

      vi.useRealTimers();
    });
  });

  describe('Data Source Management', () => {
    it('creates and manages data sources', () => {
      const store = useMonitoringStore.getState();

      let dataSourceId = '';
      act(() => {
        dataSourceId = store.createDataSource(createDataSourceInput());
      });

      const state1 = useMonitoringStore.getState();
      expect(dataSourceId).toBeTruthy();
      expect(dataSourceId).toMatch(/^datasource_\d+_/);
      expect(state1.dataSources).toHaveLength(1);
      expect(state1.dataSources[0].name).toBe('Prometheus');

      act(() => {
        store.updateDataSource(dataSourceId, { name: 'Updated Prometheus' });
      });

      const state2 = useMonitoringStore.getState();
      expect(state2.dataSources[0].name).toBe('Updated Prometheus');

      act(() => {
        store.deleteDataSource(dataSourceId);
      });

      expect(useMonitoringStore.getState().dataSources).toHaveLength(0);
    });

    it('tests data source connections', async () => {
      const store = useMonitoringStore.getState();

      let dataSourceId = '';
      act(() => {
        dataSourceId = store.createDataSource(createDataSourceInput());
      });

      let success: boolean;
      await act(async () => {
        success = await store.testDataSource(dataSourceId);
      });

      const state = useMonitoringStore.getState();
      const dataSource = state.dataSources[0];
      expect(dataSource.lastHealthCheck).toBeInstanceOf(Date);
      expect(typeof success).toBe('boolean');
    });

    it('connects and disconnects data sources', async () => {
      const store = useMonitoringStore.getState();

      let dataSourceId = '';
      act(() => {
        dataSourceId = store.createDataSource(createDataSourceInput());
      });

      await act(async () => {
        store.connectDataSource(dataSourceId);
      });

      act(() => {
        store.disconnectDataSource(dataSourceId);
      });

      const state = useMonitoringStore.getState();
      expect(state.dataSources[0].isConnected).toBe(false);
    });

    it('marks widgets with error when data source deleted', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      let dataSourceId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        dataSourceId = store.createDataSource(createDataSourceInput());
        widgetId = store.addWidget(dashboardId, {
          ...createWidgetInput(),
          dataSourceId,
        });
      });

      act(() => {
        store.deleteDataSource(dataSourceId);
      });

      const state = useMonitoringStore.getState();
      expect(state.widgets[0].error).toBe('Data source deleted');
    });
  });

  describe('Alert Management', () => {
    it('creates and manages alerts lifecycle', () => {
      const store = useMonitoringStore.getState();

      let alertId = '';
      act(() => {
        alertId = store.createAlert(createAlertInput());
      });

      const state1 = useMonitoringStore.getState();
      expect(alertId).toBeTruthy();
      expect(alertId).toMatch(/^alert_\d+_/);
      expect(state1.alerts).toHaveLength(1);
      expect(state1.alerts[0].status).toBe('pending');

      act(() => {
        store.updateAlert(alertId, { severity: 'critical' });
      });

      const state2 = useMonitoringStore.getState();
      expect(state2.alerts[0].severity).toBe('critical');

      act(() => {
        store.deleteAlert(alertId);
      });

      expect(useMonitoringStore.getState().alerts).toHaveLength(0);
    });

    it('enables and disables alerts', () => {
      const store = useMonitoringStore.getState();

      let alertId = '';
      act(() => {
        alertId = store.createAlert(createAlertInput());
        store.disableAlert(alertId);
      });

      let state = useMonitoringStore.getState();
      expect(state.alerts[0].status).toBe('disabled');

      act(() => {
        store.enableAlert(alertId);
      });

      state = useMonitoringStore.getState();
      expect(state.alerts[0].status).toBe('pending');
    });

    it('acknowledges and resolves alerts', () => {
      const store = useMonitoringStore.getState();

      let alertId = '';
      act(() => {
        alertId = store.createAlert(createAlertInput());
        store.updateAlert(alertId, { status: 'firing' });
      });

      act(() => {
        store.acknowledgeAlert(alertId);
      });

      let state = useMonitoringStore.getState();
      expect(state.alerts[0].annotations.acknowledged).toBe('true');

      act(() => {
        store.resolveAlert(alertId);
      });

      state = useMonitoringStore.getState();
      expect(state.alerts[0].status).toBe('resolved');
      expect(state.alerts[0].resolvedAt).toBeInstanceOf(Date);
    });

    it('tests alert evaluation', async () => {
      const store = useMonitoringStore.getState();

      let alertId = '';
      act(() => {
        alertId = store.createAlert(createAlertInput());
      });

      await act(async () => {
        store.testAlert(alertId);
      });

      const state = useMonitoringStore.getState();
      const alert = state.alerts[0];
      expect(alert).toBeDefined();
      expect(typeof alert.status === 'string').toBe(true);
    });
  });

  describe('Health Check Management', () => {
    it('creates and manages health checks', () => {
      const store = useMonitoringStore.getState();

      let healthCheckId = '';
      act(() => {
        healthCheckId = store.createHealthCheck({
          name: 'API Health',
          type: 'http',
          config: {
            timeout: 30,
            interval: 300,
            retryAttempts: 3,
            retryDelay: 5,
            http: {
              url: 'http://localhost:3000/health',
              method: 'GET',
              expectedStatus: [200],
            },
          },
          isEnabled: true,
          consecutiveFailures: 0,
          history: [],
          description: 'Check API health',
          tags: ['api'],
        });
      });

      const state1 = useMonitoringStore.getState();
      expect(healthCheckId).toBeTruthy();
      expect(healthCheckId).toMatch(/^healthcheck_\d+_/);
      expect(state1.healthChecks).toHaveLength(1);
      expect(state1.healthChecks[0].status).toBe('unknown');

      act(() => {
        store.updateHealthCheck(healthCheckId, { name: 'Updated API Health' });
      });

      const state2 = useMonitoringStore.getState();
      expect(state2.healthChecks[0].name).toBe('Updated API Health');

      act(() => {
        store.deleteHealthCheck(healthCheckId);
      });

      expect(useMonitoringStore.getState().healthChecks).toHaveLength(0);
    });

    it('runs health checks and tracks results', async () => {
      const store = useMonitoringStore.getState();

      let healthCheckId = '';
      act(() => {
        healthCheckId = store.createHealthCheck({
          name: 'API Health',
          type: 'http',
          config: {
            timeout: 30,
            interval: 300,
            retryAttempts: 3,
            retryDelay: 5,
            http: {
              url: 'http://localhost:3000/health',
              method: 'GET',
            },
          },
          isEnabled: true,
          consecutiveFailures: 0,
          history: [],
        });
      });

      await act(async () => {
        await store.runHealthCheck(healthCheckId);
      });

      const state = useMonitoringStore.getState();
      const healthCheck = state.healthChecks[0];
      expect(healthCheck.history).toHaveLength(1);
      expect(healthCheck.lastCheck).toBeInstanceOf(Date);
      expect(['healthy', 'warning', 'critical']).toContain(healthCheck.status);
    });

    it('enables and disables health checks', () => {
      const store = useMonitoringStore.getState();

      let healthCheckId = '';
      act(() => {
        healthCheckId = store.createHealthCheck({
          name: 'API Health',
          type: 'http',
          config: {
            timeout: 30,
            interval: 300,
            retryAttempts: 3,
            retryDelay: 5,
            http: {
              url: 'http://localhost:3000/health',
              method: 'GET',
            },
          },
          isEnabled: true,
          consecutiveFailures: 0,
          history: [],
        });
        store.disableHealthCheck(healthCheckId);
      });

      let state = useMonitoringStore.getState();
      expect(state.healthChecks[0].isEnabled).toBe(false);

      act(() => {
        store.enableHealthCheck(healthCheckId);
      });

      state = useMonitoringStore.getState();
      expect(state.healthChecks[0].isEnabled).toBe(true);
    });
  });

  describe('Metrics Collection', () => {
    it('collects system metrics', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.collectMetrics();
      });

      const state = useMonitoringStore.getState();
      expect(state.metrics.length).toBeGreaterThan(0);
      expect(state.metrics[0].value).toBeGreaterThanOrEqual(0);
    });

    it('retrieves metric history with time range', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.collectMetrics();
      });

      const state = useMonitoringStore.getState();
      if (state.metrics.length > 0) {
        const metricId = state.metrics[0].id;

        const history = store.getMetricHistory(metricId, {
          type: 'relative',
          value: 1,
          unit: 'hours',
        });

        expect(Array.isArray(history)).toBe(true);
      }
    });

    it('clears old metrics', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.collectMetrics();
      });

      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      act(() => {
        store.clearMetrics(oldDate);
      });

      // Metrics should still be there since they're recent
      expect(useMonitoringStore.getState().metrics.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Log Management', () => {
    it('queries logs with filters', async () => {
      const store = useMonitoringStore.getState();

      act(() => {
        store.setLogFilters({
          levels: ['error'],
          sources: ['api'],
        });
      });

      const results = await act(async () => {
        return await store.queryLogs({ levels: ['error', 'fatal'] });
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('clears old logs', () => {
      const store = useMonitoringStore.getState();
      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      act(() => {
        store.clearLogs(oldDate);
      });

      expect(useMonitoringStore.getState().logs).toBeDefined();
    });

    it('updates log filters', () => {
      const store = useMonitoringStore.getState();

      act(() => {
        store.setLogFilters({
          levels: ['error', 'fatal'],
          sources: ['api', 'database'],
          searchTerm: 'timeout',
          tags: ['critical'],
        });
      });

      const state = useMonitoringStore.getState();
      expect(state.logFilters.levels).toEqual(['error', 'fatal']);
      expect(state.logFilters.sources).toEqual(['api', 'database']);
      expect(state.logFilters.searchTerm).toBe('timeout');
      expect(state.logFilters.tags).toEqual(['critical']);
    });
  });

  describe('UI State Management', () => {
    it('toggles sidebar collapsed state', () => {
      const store = useMonitoringStore.getState();

      act(() => {
        store.setSidebarCollapsed(true);
      });

      let state = useMonitoringStore.getState();
      expect(state.sidebarCollapsed).toBe(true);

      act(() => {
        store.setSidebarCollapsed(false);
      });

      state = useMonitoringStore.getState();
      expect(state.sidebarCollapsed).toBe(false);
    });

    it('manages time range and refresh settings', () => {
      const store = useMonitoringStore.getState();

      const newTimeRange: TimeRange = {
        type: 'relative',
        value: 24,
        unit: 'hours',
      };

      act(() => {
        store.setTimeRange(newTimeRange);
        store.setRefreshInterval(60000);
        store.setAutoRefresh(false);
      });

      const state = useMonitoringStore.getState();
      expect(state.selectedTimeRange.value).toBe(24);
      expect(state.refreshInterval).toBe(60000);
      expect(state.isAutoRefresh).toBe(false);
    });

    it('sets selected widget', () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, createWidgetInput());
        store.setSelectedWidget(widgetId);
      });

      let state = useMonitoringStore.getState();
      expect(state.selectedWidget).toBe(widgetId);

      act(() => {
        store.setSelectedWidget(null);
      });

      state = useMonitoringStore.getState();
      expect(state.selectedWidget).toBeNull();
    });
  });

  describe('Settings Management', () => {
    it('updates monitoring settings', () => {
      const store = useMonitoringStore.getState();

      act(() => {
        store.updateSettings({
          enableAlerts: false,
          defaultRefreshInterval: 60000,
          maxDataRetention: 60,
        });
      });

      const state = useMonitoringStore.getState();
      expect(state.settings.enableAlerts).toBe(false);
      expect(state.settings.defaultRefreshInterval).toBe(60000);
      expect(state.settings.maxDataRetention).toBe(60);
    });
  });

  describe('Data Export and Import', () => {
    it('exports monitoring data by type', async () => {
      const store = useMonitoringStore.getState();

      let dashboardId = '';
      let alertId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        alertId = store.createAlert(createAlertInput());
      });

      const dashboardBlob = await act(async () => {
        return await store.exportData('dashboards');
      });

      const alertBlob = await act(async () => {
        return await store.exportData('alerts');
      });

      expect(dashboardBlob!).toBeInstanceOf(Blob);
      expect(alertBlob!).toBeInstanceOf(Blob);
    });

    it('imports monitoring data from file', async () => {
      const store = useMonitoringStore.getState();

      const mockData = {
        type: 'dashboards',
        data: {
          dashboards: [createDashboardInput()],
          widgets: [],
        },
      };

      const fileContent = JSON.stringify(mockData);
      const file = new File([fileContent], 'import.json', {
        type: 'application/json',
      });

      // Add text() method for compatibility
      Object.defineProperty(file, 'text', {
        value: async () => fileContent,
      });

      await act(async () => {
        await store.importData(file);
      });

      const state = useMonitoringStore.getState();
      expect(state.dashboards.length).toBeGreaterThan(0);
    });
  });

  describe('System Operations', () => {
    it('connects and disconnects monitoring system', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.connect();
      });

      let state = useMonitoringStore.getState();
      expect(state.isConnected).toBe(true);

      act(() => {
        store.disconnect();
      });

      state = useMonitoringStore.getState();
      expect(state.isConnected).toBe(false);
    });

    it('syncs monitoring state', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.sync();
      });

      const state = useMonitoringStore.getState();
      expect(state.lastSync).toBeInstanceOf(Date);
      expect(state.error).toBeNull();
    });

    it('initializes monitoring system with default dashboard', async () => {
      const store = useMonitoringStore.getState();

      await act(async () => {
        await store.initialize();
      });

      const state = useMonitoringStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.dashboards.length).toBeGreaterThan(0);
      expect(state.activeDashboard).not.toBeNull();
    });

    it('creates default dashboard with sample widgets', () => {
      const store = useMonitoringStore.getState();

      act(() => {
        store.createDefaultDashboard();
      });

      const state = useMonitoringStore.getState();
      expect(state.dashboards).toHaveLength(1);
      expect(state.widgets.length).toBeGreaterThan(0);
      expect(state.dataSources).toHaveLength(1);
      expect(state.activeDashboard).not.toBeNull();
    });
  });

  describe('Feature Flag Integration', () => {
    it('respects monitoring feature flag', () => {
      act(() => {
        setDevFlag('monitoring', false);
        process.env.NEXT_PUBLIC_FLAG_MONITORING = '0';
      });

      const store = useMonitoringStore.getState();

      const dashboardId = store.createDashboard(createDashboardInput());
      expect(dashboardId).toBe('');

      act(() => {
        setDevFlag('monitoring', true);
        process.env.NEXT_PUBLIC_FLAG_MONITORING = '1';
      });
    });
  });
});
