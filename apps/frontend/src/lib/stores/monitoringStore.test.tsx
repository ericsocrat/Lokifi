import { describe, it, expect, beforeEach } from 'vitest';
import { useMonitoringStore } from './monitoringStore';

describe('monitoringStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMonitoringStore.setState({
      dashboards: [],
      activeDashboardId: null,
      selectedWidgetId: null,
      dataSources: [],
      alerts: [],
      healthChecks: [],
      metrics: {
        current: {},
        historical: [],
      },
      settings: {
        defaultRefreshInterval: 30000,
        enableNotifications: true,
        alertSoundEnabled: false,
        theme: 'auto',
        timezone: 'UTC',
      },
      isLoading: false,
      error: null,
    });
  });

  describe('Dashboard Management', () => {
    it('should create a new dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Test Dashboard',
        description: 'Test description',
        layout: {
          type: 'grid',
          rows: 4,
          columns: 4,
          gridSize: 100,
          widgets: [],
        },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: ['test'],
      });

      expect(dashboardId).toBeDefined();
      expect(typeof dashboardId).toBe('string');

      const state = useMonitoringStore.getState();
      expect(state.dashboards).toHaveLength(1);
      expect(state.dashboards[0].name).toBe('Test Dashboard');
      expect(state.dashboards[0].id).toBe(dashboardId);
    });

    it('should update an existing dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Original Name',
        description: 'Original description',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      store.updateDashboard(dashboardId, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      const state = useMonitoringStore.getState();
      const dashboard = state.dashboards.find((d) => d.id === dashboardId);
      expect(dashboard?.name).toBe('Updated Name');
      expect(dashboard?.description).toBe('Updated description');
    });

    it('should delete a dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'To Delete',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      expect(useMonitoringStore.getState().dashboards).toHaveLength(1);

      store.deleteDashboard(dashboardId);

      expect(useMonitoringStore.getState().dashboards).toHaveLength(0);
    });

    it('should set active dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Test',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      store.setActiveDashboard(dashboardId);

      expect(useMonitoringStore.getState().activeDashboardId).toBe(dashboardId);

      store.setActiveDashboard(null);

      expect(useMonitoringStore.getState().activeDashboardId).toBeNull();
    });
  });

  describe('Widget Management', () => {
    it('should add a widget to a dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Dashboard',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      const widgetId = store.addWidget(dashboardId, {
        type: 'metric_chart',
        title: 'Test Widget',
        config: {},
        dataSourceId: 'test-datasource',
        query: 'SELECT * FROM test',
        displayOptions: {},
        isLoading: false,
      });

      expect(widgetId).toBeDefined();

      const state = useMonitoringStore.getState();
      const dashboard = state.dashboards.find((d) => d.id === dashboardId);
      expect(dashboard?.widgets).toHaveLength(1);
      expect(dashboard?.widgets[0].id).toBe(widgetId);
      expect(dashboard?.widgets[0].title).toBe('Test Widget');
    });

    it('should update a widget', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Dashboard',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      const widgetId = store.addWidget(dashboardId, {
        type: 'gauge',
        title: 'Original Title',
        config: {},
        dataSourceId: 'test',
        query: 'SELECT 1',
        displayOptions: {},
        isLoading: false,
      });

      store.updateWidget(widgetId, { title: 'Updated Title' });

      const state = useMonitoringStore.getState();
      const dashboard = state.dashboards.find((d) => d.id === dashboardId);
      const widget = dashboard?.widgets.find((w) => w.id === widgetId);
      expect(widget?.title).toBe('Updated Title');
    });

    it('should remove a widget', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Dashboard',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      const widgetId = store.addWidget(dashboardId, {
        type: 'table',
        title: 'To Remove',
        config: {},
        dataSourceId: 'test',
        query: 'SELECT 1',
        displayOptions: {},
        isLoading: false,
      });

      const stateBefore = useMonitoringStore.getState();
      const dashboardBefore = stateBefore.dashboards.find((d) => d.id === dashboardId);
      expect(dashboardBefore?.widgets).toHaveLength(1);

      store.removeWidget(widgetId);

      const stateAfter = useMonitoringStore.getState();
      const dashboardAfter = stateAfter.dashboards.find((d) => d.id === dashboardId);
      expect(dashboardAfter?.widgets).toHaveLength(0);
    });

    it('should set selected widget', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Dashboard',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      const widgetId = store.addWidget(dashboardId, {
        type: 'status_indicator',
        title: 'Widget',
        config: {},
        dataSourceId: 'test',
        query: 'SELECT 1',
        displayOptions: {},
        isLoading: false,
      });

      store.setSelectedWidget(widgetId);
      expect(useMonitoringStore.getState().selectedWidgetId).toBe(widgetId);

      store.setSelectedWidget(null);
      expect(useMonitoringStore.getState().selectedWidgetId).toBeNull();
    });
  });

  describe('Data Source Management', () => {
    it('should create a data source', () => {
      const store = useMonitoringStore.getState();
      
      const dataSourceId = store.createDataSource({
        name: 'Test Data Source',
        type: 'prometheus',
        url: 'http://localhost:9090',
        credentials: {
          username: 'user',
          password: 'pass',
        },
        refreshInterval: 30000,
        timeout: 5000,
        retryCount: 3,
        isHealthy: true,
        tags: ['test'],
      });

      expect(dataSourceId).toBeDefined();

      const state = useMonitoringStore.getState();
      expect(state.dataSources).toHaveLength(1);
      expect(state.dataSources[0].id).toBe(dataSourceId);
      expect(state.dataSources[0].name).toBe('Test Data Source');
    });

    it('should update a data source', () => {
      const store = useMonitoringStore.getState();
      
      const dataSourceId = store.createDataSource({
        name: 'Original Name',
        type: 'elasticsearch',
        url: 'http://localhost:9200',
        credentials: {},
        refreshInterval: 30000,
        timeout: 5000,
        retryCount: 3,
        isHealthy: true,
        tags: [],
      });

      store.updateDataSource(dataSourceId, {
        name: 'Updated Name',
        url: 'http://localhost:9201',
      });

      const state = useMonitoringStore.getState();
      const dataSource = state.dataSources.find((ds) => ds.id === dataSourceId);
      expect(dataSource?.name).toBe('Updated Name');
      expect(dataSource?.url).toBe('http://localhost:9201');
    });

    it('should delete a data source', () => {
      const store = useMonitoringStore.getState();
      
      const dataSourceId = store.createDataSource({
        name: 'To Delete',
        type: 'graphite',
        url: 'http://localhost:8080',
        credentials: {},
        refreshInterval: 30000,
        timeout: 5000,
        retryCount: 3,
        isHealthy: true,
        tags: [],
      });

      expect(useMonitoringStore.getState().dataSources).toHaveLength(1);

      store.deleteDataSource(dataSourceId);

      expect(useMonitoringStore.getState().dataSources).toHaveLength(0);
    });
  });

  describe('Alert Management', () => {
    it('should create an alert', () => {
      const store = useMonitoringStore.getState();
      
      const alertId = store.createAlert({
        name: 'CPU Alert',
        description: 'CPU usage threshold',
        severity: 'warning',
        condition: {
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80,
          duration: 300,
        },
        actions: [],
        isEnabled: true,
        tags: ['cpu', 'performance'],
      });

      expect(alertId).toBeDefined();

      const state = useMonitoringStore.getState();
      expect(state.alerts).toHaveLength(1);
      expect(state.alerts[0].id).toBe(alertId);
      expect(state.alerts[0].name).toBe('CPU Alert');
      expect(state.alerts[0].severity).toBe('warning');
    });

    it('should update an alert', () => {
      const store = useMonitoringStore.getState();
      
      const alertId = store.createAlert({
        name: 'Original Alert',
        description: 'Description',
        severity: 'info',
        condition: {
          metric: 'test',
          operator: '>',
          threshold: 50,
          duration: 60,
        },
        actions: [],
        isEnabled: true,
        tags: [],
      });

      store.updateAlert(alertId, {
        name: 'Updated Alert',
        severity: 'critical',
      });

      const state = useMonitoringStore.getState();
      const alert = state.alerts.find((a) => a.id === alertId);
      expect(alert?.name).toBe('Updated Alert');
      expect(alert?.severity).toBe('critical');
    });

    it('should delete an alert', () => {
      const store = useMonitoringStore.getState();
      
      const alertId = store.createAlert({
        name: 'To Delete',
        description: '',
        severity: 'warning',
        condition: {
          metric: 'test',
          operator: '>',
          threshold: 10,
          duration: 30,
        },
        actions: [],
        isEnabled: false,
        tags: [],
      });

      expect(useMonitoringStore.getState().alerts).toHaveLength(1);

      store.deleteAlert(alertId);

      expect(useMonitoringStore.getState().alerts).toHaveLength(0);
    });
  });

  describe('Health Check Management', () => {
    it('should create a health check', () => {
      const store = useMonitoringStore.getState();
      
      const healthCheckId = store.createHealthCheck({
        name: 'API Health',
        description: 'Check API availability',
        type: 'http',
        target: 'http://localhost:8000/health',
        interval: 60000,
        timeout: 5000,
        retryCount: 3,
        expectedStatus: 200,
        isEnabled: true,
        tags: ['api', 'critical'],
      });

      expect(healthCheckId).toBeDefined();

      const state = useMonitoringStore.getState();
      expect(state.healthChecks).toHaveLength(1);
      expect(state.healthChecks[0].id).toBe(healthCheckId);
      expect(state.healthChecks[0].name).toBe('API Health');
    });

    it('should update a health check', () => {
      const store = useMonitoringStore.getState();
      
      const healthCheckId = store.createHealthCheck({
        name: 'Original Check',
        description: 'Description',
        type: 'tcp',
        target: 'localhost:5432',
        interval: 60000,
        timeout: 5000,
        retryCount: 3,
        expectedStatus: 200,
        isEnabled: true,
        tags: [],
      });

      store.updateHealthCheck(healthCheckId, {
        name: 'Updated Check',
        interval: 120000,
      });

      const state = useMonitoringStore.getState();
      const healthCheck = state.healthChecks.find((hc) => hc.id === healthCheckId);
      expect(healthCheck?.name).toBe('Updated Check');
      expect(healthCheck?.interval).toBe(120000);
    });

    it('should delete a health check', () => {
      const store = useMonitoringStore.getState();
      
      const healthCheckId = store.createHealthCheck({
        name: 'To Delete',
        description: '',
        type: 'ping',
        target: '8.8.8.8',
        interval: 30000,
        timeout: 3000,
        retryCount: 2,
        expectedStatus: 200,
        isEnabled: false,
        tags: [],
      });

      expect(useMonitoringStore.getState().healthChecks).toHaveLength(1);

      store.deleteHealthCheck(healthCheckId);

      expect(useMonitoringStore.getState().healthChecks).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating non-existent dashboard', () => {
      const store = useMonitoringStore.getState();
      
      // Should not throw error
      store.updateDashboard('non-existent-id', { name: 'Updated' });
      
      // State should remain unchanged
      expect(useMonitoringStore.getState().dashboards).toHaveLength(0);
    });

    it('should handle deleting non-existent widget', () => {
      const store = useMonitoringStore.getState();
      
      // Should not throw error
      store.removeWidget('non-existent-id');
      
      // State should remain unchanged
      expect(useMonitoringStore.getState().dashboards).toHaveLength(0);
    });

    it('should handle adding widget to non-existent dashboard', () => {
      const store = useMonitoringStore.getState();
      
      const widgetId = store.addWidget('non-existent-dashboard', {
        type: 'metric_chart',
        title: 'Widget',
        config: {},
        dataSourceId: 'test',
        query: 'SELECT 1',
        displayOptions: {},
        isLoading: false,
      });

      // Should return empty string or handle gracefully
      expect(widgetId).toBe('');
      expect(useMonitoringStore.getState().dashboards).toHaveLength(0);
    });

    it('should maintain state immutability', () => {
      const store = useMonitoringStore.getState();
      
      const dashboardId = store.createDashboard({
        name: 'Test',
        description: '',
        layout: { type: 'grid', rows: 4, columns: 4, gridSize: 100, widgets: [] },
        widgets: [],
        dataSources: [],
        refreshInterval: 30000,
        isAutoRefresh: true,
        theme: 'light',
        isPublic: false,
        permissions: [],
        tags: [],
      });

      const stateBefore = useMonitoringStore.getState();
      const dashboardsBefore = stateBefore.dashboards;

      store.updateDashboard(dashboardId, { name: 'Updated' });

      const stateAfter = useMonitoringStore.getState();
      const dashboardsAfter = stateAfter.dashboards;

      // References should be different (immutable update)
      expect(dashboardsBefore).not.toBe(dashboardsAfter);
    });
  });
});
