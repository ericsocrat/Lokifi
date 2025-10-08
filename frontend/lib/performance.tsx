import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { FLAGS } from './featureFlags';

// Performance Types
export interface PerformanceConfig {
  // Chart Performance
  chartOptimization: {
    virtualization: boolean;
    lazyLoading: boolean;
    memoryManagement: boolean;
    renderThrottling: boolean;
    dataCompression: boolean;
  };
  
  // Data Management
  dataOptimization: {
    cachingEnabled: boolean;
    cacheSize: number; // MB
    preloadStrategy: 'none' | 'visible' | 'all';
    compressionLevel: 'none' | 'low' | 'medium' | 'high';
    batchSize: number;
  };
  
  // Network Performance
  networkOptimization: {
    connectionPooling: boolean;
    requestBatching: boolean;
    compressionEnabled: boolean;
    timeoutSettings: {
      request: number;
      connection: number;
      idle: number;
    };
  };
  
  // Rendering Performance
  renderOptimization: {
    frameRateLimit: number;
    adaptiveQuality: boolean;
    lowPowerMode: boolean;
    offscreenRendering: boolean;
    webWorkers: boolean;
  };
  
  // Memory Management
  memoryManagement: {
    garbageCollection: boolean;
    memoryLimit: number; // MB
    cleanupInterval: number; // seconds
    leakDetection: boolean;
  };
}

export interface PerformanceMetrics {
  id: string;
  timestamp: Date;
  
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Custom Metrics
  chartRenderTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  
  // User Experience
  interactionLatency: number;
  scrollPerformance: number;
  animationFrameRate: number;
  
  // Resource Usage
  domNodes: number;
  eventListeners: number;
  activeTimeouts: number;
  webWorkerCount: number;
  
  // Battery (mobile)
  batteryLevel?: number;
  batteryCharging?: boolean;
  batteryDischargingTime?: number;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  
  // Device Targeting
  deviceTypes: ('desktop' | 'tablet' | 'mobile')[];
  connectionTypes: ('slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi')[];
  
  // Configuration
  config: PerformanceConfig;
  
  // Thresholds
  thresholds: {
    lcp: number;
    fid: number;
    cls: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  // Status
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  lastModified: Date;
}

export interface PerformanceBenchmark {
  id: string;
  name: string;
  timestamp: Date;
  
  // Test Configuration
  testConfig: {
    duration: number; // seconds
    operations: string[];
    dataSize: number;
    concurrency: number;
  };
  
  // Results
  results: {
    averageRenderTime: number;
    peakMemoryUsage: number;
    operationsPerSecond: number;
    errorRate: number;
    
    // Percentiles
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  // Environment
  environment: {
    device: string;
    browser: string;
    viewport: { width: number; height: number };
    memory: number;
    cores: number;
  };
  
  // Comparison
  baselineId?: string;
  improvement?: number; // percentage
}

export interface PerformanceIssue {
  id: string;
  type: 'memory-leak' | 'slow-render' | 'network-timeout' | 'cpu-spike' | 'layout-shift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Issue Details
  title: string;
  description: string;
  impact: string;
  
  // Metrics
  affectedMetric: string;
  threshold: number;
  actualValue: number;
  
  // Context
  component?: string;
  operation?: string;
  timestamp: Date;
  
  // Stack Trace
  stackTrace?: string;
  
  // Resolution
  status: 'new' | 'investigating' | 'fixed' | 'ignored';
  resolution?: string;
  fixedAt?: Date;
  
  // Suggestions
  suggestions: string[];
}

export interface ResourceUsage {
  timestamp: Date;
  
  // JavaScript Heap
  jsHeapSize: {
    used: number;
    total: number;
    limit: number;
  };
  
  // DOM
  dom: {
    nodes: number;
    listeners: number;
    detachedNodes: number;
  };
  
  // Network
  network: {
    activeRequests: number;
    bandwidth: number;
    dataUsage: number; // bytes
  };
  
  // Storage
  storage: {
    localStorage: number;
    sessionStorage: number;
    indexedDB: number;
    cache: number;
  };
  
  // CPU
  cpu: {
    usage: number; // percentage
    taskTime: number;  
    scriptTime: number;
    renderTime: number;
  };
  
  // GPU (if available)
  gpu?: {
    usage: number;
    memory: number;
  };
  
  // Battery (mobile)
  battery?: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  };
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  
  // Condition
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq';
    threshold: number;
    duration?: number; // seconds
  };
  
  // Action
  action: {
    type: 'reduce-quality' | 'cleanup-memory' | 'throttle-updates' | 'disable-feature';
    parameters: Record<string, any>;
  };
  
  // Settings
  enabled: boolean;
  priority: number;
  cooldown: number; // seconds
  
  // Tracking
  lastTriggered?: Date;
  triggerCount: number;
  
  // Impact
  impact: {
    performanceGain: number; // percentage
    userExperienceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  
  // Alert Details
  type: 'threshold' | 'trend' | 'anomaly' | 'regression';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Message
  title: string;
  message: string;
  
  // Data
  metric: string;
  value: number;
  threshold?: number;
  
  // Context
  component?: string;
  operation?: string;
  userAgent?: string;
  
  // Status
  acknowledged: boolean;
  resolved: boolean;
  
  // Actions
  suggestedActions: string[];
}

// Store State
interface PerformanceState {
  // Configuration
  activeProfile: PerformanceProfile | null;
  profiles: PerformanceProfile[];
  
