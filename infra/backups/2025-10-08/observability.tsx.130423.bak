import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { FLAGS } from './featureFlags';

// Observability Types
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  
  // Collection
  source: 'system' | 'user' | 'external';
  tags: string[];
  
  // Alerts
  alertRules: AlertRule[];
  
  // Retention
  retentionPeriod: number; // days
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricValue {
  id: string;
  metricId: string;
  timestamp: Date;
  value: number;
  
  // Context
  labels: Record<string, string>;
  sessionId?: string;
  userId?: string;
  
  // Metadata
  source: string;
  version: string;
}

export interface AlertRule {
  id: string;
  metricId: string;
  name: string;
  description: string;
  
  // Condition
  condition: AlertCondition;
  threshold: number;
  duration: number; // seconds
  
  // Actions
  actions: AlertAction[];
  
  // State
  status: 'active' | 'firing' | 'resolved' | 'disabled';
  lastTriggered?: Date;
  
  // Configuration
  severity: 'critical' | 'warning' | 'info';
  isEnabled: boolean;
  createdAt: Date;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  window: number; // seconds
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'notification';
  config: Record<string, any>;
  isEnabled: boolean;
}

export interface SystemMetrics {
  timestamp: Date;
  
  // Performance
  performance: {
    pageLoadTime: number;
    renderTime: number;
    apiResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  // Charts
  charts: {
    activeCharts: number;
    renderingCharts: number;
    dataPointsLoaded: number;
    indicatorsActive: number;
    drawingToolsActive: number;
  };
  
  // User Activity
  userActivity: {
    activeUsers: number;
    sessionsActive: number;
    pagesViewed: number;
    actionsPerMinute: number;
  };
  
  // API
  api: {
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
    quotaUsage: number;
  };
  
  // Trading
  trading: {
    ordersPlaced: number;
    tradesExecuted: number;
    alertsTriggered: number;
    backtestsRun: number;
  };
  
  // System Health
  system: {
    uptime: number;
    errorCount: number;
    warningCount: number;
    diskUsage: number;
    networkLatency: number;
  };
}

export interface UserBehaviorEvent {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  
  // Event Details
  type: 'click' | 'view' | 'interaction' | 'error' | 'performance';
  category: string;
  action: string;
  label?: string;
  value?: number;
  
  // Context
  page: string;
  component?: string;
  feature?: string;
  
  // Environment
  userAgent: string;
  viewport: { width: number; height: number };
  deviceType: 'desktop' | 'tablet' | 'mobile';
  
  // Custom Properties
  properties: Record<string, any>;
}

export interface ErrorEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  
  // Error Details
  type: 'javascript' | 'api' | 'network' | 'validation';
  message: string;
  stack?: string;
  source?: string;
  
  // Context
  page: string;
  component?: string;
  feature?: string;
  userAgent: string;
  
  // API Errors
  endpoint?: string;
  method?: string;
  statusCode?: number;
  
  // Severity
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Resolution
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  assignedTo?: string;
  resolvedAt?: Date;
  
  // Metadata
  tags: string[];
  customData: Record<string, any>;
}

export interface PerformanceTrace {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  
  // Trace Details
  name: string;
  operation: string;
  duration: number; // milliseconds
  
  // Timing Breakdown
  timings: {
    dns?: number;
    tcp?: number;
    ssl?: number;
    request?: number;
    response?: number;
    render?: number;
  };
  
  // Context
  page: string;
  component?: string;
  
  // Resource Details
  resourceType?: 'xhr' | 'fetch' | 'navigation' | 'resource';
  url?: string;
  size?: number;
  
  // Status
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  
  // Tags
  tags: Record<string, string>;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  
  // Layout
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  
  // Access
  isPublic: boolean;
  sharedWith: string[];
  owner: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt?: Date;
  viewCount: number;
  
  // Settings
  refreshInterval: number; // seconds
  timeRange: TimeRange;
  isAutoRefresh: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'log';
  title: string;
  
  // Position & Size
  x: number; 
  y: number;
  width: number;
  height: number;
  
  // Configuration
  config: WidgetConfig;
  query: string;
  
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  showLegend: boolean;
  showTitle: boolean;
}

export interface WidgetConfig {
  // Metric Widget
  metricId?: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  format?: 'number' | 'percent' | 'bytes' | 'duration';
  
  // Chart Widget
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'gauge';
  series?: string[];
  
  // Table Widget
  columns?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Alert Widget
  severity?: 'critical' | 'warning' | 'info';
  
  // General
  limit?: number;
  filters?: Record<string, any>;
}

export interface DashboardLayout {
  type: 'grid' | 'flow';
  columns: number;
  gap: number;
  padding: number;
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  start: Date | string; // relative: '1h', '1d', etc.
  end: Date | string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  
  // Context
  logger: string;
  component?: string;
  feature?: string;
  
  // User Context
  sessionId?: string;
  userId?: string;
  
  // Metadata
  tags: string[];
  data: Record<string, any>;
  
