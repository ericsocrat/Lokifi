/* eslint-disable @typescript-eslint/no-unused-vars -- Store tests assign IDs to verify creation side effects */
import { act } from '@testing-library/react';
import { enableMapSet } from 'immer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDevFlag } from '../../src/lib/stores/featureFlags';
import {
  type AlertRule,
  type Dashboard,
  type ErrorEvent,
  type MetricDefinition,
  type SystemMetrics,
  type TimeRange,
  type UserBehaviorEvent,
  useObservabilityStore,
} from '../../src/lib/stores/observabilityStore';

// Enable Map/Set support for Immer (required for sessionEvents Map)
enableMapSet();

const createMetricInput = (): Omit<MetricDefinition, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Test Metric',
  description: 'A test metric',
  type: 'counter',
  unit: 'count',
  source: 'user',
  tags: ['test'],
  alertRules: [],
  retentionPeriod: 30,
  isActive: true,
});

const createAlertRuleInput = (
  metricId: string
): Omit<AlertRule, 'id' | 'status' | 'lastTriggered' | 'createdAt'> => ({
  metricId,
  name: 'High CPU Alert',
  description: 'Triggers when CPU exceeds threshold',
  condition: {
    operator: 'gt',
    aggregation: 'avg',
    window: 60,
  },
  threshold: 80,
  duration: 60,
  actions: [
    {
      type: 'notification',
      config: {},
      isEnabled: true,
    },
  ],
  severity: 'warning',
  isEnabled: true,
});

const createSystemMetricsInput = (): Partial<SystemMetrics> => ({
  performance: {
    pageLoadTime: 1200,
    renderTime: 350,
    apiResponseTime: 450,
    memoryUsage: 512,
    cpuUsage: 45,
  },
  charts: {
    activeCharts: 3,
    renderingCharts: 1,
    dataPointsLoaded: 50000,
    indicatorsActive: 5,
    drawingToolsActive: 2,
  },
});

const createDashboardInput = (): Omit<
  Dashboard,
  'id' | 'createdAt' | 'updatedAt' | 'viewCount'
> => ({
  name: 'Test Dashboard',
  description: 'Dashboard for testing',
  widgets: [],
  layout: {
    type: 'grid',
    columns: 12,
    gap: 16,
    padding: 24,
  },
  isPublic: false,
  sharedWith: [],
  owner: 'test-user',
  refreshInterval: 30,
  timeRange: {
    type: 'relative',
    start: '1h',
    end: 'now',
  },
  isAutoRefresh: true,
});

const resetStore = () => {
  act(() => {
    useObservabilityStore.setState({
      metrics: [],
      metricValues: [],
      alertRules: [],
      activeAlerts: [],
      systemMetrics: [],
      currentMetrics: null,
      userEvents: [],
      sessionEvents: new Map(),
      errors: [],
      recentErrors: [],
      performanceTraces: [],
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0,
        avgResponseTime: 0,
        errorRate: 0,
      },
      logs: [],
      logBuffer: [],
      dashboards: [],
      activeDashboard: null,
      isRealTimeEnabled: false,
      websocketConnected: false,
      lastDataUpdate: null,
      settings: {
        retentionDays: 30,
        maxEventsPerSession: 1000,
        enablePerformanceMonitoring: true,
        enableErrorReporting: true,
        enableUserTracking: true,
        debugMode: false,
      },
      selectedTimeRange: {
        type: 'relative',
        start: '1h',
        end: 'now',
      },
      filters: {},
      isLoading: false,
      errorMessage: null,
    });
  });
};