  // Metrics
  currentMetrics: PerformanceMetrics | null;
  metricsHistory: PerformanceMetrics[];
  
  // Benchmarks
  benchmarks: PerformanceBenchmark[];
  lastBenchmark: PerformanceBenchmark | null;
  
  // Issues & Monitoring
  activeIssues: PerformanceIssue[];
  resolvedIssues: PerformanceIssue[];
  
  // Resource Monitoring
  resourceUsage: ResourceUsage[];
  currentUsage: ResourceUsage | null;
  
  // Optimization
  optimizationRules: OptimizationRule[];
  activeOptimizations: string[];
  
  // Alerts
  alerts: PerformanceAlert[];
  unreadAlerts: number;
  
  // Real-time Monitoring
  monitoringEnabled: boolean;
  monitoringInterval: number; // ms
  
  // Performance Budget
  budget: {
    lcp: number;
    fid: number;
    cls: number;
    memoryUsage: number;
    bundleSize: number;
  };
  
  // Settings
  settings: {
    enableProfiling: boolean;
    enableOptimizations: boolean;
    enableAlerts: boolean;
    dataRetention: number; // days
    reportingInterval: number; // minutes
  };
  
  // UI State
  selectedMetric: string | null;
  selectedTimeRange: { start: Date; end: Date };
  
  // Loading States
  isBenchmarking: boolean;
  isOptimizing: boolean;
  error: string | null;
}

// Store Actions
interface PerformanceActions {
  // Profile Management
  createProfile: (profile: Omit<PerformanceProfile, 'id' | 'createdAt' | 'lastModified'>) => string;
  updateProfile: (profileId: string, updates: Partial<PerformanceProfile>) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string) => void;
  cloneProfile: (profileId: string, name: string) => string;
  
  // Metrics Collection
  collectMetrics: () => PerformanceMetrics;
  startMonitoring: (interval?: number) => void;
  stopMonitoring: () => void;
  clearMetrics: (olderThan?: Date) => void;
  
  // Benchmarking
  runBenchmark: (config: PerformanceBenchmark['testConfig']) => Promise<PerformanceBenchmark>;
  compareBenchmarks: (benchmarkId1: string, benchmarkId2: string) => any;
  deleteBenchmark: (benchmarkId: string) => void;
  
  // Issue Detection
  detectIssues: () => PerformanceIssue[];
  reportIssue: (issue: Omit<PerformanceIssue, 'id' | 'timestamp'>) => string;
  resolveIssue: (issueId: string, resolution?: string) => void;
  ignoreIssue: (issueId: string) => void;
  
  // Resource Monitoring
  trackResourceUsage: () => ResourceUsage;
  getResourceTrend: (resource: string, timeRange: { start: Date; end: Date }) => number[];
  cleanupResources: () => void;
  
  // Optimization
  addOptimizationRule: (rule: Omit<OptimizationRule, 'id' | 'triggerCount'>) => string;
  updateOptimizationRule: (ruleId: string, updates: Partial<OptimizationRule>) => void;
  deleteOptimizationRule: (ruleId: string) => void;
  applyOptimization: (ruleId: string) => void;
  revertOptimization: (ruleId: string) => void;
  
  // Alerts
  createAlert: (alert: Omit<PerformanceAlert, 'id' | 'timestamp'>) => string;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // Performance Budget
  setBudget: (budget: Partial<PerformanceState['budget']>) => void;
  checkBudget: () => { passed: boolean; violations: string[] };
  
  // Analysis
  analyzePerformance: (timeRange?: { start: Date; end: Date }) => any;
  generateReport: (type: 'summary' | 'detailed' | 'trends') => Promise<Blob>;
  getRecommendations: () => string[];
  
  // Settings
  updateSettings: (settings: Partial<PerformanceState['settings']>) => void;
  
  // Data Management
  exportData: (type: 'metrics' | 'benchmarks' | 'issues') => Promise<Blob>;
  importData: (file: File) => Promise<void>;
  
  // UI State
  setSelectedMetric: (metric: string | null) => void;
  setSelectedTimeRange: (range: { start: Date; end: Date }) => void;
  
  // Initialization
  initialize: () => Promise<void>;
  createDefaultProfiles: () => void;
  createDefaultOptimizationRules: () => void;
  setupPerformanceObservers: () => void;
}