  // Error Context
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  
  // Tracing
  traceId?: string;
  spanId?: string;
}

// Store State
interface ObservabilityState {
  // Metrics
  metrics: MetricDefinition[];
  metricValues: MetricValue[];
  
  // Alerts
  alertRules: AlertRule[];
  activeAlerts: AlertRule[];
  
  // System Monitoring
  systemMetrics: SystemMetrics[];
  currentMetrics: SystemMetrics | null;
  
  // User Behavior
  userEvents: UserBehaviorEvent[];
  sessionEvents: Map<string, UserBehaviorEvent[]>;
  
  // Error Tracking
  errors: ErrorEvent[];
  recentErrors: ErrorEvent[];
  
  // Performance
  performanceTraces: PerformanceTrace[];
  performanceMetrics: {
    p50: number;
    p95: number;
    p99: number;
    avgResponseTime: number;
    errorRate: number;
  };
  
  // Logging
  logs: LogEntry[];
  logBuffer: LogEntry[];
  
  // Dashboards
  dashboards: Dashboard[];
  activeDashboard: Dashboard | null;
  
  // Real-time
  isRealTimeEnabled: boolean;
  websocketConnected: boolean;
  lastDataUpdate: Date | null;
  
  // Settings
  settings: {
    retentionDays: number;
    maxEventsPerSession: number;
    enablePerformanceMonitoring: boolean;
    enableErrorReporting: boolean;
    enableUserTracking: boolean;
    debugMode: boolean;
  };
  
  // UI State
  selectedTimeRange: TimeRange;
  filters: {
    severity?: string[];
    component?: string[];
    feature?: string[];
    userId?: string;
  };
  
  // Loading States
  isLoading: boolean;
  errorMessage: string | null;
}

// Store Actions
interface ObservabilityActions {
  // Metrics
  createMetric: (metric: Omit<MetricDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMetric: (metricId: string, updates: Partial<MetricDefinition>) => void;
  deleteMetric: (metricId: string) => void;
  recordMetricValue: (metricId: string, value: number, labels?: Record<string, string>) => void;
  
  // Alerts
  createAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'status'>) => string;
  updateAlertRule: (ruleId: string, updates: Partial<AlertRule>) => void;
  deleteAlertRule: (ruleId: string) => void;
  checkAlertRules: () => void;
  resolveAlert: (ruleId: string) => void;
  
  // System Monitoring
  recordSystemMetrics: (metrics: Partial<SystemMetrics>) => void;
  startSystemMonitoring: () => void;
  stopSystemMonitoring: () => void;
  
  // User Behavior Tracking
  trackEvent: (event: Omit<UserBehaviorEvent, 'id' | 'timestamp'>) => void;
  trackPageView: (page: string, properties?: Record<string, any>) => void;
  trackUserAction: (action: string, category: string, label?: string, value?: number) => void;
  
  // Error Tracking
  reportError: (error: Omit<ErrorEvent, 'id' | 'timestamp'>) => void;
  updateErrorStatus: (errorId: string, status: ErrorEvent['status'], assignedTo?: string) => void;
  
  // Performance Tracking
  startTrace: (name: string, operation: string) => string;
  endTrace: (traceId: string, status?: 'success' | 'error', errorMessage?: string) => void;
  recordPerformance: (trace: Omit<PerformanceTrace, 'id' | 'timestamp'>) => void;
  
  // Logging
  log: (level: LogEntry['level'], message: string, data?: Record<string, any>) => void;
  debug: (message: string, data?: Record<string, any>) => void;
  info: (message: string, data?: Record<string, any>) => void;
  warn: (message: string, data?: Record<string, any>) => void;
  error: (message: string, error?: Error, data?: Record<string, any>) => void;
  
