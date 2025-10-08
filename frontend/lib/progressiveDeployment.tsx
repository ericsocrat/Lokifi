import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// H8: Progressive Deployment - Gradual rollout system for seamless upgrades
// Blue-green deployments, canary releases, feature flag gradual rollouts

// Progressive Deployment Types
export interface DeploymentStrategy {
  id: string;
  name: string;
  type: DeploymentStrategyType;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Configuration
  config: DeploymentConfig;
  
  // Targets
  environments: string[];
  services: string[];
  
  // Rollout Settings
  rolloutPlan: RolloutPlan;
  
  // Monitoring
  healthChecks: HealthCheckConfig[];
  successCriteria: SuccessCriteria[];
  rollbackTriggers: RollbackTrigger[];
  
  // Status
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  
  // Metadata
  tags: string[];
  owner: string;
}

export type DeploymentStrategyType = 
  | 'blue_green'      // Complete environment switch
  | 'canary'          // Gradual traffic increase
  | 'rolling'         // Instance-by-instance replacement
  | 'feature_flag'    // Feature flag based rollout
  | 'a_b_testing'     // A/B testing deployment
  | 'ring'            // Ring-based deployment
  | 'shadow'          // Shadow traffic deployment
  | 'custom';         // Custom deployment strategy

export interface DeploymentConfig {
  // Blue-Green Configuration
  blueGreen?: {
    switchStrategy: 'instant' | 'gradual';
    warmupTime: number; // seconds
    verificationTime: number; // seconds
    keepOldEnvironment: boolean;
    oldEnvironmentTTL?: number; // hours
  };
  
  // Canary Configuration
  canary?: {
    initialTrafficPercent: number;
    incrementStep: number;
    incrementInterval: number; // seconds
    maxTrafficPercent: number;
    observationTime: number; // seconds per step
  };
  
  // Rolling Configuration
  rolling?: {
    batchSize: number;
    batchDelay: number; // seconds
    maxUnavailable: number;
    maxSurge: number;
    readinessTimeout: number; // seconds
  };
  
  // Feature Flag Configuration
  featureFlag?: {
    flagName: string;
    initialPercent: number;
    incrementStep: number;
    incrementInterval: number; // seconds
    targetPercent: number;
    userSegments: string[];
  };
  
  // A/B Testing Configuration
  abTesting?: {
    controlPercent: number;
    treatmentPercent: number;
    duration: number; // hours
    metrics: string[];
    significanceLevel: number;
  };
  
  // Ring Configuration
  ring?: {
    rings: DeploymentRing[];
    promotionDelay: number; // hours
    autoPromotion: boolean;
    rollbackOnFailure: boolean;
  };
  
  // Shadow Configuration
  shadow?: {
    shadowPercent: number;
    duration: number; // hours
    compareMetrics: string[];
    maxDivergence: number; // percentage
  };
}

export interface DeploymentRing {
  id: string;
  name: string;
  description: string;
  userPercent: number;
  environments: string[];
  order: number;
  
  // Criteria
  promotionCriteria: RingPromotionCriteria[];
  
  // Status
  status: RingStatus;
  deployedAt?: Date;
  promotedAt?: Date;
}

export type RingStatus = 
  | 'pending'
  | 'deploying'
  | 'deployed'
  | 'promoting'
  | 'promoted'
  | 'failed'
  | 'rolled_back';

export interface RingPromotionCriteria {
  id: string;
  name: string;
  type: 'metric' | 'health_check' | 'manual_approval' | 'time_based';
  
  // Configuration
  config: PromotionCriteriaConfig;
  
  // Status
  status: 'pending' | 'passed' | 'failed';
  evaluatedAt?: Date;
}

export interface PromotionCriteriaConfig {
  // Metric criteria
  metric?: {
    name: string;
    operator: '>' | '<' | '>=' | '<=' | '=';
    threshold: number;
    timeWindow: number; // minutes
    aggregation: 'avg' | 'sum' | 'min' | 'max';
  };
  
  // Health check criteria
  healthCheck?: {
    checkId: string;
    successRate: number; // percentage
    timeWindow: number; // minutes
  };
  
  // Manual approval criteria
  approval?: {
    approvers: string[];
    requiredApprovals: number;
    timeout: number; // hours
  };
  