describe('observabilityStore', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FLAG_OBSERVABILITY = '1';
    setDevFlag('observability', true);
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    resetStore();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_FLAG_OBSERVABILITY = '0';
    setDevFlag('observability', false);
    vi.restoreAllMocks();
  });

  describe('Metric Management', () => {
    it('creates and manages metrics lifecycle', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000);
      const store = useObservabilityStore.getState();

      let metricId = '';
      act(() => {
        metricId = store.createMetric(createMetricInput());
      });

      const state1 = useObservabilityStore.getState();
      expect(metricId).toBe('metric_1000');
      expect(state1.metrics).toHaveLength(1);
      expect(state1.metrics[0].name).toBe('Test Metric');

      act(() => {
        store.updateMetric(metricId, { name: 'Updated Metric', unit: 'ms' });
      });

      const state2 = useObservabilityStore.getState();
      expect(state2.metrics[0].name).toBe('Updated Metric');
      expect(state2.metrics[0].unit).toBe('ms');

      act(() => {
        store.deleteMetric(metricId);
      });

      expect(useObservabilityStore.getState().metrics).toHaveLength(0);
      nowSpy.mockRestore();
    });

    it('records metric values and limits storage', () => {
      const store = useObservabilityStore.getState();
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2000);

      act(() => {
        const metricId = store.createMetric(createMetricInput());
        store.recordMetricValue(metricId, 42, { environment: 'test' });
        store.recordMetricValue(metricId, 58);
      });

      const state = useObservabilityStore.getState();
      expect(state.metricValues).toHaveLength(2);
      expect(state.metricValues[0].value).toBe(42);
      expect(state.metricValues[0].labels).toEqual({ environment: 'test' });
      expect(state.metricValues[1].value).toBe(58);

      mathSpy.mockRestore();
      nowSpy.mockRestore();
    });
  });

  describe('Alert Management', () => {
    it('creates alerts and detects threshold violations', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(3000);
      const store = useObservabilityStore.getState();

      let metricId = '';
      act(() => {
        metricId = store.createMetric({ ...createMetricInput(), name: 'CPU Usage' });
      });

      act(() => {
        const ruleId = store.createAlertRule(createAlertRuleInput(metricId));
        expect(ruleId).toBe('alert_3000');
      });

      const state1 = useObservabilityStore.getState();
      expect(state1.alertRules).toHaveLength(1);
      expect(state1.alertRules[0].status).toBe('active');

      act(() => {
        store.recordMetricValue(metricId, 90);
        store.checkAlertRules();
      });

      const state2 = useObservabilityStore.getState();
      expect(state2.activeAlerts).toHaveLength(1);
      expect(state2.activeAlerts[0].status).toBe('firing');

      nowSpy.mockRestore();
    });

    it('resolves alerts when condition clears', () => {
      const store = useObservabilityStore.getState();

      let metricId = '';
      let ruleId = '';
      act(() => {
        metricId = store.createMetric(createMetricInput());
        ruleId = store.createAlertRule(createAlertRuleInput(metricId));
        store.recordMetricValue(metricId, 90);
        store.checkAlertRules();
      });

      expect(useObservabilityStore.getState().activeAlerts).toHaveLength(1);

      act(() => {
        store.recordMetricValue(metricId, 50);
        store.checkAlertRules();
      });

      const state = useObservabilityStore.getState();
      expect(state.activeAlerts).toHaveLength(0);
      expect(state.alertRules[0].status).toBe('resolved');
    });
  });

  describe('System Monitoring', () => {
    it('records system metrics and updates current state', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        store.recordSystemMetrics(createSystemMetricsInput());
      });

      const state = useObservabilityStore.getState();
      expect(state.systemMetrics).toHaveLength(1);
      expect(state.currentMetrics?.performance.cpuUsage).toBe(45);
      expect(state.lastDataUpdate).toBeInstanceOf(Date);
    });

    it('limits stored system metrics to 1000 entries', async () => {
      const store = useObservabilityStore.getState();

      // Record metrics in smaller batches to avoid timeout
      await act(async () => {
        for (let i = 0; i < 1100; i += 100) {
          const batch = Math.min(100, 1100 - i);
          for (let j = 0; j < batch; j++) {
            store.recordSystemMetrics({ ...createSystemMetricsInput() });
          }
          // Yield to event loop between batches
          await Promise.resolve();
        }
      });

      expect(useObservabilityStore.getState().systemMetrics).toHaveLength(1000);
    });
  });

  describe('User Behavior Tracking', () => {
    it('tracks events and groups by session', () => {
      const store = useObservabilityStore.getState();
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(4000);

      const event: Omit<UserBehaviorEvent, 'id' | 'timestamp'> = {
        sessionId: 'session-1',
        userId: 'user-1',
        type: 'click',
        category: 'button',
        action: 'chart_zoom',
        label: 'chart-1',
        value: 2,
        page: '/dashboard',
        component: 'Chart',
        feature: 'zoom',
        userAgent: 'test-agent',
        viewport: { width: 1920, height: 1080 },
        deviceType: 'desktop',
        properties: {},
      };

      act(() => {
        store.trackEvent(event);
        store.trackEvent({ ...event, action: 'chart_pan' });
      });

      const state = useObservabilityStore.getState();
      expect(state.userEvents).toHaveLength(2);
      expect(state.sessionEvents.get('session-1')).toHaveLength(2);

      mathSpy.mockRestore();
      nowSpy.mockRestore();
    });

    it('tracks page views with context', () => {
      const store = useObservabilityStore.getState();

      vi.spyOn(store, 'getCurrentSessionId').mockReturnValue('session-test');
      vi.spyOn(store, 'getCurrentUserId').mockReturnValue('user-test');

      act(() => {
        store.trackPageView('/portfolio', { referrer: '/dashboard' });
      });

      const state = useObservabilityStore.getState();
      expect(state.userEvents).toHaveLength(1);
      expect(state.userEvents[0].type).toBe('view');
      expect(state.userEvents[0].page).toBe('/portfolio');
    });
  });

  describe('Error Tracking', () => {
    it('reports errors and adds to recent errors', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5000);
      const store = useObservabilityStore.getState();

      const error: Omit<ErrorEvent, 'id' | 'timestamp' | 'stackTrace'> = {
        sessionId: 'session-1',
        userId: 'user-1',
        type: 'javascript',
        message: 'Undefined is not a function',
        stack: 'Error stack trace...',
        source: 'app.js',
        page: '/dashboard',
        component: 'Chart',
        feature: 'render',
        userAgent: 'test-agent',
        severity: 'high',
        status: 'new',
        tags: ['runtime', 'chart'],
        customData: {},
      };

      act(() => {
        store.reportError(error);
      });

      const state = useObservabilityStore.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.recentErrors).toHaveLength(1);
      expect(state.errors[0].id).toBe('error_5000');

      nowSpy.mockRestore();
    });

    it('updates error status and tracks resolution', () => {
      const store = useObservabilityStore.getState();

      let errorId = '';
      act(() => {
        const error: Omit<ErrorEvent, 'id' | 'timestamp' | 'stackTrace'> = {
          sessionId: 'session-1',
          type: 'javascript',
          message: 'Test error',
          page: '/test',
          userAgent: 'test',
          severity: 'low',
          status: 'new',
          tags: [],
          customData: {},
        };
        store.reportError(error);
        errorId = useObservabilityStore.getState().errors[0].id;
      });

      act(() => {
        store.updateErrorStatus(errorId, 'resolved', 'developer-1');
      });

      const state = useObservabilityStore.getState();
      expect(state.errors[0].status).toBe('resolved');
      expect(state.errors[0].assignedTo).toBe('developer-1');
      expect(state.errors[0].resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('Performance Tracking', () => {
    it('starts and ends performance traces', () => {
      const store = useObservabilityStore.getState();
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.8);
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(6000);
      const perfNowSpy = vi.spyOn(performance, 'now').mockReturnValue(100);
      const markSpy = vi.spyOn(performance, 'mark').mockImplementation(() => undefined);
      const measureSpy = vi
        .spyOn(performance, 'measure')
        .mockImplementation(() => ({}) as PerformanceEntry);
      const clearMarksSpy = vi.spyOn(performance, 'clearMarks').mockImplementation(() => undefined);
      const clearMeasuresSpy = vi
        .spyOn(performance, 'clearMeasures')
        .mockImplementation(() => undefined);

      let traceId = '';
      act(() => {
        traceId = store.startTrace('api_call', 'fetch');
      });

      expect(traceId).toBe('trace_6000_0.8');
      expect(markSpy).toHaveBeenCalledWith(`trace_start_${traceId}`);

      perfNowSpy.mockReturnValue(250);
      act(() => {
        store.endTrace(traceId, 'success');
      });

      const state = useObservabilityStore.getState();
      expect(state.performanceTraces).toHaveLength(1);
      expect(state.performanceTraces[0].name).toBe('api_call');
      expect(state.performanceTraces[0].duration).toBe(150);

      mathSpy.mockRestore();
      nowSpy.mockRestore();
      perfNowSpy.mockRestore();
      markSpy.mockRestore();
      measureSpy.mockRestore();
      clearMarksSpy.mockRestore();
      clearMeasuresSpy.mockRestore();
    });

    it('calculates performance percentiles correctly', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        // Use more varied durations to ensure proper percentile spread
        [50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700].forEach(
          (duration) => {
            store.recordPerformance({
              sessionId: 'session-1',
              name: 'test',
              operation: 'test',
              duration,
              page: '/test',
              status: 'success',
              timings: {},
              tags: {},
            });
          }
        );
      });

      const state = useObservabilityStore.getState();
      expect(state.performanceMetrics.p50).toBeGreaterThan(0);
      expect(state.performanceMetrics.p95).toBeGreaterThan(state.performanceMetrics.p50);
      expect(state.performanceMetrics.p99).toBeGreaterThanOrEqual(state.performanceMetrics.p95);
      expect(state.performanceMetrics.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Logging', () => {
    it('logs messages with different levels', () => {
      const store = useObservabilityStore.getState();
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

      act(() => {
        store.debug('Debug message', { detail: 'debug-data' });
        store.info('Info message');
        store.warn('Warning message');
        store.error('Error message', new Error('Test error'));
      });

      const state = useObservabilityStore.getState();
      expect(state.logBuffer).toHaveLength(4);
      expect(state.logBuffer[0].level).toBe('debug');
      expect(state.logBuffer[1].level).toBe('info');
      expect(state.logBuffer[2].level).toBe('warn');
      expect(state.logBuffer[3].level).toBe('error');

      mathSpy.mockRestore();
    });

    it('flushes log buffer when full', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        for (let i = 0; i < 105; i++) {
          store.info(`Message ${i}`);
        }
      });

      const state = useObservabilityStore.getState();
      expect(state.logs.length).toBeGreaterThan(0);
      expect(state.logBuffer.length).toBeLessThan(100);
    });
  });

  describe('Dashboard Management', () => {
    it('creates and manages dashboards', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(7000);
      const store = useObservabilityStore.getState();

      let dashboardId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
      });

      const state1 = useObservabilityStore.getState();
      expect(dashboardId).toBe('dashboard_7000');
      expect(state1.dashboards).toHaveLength(1);
      expect(state1.dashboards[0].name).toBe('Test Dashboard');

      act(() => {
        store.updateDashboard(dashboardId, { name: 'Updated Dashboard' });
      });

      const state2 = useObservabilityStore.getState();
      expect(state2.dashboards[0].name).toBe('Updated Dashboard');

      act(() => {
        store.deleteDashboard(dashboardId);
      });

      expect(useObservabilityStore.getState().dashboards).toHaveLength(0);
      nowSpy.mockRestore();
    });

    it('manages widgets within dashboards', () => {
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(8000);
      const store = useObservabilityStore.getState();

      let dashboardId = '';
      let widgetId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        widgetId = store.addWidget(dashboardId, {
          type: 'metric',
          title: 'CPU Usage',
          x: 0,
          y: 0,
          width: 4,
          height: 2,
          config: { metricId: 'metric-1', format: 'percent' },
          query: 'cpu_usage',
          theme: 'auto',
          showLegend: true,
          showTitle: true,
        });
      });

      const state1 = useObservabilityStore.getState();
      expect(widgetId).toBe('widget_8000');
      expect(state1.dashboards[0].widgets).toHaveLength(1);

      act(() => {
        store.updateWidget(dashboardId, widgetId, { title: 'Updated Widget' });
      });

      const state2 = useObservabilityStore.getState();
      expect(state2.dashboards[0].widgets[0].title).toBe('Updated Widget');

      act(() => {
        store.removeWidget(dashboardId, widgetId);
      });

      expect(useObservabilityStore.getState().dashboards[0].widgets).toHaveLength(0);
      nowSpy.mockRestore();
    });

    it('sets and tracks active dashboard', () => {
      const store = useObservabilityStore.getState();

      let dashboardId = '';
      act(() => {
        dashboardId = store.createDashboard(createDashboardInput());
        store.setActiveDashboard(dashboardId);
      });

      const state1 = useObservabilityStore.getState();
      expect(state1.activeDashboard?.id).toBe(dashboardId);
      expect(state1.dashboards[0].viewCount).toBe(1);
      expect(state1.dashboards[0].lastViewedAt).toBeInstanceOf(Date);

      act(() => {
        store.setActiveDashboard(null);
      });

      expect(useObservabilityStore.getState().activeDashboard).toBeNull();
    });
  });

  describe('Real-time Features', () => {
    it('enables real-time and connects websocket', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        store.enableRealTime();
      });

      const state = useObservabilityStore.getState();
      expect(state.isRealTimeEnabled).toBe(true);
      expect(state.websocketConnected).toBe(true);
      // Note: Store uses structured logger (logger.debug) internally
    });

    it('disables real-time and disconnects websocket', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        store.enableRealTime();
        store.disableRealTime();
      });

      const state = useObservabilityStore.getState();
      expect(state.isRealTimeEnabled).toBe(false);
      expect(state.websocketConnected).toBe(false);
    });
  });

  describe('Data Management', () => {
    it('clears old data before retention date', () => {
      const store = useObservabilityStore.getState();
      const oldDate = new Date('2020-01-01');
      const newDate = new Date('2025-01-01');

      act(() => {
        store.recordMetricValue('metric-1', 100);
        useObservabilityStore.setState({
          metricValues: [
            { ...useObservabilityStore.getState().metricValues[0], timestamp: oldDate },
          ],
        });
        store.recordMetricValue('metric-1', 200);
        useObservabilityStore.setState((state) => ({
          metricValues: [state.metricValues[0], { ...state.metricValues[1], timestamp: newDate }],
        }));
      });

      expect(useObservabilityStore.getState().metricValues).toHaveLength(2);

      act(() => {
        store.clearOldData(new Date('2024-01-01'));
      });

      const state = useObservabilityStore.getState();
      expect(state.metricValues).toHaveLength(1);
      expect(state.metricValues[0].timestamp).toEqual(newDate);
    });

    it('optimizes storage based on retention settings', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        store.updateSettings({ retentionDays: 7 });
        store.optimizeStorage();
      });

      expect(useObservabilityStore.getState().settings.retentionDays).toBe(7);
    });
  });

  describe('Settings Management', () => {
    it('updates settings and filters', () => {
      const store = useObservabilityStore.getState();

      act(() => {
        store.updateSettings({ debugMode: true, retentionDays: 60 });
        store.setFilters({ severity: ['critical', 'high'], component: ['Chart'] });
      });

      const state = useObservabilityStore.getState();
      expect(state.settings.debugMode).toBe(true);
      expect(state.settings.retentionDays).toBe(60);
      expect(state.filters.severity).toEqual(['critical', 'high']);
      expect(state.filters.component).toEqual(['Chart']);
    });

    it('updates time range selection', () => {
      const store = useObservabilityStore.getState();

      const newTimeRange: TimeRange = {
        type: 'absolute',
        start: new Date('2025-01-01'),
        end: new Date('2025-01-02'),
      };

      act(() => {
        store.setTimeRange(newTimeRange);
      });

      const state = useObservabilityStore.getState();
      expect(state.selectedTimeRange.type).toBe('absolute');
      expect(state.selectedTimeRange.start).toEqual(new Date('2025-01-01'));
    });
  });

  describe('Helper Methods', () => {
    it('gets current session and user IDs', () => {
      const store = useObservabilityStore.getState();
      sessionStorage.setItem('session_id', 'test-session');
      localStorage.setItem('user_id', 'test-user');

      const sessionId = store.getCurrentSessionId();
      const userId = store.getCurrentUserId();

      expect(sessionId).toBe('test-session');
      expect(userId).toBe('test-user');
    });

    it('detects device type from window width', () => {
      const store = useObservabilityStore.getState();

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      expect(store.getDeviceType()).toBe('mobile');

      Object.defineProperty(window, 'innerWidth', { value: 800 });
      expect(store.getDeviceType()).toBe('tablet');

      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      expect(store.getDeviceType()).toBe('desktop');
    });
  });
});