  // Dashboards
  createDashboard: (dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'viewCount'>) => string;
  updateDashboard: (dashboardId: string, updates: Partial<Dashboard>) => void;
  deleteDashboard: (dashboardId: string) => void;
  setActiveDashboard: (dashboardId: string | null) => void;
  addWidget: (dashboardId: string, widget: Omit<DashboardWidget, 'id'>) => string;
  updateWidget: (dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  
  // Real-time
  enableRealTime: () => void;
  disableRealTime: () => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // Query & Analysis
  queryMetrics: (query: string, timeRange: TimeRange) => Promise<MetricValue[]>;
  analyzePerformance: (timeRange: TimeRange) => Promise<any>;
  generateReport: (type: string, config: any) => Promise<Blob>;
  
  // Data Management
  exportData: (type: 'metrics' | 'events' | 'errors' | 'logs', timeRange: TimeRange) => Promise<Blob>;
  clearOldData: (beforeDate: Date) => void;
  optimizeStorage: () => void;
  
  // Settings
  updateSettings: (settings: Partial<ObservabilityState['settings']>) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setFilters: (filters: Partial<ObservabilityState['filters']>) => void;
  
  // Initialization
  initialize: () => Promise<void>;
  loadHistoricalData: (timeRange: TimeRange) => Promise<void>;
  
  // Helper Methods
  getCurrentSessionId: () => string;
  getCurrentUserId: () => string | undefined;
  getDeviceType: () => 'desktop' | 'tablet' | 'mobile';
  createDefaultMetrics: () => void;
  setupErrorListeners: () => void;
  setupPerformanceObservers: () => void;
  executeAlertActions: (rule: AlertRule, value: number) => Promise<void>;
  executeErrorActions: (error: ErrorEvent) => Promise<void>;
}

// Create Store
export const useObservabilityStore = create<ObservabilityState & ObservabilityActions>()(
  persist(
    subscribeWithSelector(
      immer<any>((set, get) => ({
        // Initial State
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
          errorRate: 0
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
          debugMode: false
        },
        selectedTimeRange: {
          type: 'relative',
          start: '1h',
          end: 'now'
        },
        filters: {},
        isLoading: false,
        errorMessage: null,
        
        // Metrics
        createMetric: (metricData) => {
          if (!FLAGS.observability) return '';
          
          const metricId = `metric_${Date.now()}`;
          const now = new Date();
          
          const metric: MetricDefinition = {
            ...metricData,
            id: metricId,
            createdAt: now,
            updatedAt: now
          };
          
          set((state: any) => {
            state.metrics.push(metric);
          });
          
          return metricId;
        },
        
        updateMetric: (metricId, updates) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const metric = state.metrics.find(m => m.id === metricId);
            if (metric) {
              Object.assign(metric, updates);
              metric.updatedAt = new Date();
            }
          });
        },
        
        deleteMetric: (metricId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const index = state.metrics.findIndex(m => m.id === metricId);
            if (index !== -1) {
              state.metrics.splice(index, 1);
            }
            
            // Remove related data
            state.metricValues = state.metricValues.filter(v => v.metricId !== metricId);
            state.alertRules = state.alertRules.filter(r => r.metricId !== metricId);
          });
        },
        
        recordMetricValue: (metricId, value, labels = {}) => {
          if (!FLAGS.observability) return;
          
          const valueId = `value_${Date.now()}_${Math.random()}`;
          const metricValue: MetricValue = {
            id: valueId,
            metricId,
            timestamp: new Date(),
            value,
            labels,
            sessionId: get().getCurrentSessionId(),
            userId: get().getCurrentUserId(),
            source: 'user',
            version: '1.0'
          };
          
          set((state: any) => {
            state.metricValues.push(metricValue);
            
            // Keep only recent values in memory
            const maxValues = 10000;
            if (state.metricValues.length > maxValues) {
              state.metricValues = state.metricValues.slice(-maxValues);
            }
          });
          
          // Check alert rules
          get().checkAlertRules();
        },
        
        // Alerts
        createAlertRule: (ruleData) => {
          if (!FLAGS.observability) return '';
          
          const ruleId = `alert_${Date.now()}`;
          const rule: AlertRule = {
            ...ruleData,
            id: ruleId,
            status: 'active',
            createdAt: new Date()
          };
          
          set((state: any) => {
            state.alertRules.push(rule);
          });
          
          return ruleId;
        },
        