// Create Store
export const usePerformanceStore = create<PerformanceState & PerformanceActions>()(
  persist(
    subscribeWithSelector(
      immer<any>((set: any, get: any) => ({
        // Initial State
        activeProfile: null,
        profiles: [],
        currentMetrics: null,
        metricsHistory: [],
        benchmarks: [],
        lastBenchmark: null,
        activeIssues: [],
        resolvedIssues: [],
        resourceUsage: [],
        currentUsage: null,
        optimizationRules: [],
        activeOptimizations: [],
        alerts: [],
        unreadAlerts: 0,
        monitoringEnabled: false,
        monitoringInterval: 5000,
        budget: {
          lcp: 2500,    // 2.5s
          fid: 100,     // 100ms
          cls: 0.1,     // 0.1
          memoryUsage: 100, // 100MB
          bundleSize: 500   // 500KB
        },
        settings: {
          enableProfiling: true,
          enableOptimizations: true,
          enableAlerts: true,
          dataRetention: 7,
          reportingInterval: 5
        },
        selectedMetric: null,
        selectedTimeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
          end: new Date()
        },
        isBenchmarking: false,
        isOptimizing: false,
        error: null,
        
        // Profile Management
        createProfile: (profileData: any) => {
          if (!FLAGS.performance) return '';
          
          const profileId = `profile_${Date.now()}`;
          const now = new Date();
          
          const profile: PerformanceProfile = {
            ...profileData,
            id: profileId,
            createdAt: now,
            lastModified: now
          };
          
          set((state: any) => {
            state.profiles.push(profile);
            
            // Set as active if no active profile
            if (!state.activeProfile) {
              state.activeProfile = profile;
            }
          });
          
          return profileId;
        },
        
        updateProfile: (profileId: any, updates: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const profile = state.profiles.find((p: any) => p.id === profileId);
            if (profile) {
              Object.assign(profile, updates);
              profile.lastModified = new Date();
              
              // Update active profile if it's the same
              if (state.activeProfile?.id === profileId) {
                state.activeProfile = profile;
              }
            }
          });
        },
        
        deleteProfile: (profileId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const index = state.profiles.findIndex(p => p.id === profileId);
            if (index !== -1) {
              state.profiles.splice(index, 1);
              
              // Clear active profile if deleted
              if (state.activeProfile?.id === profileId) {
                state.activeProfile = state.profiles[0] || null;
              }
            }
          });
        },
        
        setActiveProfile: (profileId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const profile = state.profiles.find((p: any) => p.id === profileId);
            if (profile) {
              state.activeProfile = profile;
            }
          });
        },
        
        cloneProfile: (profileId: any, name: any) => {
          if (!FLAGS.performance) return '';
          
          const profile = get().profiles.find((p: any) => p.id === profileId);
          if (!profile) return '';
          
          return get().createProfile({
            ...profile,
            name,
            isActive: false,
            isDefault: false
          });
        },
        
        // Metrics Collection
        collectMetrics: () => {
          if (!FLAGS.performance || typeof window === 'undefined') {
            return {} as PerformanceMetrics;
          }
          
          const now = Date.now();
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          // Collect Core Web Vitals
          const metrics: PerformanceMetrics = {
            id: `metrics_${now}`,
            timestamp: new Date(),
            
            // Core Web Vitals (would be collected via web-vitals library)
            lcp: 0, // Will be updated by web-vitals
            fid: 0,
            cls: 0,
            fcp: navigation?.loadEventEnd - navigation?.fetchStart || 0,
            ttfb: navigation?.responseStart - navigation?.requestStart || 0,
            
            // Custom metrics
            chartRenderTime: 0, // Will be measured during chart operations
            apiResponseTime: 0, // Will be measured during API calls
            memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
            cpuUsage: 0, // Estimated
            networkLatency: 0,
            
            // User experience
            interactionLatency: 0,
            scrollPerformance: 0,
            animationFrameRate: 60, // Default to 60fps
            
            // Resource usage
            domNodes: document.querySelectorAll('*').length,
            eventListeners: 0, // Would need custom tracking
            activeTimeouts: 0, // Would need custom tracking
            webWorkerCount: 0
          };
          
          set((state: any) => {
            state.currentMetrics = metrics;
            state.metricsHistory.push(metrics);
            
            // Keep only recent metrics
            const maxMetrics = 1000;
            if (state.metricsHistory.length > maxMetrics) {
              state.metricsHistory = state.metricsHistory.slice(-maxMetrics);
            }
          });
          
          return metrics;
        },
        
        startMonitoring: (interval = 5000) => {
          if (!FLAGS.performance || typeof window === 'undefined') return;
          
          set((state: any) => {
            state.monitoringEnabled = true;
            state.monitoringInterval = interval;
          });
          
          // Start monitoring interval
          const monitoringId = setInterval(() => {
            if (!get().monitoringEnabled) {
              clearInterval(monitoringId);
              return;
            }
            
            get().collectMetrics();
            get().trackResourceUsage();
            get().detectIssues();
          }, interval);
          
          // Store interval ID for cleanup
          (window as any).__performanceMonitoring = monitoringId;
        },
        
        stopMonitoring: () => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            state.monitoringEnabled = false;
          });
          
          // Clear monitoring interval
          if ((window as any).__performanceMonitoring) {
            clearInterval((window as any).__performanceMonitoring);
            delete (window as any).__performanceMonitoring;
          }
        },
        
        clearMetrics: (olderThan: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            if (olderThan) {
              state.metricsHistory = state.metricsHistory.filter((m: any) => m.timestamp >= olderThan);
            } else {
              state.metricsHistory = [];
              state.currentMetrics = null;
            }
          });
        },
        
        // Benchmarking
        runBenchmark: async (config: any) => {
          if (!FLAGS.performance) {
            throw new Error('Performance features not enabled');
          }
          
          set((state: any) => {
            state.isBenchmarking = true;
            state.error = null;
          });
          
          try {
            const benchmarkId = `benchmark_${Date.now()}`;
            const startTime = performance.now();
            
            // Run benchmark operations
            const results = await runBenchmarkOperations(config);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            const benchmark: PerformanceBenchmark = {
              id: benchmarkId,
              name: `Benchmark ${new Date().toISOString()}`,
              timestamp: new Date(),
              testConfig: config,
              results: {
                ...results,
                averageRenderTime: duration / config.operations.length
              },
              environment: {
                device: navigator.userAgent,
                browser: navigator.userAgent,
                viewport: {
                  width: window.innerWidth,
                  height: window.innerHeight
                },
                memory: (navigator as any).deviceMemory || 4,
                cores: navigator.hardwareConcurrency || 4
              }
            };
            
            set((state: any) => {
              state.benchmarks.push(benchmark);
              state.lastBenchmark = benchmark;
              state.isBenchmarking = false;
              
              // Keep only last 50 benchmarks
              if (state.benchmarks.length > 50) {
                state.benchmarks = state.benchmarks.slice(-50);
              }
            });
            
            return benchmark;
            
          } catch (error) {
            set((state: any) => {
              state.error = error instanceof Error ? error.message : 'Benchmark failed';
              state.isBenchmarking = false;
            });
            
            throw error;
          }
        },
        
        compareBenchmarks: (benchmarkId1: any, benchmarkId2: any) => {
          if (!FLAGS.performance) return null;
          
          const { benchmarks } = get();
          const benchmark1 = benchmarks.find((b: any) => b.id === benchmarkId1);
          const benchmark2 = benchmarks.find((b: any) => b.id === benchmarkId2);
          
          if (!benchmark1 || !benchmark2) return null;
          
          return {
            renderTime: {
              change: ((benchmark2.results.averageRenderTime - benchmark1.results.averageRenderTime) / benchmark1.results.averageRenderTime) * 100,
              improvement: benchmark2.results.averageRenderTime < benchmark1.results.averageRenderTime
            },
            memoryUsage: {
              change: ((benchmark2.results.peakMemoryUsage - benchmark1.results.peakMemoryUsage) / benchmark1.results.peakMemoryUsage) * 100,
              improvement: benchmark2.results.peakMemoryUsage < benchmark1.results.peakMemoryUsage
            },
            opsPerSecond: {
              change: ((benchmark2.results.operationsPerSecond - benchmark1.results.operationsPerSecond) / benchmark1.results.operationsPerSecond) * 100,
              improvement: benchmark2.results.operationsPerSecond > benchmark1.results.operationsPerSecond
            }
          };
        },
        
        deleteBenchmark: (benchmarkId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const index = state.benchmarks.findIndex(b => b.id === benchmarkId);
            if (index !== -1) {
              state.benchmarks.splice(index, 1);
              
              if (state.lastBenchmark?.id === benchmarkId) {
                state.lastBenchmark = state.benchmarks[state.benchmarks.length - 1] || null;
              }
            }
          });
        },
        
        // Issue Detection
        detectIssues: () => {
          if (!FLAGS.performance) return [];
          
          const { currentMetrics, budget } = get();
          if (!currentMetrics) return [];
          
          const issues: PerformanceIssue[] = [];
          
          // Check budget violations
          if (currentMetrics.lcp > budget.lcp) {
            issues.push({
              id: `issue_lcp_${Date.now()}`,
              type: 'slow-render',
              severity: 'high',
              title: 'Largest Contentful Paint exceeds budget',
              description: `LCP is ${currentMetrics.lcp}ms, which exceeds the budget of ${budget.lcp}ms`,
              impact: 'Users experience slow page loading',
              affectedMetric: 'lcp',
              threshold: budget.lcp,
              actualValue: currentMetrics.lcp,
              timestamp: new Date(),
              status: 'new',
              suggestions: [
                'Optimize image loading',
                'Reduce server response time',
                'Eliminate render-blocking resources'
              ]
            });
          }
          
          if (currentMetrics.memoryUsage > budget.memoryUsage) {
            issues.push({
              id: `issue_memory_${Date.now()}`,
              type: 'memory-leak',
              severity: 'medium',
              title: 'Memory usage exceeds budget',
              description: `Memory usage is ${currentMetrics.memoryUsage.toFixed(1)}MB, which exceeds the budget of ${budget.memoryUsage}MB`,
              impact: 'Application may become slow or crash',
              affectedMetric: 'memoryUsage',
              threshold: budget.memoryUsage,
              actualValue: currentMetrics.memoryUsage,
              timestamp: new Date(),
              status: 'new',
              suggestions: [
                'Clear unused data caches',
                'Remove event listeners',
                'Optimize component lifecycle'
              ]
            });
          }
          
          set((state: any) => {
            // Add new issues
            issues.forEach((issue: any) => {
              if (!state.activeIssues.some(existing => existing.type === issue.type && existing.affectedMetric === issue.affectedMetric)) {
                state.activeIssues.push(issue);
              }
            });
          });
          
          return issues;
        },
        
        reportIssue: (issueData: any) => {
          if (!FLAGS.performance) return '';
          
          const issueId = `issue_${Date.now()}`;
          const issue: PerformanceIssue = {
            ...issueData,
            id: issueId,
            timestamp: new Date()
          };
          
          set((state: any) => {
            state.activeIssues.push(issue);
          });
          
          return issueId;
        },
        
        resolveIssue: (issueId: any, resolution: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const issueIndex = state.activeIssues.findIndex(i => i.id === issueId);
            if (issueIndex !== -1) {
              const issue = state.activeIssues[issueIndex];
              issue.status = 'fixed';
              issue.resolution = resolution;
              issue.fixedAt = new Date();
              
              // Move to resolved issues
              state.resolvedIssues.push(issue);
              state.activeIssues.splice(issueIndex, 1);
            }
          });
        },
        
        ignoreIssue: (issueId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const issueIndex = state.activeIssues.findIndex(i => i.id === issueId);
            if (issueIndex !== -1) {
              const issue = state.activeIssues[issueIndex];
              issue.status = 'ignored';
              
              state.resolvedIssues.push(issue);
              state.activeIssues.splice(issueIndex, 1);
            }
          });
        },
        
        // Resource Monitoring
        trackResourceUsage: () => {
          if (!FLAGS.performance || typeof window === 'undefined') {
            return {} as ResourceUsage;
          }
          
          const memory = (performance as any).memory;
          const nav = navigator as any;
          
          const usage: ResourceUsage = {
            timestamp: new Date(),
            
            jsHeapSize: {
              used: memory?.usedJSHeapSize || 0,
              total: memory?.totalJSHeapSize || 0,
              limit: memory?.jsHeapSizeLimit || 0
            },
            
            dom: {
              nodes: document.querySelectorAll('*').length,
              listeners: 0, // Would need custom tracking
              detachedNodes: 0 // Would need custom tracking
            },
            
            network: {
              activeRequests: 0, // Would track active XHR/fetch
              bandwidth: nav.connection?.downlink || 0,
              dataUsage: 0 // Would track cumulative
            },
            
            storage: {
              localStorage: JSON.stringify(localStorage).length,
              sessionStorage: JSON.stringify(sessionStorage).length,
              indexedDB: 0, // Would need to query
              cache: 0 // Would need to query
            },
            
            cpu: {
              usage: 0, // Estimated based on frame rate
              taskTime: 0,
              scriptTime: 0,
              renderTime: 0
            }
          };
          
          // Add battery info if available
          if (nav.getBattery) {
            nav.getBattery().then((battery: any) => {
              usage.battery = {
                level: battery.level * 100,
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
              };
            });
          }
          
          set((state: any) => {
            state.currentUsage = usage;
            state.resourceUsage.push(usage);
            
            // Keep only recent usage data
            const maxUsage = 1000;
            if (state.resourceUsage.length > maxUsage) {
              state.resourceUsage = state.resourceUsage.slice(-maxUsage);
            }
          });
          
          return usage;
        },
        
        getResourceTrend: (resource: any, timeRange: any) => {
          if (!FLAGS.performance) return [];
          
          const { resourceUsage } = get();
          const filteredUsage = resourceUsage.filter((u: any) => 
            u.timestamp >= timeRange.start && u.timestamp <= timeRange.end
          );
          
          // Extract values based on resource path
          return filteredUsage.map((usage: any) => {
            const keys = resource.split('.');
            let value: any = usage;
            
            for (const key of keys) {
              value = value?.[key];
              if (value === undefined) return 0;
            }
            
            return typeof value === 'number' ? value : 0;
          });
        },
        
        cleanupResources: () => {
          if (!FLAGS.performance || typeof window === 'undefined') return;
          
          // Force garbage collection if available
          if ((window as any).gc) {
            (window as any).gc();
          }
          
          // Clear caches
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach((name: any) => {
                if (name.includes('temp') || name.includes('old')) {
                  caches.delete(name);
                }
              });
            });
          }
          
          // Dispatch cleanup event for components
          window.dispatchEvent(new CustomEvent('performance:cleanup'));
        },
        
        // Optimization
        addOptimizationRule: (ruleData: any) => {
          if (!FLAGS.performance) return '';
          
          const ruleId = `rule_${Date.now()}`;
          const rule: OptimizationRule = {
            ...ruleData,
            id: ruleId,
            triggerCount: 0
          };
          
          set((state: any) => {
            state.optimizationRules.push(rule);
          });
          
          return ruleId;
        },
        
        updateOptimizationRule: (ruleId: any, updates: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const rule = state.optimizationRules.find((r: any) => r.id === ruleId);
            if (rule) {
              Object.assign(rule, updates);
            }
          });
        },
        
        deleteOptimizationRule: (ruleId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const index = state.optimizationRules.findIndex(r => r.id === ruleId);
            if (index !== -1) {
              state.optimizationRules.splice(index, 1);
            }
            
            // Remove from active optimizations
            state.activeOptimizations = state.activeOptimizations.filter((id: any) => id !== ruleId);
          });
        },
        
        applyOptimization: (ruleId: any) => {
          if (!FLAGS.performance) return;
          
          const rule = get().optimizationRules.find((r: any) => r.id === ruleId);
          if (!rule || !rule.enabled) return;
          
          set((state: any) => {
            if (!state.activeOptimizations.includes(ruleId)) {
              state.activeOptimizations.push(ruleId);
            }
            
            // Update rule
            const ruleToUpdate = state.optimizationRules.find((r: any) => r.id === ruleId);
            if (ruleToUpdate) {
              ruleToUpdate.triggerCount++;
              ruleToUpdate.lastTriggered = new Date();
            }
          });
          
          // Execute optimization action
          executeOptimizationAction(rule.action);
        },
        
        revertOptimization: (ruleId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            state.activeOptimizations = state.activeOptimizations.filter((id: any) => id !== ruleId);
          });
          
          // Would revert the optimization action
          console.log(`Reverting optimization: ${ruleId}`);
        },
        
        // Alerts
        createAlert: (alertData: any) => {
          if (!FLAGS.performance) return '';
          
          const alertId = `alert_${Date.now()}`;
          const alert: PerformanceAlert = {
            ...alertData,
            id: alertId,
            timestamp: new Date()
          };
          
          set((state: any) => {
            state.alerts.unshift(alert);
            
            if (!alert.acknowledged) {
              state.unreadAlerts++;
            }
            
            // Keep only recent alerts
            if (state.alerts.length > 100) {
              state.alerts = state.alerts.slice(0, 100);
            }
          });
          
          return alertId;
        },
        
        acknowledgeAlert: (alertId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const alert = state.alerts.find(a => a.id === alertId);
            if (alert && !alert.acknowledged) {
              alert.acknowledged = true;
              state.unreadAlerts = Math.max(0, state.unreadAlerts - 1);
            }
          });
        },
        
        resolveAlert: (alertId: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            const alert = state.alerts.find(a => a.id === alertId);
            if (alert) {
              alert.resolved = true;
              
              if (!alert.acknowledged) {
                alert.acknowledged = true;
                state.unreadAlerts = Math.max(0, state.unreadAlerts - 1);
              }
            }
          });
        },
        
        clearAlerts: () => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            state.alerts = [];
            state.unreadAlerts = 0;
          });
        },
        
        // Performance Budget
        setBudget: (budget: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            Object.assign(state.budget, budget);
          });
        },
        
        checkBudget: () => {
          if (!FLAGS.performance) return { passed: true, violations: [] };
          
          const { currentMetrics, budget } = get();
          if (!currentMetrics) return { passed: true, violations: [] };
          
          const violations: string[] = [];
          
          if (currentMetrics.lcp > budget.lcp) {
            violations.push(`LCP: ${currentMetrics.lcp}ms > ${budget.lcp}ms`);
          }
          
          if (currentMetrics.fid > budget.fid) {
            violations.push(`FID: ${currentMetrics.fid}ms > ${budget.fid}ms`);
          }
          
          if (currentMetrics.cls > budget.cls) {
            violations.push(`CLS: ${currentMetrics.cls} > ${budget.cls}`);
          }
          
          if (currentMetrics.memoryUsage > budget.memoryUsage) {
            violations.push(`Memory: ${currentMetrics.memoryUsage.toFixed(1)}MB > ${budget.memoryUsage}MB`);
          }
          
          return {
            passed: violations.length === 0,
            violations
          };
        },
        
        // Analysis
        analyzePerformance: (timeRange: any) => {
          if (!FLAGS.performance) return {};
          
          const { metricsHistory } = get();
          const range = timeRange || get().selectedTimeRange;
          
          const filteredMetrics = metricsHistory.filter((m: any) => 
            m.timestamp >= range.start && m.timestamp <= range.end
          );
          
          if (filteredMetrics.length === 0) return {};
          
          const analysis = {
            summary: {
              dataPoints: filteredMetrics.length,
              timeRange: range,
              averageMetrics: calculateAverageMetrics(filteredMetrics)
            },
            trends: {
              lcp: calculateTrend(filteredMetrics.map((m: any) => m.lcp)),
              fid: calculateTrend(filteredMetrics.map((m: any) => m.fid)),
              memoryUsage: calculateTrend(filteredMetrics.map((m: any) => m.memoryUsage))
            },
            insights: generateInsights(filteredMetrics)
          };
          
          return analysis;
        },
        
        generateReport: async (type: any) => {
          if (!FLAGS.performance) throw new Error('Performance features not enabled');
          
          const analysis = get().analyzePerformance();
          const report = {
            type,
            timestamp: new Date(),
            data: analysis,
            budget: get().budget,
            issues: get().activeIssues,
            recommendations: get().getRecommendations()
          };
          
          const blob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json'
          });
          
          return blob;
        },
        
        getRecommendations: () => {
          if (!FLAGS.performance) return [];
          
          const { activeIssues, currentMetrics, budget } = get();
          const recommendations: string[] = [];
          
          // Based on active issues
          activeIssues.forEach((issue: any) => {
            recommendations.push(...issue.suggestions);
          });
          
          // Based on metrics vs budget
          if (currentMetrics) {
            if (currentMetrics.memoryUsage > budget.memoryUsage * 0.8) {
              recommendations.push('Consider implementing memory optimization strategies');
            }
            
            if (currentMetrics.domNodes > 1000) {
              recommendations.push('Reduce DOM complexity for better performance');
            }
            
            if (currentMetrics.lcp > budget.lcp * 0.8) {
              recommendations.push('Optimize loading performance');
            }
          }
          
          return [...new Set(recommendations)]; // Remove duplicates
        },
        
        // Settings
        updateSettings: (settings: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            Object.assign(state.settings, settings);
          });
        },
        
        // Data Management
        exportData: async (type: any) => {
          if (!FLAGS.performance) throw new Error('Performance features not enabled');
          
          const data = {
            metrics: type === 'metrics' ? get().metricsHistory : undefined,
            benchmarks: type === 'benchmarks' ? get().benchmarks : undefined,
            issues: type === 'issues' ? [...get().activeIssues, ...get().resolvedIssues] : undefined
          };
          
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
          });
          
          return blob;
        },
        
        importData: async (file: any) => {
          if (!FLAGS.performance) return;
          
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            set((state: any) => {
              if (data.metrics) {
                state.metricsHistory = [...state.metricsHistory, ...data.metrics];
              }
              if (data.benchmarks) {
                state.benchmarks = [...state.benchmarks, ...data.benchmarks];
              }
              if (data.issues) {
                // Separate active and resolved issues
                data.issues.forEach((issue: PerformanceIssue) => {
                  if (issue.status === 'new' || issue.status === 'investigating') {
                    state.activeIssues.push(issue);
                  } else {
                    state.resolvedIssues.push(issue);
                  }
                });
              }
            });
            
          } catch (error) {
            set((state: any) => {
              state.error = error instanceof Error ? error.message : 'Failed to import data';
            });
          }
        },
        
        // UI State
        setSelectedMetric: (metric: any) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            state.selectedMetric = metric;
          });
        },
        
        setSelectedTimeRange: (range) => {
          if (!FLAGS.performance) return;
          
          set((state: any) => {
            state.selectedTimeRange = range;
          });
        },
        
        // Initialization
        initialize: async () => {
          if (!FLAGS.performance) return;
          
          try {
            // Create default profiles
            get().createDefaultProfiles();
            
            // Set up optimization rules
            get().createDefaultOptimizationRules();
            
            // Start monitoring if enabled
            if (get().settings.enableProfiling) {
              get().startMonitoring();
            }
            
            // Set up performance observers
            get().setupPerformanceObservers();
            
          } catch (error) {
            set((state: any) => {
              state.error = error instanceof Error ? error.message : 'Initialization failed';
            });
          }
        },
        
        // Helper Methods
        createDefaultProfiles: () => {
          // High Performance Profile
          get().createProfile({
            name: 'High Performance',
            description: 'Optimized for maximum performance',
            deviceTypes: ['desktop'],
            connectionTypes: ['4g', '5g', 'wifi'],
            config: {
              chartOptimization: {
                virtualization: true,
                lazyLoading: true,
                memoryManagement: true,
                renderThrottling: true,
                dataCompression: true
              },
              dataOptimization: {
                cachingEnabled: true,
                cacheSize: 100,
                preloadStrategy: 'visible',
                compressionLevel: 'medium',
                batchSize: 1000
              },
              networkOptimization: {
                connectionPooling: true,
                requestBatching: true,
                compressionEnabled: true,
                timeoutSettings: { request: 5000, connection: 3000, idle: 60000 }
              },
              renderOptimization: {
                frameRateLimit: 60,
                adaptiveQuality: true,
                lowPowerMode: false,
                offscreenRendering: true,
                webWorkers: true
              },
              memoryManagement: {
                garbageCollection: true,
                memoryLimit: 200,
                cleanupInterval: 30,
                leakDetection: true
              }
            },
            thresholds: {
              lcp: 2000,
              fid: 50,
              cls: 0.05,
              memoryUsage: 100,
              cpuUsage: 70
            },
            isActive: true,
            isDefault: true
          });
          
          // Battery Saver Profile
          get().createProfile({
            name: 'Battery Saver',
            description: 'Optimized for mobile devices and battery life',
            deviceTypes: ['mobile', 'tablet'],
            connectionTypes: ['2g', '3g', '4g'],
            config: {
              chartOptimization: {
                virtualization: true,
                lazyLoading: true,
                memoryManagement: true,
                renderThrottling: true,
                dataCompression: true
              },
              dataOptimization: {
                cachingEnabled: true,
                cacheSize: 50,
                preloadStrategy: 'none',
                compressionLevel: 'high',
                batchSize: 500
              },
              networkOptimization: {
                connectionPooling: true,
                requestBatching: true,
                compressionEnabled: true,
                timeoutSettings: { request: 10000, connection: 5000, idle: 30000 }
              },
              renderOptimization: {
                frameRateLimit: 30,
                adaptiveQuality: true,
                lowPowerMode: true,
                offscreenRendering: false,
                webWorkers: false
              },
              memoryManagement: {
                garbageCollection: true,
                memoryLimit: 50,
                cleanupInterval: 15,
                leakDetection: false
              }
            },
            thresholds: {
              lcp: 3000,
              fid: 200,
              cls: 0.15,
              memoryUsage: 50,
              cpuUsage: 50
            },
            isActive: false,
            isDefault: false
          });
        },
        
        createDefaultOptimizationRules: () => {
          // Memory cleanup rule
          get().addOptimizationRule({
            name: 'High Memory Usage Cleanup',
            description: 'Clean up memory when usage exceeds threshold',
            condition: {
              metric: 'memoryUsage',
              operator: 'gt',
              threshold: 80,
              duration: 10
            },
            action: {
              type: 'cleanup-memory',
              parameters: { aggressive: false }
            },
            enabled: true,
            priority: 1,
            cooldown: 60,
            impact: {
              performanceGain: 15,
              userExperienceImpact: 'minimal'
            }
          });
          
          // Reduce quality on slow connections
          get().addOptimizationRule({
            name: 'Reduce Quality on Slow Connection',
            description: 'Reduce rendering quality when connection is slow',
            condition: {
              metric: 'networkLatency',
              operator: 'gt',
              threshold: 1000
            },
            action: {
              type: 'reduce-quality',
              parameters: { level: 0.7 }
            },
            enabled: true,
            priority: 2,
            cooldown: 120,
            impact: {
              performanceGain: 25,
              userExperienceImpact: 'moderate'
            }
          });
        },
        
        setupPerformanceObservers: () => {
          if (typeof window === 'undefined' || !window.PerformanceObserver) return;
          
          try {
            // Observe paint timing
            const paintObserver = new PerformanceObserver((list: any) => {
              for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                  set((state: any) => {
                    if (state.currentMetrics) {
                      state.currentMetrics.fcp = entry.startTime;
                    }
                  });
                }
              }
            });
            
            paintObserver.observe({ entryTypes: ['paint'] });
            
            // Observe long tasks
            const longTaskObserver = new PerformanceObserver((list: any) => {
              for (const entry of list.getEntries()) {
                if (entry.duration > 50) { // Long task threshold
                  get().createAlert({
                    type: 'threshold',
                    severity: 'warning',
                    title: 'Long Task Detected',
                    message: `Task took ${entry.duration.toFixed(0)}ms to complete`,
                    metric: 'taskDuration',
                    value: entry.duration,
                    threshold: 50,
                    acknowledged: false,
                    resolved: false,
                    suggestedActions: [
                      'Break up long-running tasks',
                      'Use web workers for heavy computation',
                      'Implement task scheduling'
                    ]
                  });
                }
              }
            });
            
            longTaskObserver.observe({ entryTypes: ['longtask'] });
            
          } catch (error) {
            console.warn('Performance observer setup failed:', error);
          }
        }
      }))
    ),
    {
      name: 'lokifi-performance-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            optimizationRules: [],
            activeOptimizations: [],
            alerts: [],
            unreadAlerts: 0
          };
        }
        return persistedState as PerformanceState & PerformanceActions;
      }
    }
  )
);

