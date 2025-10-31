import type { BaseStoreState } from '@/types/stores';
import type { Draft } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// H6: Monitoring System - Advanced monitoring for seamless upgrades
// Real-time health monitoring, automated issue detection, rollback triggers

// Monitoring Types
export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;

  // Dashboard Configuration
  layout: DashboardLayout;
  widgets: MonitoringWidget[];

  // Data Sources
  dataSources: DataSource[];

  // User Settings
  refreshInterval: number; // ms
  isAutoRefresh: boolean;
  theme: 'light' | 'dark' | 'auto';

  // Sharing & Permissions
  isPublic: boolean;
  permissions: DashboardPermission[];
  tags: string[];
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  rows: number;
  columns: number;
  gridSize: number;
  widgets: WidgetPosition[];
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

export interface MonitoringWidget {
  id: string;
  type: MonitoringWidgetType;
  title: string;
  description?: string;

  // Configuration
  config: WidgetConfig;

  // Data
  dataSourceId: string;
  query: string;

  // Display Settings
  displayOptions: WidgetDisplayOptions;

  // Status
  isLoading: boolean;
  error?: string;
  lastUpdated?: Date;
}

export type MonitoringWidgetType =
  | 'metric_chart' // Time series chart
  | 'gauge' // Single value gauge
  | 'status_indicator' // Health status
  | 'table' // Data table
  | 'log_viewer' // Log display
  | 'alert_list' // Alert feed
  | 'heatmap' // Heat map
  | 'world_map' // Geographic map
  | 'histogram' // Distribution chart
  | 'pie_chart' // Pie/donut chart
  | 'bar_chart' // Bar chart
  | 'scatter_plot' // Scatter plot
  | 'sankey' // Flow diagram
  | 'funnel' // Funnel chart
  | 'custom'; // Custom widget

export interface WidgetConfig {
  // Chart Configuration
  chartType?: 'line' | 'area' | 'bar' | 'scatter';
  stacking?: 'none' | 'normal' | 'percent';

  // Time Configuration
  timeRange?: TimeRange;
  granularity?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month';

  // Value Configuration
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;

  // Thresholds
  thresholds?: WidgetThreshold[];

  // Aggregation
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'last';

  // Custom Settings
  // any required: User-defined widget configuration (dynamic, arbitrary structure)
  customConfig?: Record<string, any>;
}

export interface WidgetThreshold {
  id: string;
  value: number;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
  color: string;
  label?: string;
  isVisible: boolean;
}

export interface WidgetDisplayOptions {
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;

  // Colors
  colorScheme: string[];
  backgroundColor?: string;
  textColor?: string;

  // Font
  fontSize: number;
  fontFamily: string;

  // Animation
  animationDuration: number;
  enableAnimation: boolean;
}

export interface TimeRange {
  type: 'relative' | 'absolute';

  // Relative time
  value?: number;
  unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

  // Absolute time
  start?: Date;
  end?: Date;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;

  // Connection
  url: string;
  credentials?: DataSourceCredentials;

  // Configuration
  config: DataSourceConfig;

  // Status
  isConnected: boolean;
  lastHealthCheck?: Date;
  error?: string;

  // Metadata
  description?: string;
  tags?: string[];
}

export type DataSourceType =
  | 'prometheus'
  | 'grafana'
  | 'elasticsearch'
  | 'influxdb'
  | 'mysql'
  | 'postgresql'
  | 'mongodb'
  | 'redis'
  | 'api'
  | 'webhook'
  | 'file'
  | 'custom';

export interface DataSourceCredentials {
  type: 'none' | 'basic' | 'oauth' | 'token' | 'key';
  username?: string;
  password?: string;
  token?: string;
  apiKey?: string;
  oauthConfig?: OAuthConfig;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tokenUrl: string;
  authUrl: string;
}

export interface DataSourceConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;

  // Caching
  cacheDuration: number;
  enableCache: boolean;

  // Rate Limiting
  rateLimitRequests: number;
  rateLimitWindow: number; // ms

  // Custom settings
  // any required: User-defined data source configuration (dynamic, provider-specific)
  customConfig?: Record<string, any>;
}

export interface DashboardPermission {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedAt: Date;
  grantedBy: string;
}

export interface MonitoringAlert {
  id: string;
  name: string;
  description: string;

  // Alert Rule
  rule: AlertRule;

  // Status
  status: 'firing' | 'resolved' | 'pending' | 'disabled';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  // Timing
  createdAt: Date;
  firedAt?: Date;
  resolvedAt?: Date;
  lastEvaluated?: Date;

  // Notification
  notifications: AlertNotification[];

  // Metadata
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface AlertRule {
  query: string;
  dataSourceId: string;

  // Evaluation
  condition: AlertCondition;
  evaluationInterval: number; // seconds

  // Threshold
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=';

  // Time conditions
  forDuration?: number; // seconds - how long condition must be true

  // Recovery
  resolveTimeout?: number; // seconds - auto-resolve after this time
}

export interface AlertCondition {
  type: 'threshold' | 'change' | 'anomaly' | 'missing_data';