        updateAlertRule: (ruleId, updates) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const rule = state.alertRules.find(r => r.id === ruleId);
            if (rule) {
              Object.assign(rule, updates);
            }
          });
        },
        
        deleteAlertRule: (ruleId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const index = state.alertRules.findIndex(r => r.id === ruleId);
            if (index !== -1) {
              state.alertRules.splice(index, 1);
            }
            
            // Remove from active alerts
            state.activeAlerts = state.activeAlerts.filter(a => a.id !== ruleId);
          });
        },
        
        checkAlertRules: () => {
          if (!FLAGS.observability) return;
          
          const { alertRules, metricValues } = get();
          const now = new Date();
          
          alertRules.forEach(rule => {
            if (!rule.isEnabled) return;
            
            // Get recent metric values
            const windowStart = new Date(now.getTime() - rule.condition.window * 1000);
            const recentValues = metricValues.filter(v => 
              v.metricId === rule.metricId && 
              v.timestamp >= windowStart
            );
            
            if (recentValues.length === 0) return;
            
            // Calculate aggregated value
            let aggregatedValue: number;
            const values = recentValues.map(v => v.value);
            
            switch (rule.condition.aggregation) {
              case 'avg':
                aggregatedValue = values.reduce((sum, v) => sum + v, 0) / values.length;
                break;
              case 'sum':
                aggregatedValue = values.reduce((sum, v) => sum + v, 0);
                break;
              case 'min':
                aggregatedValue = Math.min(...values);
                break;
              case 'max':
                aggregatedValue = Math.max(...values);
                break;
              case 'count':
                aggregatedValue = values.length;
                break;
              default:
                return;
            }
            
            // Check condition
            let shouldFire = false;
            switch (rule.condition.operator) {
              case 'gt':
                shouldFire = aggregatedValue > rule.threshold;
                break;
              case 'gte':
                shouldFire = aggregatedValue >= rule.threshold;
                break;
              case 'lt':
                shouldFire = aggregatedValue < rule.threshold;
                break;
              case 'lte':
                shouldFire = aggregatedValue <= rule.threshold;
                break;
              case 'eq':
                shouldFire = aggregatedValue === rule.threshold;
                break;
              case 'ne':
                shouldFire = aggregatedValue !== rule.threshold;
                break;
            }
            
            set((state: any) => {
              const existingAlert = state.activeAlerts.find(a => a.id === rule.id);
              
              if (shouldFire && !existingAlert) {
                // Fire alert
                const updatedRule = { ...rule, status: 'firing' as const, lastTriggered: now };
                state.activeAlerts.push(updatedRule);
                
                // Update original rule
                const originalRule = state.alertRules.find(r => r.id === rule.id);
                if (originalRule) {
                  originalRule.status = 'firing';
                  originalRule.lastTriggered = now;
                }
                
                // Execute alert actions
                get().executeAlertActions(updatedRule, aggregatedValue);
                
              } else if (!shouldFire && existingAlert) {
                // Resolve alert
                state.activeAlerts = state.activeAlerts.filter(a => a.id !== rule.id);
                
                const originalRule = state.alertRules.find(r => r.id === rule.id);
                if (originalRule) {
                  originalRule.status = 'resolved';
                }
              }
            });
          });
        },
        
        resolveAlert: (ruleId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.activeAlerts = state.activeAlerts.filter(a => a.id !== ruleId);
            
            const rule = state.alertRules.find(r => r.id === ruleId);
            if (rule) {
              rule.status = 'resolved';
            }
          });
        },
        
        // System Monitoring
        recordSystemMetrics: (metricsData) => {
          if (!FLAGS.observability) return;
          
          const metrics: SystemMetrics = {
            timestamp: new Date(),
            performance: {
              pageLoadTime: 0,
              renderTime: 0,
              apiResponseTime: 0,
              memoryUsage: 0,
              cpuUsage: 0
            },
            charts: {
              activeCharts: 0,
              renderingCharts: 0,
              dataPointsLoaded: 0,
              indicatorsActive: 0,
              drawingToolsActive: 0
            },
            userActivity: {
              activeUsers: 0,
              sessionsActive: 0,
              pagesViewed: 0,
              actionsPerMinute: 0
            },
            api: {
              requestsPerMinute: 0,
              errorRate: 0,
              averageResponseTime: 0,
              quotaUsage: 0
            },
            trading: {
              ordersPlaced: 0,
              tradesExecuted: 0,
              alertsTriggered: 0,
              backtestsRun: 0
            },
            system: {
              uptime: 0,
              errorCount: 0,
              warningCount: 0,
              diskUsage: 0,
              networkLatency: 0
            },
            ...metricsData
          };
          
          set((state: any) => {
            state.systemMetrics.push(metrics);
            state.currentMetrics = metrics;
            state.lastDataUpdate = new Date();
            
            // Keep only recent metrics
            const maxMetrics = 1000;
            if (state.systemMetrics.length > maxMetrics) {
              state.systemMetrics = state.systemMetrics.slice(-maxMetrics);
            }
          });
        },
        
        startSystemMonitoring: () => {
          if (!FLAGS.observability) return;
          
          // In a real implementation, this would start collection intervals
          console.log('Starting system monitoring');
        },
        
        stopSystemMonitoring: () => {
          if (!FLAGS.observability) return;
          
          console.log('Stopping system monitoring');
        },
        
        // User Behavior Tracking
        trackEvent: (eventData) => {
          if (!FLAGS.observability || !get().settings.enableUserTracking) return;
          
          const eventId = `event_${Date.now()}_${Math.random()}`;
          const event: UserBehaviorEvent = {
            ...eventData,
            id: eventId,
            timestamp: new Date()
          };
          
          set((state: any) => {
            state.userEvents.push(event);
            
            // Group by session
            const sessionEvents = state.sessionEvents.get(event.sessionId) || [];
            sessionEvents.push(event);
            
            // Limit events per session
            if (sessionEvents.length > state.settings.maxEventsPerSession) {
              sessionEvents.shift();
            }
            
            state.sessionEvents.set(event.sessionId, sessionEvents);
            
            // Keep only recent events in main array
            const maxEvents = 5000;
            if (state.userEvents.length > maxEvents) {
              state.userEvents = state.userEvents.slice(-maxEvents);
            }
          });
        },
        
        trackPageView: (page, properties = {}) => {
          if (!FLAGS.observability) return;
          
          get().trackEvent({
            sessionId: get().getCurrentSessionId(),
            userId: get().getCurrentUserId(),
            type: 'view',
            category: 'navigation',
            action: 'page_view',
            label: page,
            page,
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            deviceType: get().getDeviceType(),
            properties
          });
        },
        
        trackUserAction: (action, category, label, value) => {
          if (!FLAGS.observability) return;
          
          get().trackEvent({
            sessionId: get().getCurrentSessionId(),
            userId: get().getCurrentUserId(),
            type: 'interaction',
            category,
            action,
            label,
            value,
            page: window.location.pathname,
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            deviceType: get().getDeviceType(),
            properties: {}
          });
        },
        
        // Error Tracking
        reportError: (errorData) => {
          if (!FLAGS.observability || !get().settings.enableErrorReporting) return;
          
          const errorId = `error_${Date.now()}`;
          const error: ErrorEvent = {
            ...errorData,
            id: errorId,
            timestamp: new Date(),
            status: 'new'
          };
          
          set((state: any) => {
            state.errors.push(error);
            
            // Add to recent errors
            state.recentErrors.unshift(error);
            if (state.recentErrors.length > 100) {
              state.recentErrors = state.recentErrors.slice(0, 100);
            }
          });
          
          // Auto-report critical errors
          if (error.severity === 'critical') {
            get().executeErrorActions(error);
          }
        },
        
        updateErrorStatus: (errorId, status, assignedTo) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const error = state.errors.find(e => e.id === errorId);
            if (error) {
              error.status = status;
              if (assignedTo) error.assignedTo = assignedTo;
              if (status === 'resolved') error.resolvedAt = new Date();
            }
          });
        },
        
        // Performance Tracking
        startTrace: (name, operation) => {
          if (!FLAGS.observability || !get().settings.enablePerformanceMonitoring) return '';
          
          const traceId = `trace_${Date.now()}_${Math.random()}`;
          
          // Store trace start time
          if (typeof window !== 'undefined') {
            (window as any).__traces = (window as any).__traces || {};
            (window as any).__traces[traceId] = {
              name,
              operation,
              startTime: performance.now(),
              startMark: `trace_start_${traceId}`
            };
            
            performance.mark(`trace_start_${traceId}`);
          }
          
          return traceId;
        },
        
        endTrace: (traceId, status = 'success', errorMessage) => {
          if (!FLAGS.observability || typeof window === 'undefined') return;
          
          const traces = (window as any).__traces;
          if (!traces || !traces[traceId]) return;
          
          const trace = traces[traceId];
          const endTime = performance.now();
          const duration = endTime - trace.startTime;
          
          performance.mark(`trace_end_${traceId}`);
          performance.measure(`trace_${traceId}`, `trace_start_${traceId}`, `trace_end_${traceId}`);
          
          get().recordPerformance({
            sessionId: get().getCurrentSessionId(),
            userId: get().getCurrentUserId(),
            name: trace.name,
            operation: trace.operation,
            duration,
            page: window.location.pathname,
            status,
            errorMessage,
            timings: {},
            tags: {}
          });
          
          // Clean up
          delete traces[traceId];
          performance.clearMarks(`trace_start_${traceId}`);
          performance.clearMarks(`trace_end_${traceId}`);
          performance.clearMeasures(`trace_${traceId}`);
        },
        
        recordPerformance: (traceData) => {
          if (!FLAGS.observability) return;
          
          const traceId = `perf_${Date.now()}`;
          const trace: PerformanceTrace = {
            ...traceData,
            id: traceId,
            timestamp: new Date()
          };
          
          set((state: any) => {
            state.performanceTraces.push(trace);
            
            // Update performance metrics
            const recentTraces = state.performanceTraces.slice(-1000);
            const durations = recentTraces.map(t => t.duration).sort((a, b) => a - b);
            
            if (durations.length > 0) {
              const p50Index = Math.floor(durations.length * 0.5);
              const p95Index = Math.floor(durations.length * 0.95);
              const p99Index = Math.floor(durations.length * 0.99);
              
              state.performanceMetrics = {
                p50: durations[p50Index] || 0,
                p95: durations[p95Index] || 0,
                p99: durations[p99Index] || 0,
                avgResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                errorRate: recentTraces.filter(t => t.status === 'error').length / recentTraces.length
              };
            }
            
            // Keep only recent traces
            const maxTraces = 5000;
            if (state.performanceTraces.length > maxTraces) {
              state.performanceTraces = state.performanceTraces.slice(-maxTraces);
            }
          });
        },
        
        // Logging
        log: (level, message, data = {}) => {
          if (!FLAGS.observability) return;
          
          const logId = `log_${Date.now()}_${Math.random()}`;
          const entry: LogEntry = {
            id: logId,
            timestamp: new Date(),
            level,
            message,
            logger: 'lokifi',
            sessionId: get().getCurrentSessionId(),
            userId: get().getCurrentUserId(),
            tags: [],
            data
          };
          
          set((state: any) => {
            // Add to buffer first
            state.logBuffer.push(entry);
            
            // Flush buffer periodically or when full
            if (state.logBuffer.length >= 100) {
              state.logs.push(...state.logBuffer);
              state.logBuffer = [];
              
              // Keep only recent logs
              const maxLogs = 10000;
              if (state.logs.length > maxLogs) {
                state.logs = state.logs.slice(-maxLogs);
              }
            }
          });
          
          // Console logging in debug mode
          if (get().settings.debugMode) {
            const consoleMethod = level === 'debug' ? 'debug' :
                                 level === 'info' ? 'info' :
                                 level === 'warn' ? 'warn' :
                                 level === 'error' || level === 'fatal' ? 'error' : 'log';
            
            console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data);
          }
        },
        
        debug: (message, data) => get().log('debug', message, data),
        info: (message, data) => get().log('info', message, data),
        warn: (message, data) => get().log('warn', message, data),
        error: (message, error, data = {}) => {
          const errorData = error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : undefined;
          
          get().log('error', message, { ...data, error: errorData });
        },
        
        // Dashboard Management
        createDashboard: (dashboardData) => {
          if (!FLAGS.observability) return '';
          
          const dashboardId = `dashboard_${Date.now()}`;
          const now = new Date();
          
          const dashboard: Dashboard = {
            ...dashboardData,
            id: dashboardId,
            createdAt: now,
            updatedAt: now,
            viewCount: 0
          };
          
          set((state: any) => {
            state.dashboards.push(dashboard);
          });
          
          return dashboardId;
        },
        
        updateDashboard: (dashboardId, updates) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const dashboard = state.dashboards.find(d => d.id === dashboardId);
            if (dashboard) {
              Object.assign(dashboard, updates);
              dashboard.updatedAt = new Date();
            }
          });
        },
        
        deleteDashboard: (dashboardId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const index = state.dashboards.findIndex(d => d.id === dashboardId);
            if (index !== -1) {
              state.dashboards.splice(index, 1);
            }
            
            // Clear active dashboard if it was deleted
            if (state.activeDashboard?.id === dashboardId) {
              state.activeDashboard = null;
            }
          });
        },
        
        setActiveDashboard: (dashboardId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            if (dashboardId) {
              const dashboard = state.dashboards.find(d => d.id === dashboardId);
              if (dashboard) {
                state.activeDashboard = dashboard;
                dashboard.lastViewedAt = new Date();
                dashboard.viewCount++;
              }
            } else {
              state.activeDashboard = null;
            }
          });
        },
        
        addWidget: (dashboardId, widgetData) => {
          if (!FLAGS.observability) return '';
          
          const widgetId = `widget_${Date.now()}`;
          const widget: DashboardWidget = {
            ...widgetData,
            id: widgetId
          };
          
          set((state: any) => {
            const dashboard = state.dashboards.find(d => d.id === dashboardId);
            if (dashboard) {
              dashboard.widgets.push(widget);
              dashboard.updatedAt = new Date();
            }
          });
          
          return widgetId;
        },
        
        updateWidget: (dashboardId, widgetId, updates) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const dashboard = state.dashboards.find(d => d.id === dashboardId);
            if (dashboard) {
              const widget = dashboard.widgets.find(w => w.id === widgetId);
              if (widget) {
                Object.assign(widget, updates);
                dashboard.updatedAt = new Date();
              }
            }
          });
        },
        
        removeWidget: (dashboardId, widgetId) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            const dashboard = state.dashboards.find(d => d.id === dashboardId);
            if (dashboard) {
              const index = dashboard.widgets.findIndex(w => w.id === widgetId);
              if (index !== -1) {
                dashboard.widgets.splice(index, 1);
                dashboard.updatedAt = new Date();
              }
            }
          });
        },
        
        // Real-time
        enableRealTime: () => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.isRealTimeEnabled = true;
          });
          
          get().connectWebSocket();
        },
        
        disableRealTime: () => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.isRealTimeEnabled = false;
          });
          
          get().disconnectWebSocket();
        },
        
        connectWebSocket: () => {
          if (!FLAGS.observability || typeof window === 'undefined') return;
          
          // In a real implementation, this would establish WebSocket connection
          set((state: any) => {
            state.websocketConnected = true;
          });
          
          console.log('Connected to observability WebSocket');
        },
        
        disconnectWebSocket: () => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.websocketConnected = false;
          });
          
          console.log('Disconnected from observability WebSocket');
        },
        
        // Query & Analysis
        queryMetrics: async (query, timeRange) => {
          if (!FLAGS.observability) return [];
          
          try {
            const response = await fetch('/api/observability/metrics/query', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ query, timeRange })
            });
            
            if (!response.ok) throw new Error('Query failed');
            
            return await response.json();
            
          } catch (error) {
            set((state: any) => {
              state.errorMessage = error instanceof Error ? error.message : 'Query failed';
            });
            
            return [];
          }
        },
        
        analyzePerformance: async (timeRange) => {
          if (!FLAGS.observability) return {};
          
          try {
            const response = await fetch('/api/observability/performance/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ timeRange })
            });
            
            if (!response.ok) throw new Error('Analysis failed');
            
            return await response.json();
            
          } catch (error) {
            set((state: any) => {
              state.errorMessage = error instanceof Error ? error.message : 'Analysis failed';
            });
            
            return {};
          }
        },
        
        generateReport: async (type, config) => {
          if (!FLAGS.observability) throw new Error('Observability not enabled');
          
          const response = await fetch('/api/observability/reports/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ type, config })
          });
          
          if (!response.ok) throw new Error('Report generation failed');
          
          return await response.blob();
        },
        
        // Data Management
        exportData: async (type, timeRange) => {
          if (!FLAGS.observability) throw new Error('Observability not enabled');
          
          const response = await fetch(`/api/observability/data/export/${type}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ timeRange })
          });
          
          if (!response.ok) throw new Error('Export failed');
          
          return await response.blob();
        },
        
        clearOldData: (beforeDate) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.metricValues = state.metricValues.filter(v => v.timestamp >= beforeDate);
            state.userEvents = state.userEvents.filter(e => e.timestamp >= beforeDate);
            state.errors = state.errors.filter(e => e.timestamp >= beforeDate);
            state.performanceTraces = state.performanceTraces.filter(t => t.timestamp >= beforeDate);
            state.logs = state.logs.filter(l => l.timestamp >= beforeDate);
            state.systemMetrics = state.systemMetrics.filter(m => m.timestamp >= beforeDate);
          });
        },
        
        optimizeStorage: () => {
          if (!FLAGS.observability) return;
          
          const retentionDate = new Date();
          retentionDate.setDate(retentionDate.getDate() - get().settings.retentionDays);
          
          get().clearOldData(retentionDate);
        },
        
        // Settings
        updateSettings: (settings) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            Object.assign(state.settings, settings);
          });
        },
        
        setTimeRange: (timeRange) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.selectedTimeRange = timeRange;
          });
        },
        
        setFilters: (filters) => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            Object.assign(state.filters, filters);
          });
        },
        
        // Initialization
        initialize: async () => {
          if (!FLAGS.observability) return;
          
          set((state: any) => {
            state.isLoading = true;
            state.errorMessage = null;
          });
          
          try {
            // Initialize default metrics
            get().createDefaultMetrics();
            
            // Start system monitoring
            get().startSystemMonitoring();
            
            // Set up error listeners
            get().setupErrorListeners();
            
            // Set up performance observers
            get().setupPerformanceObservers();
            
            set((state: any) => {
              state.isLoading = false;
            });
            
          } catch (error) {
            set((state: any) => {
              state.errorMessage = error instanceof Error ? error.message : 'Initialization failed';
              state.isLoading = false;
            });
          }
        },
        
        loadHistoricalData: async (timeRange) => {
          if (!FLAGS.observability) return;
          
          try {
            const response = await fetch('/api/observability/data/historical', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ timeRange })
            });
            
            if (!response.ok) throw new Error('Failed to load historical data');
            
            const data = await response.json();
            
            set((state: any) => {
              state.metricValues = [...state.metricValues, ...data.metrics];
              state.userEvents = [...state.userEvents, ...data.events];
              state.errors = [...state.errors, ...data.errors];
              state.performanceTraces = [...state.performanceTraces, ...data.traces];
              state.logs = [...state.logs, ...data.logs];
            });
            
          } catch (error) {
            set((state: any) => {
              state.errorMessage = error instanceof Error ? error.message : 'Failed to load historical data';
            });
          }
        },
        
        // Helper Methods
        getCurrentSessionId: () => {
          if (typeof window === 'undefined') return 'server';
          return sessionStorage.getItem('session_id') || 'anonymous';
        },
        
        getCurrentUserId: () => {
          if (typeof window === 'undefined') return undefined;
          return localStorage.getItem('user_id') || undefined;
        },
        
        getDeviceType: (): 'desktop' | 'tablet' | 'mobile' => {
          if (typeof window === 'undefined') return 'desktop';
          
          const width = window.innerWidth;
          if (width < 768) return 'mobile';
          if (width < 1024) return 'tablet';
          return 'desktop';
        },
        
        createDefaultMetrics: () => {
          // Create default system metrics
          const defaultMetrics = [
            {
              name: 'Page Load Time',
              description: 'Time taken to load pages',
              type: 'histogram' as const,
              unit: 'ms',
              source: 'system' as const,
              tags: ['performance', 'user-experience'],
              alertRules: [],
              retentionPeriod: 30,
              isActive: true
            },
            {
              name: 'API Response Time',
              description: 'Time taken for API requests',
              type: 'histogram' as const,
              unit: 'ms',
              source: 'system' as const,
              tags: ['performance', 'api'],
              alertRules: [],
              retentionPeriod: 30,
              isActive: true
            },
            {
              name: 'Error Rate',
              description: 'Rate of errors occurring',
              type: 'counter' as const,
              source: 'system' as const,
              tags: ['errors', 'reliability'],
              alertRules: [],
              retentionPeriod: 30,
              isActive: true
            }
          ];
          
          defaultMetrics.forEach(metric => {
            get().createMetric(metric);
          });
        },
        
        setupErrorListeners: () => {
          if (typeof window === 'undefined') return;
          
          // Global error handler
          window.addEventListener('error', (event) => {
            get().reportError({
              type: 'javascript',
              message: event.message,
              stack: event.error?.stack,
              source: event.filename,
              page: window.location.pathname,
              userAgent: navigator.userAgent,
              severity: 'medium',
              status: 'new',
              tags: ['javascript', 'runtime'],
              customData: {
                lineno: event.lineno,
                colno: event.colno
              },
              sessionId: get().getCurrentSessionId(),
              userId: get().getCurrentUserId()
            });
          });
          
          // Unhandled promise rejections
          window.addEventListener('unhandledrejection', (event) => {
            get().reportError({
              type: 'javascript',
              message: `Unhandled promise rejection: ${event.reason}`,
              stack: event.reason?.stack,
              page: window.location.pathname,
              userAgent: navigator.userAgent,
              severity: 'high',
              status: 'new',
              tags: ['javascript', 'promise', 'async'],
              customData: { reason: event.reason },
              sessionId: get().getCurrentSessionId(),
              userId: get().getCurrentUserId()
            });
          });
        },
        
        setupPerformanceObservers: () => {
          if (typeof window === 'undefined' || !window.PerformanceObserver) return;
          
          try {
            // Navigation timing
            const navObserver = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'navigation') {
                  const navEntry = entry as PerformanceNavigationTiming;
                  
                  get().recordPerformance({
                    sessionId: get().getCurrentSessionId(),
                    userId: get().getCurrentUserId(),
                    name: 'page_load',
                    operation: 'navigation',
                    duration: navEntry.loadEventEnd - navEntry.fetchStart,
                    page: window.location.pathname,
                    resourceType: 'navigation',
                    status: 'success',
                    timings: {
                      dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
                      tcp: navEntry.connectEnd - navEntry.connectStart,
                      ssl: navEntry.connectEnd - navEntry.secureConnectionStart,
                      request: navEntry.responseStart - navEntry.requestStart,
                      response: navEntry.responseEnd - navEntry.responseStart,
                      render: navEntry.loadEventEnd - navEntry.responseEnd
                    },
                    tags: {}
                  });
                }
              }
            });
            
            navObserver.observe({ entryTypes: ['navigation'] });
            
          } catch (error) {
            console.warn('Performance observer setup failed:', error);
          }
        },
        
        executeAlertActions: async (rule: AlertRule, value: number) => {
          for (const action of rule.actions) {
            if (!action.isEnabled) continue;
            
            try {
              switch (action.type) {
                case 'notification':
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`Alert: ${rule.name}`, {
                      body: `${rule.description}\nCurrent value: ${value}`,
                      icon: '/favicon.ico'
                    });
                  }
                  break;
                  
                case 'webhook':
                  await fetch(action.config.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      alert: rule.name,
                      description: rule.description,
                      value,
                      severity: rule.severity,
                      timestamp: new Date().toISOString()
                    })
                  });
                  break;
                  
                case 'email':
                  // Would integrate with email service
                  console.log(`Email alert: ${rule.name} - ${value}`);
                  break;
                  
                case 'slack':
                  // Would integrate with Slack API
                  console.log(`Slack alert: ${rule.name} - ${value}`);
                  break;
              }
              
            } catch (error) {
              console.error(`Failed to execute alert action ${action.type}:`, error);
            }
          }
        },
        
        executeErrorActions: async (error: ErrorEvent) => {
          // Auto-report critical errors to external service
          if (error.severity === 'critical') {
            try {
              await fetch('/api/observability/errors/report', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(error)
              });
            } catch (reportError) {
              console.error('Failed to report critical error:', reportError);
            }
          }
        }
      }))
    ),
    {
      name: 'lokifi-observability-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            performanceTraces: [],
            logs: [],
            logBuffer: [],
            sessionEvents: new Map()
          };
        }
        return persistedState as ObservabilityState & ObservabilityActions;
      }
    }
  )
);

// Selectors
export const useActiveMetrics = () =>
  useObservabilityStore((state) => state.metrics.filter(m => m.isActive));

export const useRecentErrors = (limit = 10) =>
  useObservabilityStore((state) => state.recentErrors.slice(0, limit));

export const usePerformanceMetrics = () =>
  useObservabilityStore((state) => state.performanceMetrics);

export const useSystemHealth = () =>
  useObservabilityStore((state) => {
    const current = state.currentMetrics;
    if (!current) return null;
    
    return {
      status: current.system.errorCount === 0 && current.system.warningCount < 5 ? 'healthy' : 'warning',
      uptime: current.system.uptime,
      errorRate: state.performanceMetrics.errorRate,
      responseTime: state.performanceMetrics.avgResponseTime,
      lastUpdate: state.lastDataUpdate
    };
  });

// Initialize observability on client
if (typeof window !== 'undefined' && FLAGS.observability) {
  const store = useObservabilityStore.getState();
  store.initialize();
  
  // Set up periodic optimization
  setInterval(() => {
    store.optimizeStorage();
  }, 60000); // Every minute
}