  // Time-based criteria
  time?: {
    minimumDuration: number; // hours
    evaluateAfter: number; // hours
  };
}

export interface RolloutPlan {
  id: string;
  name: string;
  description: string;
  
  // Phases
  phases: RolloutPhase[];
  
  // Settings
  settings: RolloutSettings;
}

export interface RolloutPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  
  // Target
  targetPercent: number;
  duration: number; // seconds
  
  // Conditions
  startConditions: PhaseCondition[];
  exitConditions: PhaseCondition[];
  
  // Actions
  preActions: PhaseAction[];
  postActions: PhaseAction[];
  
  // Status
  status: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type PhaseStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'paused';

export interface PhaseCondition {
  id: string;
  type: 'metric' | 'health_check' | 'approval' | 'time' | 'custom';
  config: Record<string, any>;
}

export interface PhaseAction {
  id: string;
  type: 'notification' | 'script' | 'service_restart' | 'health_check' | 'custom';
  config: Record<string, any>;
}

export interface RolloutSettings {
  // Automation
  autoPromote: boolean;
  autoRollback: boolean;
  pauseOnFailure: boolean;
  
  // Timing
  phaseTimeout: number; // seconds
  stabilizationTime: number; // seconds
  
  // Notifications
  notifyOnPhaseStart: boolean;
  notifyOnPhaseComplete: boolean;
  notifyOnFailure: boolean;
  notificationChannels: string[];
}

export interface HealthCheckConfig {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'custom';
  config: Record<string, any>;
  
  // Settings
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
  
  // Thresholds
  successRate: number; // percentage
  responseTime: number; // milliseconds
}

export interface SuccessCriteria {
  id: string;
  name: string;
  type: 'error_rate' | 'response_time' | 'throughput' | 'availability' | 'custom';
  
  // Thresholds
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '=';
  
  // Evaluation
  timeWindow: number; // minutes
  evaluationInterval: number; // seconds
  
  // Weight
  weight: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RollbackTrigger {
  id: string;
  name: string;
  type: 'metric_threshold' | 'error_spike' | 'manual' | 'health_failure';
  
  // Configuration
  config: Record<string, any>;
  
  // Settings
  isEnabled: boolean;
  sensitivity: number; // 0-100
  
  // Status
  lastTriggered?: Date;
  triggerCount: number;
}

export interface Deployment {
  id: string;
  name: string;
  version: string;
  strategyId: string;
  
  // Status
  status: DeploymentStatus;
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // seconds
  
  // Progress
  currentPhase: number;
  overallProgress: number; // 0-100
  trafficPercent: number;
  
  // Metrics
  metrics: DeploymentMetrics;
  
  // Phases
  phaseHistory: PhaseExecution[];
  
  // Context
  environment: string;
  services: string[];
  
  // User
  initiatedBy: string;
  approvedBy?: string;
  
  // Error handling
  error?: string;
  rollbackReason?: string;
}

export type DeploymentStatus = 
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'rolling_back'
  | 'rolled_back'
  | 'cancelled';

export interface DeploymentMetrics {
  errorRate: number;
  responseTime: number; // milliseconds
  throughput: number; // requests per second
  availability: number; // percentage
  
  // Custom metrics
  customMetrics: Record<string, number>;
  
  // Comparison with baseline
  baseline: DeploymentMetrics;
  improvement: Record<string, number>; // percentage change
}

export interface PhaseExecution {
  phaseId: string;
  startedAt: Date;
  completedAt?: Date;
  status: PhaseStatus;
  trafficPercent: number;
  metrics: DeploymentMetrics;
  error?: string;
}

export interface ProgressiveDeploymentSettings {
  // General
  enableProgressiveDeployment: boolean;
  defaultStrategy: string;
  maxConcurrentDeployments: number;
  
  // Monitoring
  metricsCollectionInterval: number; // seconds
  healthCheckInterval: number; // seconds
  alertingEnabled: boolean;
  
  // Safety
  autoRollbackEnabled: boolean;
  rollbackThreshold: number; // error rate percentage
  maxRolloutDuration: number; // hours
  
  // Notifications
  notificationsEnabled: boolean;
  notificationChannels: string[];
  