  // Threshold condition
  value?: number;
  comparison?: '>' | '<' | '>=' | '<=' | '=' | '!=';

  // Change condition
  changeType?: 'absolute' | 'percentage';
  changeValue?: number;
  timeWindow?: number; // seconds

  // Anomaly detection
  algorithm?: 'statistical' | 'ml' | 'seasonal';
  sensitivity?: number; // 0-100

  // Missing data
  missingDataTimeout?: number; // seconds
}

export interface AlertNotification {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';

  // Configuration
  config: NotificationConfig;

  // Status
  isEnabled: boolean;
  lastSent?: Date;
  deliveryStatus?: 'pending' | 'sent' | 'failed' | 'delivered';
  error?: string;
}

export interface NotificationConfig {
  // Email
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    template?: string;
  };

  // Slack
  slack?: {
    webhook: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    template?: string;
  };

  // Webhook
  webhook?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  };

  // SMS
  sms?: {
    to: string[];
    message?: string;
    provider?: 'twilio' | 'aws' | 'custom';
  };

  // Push notification
  push?: {
    tokens: string[];
    title?: string;
    body?: string;
    // any required: Push notification payload data (arbitrary structure per provider)
    data?: Record<string, any>;
  };
}

export interface HealthCheck {
  id: string;
  name: string;
  type: HealthCheckType;

  // Configuration
  config: HealthCheckConfig;

  // Status
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  isEnabled: boolean;

  // Results
  lastCheck?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;

  // History
  history: HealthCheckResult[];

  // Metadata
  description?: string;
  tags?: string[];
}

export type HealthCheckType =
  | 'http'
  | 'tcp'
  | 'ping'
  | 'dns'
  | 'ssl'
  | 'database'
  | 'api'
  | 'service'
  | 'custom';

export interface HealthCheckConfig {
  // HTTP check
  http?: {
    url: string;
    method: 'GET' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    body?: string;
    expectedStatus?: number[];
    expectedBody?: string;
    followRedirects?: boolean;
  };

  // TCP check
  tcp?: {
    host: string;
    port: number;
  };

  // Ping check
  ping?: {
    host: string;
    packets?: number;
  };

  // DNS check
  dns?: {
    domain: string;
    recordType: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
    expectedResult?: string;
  };

  // SSL check
  ssl?: {
    host: string;
    port?: number;
    warningDays?: number; // warn before expiry
  };

  // Database check
  database?: {
    connectionString: string;
    query?: string;
    expectedRows?: number;
  };

  // General settings
  timeout: number; // seconds
  interval: number; // seconds
  retryAttempts: number;
  retryDelay: number; // seconds
}

export interface HealthCheckResult {
  timestamp: Date;
  status: 'success' | 'failure' | 'timeout';
  responseTime?: number; // milliseconds
  error?: string;
  // any required: Health check result metadata (varies by check type)
  metadata?: Record<string, any>;
}

export interface SystemMetric {
  id: string;
  name: string;
  type: MetricType;

  // Value
  value: number;
  unit: string;
  timestamp: Date;

  // Context
  labels: Record<string, string>;

  // History
  history: MetricDataPoint[];
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary' | 'rate' | 'percentage';

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;

  // Context
  source: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;

  // Data
  // any required: Log entry data (arbitrary structure, application-specific)
  data?: Record<string, any>;
  error?: LogError;

  // Metadata
  tags?: string[];
  correlationId?: string;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export interface MonitoringSettings {
  // General
  enableRealTimeMonitoring: boolean;
  defaultRefreshInterval: number;
  maxDataRetention: number; // days

  // Dashboards
  defaultDashboardTheme: 'light' | 'dark' | 'auto';
  autoSaveDashboards: boolean;

  // Alerts
  enableAlerts: boolean;
  defaultAlertSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  alertEvaluationInterval: number; // seconds

  // Health Checks
  enableHealthChecks: boolean;
  defaultHealthCheckInterval: number; // seconds
  healthCheckTimeout: number; // seconds

  // Data Sources
  dataSourceTimeout: number; // seconds
  enableDataSourceCaching: boolean;
  defaultCacheDuration: number; // seconds

  // Logs
  enableLogCollection: boolean;
  logRetentionDays: number;
  maxLogEntriesPerQuery: number;

  // Notifications
  enableNotifications: boolean;
  notificationCooldown: number; // seconds

  // Performance
  enablePerformanceMonitoring: boolean;
  maxConcurrentQueries: number;
  queryTimeout: number; // seconds
}

// Store State
// ============================================================================
// Monitoring Store State Interface
// ============================================================================

interface MonitoringState extends BaseStoreState {
  // Dashboards
  dashboards: MonitoringDashboard[];
  activeDashboard: string | null;