// Helper Functions
async function runBenchmarkOperations(config: PerformanceBenchmark['testConfig']): Promise<any> {
  const startTime = performance.now();
  let operationCount = 0;
  let errorCount = 0;
  const durations: number[] = [];
  
  for (let i = 0; i < config.operations.length; i++) {
    const operation = config.operations[i];
    const opStartTime = performance.now();
    
    try {
      // Simulate operation - in real implementation would execute actual operations
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      operationCount++;
    } catch (error) {
      errorCount++;
    }
    
    const opEndTime = performance.now();
    durations.push(opEndTime - opStartTime);
  }
  
  const endTime = performance.now();
  const totalDuration = (endTime - startTime) / 1000; // seconds
  
  durations.sort((a: any, b: any) => a - b);
  
  return {
    operationsPerSecond: operationCount / totalDuration,
    errorRate: errorCount / config.operations.length,
    peakMemoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
    p50: durations[Math.floor(durations.length * 0.5)] || 0,
    p90: durations[Math.floor(durations.length * 0.9)] || 0,
    p95: durations[Math.floor(durations.length * 0.95)] || 0,
    p99: durations[Math.floor(durations.length * 0.99)] || 0
  };
}

function executeOptimizationAction(action: OptimizationRule['action']): void {
  switch (action.type) {
    case 'cleanup-memory':
      if ((window as any).gc && action.parameters.aggressive) {
        (window as any).gc();
      }
      window.dispatchEvent(new CustomEvent('optimization:cleanup-memory', { detail: action.parameters }));
      break;
      
    case 'reduce-quality':
      window.dispatchEvent(new CustomEvent('optimization:reduce-quality', { detail: action.parameters }));
      break;
      
    case 'throttle-updates':
      window.dispatchEvent(new CustomEvent('optimization:throttle-updates', { detail: action.parameters }));
      break;
      
    case 'disable-feature':
      window.dispatchEvent(new CustomEvent('optimization:disable-feature', { detail: action.parameters }));
      break;
  }
}