  // Traffic Management
  trafficSplittingEnabled: boolean;
  minimumHealthyInstances: number;
  
  // Feature Flags
  featureFlagIntegration: boolean;
  flagProvider: 'internal' | 'launchdarkly' | 'split' | 'custom';
  
  // Advanced
  shadowTrafficEnabled: boolean;
  canaryAnalysisEnabled: boolean;
  automaticPromotionEnabled: boolean;
}

// Store State
interface ProgressiveDeploymentState {
  // Strategies
  strategies: DeploymentStrategy[];
  selectedStrategy: string | null;
  
  // Deployments
  deployments: Deployment[];
  activeDeployment: string | null;
  
  // UI State
  sidebarCollapsed: boolean;
  selectedTab: 'strategies' | 'deployments' | 'monitoring' | 'settings';
  
  // Monitoring
  isMonitoring: boolean;
  lastMetricsUpdate: Date | null;
  
  // Settings
  settings: ProgressiveDeploymentSettings;
  
  // Status
  error: string | null;
  isLoading: boolean;
}

// Store Actions
interface ProgressiveDeploymentActions {
  // Strategy Management
  createStrategy: (strategy: Omit<DeploymentStrategy, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => string;
  updateStrategy: (strategyId: string, updates: Partial<DeploymentStrategy>) => void;
  deleteStrategy: (strategyId: string) => void;
  cloneStrategy: (strategyId: string, name: string) => string;
  setSelectedStrategy: (strategyId: string | null) => void;
  
  // Deployment Management
  createDeployment: (deployment: Omit<Deployment, 'id' | 'createdAt' | 'status' | 'phaseHistory' | 'metrics'>) => string;
  startDeployment: (deploymentId: string) => Promise<void>;
  pauseDeployment: (deploymentId: string) => void;
  resumeDeployment: (deploymentId: string) => void;
  cancelDeployment: (deploymentId: string) => void;
  rollbackDeployment: (deploymentId: string, reason?: string) => Promise<void>;
  
  // Phase Management
  promotePhase: (deploymentId: string) => Promise<void>;
  skipPhase: (deploymentId: string, phaseId: string) => void;
  
  // Traffic Management
  adjustTraffic: (deploymentId: string, percent: number) => void;
  
  // Monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
  updateMetrics: (deploymentId: string, metrics: DeploymentMetrics) => void;
  
  // Health Checks
  runHealthCheck: (deploymentId: string, checkId: string) => Promise<boolean>;
  
  // Analysis
  compareDeployments: (deploymentId1: string, deploymentId2: string) => any;
  generateReport: (deploymentId: string) => Promise<Blob>;
  
  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedTab: (tab: ProgressiveDeploymentState['selectedTab']) => void;
  setActiveDeployment: (deploymentId: string | null) => void;
  
  // Settings
  updateSettings: (settings: Partial<ProgressiveDeploymentSettings>) => void;
  
  // Data Management
  exportStrategy: (strategyId: string) => Promise<Blob>;
  importStrategy: (file: File) => Promise<string>;
  
  // Initialization
  initialize: () => Promise<void>;
  createDefaultStrategies: () => void;
  executeDeploymentPhases: (deploymentId: string) => Promise<void>;
}

// Initial State
const createInitialState = (): ProgressiveDeploymentState => ({
  strategies: [],
  selectedStrategy: null,
  deployments: [],
  activeDeployment: null,
  sidebarCollapsed: false,
  selectedTab: 'strategies',
  isMonitoring: false,
  lastMetricsUpdate: null,
  settings: {
    enableProgressiveDeployment: true,
    defaultStrategy: '',
    maxConcurrentDeployments: 3,
    metricsCollectionInterval: 30,
    healthCheckInterval: 60,
    alertingEnabled: true,
    autoRollbackEnabled: true,
    rollbackThreshold: 5.0,
    maxRolloutDuration: 24,
    notificationsEnabled: true,
    notificationChannels: ['slack', 'email'],
    trafficSplittingEnabled: true,
    minimumHealthyInstances: 1,
    featureFlagIntegration: true,
    flagProvider: 'internal',
    shadowTrafficEnabled: false,
    canaryAnalysisEnabled: true,
    automaticPromotionEnabled: false
  },
  error: null,
  isLoading: false
});

// Create Store
export const useProgressiveDeploymentStore = create<ProgressiveDeploymentState & ProgressiveDeploymentActions>()(
  persist(
    immer<any>((set: any, get: any) => ({
      ...createInitialState(),

      // Strategy Management
      createStrategy: (strategyData: any) => {
        if (!FLAGS.progressiveDeployment) return '';
        
        const id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const strategy: DeploymentStrategy = {
          ...strategyData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0
        };
        
        set((state: any) => {
          state.strategies.push(strategy);
        });
        
        return id;
      },

      updateStrategy: (strategyId: any, updates: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const strategy = state.strategies.find((s: any) => s.id === strategyId);
          if (strategy) {
            Object.assign(strategy, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deleteStrategy: (strategyId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.strategies = state.strategies.filter((s: any) => s.id !== strategyId);
          if (state.selectedStrategy === strategyId) {
            state.selectedStrategy = null;
          }
        });
      },

      cloneStrategy: (strategyId: any, name: any) => {
        if (!FLAGS.progressiveDeployment) return '';
        
        const strategy = get().strategies.find((s: any) => s.id === strategyId);
        if (!strategy) return '';
        
        return get().createStrategy({
          ...strategy,
          name,
          isActive: false
        });
      },

      setSelectedStrategy: (strategyId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.selectedStrategy = strategyId;
        });
      },

      // Deployment Management
      createDeployment: (deploymentData: any) => {
        if (!FLAGS.progressiveDeployment) return '';
        
        const id = `deployment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const deployment: Deployment = {
          ...deploymentData,
          id,
          createdAt: new Date(),
          status: 'pending',
          currentPhase: 0,
          overallProgress: 0,
          trafficPercent: 0,
          phaseHistory: [],
          metrics: {
            errorRate: 0,
            responseTime: 0,
            throughput: 0,
            availability: 100,
            customMetrics: {},
            baseline: {
              errorRate: 0,
              responseTime: 0,
              throughput: 0,
              availability: 100,
              customMetrics: {},
              baseline: {} as any,
              improvement: {}
            },
            improvement: {}
          }
        };
        
        set((state: any) => {
          state.deployments.push(deployment);
        });
        
        return id;
      },

      startDeployment: async (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        const deployment = get().deployments.find((d: any) => d.id === deploymentId);
        if (!deployment) return;
        
        const strategy = get().strategies.find((s: any) => s.id === deployment.strategyId);
        if (!strategy) return;
        
        set((state: any) => {
          const d = state.deployments.find((d: any) => d.id === deploymentId);
          if (d) {
            d.status = 'running';
            d.startedAt = new Date();
            d.currentPhase = 0;
          }
          
          // Update strategy usage
          const s = state.strategies.find((s: any) => s.id === deployment.strategyId);
          if (s) {
            s.usageCount += 1;
            s.lastUsed = new Date();
          }
        });
        
        // Start monitoring
        get().startMonitoring();
        
        try {
          // Simulate deployment phases based on strategy
          await get().executeDeploymentPhases(deploymentId);
          
        } catch (error) {
          set((state: any) => {
            const d = state.deployments.find((d: any) => d.id === deploymentId);
            if (d) {
              d.status = 'failed';
              d.error = error instanceof Error ? error.message : 'Deployment failed';
              d.completedAt = new Date();
              if (d.startedAt) {
                d.duration = (d.completedAt.getTime() - d.startedAt.getTime()) / 1000;
              }
            }
          });
          throw error;
        }
      },

      executeDeploymentPhases: async (deploymentId: string) => {
        const deployment = get().deployments.find((d: any) => d.id === deploymentId);
        if (!deployment) return;
        
        const strategy = get().strategies.find((s: any) => s.id === deployment.strategyId);
        if (!strategy) return;
        
        const phases = strategy.rolloutPlan.phases.sort((a: any, b: any) => a.order - b.order);
        
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          
          // Check if deployment was cancelled or rolled back
          const currentDeployment = get().deployments.find((d: any) => d.id === deploymentId);
          if (!currentDeployment || ['cancelled', 'rolling_back', 'rolled_back'].includes(currentDeployment.status)) {
            break;
          }
          
          // Start phase
          const phaseExecution: PhaseExecution = {
            phaseId: phase.id,
            startedAt: new Date(),
            status: 'running',
            trafficPercent: phase.targetPercent,
            metrics: {
              errorRate: Math.random() * 2,
              responseTime: 100 + Math.random() * 50,
              throughput: 1000 + Math.random() * 500,
              availability: 99 + Math.random(),
              customMetrics: {},
              baseline: {} as any,
              improvement: {}
            }
          };
          
          set((state: any) => {
            const d = state.deployments.find((d: any) => d.id === deploymentId);
            if (d) {
              d.currentPhase = i;
              d.trafficPercent = phase.targetPercent;
              d.overallProgress = ((i + 1) / phases.length) * 100;
              d.phaseHistory.push(phaseExecution);
            }
          });
          
          // Simulate phase execution
          await new Promise(resolve => setTimeout(resolve, Math.min(phase.duration * 1000, 5000)));
          
          // Complete phase
          set((state: any) => {
            const d = state.deployments.find((d: any) => d.id === deploymentId);
            if (d) {
              const execution = d.phaseHistory[d.phaseHistory.length - 1];
              execution.completedAt = new Date();
              execution.status = Math.random() > 0.1 ? 'completed' : 'failed';
              
              if (execution.status === 'failed' && strategy.rolloutPlan.settings.autoRollback) {
                d.status = 'rolling_back';
                return;
              }
            }
          });
        }
        
        // Complete deployment
        set((state: any) => {
          const d = state.deployments.find((d: any) => d.id === deploymentId);
          if (d && d.status === 'running') {
            d.status = 'completed';
            d.completedAt = new Date();
            d.overallProgress = 100;
            d.trafficPercent = 100;
            if (d.startedAt) {
              d.duration = (d.completedAt.getTime() - d.startedAt.getTime()) / 1000;
            }
          }
        });
      },

      pauseDeployment: (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment && deployment.status === 'running') {
            deployment.status = 'paused';
          }
        });
      },

      resumeDeployment: (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment && deployment.status === 'paused') {
            deployment.status = 'running';
          }
        });
        
        // Continue execution
        get().executeDeploymentPhases(deploymentId);
      },

      cancelDeployment: (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            deployment.status = 'cancelled';
            deployment.completedAt = new Date();
            if (deployment.startedAt) {
              deployment.duration = (deployment.completedAt.getTime() - deployment.startedAt.getTime()) / 1000;
            }
          }
        });
      },

      rollbackDeployment: async (deploymentId, reason = 'Manual rollback') => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            deployment.status = 'rolling_back';
            deployment.rollbackReason = reason;
          }
        });
        
        // Simulate rollback
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            deployment.status = 'rolled_back';
            deployment.trafficPercent = 0;
            deployment.completedAt = new Date();
            if (deployment.startedAt) {
              deployment.duration = (deployment.completedAt.getTime() - deployment.startedAt.getTime()) / 1000;
            }
          }
        });
      },

      promotePhase: async (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        const deployment = get().deployments.find((d: any) => d.id === deploymentId);
        if (!deployment || deployment.status !== 'paused') return;
        
        // Resume and advance to next phase
        get().resumeDeployment(deploymentId);
      },

      skipPhase: (deploymentId: any, phaseId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            const execution = deployment.phaseHistory.find(e => e.phaseId === phaseId);
            if (execution) {
              execution.status = 'skipped';
              execution.completedAt = new Date();
            }
          }
        });
      },

      adjustTraffic: (deploymentId: any, percent: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            deployment.trafficPercent = Math.max(0, Math.min(100, percent));
          }
        });
      },

      // Monitoring
      startMonitoring: () => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.isMonitoring = true;
        });
        
        // In a real implementation, this would start actual monitoring
      },

      stopMonitoring: () => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.isMonitoring = false;
        });
      },

      updateMetrics: (deploymentId, metrics) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          const deployment = state.deployments.find((d: any) => d.id === deploymentId);
          if (deployment) {
            deployment.metrics = metrics;
            state.lastMetricsUpdate = new Date();
          }
        });
      },

      runHealthCheck: async (deploymentId: any, checkId: any) => {
        if (!FLAGS.progressiveDeployment) return false;
        
        // Simulate health check
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
        
        const success = Math.random() > 0.2; // 80% success rate
        
        return success;
      },

      compareDeployments: (deploymentId1: any, deploymentId2: any) => {
        if (!FLAGS.progressiveDeployment) return null;
        
        const dep1 = get().deployments.find((d: any) => d.id === deploymentId1);
        const dep2 = get().deployments.find((d: any) => d.id === deploymentId2);
        
        if (!dep1 || !dep2) return null;
        
        return {
          errorRate: {
            deployment1: dep1.metrics.errorRate,
            deployment2: dep2.metrics.errorRate,
            difference: dep2.metrics.errorRate - dep1.metrics.errorRate
          },
          responseTime: {
            deployment1: dep1.metrics.responseTime,
            deployment2: dep2.metrics.responseTime,
            difference: dep2.metrics.responseTime - dep1.metrics.responseTime
          },
          throughput: {
            deployment1: dep1.metrics.throughput,
            deployment2: dep2.metrics.throughput,
            difference: dep2.metrics.throughput - dep1.metrics.throughput
          }
        };
      },

      generateReport: async (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) throw new Error('Progressive deployment not enabled');
        
        const deployment = get().deployments.find((d: any) => d.id === deploymentId);
        if (!deployment) throw new Error('Deployment not found');
        
        const report = {
          deployment,
          strategy: get().strategies.find((s: any) => s.id === deployment.strategyId),
          generatedAt: new Date().toISOString(),
          summary: {
            duration: deployment.duration,
            phases: deployment.phaseHistory.length,
            successRate: deployment.phaseHistory.filter((p: any) => p.status === 'completed').length / deployment.phaseHistory.length * 100,
            finalTrafficPercent: deployment.trafficPercent
          }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json'
        });
        
        return blob;
      },

      // UI Actions
      setSidebarCollapsed: (collapsed: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.sidebarCollapsed = collapsed;
        });
      },

      setSelectedTab: (tab: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.selectedTab = tab;
        });
      },

      setActiveDeployment: (deploymentId: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          state.activeDeployment = deploymentId;
        });
      },

      // Settings
      updateSettings: (settings: any) => {
        if (!FLAGS.progressiveDeployment) return;
        
        set((state: any) => {
          Object.assign(state.settings, settings);
        });
      },

      // Data Management
      exportStrategy: async (strategyId: any) => {
        if (!FLAGS.progressiveDeployment) throw new Error('Progressive deployment not enabled');
        
        const strategy = get().strategies.find((s: any) => s.id === strategyId);
        if (!strategy) throw new Error('Strategy not found');
        
        const exportData = {
          strategy,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        
        return blob;
      },

      importStrategy: async (file: any) => {
        if (!FLAGS.progressiveDeployment) throw new Error('Progressive deployment not enabled');
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        return get().createStrategy(data.strategy);
      },

      // Initialization
      initialize: async () => {
        if (!FLAGS.progressiveDeployment) return;
        
        try {
          // Create default strategies if none exist
          if (get().strategies.length === 0) {
            get().createDefaultStrategies();
          }
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Initialization failed';
          });
        }
      },

      createDefaultStrategies: () => {
        // Blue-Green Strategy
        const blueGreenId = get().createStrategy({
          name: 'Blue-Green Deployment',
          type: 'blue_green',
          description: 'Complete environment switch with instant cutover',
          config: {
            blueGreen: {
              switchStrategy: 'instant',
              warmupTime: 300,
              verificationTime: 600,
              keepOldEnvironment: true,
              oldEnvironmentTTL: 24
            }
          },
          environments: ['staging', 'production'],
          services: ['api', 'web', 'worker'],
          rolloutPlan: {
            id: 'bg-plan-1',
            name: 'Blue-Green Rollout',
            description: 'Complete environment switch',
            phases: [
              {
                id: 'bg-phase-1',
                name: 'Deploy to Green',
                description: 'Deploy new version to green environment',
                order: 1,
                targetPercent: 0,
                duration: 600,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              },
              {
                id: 'bg-phase-2',
                name: 'Switch Traffic',
                description: 'Switch all traffic to green environment',
                order: 2,
                targetPercent: 100,
                duration: 60,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              }
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
              notificationChannels: ['slack', 'email']
            }
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
              responseTime: 1000
            }
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
              severity: 'high'
            },
            {
              id: 'response-time',
              name: 'Response Time',
              type: 'response_time',
              threshold: 500,
              operator: '<',
              timeWindow: 10,
              evaluationInterval: 30,
              weight: 30,
              severity: 'medium'
            }
          ],
          rollbackTriggers: [
            {
              id: 'error-spike',
              name: 'Error Rate Spike',
              type: 'error_spike',
              config: { threshold: 5.0, timeWindow: 5 },
              isEnabled: true,
              sensitivity: 80,
              triggerCount: 0
            }
          ],
          isActive: true,
          tags: ['production', 'safe'],
          owner: 'devops-team'
        });
        
        // Canary Strategy
        get().createStrategy({
          name: 'Canary Deployment',
          type: 'canary',
          description: 'Gradual traffic increase with monitoring',
          config: {
            canary: {
              initialTrafficPercent: 5,
              incrementStep: 25,
              incrementInterval: 300,
              maxTrafficPercent: 100,
              observationTime: 180
            }
          },
          environments: ['production'],
          services: ['api', 'web'],
          rolloutPlan: {
            id: 'canary-plan-1',
            name: 'Canary Rollout',
            description: 'Gradual traffic increase',
            phases: [
              {
                id: 'canary-phase-1',
                name: '5% Traffic',
                description: 'Route 5% of traffic to new version',
                order: 1,
                targetPercent: 5,
                duration: 300,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              },
              {
                id: 'canary-phase-2',
                name: '25% Traffic',
                description: 'Route 25% of traffic to new version',
                order: 2,
                targetPercent: 25,
                duration: 300,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              },
              {
                id: 'canary-phase-3',
                name: '50% Traffic',
                description: 'Route 50% of traffic to new version',
                order: 3,
                targetPercent: 50,
                duration: 300,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              },
              {
                id: 'canary-phase-4',
                name: '100% Traffic',
                description: 'Route all traffic to new version',
                order: 4,
                targetPercent: 100,
                duration: 300,
                startConditions: [],
                exitConditions: [],
                preActions: [],
                postActions: [],
                status: 'pending'
              }
            ],
            settings: {
              autoPromote: true,
              autoRollback: true,
              pauseOnFailure: true,
              phaseTimeout: 900,
              stabilizationTime: 180,
              notifyOnPhaseStart: true,
              notifyOnPhaseComplete: false,
              notifyOnFailure: true,
              notificationChannels: ['slack']
            }
          },
          healthChecks: [
            {
              id: 'canary-health',
              name: 'Canary Health Check',
              type: 'http',
              config: { url: '/health', expectedStatus: 200 },
              interval: 15,
              timeout: 5,
              retries: 2,
              successRate: 98,
              responseTime: 300
            }
          ],
          successCriteria: [
            {
              id: 'canary-error-rate',
              name: 'Canary Error Rate',
              type: 'error_rate',
              threshold: 0.5,
              operator: '<',
              timeWindow: 5,
              evaluationInterval: 15,
              weight: 50,
              severity: 'critical'
            }
          ],
          rollbackTriggers: [
            {
              id: 'canary-failure',
              name: 'Canary Failure',
              type: 'metric_threshold',
              config: { metric: 'error_rate', threshold: 2.0 },
              isEnabled: true,
              sensitivity: 90,
              triggerCount: 0
            }
          ],
          isActive: true,
          tags: ['production', 'gradual'],
          owner: 'devops-team'
        });
        
        // Set default strategy
        set((state: any) => {
          if (!state.settings.defaultStrategy && state.strategies.length > 0) {
            state.settings.defaultStrategy = blueGreenId;
          }
        });
      }
    })),
    {
      name: 'lokifi-progressive-deployment-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            deployments: [],
            activeDeployment: null
          };
        }
        return persistedState as ProgressiveDeploymentState & ProgressiveDeploymentActions;
      }
    }
  )
);

// Auto-initialize when enabled
if (typeof window !== 'undefined' && FLAGS.progressiveDeployment) {
  useProgressiveDeploymentStore.getState().initialize();
}