  // Widgets
  widgets: MonitoringWidget[];
  selectedWidget: string | null;

  // Data Sources
  dataSources: DataSource[];

  // Alerts
  alerts: MonitoringAlert[];

  // Health Checks
  healthChecks: HealthCheck[];

  // System Metrics
  metrics: SystemMetric[];

  // Logs
  logs: LogEntry[];
  logFilters: LogFilters;

  // UI State
  sidebarCollapsed: boolean;
  selectedTimeRange: TimeRange;
  refreshInterval: number;
  isAutoRefresh: boolean;

  // Settings
  settings: MonitoringSettings;

  // Connection Status (extends BaseStoreState)
  isConnected: boolean;
  lastSync: Date | null;
}

export interface LogFilters {
  levels: LogLevel[];
  sources: string[];
  timeRange: TimeRange;
  searchTerm: string;
  tags: string[];
}

// ============================================================================
// Monitoring Store Actions Interface
// ============================================================================

// Store Actions
interface MonitoringActions {
  // Dashboard Management
  createDashboard: (
    dashboard: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateDashboard: (dashboardId: string, updates: Partial<MonitoringDashboard>) => void;
  deleteDashboard: (dashboardId: string) => void;
  cloneDashboard: (dashboardId: string, name: string) => string;
  exportDashboard: (dashboardId: string) => Promise<Blob>;
  importDashboard: (file: File) => Promise<string>;
  setActiveDashboard: (dashboardId: string | null) => void;

  // Widget Management
  addWidget: (dashboardId: string, widget: Omit<MonitoringWidget, 'id'>) => string;
  updateWidget: (widgetId: string, updates: Partial<MonitoringWidget>) => void;
  removeWidget: (widgetId: string) => void;
  moveWidget: (widgetId: string, position: WidgetPosition) => void;
  resizeWidget: (widgetId: string, size: { width: number; height: number }) => void;
  setSelectedWidget: (widgetId: string | null) => void;
  refreshWidget: (widgetId: string) => Promise<void>;

  // Data Source Management
  createDataSource: (
    dataSource: Omit<DataSource, 'id' | 'isConnected' | 'lastHealthCheck'>
  ) => string;
  updateDataSource: (dataSourceId: string, updates: Partial<DataSource>) => void;
  deleteDataSource: (dataSourceId: string) => void;
  testDataSource: (dataSourceId: string) => Promise<boolean>;
  connectDataSource: (dataSourceId: string) => Promise<void>;
  disconnectDataSource: (dataSourceId: string) => void;

  // Alert Management
  createAlert: (alert: Omit<MonitoringAlert, 'id' | 'status' | 'createdAt'>) => string;
  updateAlert: (alertId: string, updates: Partial<MonitoringAlert>) => void;
  deleteAlert: (alertId: string) => void;
  enableAlert: (alertId: string) => void;
  disableAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  testAlert: (alertId: string) => Promise<void>;

  // Health Check Management
  createHealthCheck: (healthCheck: Omit<HealthCheck, 'id' | 'status' | 'lastCheck'>) => string;
  updateHealthCheck: (healthCheckId: string, updates: Partial<HealthCheck>) => void;
  deleteHealthCheck: (healthCheckId: string) => void;
  runHealthCheck: (healthCheckId: string) => Promise<HealthCheckResult>;
  enableHealthCheck: (healthCheckId: string) => void;
  disableHealthCheck: (healthCheckId: string) => void;

  // Metrics
  collectMetrics: () => Promise<void>;
  getMetricHistory: (metricId: string, timeRange: TimeRange) => MetricDataPoint[];
  clearMetrics: (olderThan: Date) => void;

  // Logs
  queryLogs: (filters: Partial<LogFilters>) => Promise<LogEntry[]>;
  clearLogs: (olderThan: Date) => void;
  setLogFilters: (filters: Partial<LogFilters>) => void;

  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setRefreshInterval: (interval: number) => void;
  setAutoRefresh: (enabled: boolean) => void;

  // Settings
  updateSettings: (settings: Partial<MonitoringSettings>) => void;

  // Data Management
  exportData: (type: 'dashboards' | 'alerts' | 'healthchecks' | 'logs') => Promise<Blob>;
  importData: (file: File) => Promise<void>;

  // System
  connect: () => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;

  // Initialization
  initialize: () => Promise<void>;
  createDefaultDashboard: () => void;
}

// ============================================================================
// Combined Monitoring Store Type
// ============================================================================

type MonitoringStore = MonitoringState & MonitoringActions;

// ============================================================================
// Initial State Factory
// ============================================================================

// Initial State
const createInitialState = (): MonitoringState => ({
  // BaseStoreState properties
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Monitoring-specific properties
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
  refreshInterval: 30000, // 30 seconds
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

// ============================================================================
// Store Creation
// ============================================================================

// Create Store
export const useMonitoringStore = create<MonitoringStore>()(
  persist(
    // @ts-expect-error - Known Zustand v5 StateCreator typing issue with immer middleware (acceptable)
    immer((set, get) => ({
      ...createInitialState(),

      // Dashboard Management
      createDashboard: (
        dashboardData: Omit<MonitoringDashboard, 'id' | 'createdAt' | 'updatedAt'>
      ) => {
        if (!FLAGS.monitoring) return '';

        const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const dashboard: MonitoringDashboard = {
          ...dashboardData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((draft: Draft<MonitoringStore>) => {
          draft.dashboards.push(dashboard);
        });

        return id;
      },

      updateDashboard: (dashboardId: string, updates: Partial<MonitoringDashboard>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const dashboard = draft.dashboards.find((d) => d.id === dashboardId);
          if (dashboard) {
            Object.assign(dashboard, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deleteDashboard: (dashboardId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const dashboard = draft.dashboards.find((d) => d.id === dashboardId);
          draft.dashboards = draft.dashboards.filter((d) => d.id !== dashboardId);
          if (draft.activeDashboard === dashboardId) {
            draft.activeDashboard = null;
          }
          // Remove widgets from this dashboard
          if (dashboard) {
            const widgetIdsToRemove = dashboard.layout.widgets.map((w) => w.widgetId);
            draft.widgets = draft.widgets.filter((w) => !widgetIdsToRemove.includes(w.id));
          }
        });
      },

      cloneDashboard: (dashboardId: string, name: string) => {
        if (!FLAGS.monitoring) return '';

        const dashboard = get().dashboards.find((d) => d.id === dashboardId);
        if (!dashboard) return '';

        const newId = get().createDashboard({
          ...dashboard,
          name,
          isPublic: false,
          permissions: [],
        });

        return newId;
      },

      exportDashboard: async (dashboardId: string) => {
        if (!FLAGS.monitoring) throw new Error('Monitoring not enabled');

        const dashboard = get().dashboards.find((d) => d.id === dashboardId);
        if (!dashboard) throw new Error('Dashboard not found');

        const exportData = {
          dashboard,
          widgets: get().widgets.filter((w) =>
            dashboard.layout.widgets.find((dw) => dw.widgetId === w.id)
          ),
          exportedAt: new Date().toISOString(),
          version: '1.0',
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });

        return blob;
      },

      importDashboard: async (file: File) => {
        if (!FLAGS.monitoring) throw new Error('Monitoring not enabled');

        const text = await file.text();
        const data = JSON.parse(text);

        // Create new dashboard
        const dashboardId = get().createDashboard(data.dashboard);

        // Import widgets
        data.widgets?.forEach((widget: MonitoringWidget) => {
          get().addWidget(dashboardId, widget);
        });

        return dashboardId;
      },

      setActiveDashboard: (dashboardId: string | null) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.activeDashboard = dashboardId;
        });
      },

      // Widget Management
      addWidget: (dashboardId: string, widgetData: Omit<MonitoringWidget, 'id'>) => {
        if (!FLAGS.monitoring) return '';

        const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const widget: MonitoringWidget = {
          ...widgetData,
          id: widgetId,
          isLoading: false,
          lastUpdated: new Date(),
        };

        set((draft: Draft<MonitoringStore>) => {
          draft.widgets.push(widget);

          // Add to dashboard layout
          const dashboard = draft.dashboards.find((d) => d.id === dashboardId);
          if (dashboard) {
            const position: WidgetPosition = {
              widgetId,
              x: 0,
              y: 0,
              width: 6,
              height: 4,
            };
            dashboard.layout.widgets.push(position);
            dashboard.updatedAt = new Date();
          }
        });

        return widgetId;
      },

      updateWidget: (widgetId: string, updates: Partial<MonitoringWidget>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const widget = draft.widgets.find((w) => w.id === widgetId);
          if (widget) {
            Object.assign(widget, { ...updates, lastUpdated: new Date() });
          }
        });
      },

      removeWidget: (widgetId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.widgets = draft.widgets.filter((w) => w.id !== widgetId);
          if (draft.selectedWidget === widgetId) {
            draft.selectedWidget = null;
          }

          // Remove from all dashboard layouts
          draft.dashboards.forEach((dashboard) => {
            dashboard.layout.widgets = dashboard.layout.widgets.filter(
              (w) => w.widgetId !== widgetId
            );
          });
        });
      },

      moveWidget: (widgetId: string, position: Partial<WidgetPosition>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.dashboards.forEach((dashboard) => {
            const widgetPos = dashboard.layout.widgets.find((w) => w.widgetId === widgetId);
            if (widgetPos) {
              Object.assign(widgetPos, position);
              dashboard.updatedAt = new Date();
            }
          });
        });
      },