function calculateAverageMetrics(metrics: PerformanceMetrics[]): Partial<PerformanceMetrics> {
  if (metrics.length === 0) return {};
  
  return {
    lcp: metrics.reduce((sum: any, m: any) => sum + m.lcp, 0) / metrics.length,
    fid: metrics.reduce((sum: any, m: any) => sum + m.fid, 0) / metrics.length,
    cls: metrics.reduce((sum: any, m: any) => sum + m.cls, 0) / metrics.length,
    memoryUsage: metrics.reduce((sum: any, m: any) => sum + m.memoryUsage, 0) / metrics.length,
    cpuUsage: metrics.reduce((sum: any, m: any) => sum + m.cpuUsage, 0) / metrics.length,
    chartRenderTime: metrics.reduce((sum: any, m: any) => sum + m.chartRenderTime, 0) / metrics.length,
    apiResponseTime: metrics.reduce((sum: any, m: any) => sum + m.apiResponseTime, 0) / metrics.length
  };
}

function calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; change: number } {
  if (values.length < 2) return { direction: 'stable', change: 0 };
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum: any, v: any) => sum + v, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum: any, v: any) => sum + v, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  return {
    direction: Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down',
    change: Math.abs(change)
  };
}

function generateInsights(metrics: PerformanceMetrics[]): string[] {
  const insights: string[] = [];
  
  if (metrics.length === 0) return insights;
  
  const avgMemory = metrics.reduce((sum: any, m: any) => sum + m.memoryUsage, 0) / metrics.length;
  const avgLcp = metrics.reduce((sum: any, m: any) => sum + m.lcp, 0) / metrics.length;
  
  if (avgMemory > 100) {
    insights.push('Memory usage is consistently high. Consider implementing memory optimization.');
  }
  
  if (avgLcp > 2500) {
    insights.push('Page load times are slow. Focus on optimizing LCP metrics.');
  }
  
  const memoryTrend = calculateTrend(metrics.map((m: any) => m.memoryUsage));
  if (memoryTrend.direction === 'up' && memoryTrend.change > 10) {
    insights.push('Memory usage is trending upward. Check for potential memory leaks.');
  }
  
  return insights;
}

// Selectors
export const useActiveProfile = () =>
  usePerformanceStore((state: any) => state.activeProfile);

export const useCurrentMetrics = () =>
  usePerformanceStore((state: any) => state.currentMetrics);

export const useActiveIssuesCount = () =>
  usePerformanceStore((state: any) => state.activeIssues.length);

export const useUnreadAlertsCount = () =>
  usePerformanceStore((state: any) => state.unreadAlerts);

export const useBudgetStatus = () =>
  usePerformanceStore((state: any) => {
    const store = usePerformanceStore.getState();
    return store.checkBudget();
  });

// Initialize store on client
if (typeof window !== 'undefined' && FLAGS.performance) {
  const store = usePerformanceStore.getState();
  store.initialize();
}