      resizeWidget: (widgetId: string, size: { width: number; height: number }) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.dashboards.forEach((dashboard) => {
            const widgetPos = dashboard.layout.widgets.find((w) => w.widgetId === widgetId);
            if (widgetPos) {
              widgetPos.width = size.width;
              widgetPos.height = size.height;
              dashboard.updatedAt = new Date();
            }
          });
        });
      },

      setSelectedWidget: (widgetId: string | null) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.selectedWidget = widgetId;
        });
      },

      refreshWidget: async (widgetId: string) => {
        if (!FLAGS.monitoring) return;

        const widget = get().widgets.find((w) => w.id === widgetId);
        if (!widget) return;

        set((draft: Draft<MonitoringStore>) => {
          const w = draft.widgets.find((w) => w.id === widgetId);
          if (w) {
            w.isLoading = true;
            w.error = undefined;
          }
        });

        try {
          // Simulate data refresh
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

          set((draft: Draft<MonitoringStore>) => {
            const w = draft.widgets.find((w) => w.id === widgetId);
            if (w) {
              w.isLoading = false;
              w.lastUpdated = new Date();
            }
          });
        } catch (error) {
          set((draft: Draft<MonitoringStore>) => {
            const w = draft.widgets.find((w) => w.id === widgetId);
            if (w) {
              w.isLoading = false;
              w.error = error instanceof Error ? error.message : 'Refresh failed';
            }
          });
        }
      },

      // Data Source Management
      createDataSource: (
        dataSourceData: Omit<DataSource, 'id' | 'isConnected' | 'lastHealthCheck'>
      ) => {
        if (!FLAGS.monitoring) return '';

        const id = `datasource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const dataSource: DataSource = {
          ...dataSourceData,
          id,
          isConnected: false,
        };

        set((draft: Draft<MonitoringStore>) => {
          draft.dataSources.push(dataSource);
        });

        return id;
      },

      updateDataSource: (dataSourceId: string, updates: Partial<DataSource>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const dataSource = draft.dataSources.find((ds) => ds.id === dataSourceId);
          if (dataSource) {
            Object.assign(dataSource, updates);
          }
        });
      },

      deleteDataSource: (dataSourceId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.dataSources = draft.dataSources.filter((ds) => ds.id !== dataSourceId);

          // Clean up widgets using this data source
          draft.widgets.forEach((widget) => {
            if (widget.dataSourceId === dataSourceId) {
              widget.error = 'Data source deleted';
            }
          });
        });
      },

      testDataSource: async (dataSourceId: string) => {
        if (!FLAGS.monitoring) return false;

        const dataSource = get().dataSources.find((ds) => ds.id === dataSourceId);
        if (!dataSource) return false;

        try {
          // Simulate connection test
          await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));

          const success = Math.random() > 0.2; // 80% success rate

          set((draft: Draft<MonitoringStore>) => {
            const ds = draft.dataSources.find((ds) => ds.id === dataSourceId);
            if (ds) {
              ds.lastHealthCheck = new Date();
              ds.isConnected = success;
              if (!success) {
                ds.error = 'Connection test failed';
              } else {
                ds.error = undefined;
              }
            }
          });

          return success;
        } catch (error) {
          set((draft: Draft<MonitoringStore>) => {
            const ds = draft.dataSources.find((ds) => ds.id === dataSourceId);
            if (ds) {
              ds.isConnected = false;
              ds.error = error instanceof Error ? error.message : 'Test failed';
              ds.lastHealthCheck = new Date();
            }
          });
          return false;
        }
      },

      connectDataSource: async (dataSourceId: string) => {
        if (!FLAGS.monitoring) return;

        await get().testDataSource(dataSourceId);
      },

      disconnectDataSource: (dataSourceId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const dataSource = draft.dataSources.find((ds) => ds.id === dataSourceId);
          if (dataSource) {
            dataSource.isConnected = false;
          }
        });
      }, // Alert Management
      createAlert: (alertData: Omit<MonitoringAlert, 'id' | 'status' | 'createdAt'>) => {
        if (!FLAGS.monitoring) return '';

        const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alert: MonitoringAlert = {
          ...alertData,
          id,
          status: 'pending',
          createdAt: new Date(),
        };

        set((draft: Draft<MonitoringStore>) => {
          draft.alerts.push(alert);
        });

        return id;
      },

      updateAlert: (alertId: string, updates: Partial<MonitoringAlert>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const alert = draft.alerts.find((a) => a.id === alertId);
          if (alert) {
            Object.assign(alert, updates);
          }
        });
      },

      deleteAlert: (alertId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.alerts = draft.alerts.filter((a) => a.id !== alertId);
        });
      },

      enableAlert: (alertId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const alert = draft.alerts.find((a) => a.id === alertId);
          if (alert && alert.status === 'disabled') {
            alert.status = 'pending';
          }
        });
      },

      disableAlert: (alertId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const alert = draft.alerts.find((a) => a.id === alertId);
          if (alert) {
            alert.status = 'disabled';
          }
        });
      },

      acknowledgeAlert: (alertId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const alert = draft.alerts.find((a) => a.id === alertId);
          if (alert && alert.status === 'firing') {
            alert.annotations = {
              ...alert.annotations,
              acknowledged: 'true',
              acknowledgedAt: new Date().toISOString(),
            };
          }
        });
      },

      resolveAlert: (alertId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const alert = draft.alerts.find((a) => a.id === alertId);
          if (alert && alert.status === 'firing') {
            alert.status = 'resolved';
            alert.resolvedAt = new Date();
          }
        });
      },

      testAlert: async (alertId: string) => {
        if (!FLAGS.monitoring) return;

        const alert = get().alerts.find((a) => a.id === alertId);
        if (!alert) return;

        // Simulate alert evaluation
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        set((draft: Draft<MonitoringStore>) => {
          const a = draft.alerts.find((a) => a.id === alertId);
          if (a) {
            a.lastEvaluated = new Date();
            // Simulate test result
            if (Math.random() > 0.5) {
              a.status = 'firing';
              a.firedAt = new Date();
            }
          }
        });
      },

      // Health Check Management
      createHealthCheck: (
        healthCheckData: Omit<HealthCheck, 'id' | 'status' | 'consecutiveFailures' | 'history'>
      ) => {
        if (!FLAGS.monitoring) return '';

        const id = `healthcheck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const healthCheck: HealthCheck = {
          ...healthCheckData,
          id,
          status: 'unknown',
          consecutiveFailures: 0,
          history: [],
        };

        set((draft: Draft<MonitoringStore>) => {
          draft.healthChecks.push(healthCheck);
        });

        return id;
      },

      updateHealthCheck: (healthCheckId: string, updates: Partial<HealthCheck>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const healthCheck = draft.healthChecks.find((hc) => hc.id === healthCheckId);
          if (healthCheck) {
            Object.assign(healthCheck, updates);
          }
        });
      },

      deleteHealthCheck: (healthCheckId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.healthChecks = draft.healthChecks.filter((hc) => hc.id !== healthCheckId);
        });
      },

      runHealthCheck: async (healthCheckId: string) => {
        if (!FLAGS.monitoring) throw new Error('Monitoring not enabled');

        const healthCheck = get().healthChecks.find((hc) => hc.id === healthCheckId);
        if (!healthCheck) throw new Error('Health check not found');

        const start = Date.now();

        try {
          // Simulate health check execution
          await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 2000));

          const success = Math.random() > 0.2; // 80% success rate
          const responseTime = Date.now() - start;

          const result: HealthCheckResult = {
            timestamp: new Date(),
            status: success ? 'success' : 'failure',
            responseTime,
            error: success ? undefined : 'Health check failed',
          };

          set((draft: Draft<MonitoringStore>) => {
            const hc = draft.healthChecks.find((hc) => hc.id === healthCheckId);
            if (hc) {
              hc.lastCheck = result.timestamp;
              hc.history.push(result);

              if (result.status === 'success') {
                hc.status = 'healthy';
                hc.lastSuccess = result.timestamp;
                hc.consecutiveFailures = 0;
              } else {
                hc.consecutiveFailures += 1;
                hc.lastFailure = result.timestamp;

                if (hc.consecutiveFailures >= 3) {
                  hc.status = 'critical';
                } else {
                  hc.status = 'warning';
                }
              }

              // Keep only last 100 results
              if (hc.history.length > 100) {
                hc.history = hc.history.slice(-100);
              }
            }
          });

          return result;
        } catch (error) {
          const result: HealthCheckResult = {
            timestamp: new Date(),
            status: 'failure',
            error: error instanceof Error ? error.message : 'Execution failed',
          };

          set((draft: Draft<MonitoringStore>) => {
            const hc = draft.healthChecks.find((hc) => hc.id === healthCheckId);
            if (hc) {
              hc.lastCheck = result.timestamp;
              hc.lastFailure = result.timestamp;
              hc.consecutiveFailures += 1;
              hc.status = hc.consecutiveFailures >= 3 ? 'critical' : 'warning';
              hc.history.push(result);

              if (hc.history.length > 100) {
                hc.history = hc.history.slice(-100);
              }
            }
          });

          return result;
        }
      },

      enableHealthCheck: (healthCheckId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const healthCheck = draft.healthChecks.find((hc) => hc.id === healthCheckId);
          if (healthCheck) {
            healthCheck.isEnabled = true;
          }
        });
      },

      disableHealthCheck: (healthCheckId: string) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          const healthCheck = draft.healthChecks.find((hc) => hc.id === healthCheckId);
          if (healthCheck) {
            healthCheck.isEnabled = false;
          }
        });
      },

      // Metrics
      collectMetrics: async () => {
        if (!FLAGS.monitoring) return;

        // Simulate metric collection
        const now = new Date();
        const metrics = [
          'cpu_usage',
          'memory_usage',
          'disk_usage',
          'network_in',
          'network_out',
          'requests_per_second',
          'response_time',
          'error_rate',
          'active_connections',
        ];

        set((draft: Draft<MonitoringStore>) => {
          metrics.forEach((metricName) => {
            let metric = draft.metrics.find((m) => m.name === metricName);

            if (!metric) {
              metric = {
                id: `metric_${metricName}`,
                name: metricName,
                type: 'gauge',
                value: Math.random() * 100,
                unit: '%',
                timestamp: now,
                labels: { source: 'system' },
                history: [],
              };
              draft.metrics.push(metric);
            } else {
              const newValue = Math.max(0, metric.value + (Math.random() - 0.5) * 20);
              metric.history.push({
                timestamp: metric.timestamp,
                value: metric.value,
                labels: metric.labels,
              });
              metric.value = newValue;
              metric.timestamp = now;

              // Keep only last 1000 data points
              if (metric.history.length > 1000) {
                metric.history = metric.history.slice(-1000);
              }
            }
          });
        });
      },

      getMetricHistory: (metricId: string, timeRange: TimeRange) => {
        if (!FLAGS.monitoring) return [];

        const metric = get().metrics.find((m) => m.id === metricId);
        if (!metric) return [];

        const now = new Date();
        let cutoff = now;

        if (timeRange.type === 'relative' && timeRange.value && timeRange.unit) {
          const msMap = {
            minutes: 60 * 1000,
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000,
            months: 30 * 24 * 60 * 60 * 1000,
          };
          cutoff = new Date(
            now.getTime() - timeRange.value * msMap[timeRange.unit as keyof typeof msMap]
          );
        } else if (timeRange.type === 'absolute' && timeRange.start) {
          cutoff = timeRange.start;
        }

        return metric.history.filter((dp) => dp.timestamp >= cutoff);
      },

      clearMetrics: (olderThan: Date) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.metrics.forEach((metric) => {
            metric.history = metric.history.filter((dp) => dp.timestamp > olderThan);
          });
        });
      },

      // Logs
      queryLogs: async (filters: Partial<LogFilters>) => {
        if (!FLAGS.monitoring) return [];

        const { logs } = get();
        let filteredLogs = logs;

        if (filters.levels && filters.levels.length > 0) {
          filteredLogs = filteredLogs.filter((log) => filters.levels!.includes(log.level));
        }

        if (filters.sources && filters.sources.length > 0) {
          filteredLogs = filteredLogs.filter((log) => filters.sources!.includes(log.source));
        }

        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          filteredLogs = filteredLogs.filter(
            (log) =>
              log.message.toLowerCase().includes(term) ||
              (log.component && log.component.toLowerCase().includes(term))
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filteredLogs = filteredLogs.filter(
            (log) => log.tags && filters.tags!.some((tag) => log.tags!.includes(tag))
          );
        }

        // Sort by timestamp desc
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return filteredLogs.slice(0, get().settings.maxLogEntriesPerQuery);
      },

      clearLogs: (olderThan: Date) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.logs = draft.logs.filter((log) => log.timestamp > olderThan);
        });
      },

      setLogFilters: (filters: Partial<LogFilters>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          Object.assign(draft.logFilters, filters);
        });
      },

      // UI Actions
      setSidebarCollapsed: (collapsed: boolean) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.sidebarCollapsed = collapsed;
        });
      },

      setTimeRange: (timeRange: TimeRange) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.selectedTimeRange = timeRange;
        });
      },

      setRefreshInterval: (interval: number) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.refreshInterval = interval;
        });
      },

      setAutoRefresh: (enabled: boolean) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.isAutoRefresh = enabled;
        });
      },

      // Settings
      updateSettings: (settings: Partial<MonitoringSettings>) => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          Object.assign(draft.settings, settings);
        });
      },

      // Data Management
      exportData: async (type: 'dashboards' | 'alerts' | 'healthchecks' | 'logs') => {
        if (!FLAGS.monitoring) throw new Error('Monitoring not enabled');

        const { dashboards, alerts, healthChecks, logs } = get();
        let data: unknown;

        switch (type) {
          case 'dashboards':
            data = { dashboards, widgets: get().widgets };
            break;
          case 'alerts':
            data = { alerts };
            break;
          case 'healthchecks':
            data = { healthChecks };
            break;
          case 'logs':
            data = { logs };
            break;
        }

        const exportData = {
          type,
          data,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });

        return blob;
      },

      importData: async (file: File) => {
        if (!FLAGS.monitoring) throw new Error('Monitoring not enabled');

        const text = await file.text();
        const importData = JSON.parse(text);

        set((draft: Draft<MonitoringStore>) => {
          if (importData.type === 'dashboards' && importData.data.dashboards) {
            draft.dashboards.push(...importData.data.dashboards);
            if (importData.data.widgets) {
              draft.widgets.push(...importData.data.widgets);
            }
          } else if (importData.type === 'alerts' && importData.data.alerts) {
            draft.alerts.push(...importData.data.alerts);
          } else if (importData.type === 'healthchecks' && importData.data.healthChecks) {
            draft.healthChecks.push(...importData.data.healthChecks);
          } else if (importData.type === 'logs' && importData.data.logs) {
            draft.logs.push(...importData.data.logs);
          }
        });
      },

      // System
      connect: async () => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.isConnected = true;
          draft.error = null;
        });

        // Start auto-refresh if enabled
        if (get().isAutoRefresh) {
          // Auto-refresh logic would go here
        }
      },

      disconnect: () => {
        if (!FLAGS.monitoring) return;

        set((draft: Draft<MonitoringStore>) => {
          draft.isConnected = false;
        });
      },

      sync: async () => {
        if (!FLAGS.monitoring) return;

        try {
          // Simulate sync
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set((draft: Draft<MonitoringStore>) => {
            draft.lastSync = new Date();
            draft.error = null;
          });
        } catch (error) {
          set((draft: Draft<MonitoringStore>) => {
            draft.error = error instanceof Error ? error.message : 'Sync failed';
          });
        }
      },

      // Initialization
      initialize: async () => {
        if (!FLAGS.monitoring) return;

        try {
          await get().connect();
          await get().collectMetrics();

          // Create sample data for development
          if (get().dashboards.length === 0) {
            get().createDefaultDashboard();
          }
        } catch (error) {
          set((draft: Draft<MonitoringStore>) => {
            draft.error = error instanceof Error ? error.message : 'Initialization failed';
          });
        }
      },

      createDefaultDashboard: () => {
        const dashboardId = get().createDashboard({
          name: 'System Overview',
          description: 'Main system monitoring dashboard',
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
          tags: ['system', 'overview'],
        });

        // Add sample widgets
        const dataSourceId = get().createDataSource({
          name: 'System Metrics',
          type: 'prometheus',
          url: 'http://localhost:9090',
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

        // CPU Usage Widget
        get().addWidget(dashboardId, {
          type: 'gauge',
          title: 'CPU Usage',
          description: 'Current CPU utilization',
          config: {
            unit: '%',
            min: 0,
            max: 100,
            thresholds: [
              {
                id: 'warn',
                value: 70,
                operator: '>',
                color: '#FFA500',
                label: 'Warning',
                isVisible: true,
              },
              {
                id: 'critical',
                value: 90,
                operator: '>',
                color: '#FF0000',
                label: 'Critical',
                isVisible: true,
              },
            ],
          },
          dataSourceId,
          query: 'cpu_usage_percent',
          displayOptions: {
            showLegend: false,
            showGrid: false,
            showTooltip: true,
            colorScheme: ['#00FF00', '#FFA500', '#FF0000'],
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            animationDuration: 1000,
            enableAnimation: true,
          },
          isLoading: false,
        });

        // Memory Usage Widget
        get().addWidget(dashboardId, {
          type: 'metric_chart',
          title: 'Memory Usage',
          description: 'Memory utilization over time',
          config: {
            chartType: 'area',
            unit: 'GB',
            timeRange: { type: 'relative', value: 1, unit: 'hours' },
            granularity: 'minute',
          },
          dataSourceId,
          query: 'memory_usage_bytes',
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
          isLoading: false,
        });

        // Error Rate Widget
        get().addWidget(dashboardId, {
          type: 'status_indicator',
          title: 'Error Rate',
          description: 'Application error rate',
          config: {
            unit: '%',
            thresholds: [
              { id: 'ok', value: 1, operator: '<', color: '#00FF00', label: 'OK', isVisible: true },
              {
                id: 'warn',
                value: 5,
                operator: '<',
                color: '#FFA500',
                label: 'Warning',
                isVisible: true,
              },
              {
                id: 'critical',
                value: 5,
                operator: '>=',
                color: '#FF0000',
                label: 'Critical',
                isVisible: true,
              },
            ],
          },
          dataSourceId,
          query: 'error_rate_percent',
          displayOptions: {
            showLegend: false,
            showGrid: false,
            showTooltip: true,
            colorScheme: ['#00FF00', '#FFA500', '#FF0000'],
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
            animationDuration: 300,
            enableAnimation: true,
          },
          isLoading: false,
        });

        get().setActiveDashboard(dashboardId);
      },
    })),
    {
      name: 'lokifi-monitoring-storage',
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          return {
            ...(persistedState as object),
            widgets: [],
            dataSources: [],
            logs: [],
            logFilters: {
              levels: ['info', 'warn', 'error', 'fatal'],
              sources: [],
              timeRange: { type: 'relative', value: 1, unit: 'hours' },
              searchTerm: '',
              tags: [],
            },
          };
        }
        return persistedState as MonitoringState & MonitoringActions;
      },
    }
  )
);

// Auto-initialize when enabled
if (typeof window !== 'undefined' && FLAGS.monitoring) {
  useMonitoringStore.getState().initialize();
}
