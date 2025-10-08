import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// H7: Rollback System - Automated rollback capabilities for seamless upgrades
// Version management, automated rollback triggers, recovery procedures

// Rollback Types
export interface RollbackSnapshot {
  id: string;
  name: string;
  version: string;
  createdAt: Date;
  
  // Snapshot Data
  applicationState: ApplicationStateSnapshot;
  databaseState: DatabaseStateSnapshot;
  configurationState: ConfigurationSnapshot;
  
  // Metadata
  tags: string[];
  description?: string;
  createdBy: string;
  
  // Status
  status: 'active' | 'archived' | 'corrupted';
  size: number; // bytes
  
  // Validation
  checksum: string;
  isVerified: boolean;
  lastVerified?: Date;
}

export interface ApplicationStateSnapshot {
  // Frontend State
  userPreferences: Record<string, any>;
  sessionData: Record<string, any>;
  cachedData: Record<string, any>;
  
  // Feature Flags
  featureFlags: Record<string, boolean>;
  
  // UI State
  dashboardLayouts: Record<string, any>;
  chartConfigurations: Record<string, any>;
  
  // Custom Settings
  customSettings: Record<string, any>;
}

export interface DatabaseStateSnapshot {
  // Schema Information
  schemaVersion: string;
  tables: TableSnapshot[];
  
  // Data Statistics
  recordCounts: Record<string, number>;
  dataSize: number;
  
  // Backup Information
  backupPath?: string;
  backupFormat: 'sql' | 'json' | 'binary';
  isCompressed: boolean;
}

export interface TableSnapshot {
  name: string;
  schema: string;
  recordCount: number;
  lastModified: Date;
  checksum: string;
}

export interface ConfigurationSnapshot {
  // Environment Variables
  environment: Record<string, string>;
  
  // Application Config
  appConfig: Record<string, any>;
  
  // External Services
  serviceConfigs: Record<string, any>;
  
  // Security Settings
  securityConfig: Record<string, any>;
}

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Plan Configuration
  targetSnapshot: string;
  rollbackSteps: RollbackStep[];
  
  // Conditions
  triggers: RollbackTrigger[];
  prerequisites: RollbackPrerequisite[];
  
  // Settings
  settings: RollbackPlanSettings;
  
  // Status
  isEnabled: boolean;
  lastExecuted?: Date;
  executionHistory: RollbackExecution[];
}

export interface RollbackStep {
  id: string;
  name: string;
  type: RollbackStepType;
  
  // Configuration
  config: RollbackStepConfig;
  
  // Execution
  order: number;
  isRequired: boolean;
  timeout: number; // seconds
  
  // Rollback
  canRollback: boolean;
  rollbackConfig?: RollbackStepConfig;
  
  // Dependencies
  dependsOn: string[];
  
  // Validation
  preValidation?: ValidationRule[];
  postValidation?: ValidationRule[];
}

export type RollbackStepType = 
  | 'database_restore'
  | 'file_restore'
  | 'config_restore'
  | 'service_restart'
  | 'cache_clear'
  | 'feature_flag_revert'
  | 'custom_script'
  | 'notification'
  | 'health_check'
  | 'validation';

export interface RollbackStepConfig {
  // Database restore
  database?: {
    connectionString: string;
    backupPath: string;
    schema?: string;
    tables?: string[];
    skipData?: boolean;
  };
  
  // File restore
  fileRestore?: {
    sourcePath: string;
    targetPath: string;
    backupPath: string;
    preservePermissions?: boolean;
    excludePatterns?: string[];
  };
  
  // Config restore
  configRestore?: {
    configFile: string;
    backupConfig: Record<string, any>;
    mergeStrategy?: 'replace' | 'merge' | 'selective';
    restoreKeys?: string[];
  };
  
  // Service restart
  serviceRestart?: {
    services: string[];
    restartMode: 'sequential' | 'parallel';
    waitTime?: number;
    healthCheck?: string;
  };
  
  // Cache clear
  cacheClear?: {
    cacheTypes: string[];
    pattern?: string;
    preserveKeys?: string[];
  };
  
  // Feature flag revert
  featureFlagRevert?: {
    flags: Record<string, boolean>;
    rollbackMode: 'immediate' | 'gradual';
    rolloutPercentage?: number;
  };
  
  // Custom script
  customScript?: {
    script: string;
    interpreter: 'bash' | 'powershell' | 'node' | 'python';
    arguments?: string[];
    environment?: Record<string, string>;
    workingDirectory?: string;
  };
  
  // Notification
  notification?: {
    recipients: string[];
    message: string;
    channels: ('email' | 'slack' | 'webhook')[];
    template?: string;
  };
  
  // Health check
  healthCheck?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'HEAD';
    expectedStatus: number;
    expectedResponse?: string;
    timeout?: number;
  };
  
  // Validation
  validation?: {
    rules: ValidationRule[];
    failureMode: 'abort' | 'warn' | 'continue';
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationType;
  config: ValidationConfig;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export type ValidationType = 
  | 'database_integrity'
  | 'file_existence'
  | 'service_health'
  | 'api_response'
  | 'custom_check';

export interface ValidationConfig {
  // Database integrity
  database?: {
    query: string;
    expectedResult?: any;
    connectionString?: string;
  };
  
  // File existence
  file?: {
    path: string;
    shouldExist: boolean;
    minSize?: number;
    maxAge?: number; // hours
  };
  
  // Service health
  service?: {
    name: string;
    expectedStatus: 'running' | 'stopped';
    port?: number;
  };
  
  // API response
  api?: {
    url: string;
    method: 'GET' | 'POST' | 'HEAD';
    headers?: Record<string, string>;
    expectedStatus: number;
    expectedBody?: string;
    timeout?: number;
  };
  
  // Custom check
  custom?: {
    script: string;
    interpreter: 'bash' | 'powershell' | 'node' | 'python';
    arguments?: string[];
    expectedExitCode?: number;
  };
}

export interface RollbackTrigger {
  id: string;
  name: string;
  type: RollbackTriggerType;
  
  // Configuration
  config: RollbackTriggerConfig;
  
  // Status
  isEnabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  
  // Settings
  cooldown: number; // seconds
  maxTriggers?: number;
}

export type RollbackTriggerType = 
  | 'error_rate_threshold'
  | 'response_time_threshold'
  | 'health_check_failure'
  | 'manual_trigger'
  | 'scheduled'
  | 'dependency_failure'
  | 'custom_metric';

export interface RollbackTriggerConfig {
  // Error rate threshold
  errorRate?: {
    threshold: number; // percentage
    timeWindow: number; // minutes
    errorTypes?: string[];
    endpoint?: string;
  };
  
  // Response time threshold
  responseTime?: {
    threshold: number; // milliseconds
    timeWindow: number; // minutes
    percentile: 50 | 90 | 95 | 99;
    endpoint?: string;
  };
  
  // Health check failure
  healthCheck?: {
    healthCheckId: string;
    consecutiveFailures: number;
    timeWindow?: number; // minutes
  };
  
  // Manual trigger
  manual?: {
    requireConfirmation: boolean;
    requiredRole?: string;
    reason?: string;
  };
  
  // Scheduled
  scheduled?: {
    cron: string;
    timezone?: string;
    conditions?: Record<string, any>;
  };
  
  // Dependency failure
  dependency?: {
    service: string;
    failureType: 'unreachable' | 'error' | 'timeout' | 'unavailable';
    retryCount?: number;
  };
  
  // Custom metric
  customMetric?: {
    metricName: string;
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    threshold: number;
    timeWindow?: number; // minutes
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  };
}

export interface RollbackPrerequisite {
  id: string;
  name: string;
  type: PrerequisiteType;
  config: PrerequisiteConfig;
  isRequired: boolean;
}

export type PrerequisiteType = 
  | 'backup_available'
  | 'service_status'
  | 'resource_availability'
  | 'approval_required'
  | 'maintenance_window';

export interface PrerequisiteConfig {
  // Backup available
  backup?: {
    snapshotId: string;
    maxAge: number; // hours
    verificationRequired: boolean;
  };
  
  // Service status
  service?: {
    name: string;
    requiredStatus: 'running' | 'stopped' | 'idle';
  };
  
  // Resource availability
  resource?: {
    type: 'cpu' | 'memory' | 'disk' | 'network';
    threshold: number; // percentage available
    duration?: number; // minutes
  };
  
  // Approval required
  approval?: {
    approvers: string[];
    requiredApprovals: number;
    timeout?: number; // hours
  };
  
  // Maintenance window
  maintenanceWindow?: {
    start: string; // HH:MM
    end: string;   // HH:MM
    timezone?: string;
    weekdays?: number[]; // 0=Sunday
  };
}

export interface RollbackPlanSettings {
  // Execution
  autoExecute: boolean;
  executionTimeout: number; // seconds
  parallelSteps: boolean;
  
  // Validation
  validateBeforeRollback: boolean;
  validateAfterRollback: boolean;
  stopOnValidationFailure: boolean;
  
  // Notifications
  notifyOnStart: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notificationChannels: string[];
  
  // Recovery
  createRecoverySnapshot: boolean;
  allowNestedRollbacks: boolean;
  maxRollbackDepth: number;
}

export interface RollbackExecution {
  id: string;
  planId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  
  // Status
  status: RollbackExecutionStatus;
  
  // Results
  stepsExecuted: RollbackStepResult[];
  errorMessage?: string;
  
  // Context
  triggeredBy: string;
  triggerType: 'manual' | 'automatic';
  triggerReason?: string;
  
  // Metadata
  environment: string;
  version: string;
  executionContext: Record<string, any>;
}

export type RollbackExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled_back';

export interface RollbackStepResult {
  stepId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  errorMessage?: string;
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  ruleId: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  details?: Record<string, any>;
  duration?: number; // milliseconds
}

export interface RollbackSettings {
  // General
  enableAutoRollback: boolean;
  defaultTimeout: number; // seconds
  maxConcurrentRollbacks: number;
  
  // Snapshots
  autoCreateSnapshots: boolean;
  snapshotRetentionDays: number;
  maxSnapshotsPerVersion: number;
  snapshotCompressionEnabled: boolean;
  
  // Validation
  enablePreValidation: boolean;
  enablePostValidation: boolean;
  validationTimeout: number; // seconds
  
  // Notifications
  enableNotifications: boolean;
  defaultNotificationChannels: string[];
  notificationCooldown: number; // seconds
  
  // Security
  requireApprovalForCritical: boolean;
  allowedRoles: string[];
  auditAllActions: boolean;
  
  // Performance
  enableProgressTracking: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Recovery
  enableRecoveryMode: boolean;
  maxRecoveryAttempts: number;
  recoveryDelay: number; // seconds
}

// Store State
interface RollbackState {
  // Snapshots
  snapshots: RollbackSnapshot[];
  selectedSnapshot: string | null;
  
  // Plans
  plans: RollbackPlan[];
  activePlan: string | null;
  
  // Executions
  executions: RollbackExecution[];
  currentExecution: string | null;
  
  // UI State
  sidebarCollapsed: boolean;
  selectedTab: 'snapshots' | 'plans' | 'executions' | 'settings';
  
  // Settings
  settings: RollbackSettings;
  
  // Status
  isExecuting: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Store Actions
interface RollbackActions {
  // Snapshot Management
  createSnapshot: (snapshot: Omit<RollbackSnapshot, 'id' | 'createdAt' | 'checksum' | 'isVerified'>) => Promise<string>;
  deleteSnapshot: (snapshotId: string) => void;
  verifySnapshot: (snapshotId: string) => Promise<boolean>;
  setSelectedSnapshot: (snapshotId: string | null) => void;
  
  // Plan Management
  createPlan: (plan: Omit<RollbackPlan, 'id' | 'createdAt' | 'updatedAt' | 'executionHistory'>) => string;
  updatePlan: (planId: string, updates: Partial<RollbackPlan>) => void;
  deletePlan: (planId: string) => void;
  clonePlan: (planId: string, name: string) => string;
  setActivePlan: (planId: string | null) => void;
  
  // Plan Configuration
  addStep: (planId: string, step: Omit<RollbackStep, 'id'>) => string;
  updateStep: (planId: string, stepId: string, updates: Partial<RollbackStep>) => void;
  removeStep: (planId: string, stepId: string) => void;
  reorderSteps: (planId: string, stepIds: string[]) => void;
  
  // Trigger Management
  addTrigger: (planId: string, trigger: Omit<RollbackTrigger, 'id' | 'triggerCount' | 'lastTriggered'>) => string;
  updateTrigger: (planId: string, triggerId: string, updates: Partial<RollbackTrigger>) => void;
  removeTrigger: (planId: string, triggerId: string) => void;
  
  // Execution
  executeRollback: (planId: string, reason?: string) => Promise<string>;
  cancelExecution: (executionId: string) => void;
  pauseExecution: (executionId: string) => void;
  resumeExecution: (executionId: string) => void;
  
  // Validation
  validatePlan: (planId: string) => Promise<ValidationResult[]>;
  validateSnapshot: (snapshotId: string) => Promise<ValidationResult[]>;
  
  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedTab: (tab: RollbackState['selectedTab']) => void;
  
  // Settings
  updateSettings: (settings: Partial<RollbackSettings>) => void;
  
  // Data Management
  exportPlan: (planId: string) => Promise<Blob>;
  importPlan: (file: File) => Promise<string>;
  exportSnapshot: (snapshotId: string) => Promise<Blob>;
  
  // System
  sync: () => Promise<void>;
  
  // Initialization
  initialize: () => Promise<void>;
  createSampleData: () => Promise<void>;
}

// Initial State
const createInitialState = (): RollbackState => ({
  snapshots: [],
  selectedSnapshot: null,
  plans: [],
  activePlan: null,
  executions: [],
  currentExecution: null,
  sidebarCollapsed: false,
  selectedTab: 'snapshots',
  settings: {
    enableAutoRollback: true,
    defaultTimeout: 3600, // 1 hour
    maxConcurrentRollbacks: 3,
    autoCreateSnapshots: true,
    snapshotRetentionDays: 30,
    maxSnapshotsPerVersion: 5,
    snapshotCompressionEnabled: true,
    enablePreValidation: true,
    enablePostValidation: true,
    validationTimeout: 300, // 5 minutes
    enableNotifications: true,
    defaultNotificationChannels: ['email', 'slack'],
    notificationCooldown: 300, // 5 minutes
    requireApprovalForCritical: true,
    allowedRoles: ['admin', 'devops'],
    auditAllActions: true,
    enableProgressTracking: true,
    logLevel: 'info',
    enableRecoveryMode: true,
    maxRecoveryAttempts: 3,
    recoveryDelay: 30 // seconds
  },
  isExecuting: false,
  error: null,
  lastSync: null
});

// Create Store
export const useRollbackStore = create<RollbackState & RollbackActions>()(
  persist(
    immer<any>((set: any, get: any) => ({
      ...createInitialState(),

      // Snapshot Management
      createSnapshot: async (snapshotData: any) => {
        if (!FLAGS.rollback) throw new Error('Rollback not enabled');
        
        const id = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulate snapshot creation
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        // Generate checksum
        const checksum = generateChecksum(snapshotData);
        
        const snapshot: RollbackSnapshot = {
          ...snapshotData,
          id,
          createdAt: new Date(),
          checksum,
          isVerified: true,
          size: Math.floor(Math.random() * 1000000000) // Random size
        };
        
        set((state: any) => {
          state.snapshots.push(snapshot);
          
          // Auto-cleanup old snapshots
          if (state.settings.maxSnapshotsPerVersion > 0) {
            const versionSnapshots = state.snapshots.filter((s: any) => s.version === snapshot.version);
            if (versionSnapshots.length > state.settings.maxSnapshotsPerVersion) {
              // Remove oldest snapshots
              const toRemove = versionSnapshots
                .sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
                .slice(0, versionSnapshots.length - state.settings.maxSnapshotsPerVersion);
              
              state.snapshots = state.snapshots.filter((s: any) => !toRemove.includes(s));
            }
          }
        });
        
        return id;
      },

      deleteSnapshot: (snapshotId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.snapshots = state.snapshots.filter((s: any) => s.id !== snapshotId);
          if (state.selectedSnapshot === snapshotId) {
            state.selectedSnapshot = null;
          }
        });
      },

      verifySnapshot: async (snapshotId: any) => {
        if (!FLAGS.rollback) return false;
        
        const snapshot = get().snapshots.find((s: any) => s.id === snapshotId);
        if (!snapshot) return false;
        
        try {
          // Simulate verification
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
          const isValid = Math.random() > 0.1; // 90% success rate
          
          set((state: any) => {
            const s = state.snapshots.find((s: any) => s.id === snapshotId);
            if (s) {
              s.isVerified = isValid;
              s.lastVerified = new Date();
              if (!isValid) {
                s.status = 'corrupted';
              }
            }
          });
          
          return isValid;
        } catch (error) {
          set((state: any) => {
            const s = state.snapshots.find((s: any) => s.id === snapshotId);
            if (s) {
              s.isVerified = false;
              s.status = 'corrupted';
              s.lastVerified = new Date();
            }
          });
          return false;
        }
      },

      setSelectedSnapshot: (snapshotId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.selectedSnapshot = snapshotId;
        });
      },

      // Plan Management
      createPlan: (planData: any) => {
        if (!FLAGS.rollback) return '';
        
        const id = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const plan: RollbackPlan = {
          ...planData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          executionHistory: []
        };
        
        set((state: any) => {
          state.plans.push(plan);
        });
        
        return id;
      },

      updatePlan: (planId: any, updates: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            Object.assign(plan, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deletePlan: (planId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.plans = state.plans.filter(p => p.id !== planId);
          if (state.activePlan === planId) {
            state.activePlan = null;
          }
        });
      },

      clonePlan: (planId: any, name: any) => {
        if (!FLAGS.rollback) return '';
        
        const plan = get().plans.find((p: any) => p.id === planId);
        if (!plan) return '';
        
        return get().createPlan({
          ...plan,
          name,
          isEnabled: false
        });
      },

      setActivePlan: (planId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.activePlan = planId;
        });
      },

      // Plan Configuration
      addStep: (planId: any, stepData: any) => {
        if (!FLAGS.rollback) return '';
        
        const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const step: RollbackStep = {
          ...stepData,
          id: stepId
        };
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            plan.rollbackSteps.push(step);
            plan.updatedAt = new Date();
          }
        });
        
        return stepId;
      },

      updateStep: (planId, stepId, updates) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            const step = plan.rollbackSteps.find((s: any) => s.id === stepId);
            if (step) {
              Object.assign(step, updates);
              plan.updatedAt = new Date();
            }
          }
        });
      },

      removeStep: (planId: any, stepId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            plan.rollbackSteps = plan.rollbackSteps.filter((s: any) => s.id !== stepId);
            plan.updatedAt = new Date();
          }
        });
      },

      reorderSteps: (planId: any, stepIds: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            const reorderedSteps = stepIds.map(id => plan.rollbackSteps.find((s: any) => s.id === id)!).filter(Boolean);
            plan.rollbackSteps = reorderedSteps;
            plan.updatedAt = new Date();
          }
        });
      },

      // Trigger Management
      addTrigger: (planId: any, triggerData: any) => {
        if (!FLAGS.rollback) return '';
        
        const triggerId = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const trigger: RollbackTrigger = {
          ...triggerData,
          id: triggerId,
          triggerCount: 0
        };
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            plan.triggers.push(trigger);
            plan.updatedAt = new Date();
          }
        });
        
        return triggerId;
      },

      updateTrigger: (planId, triggerId, updates) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            const trigger = plan.triggers.find(t => t.id === triggerId);
            if (trigger) {
              Object.assign(trigger, updates);
              plan.updatedAt = new Date();
            }
          }
        });
      },

      removeTrigger: (planId: any, triggerId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const plan = state.plans.find((p: any) => p.id === planId);
          if (plan) {
            plan.triggers = plan.triggers.filter((t: any) => t.id !== triggerId);
            plan.updatedAt = new Date();
          }
        });
      },

      // Execution
      executeRollback: async (planId, reason = 'Manual execution') => {
        if (!FLAGS.rollback) throw new Error('Rollback not enabled');
        
        const plan = get().plans.find((p: any) => p.id === planId);
        if (!plan) throw new Error('Plan not found');
        
        if (get().isExecuting) {
          throw new Error('Another rollback is already executing');
        }
        
        const executionId = `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = new Date();
        
        const execution: RollbackExecution = {
          id: executionId,
          planId,
          startedAt: startTime,
          status: 'running',
          stepsExecuted: [],
          triggeredBy: 'system', // Would be actual user in real implementation
          triggerType: 'manual',
          triggerReason: reason,
          environment: 'production',
          version: '1.0.0',
          executionContext: {}
        };
        
        set((state: any) => {
          state.executions.push(execution);
          state.currentExecution = executionId;
          state.isExecuting = true;
          state.error = null;
        });
        
        try {
          // Execute steps in order
          for (const step of plan.rollbackSteps.sort((a: any, b: any) => a.order - b.order)) {
            const stepResult: RollbackStepResult = {
              stepId: step.id,
              startedAt: new Date(),
              status: 'running'
            };
            
            set((state: any) => {
              const exec = state.executions.find((e: any) => e.id === executionId);
              if (exec) {
                exec.stepsExecuted.push(stepResult);
              }
            });
            
            // Simulate step execution
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2000));
            
            const success = Math.random() > 0.1; // 90% success rate
            const endTime = new Date();
            
            set((state: any) => {
              const exec = state.executions.find((e: any) => e.id === executionId);
              if (exec) {
                const result = exec.stepsExecuted.find(r => r.stepId === step.id);
                if (result) {
                  result.completedAt = endTime;
                  result.duration = (endTime.getTime() - result.startedAt.getTime()) / 1000;
                  result.status = success ? 'completed' : 'failed';
                  if (!success) {
                    result.errorMessage = `Step ${step.name} failed during execution`;
                  }
                }
              }
            });
            
            if (!success && step.isRequired) {
              throw new Error(`Required step '${step.name}' failed`);
            }
          }
          
          // Success
          const endTime = new Date();
          set((state: any) => {
            const exec = state.executions.find((e: any) => e.id === executionId);
            if (exec) {
              exec.status = 'completed';
              exec.completedAt = endTime;
              exec.duration = (endTime.getTime() - startTime.getTime()) / 1000;
            }
            state.isExecuting = false;
            state.currentExecution = null;
            
            // Update plan execution history
            const p = state.plans.find((p: any) => p.id === planId);
            if (p) {
              p.executionHistory.push(execution);
              p.lastExecuted = endTime;
            }
          });
          
          return executionId;
          
        } catch (error) {
          // Failure
          const endTime = new Date();
          set((state: any) => {
            const exec = state.executions.find((e: any) => e.id === executionId);
            if (exec) {
              exec.status = 'failed';
              exec.completedAt = endTime;
              exec.duration = (endTime.getTime() - startTime.getTime()) / 1000;
              exec.errorMessage = error instanceof Error ? error.message : 'Execution failed';
            }
            state.isExecuting = false;
            state.currentExecution = null;
            state.error = error instanceof Error ? error.message : 'Execution failed';
          });
          
          throw error;
        }
      },

      cancelExecution: (executionId: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          const execution = state.executions.find((e: any) => e.id === executionId);
          if (execution && execution.status === 'running') {
            execution.status = 'cancelled';
            execution.completedAt = new Date();
            if (execution.startedAt && execution.completedAt) {
              execution.duration = (execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000;
            }
          }
          
          if (state.currentExecution === executionId) {
            state.currentExecution = null;
            state.isExecuting = false;
          }
        });
      },

      pauseExecution: (executionId: any) => {
        if (!FLAGS.rollback) return;
        
        // In a real implementation, this would pause the actual execution
        console.log(`Pausing execution ${executionId}`);
      },

      resumeExecution: (executionId: any) => {
        if (!FLAGS.rollback) return;
        
        // In a real implementation, this would resume the paused execution
        console.log(`Resuming execution ${executionId}`);
      },

      // Validation
      validatePlan: async (planId: any) => {
        if (!FLAGS.rollback) return [];
        
        const plan = get().plans.find((p: any) => p.id === planId);
        if (!plan) return [];
        
        const results: ValidationResult[] = [];
        
        // Simulate validation
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Validate each step
        for (const step of plan.rollbackSteps) {
          if (step.preValidation) {
            for (const rule of step.preValidation) {
              const result: ValidationResult = {
                ruleId: rule.id,
                status: Math.random() > 0.2 ? 'passed' : 'failed',
                message: `Validation rule '${rule.name}' executed`,
                duration: Math.floor(Math.random() * 1000)
              };
              results.push(result);
            }
          }
        }
        
        return results;
      },

      validateSnapshot: async (snapshotId: any) => {
        if (!FLAGS.rollback) return [];
        
        const snapshot = get().snapshots.find((s: any) => s.id === snapshotId);
        if (!snapshot) return [];
        
        const results: ValidationResult[] = [];
        
        // Simulate validation
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        
        const validations = [
          'Checksum verification',
          'Data integrity check',
          'Schema validation',
          'Size verification'
        ];
        
        for (const validation of validations) {
          const result: ValidationResult = {
            ruleId: `val_${validation.replace(/\s+/g, '_').toLowerCase()}`,
            status: Math.random() > 0.15 ? 'passed' : 'failed',
            message: validation,
            duration: Math.floor(Math.random() * 500)
          };
          results.push(result);
        }
        
        return results;
      },

      // UI Actions
      setSidebarCollapsed: (collapsed: any) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.sidebarCollapsed = collapsed;
        });
      },

      setSelectedTab: (tab) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          state.selectedTab = tab;
        });
      },

      // Settings
      updateSettings: (settings) => {
        if (!FLAGS.rollback) return;
        
        set((state: any) => {
          Object.assign(state.settings, settings);
        });
      },

      // Data Management
      exportPlan: async (planId: any) => {
        if (!FLAGS.rollback) throw new Error('Rollback not enabled');
        
        const plan = get().plans.find((p: any) => p.id === planId);
        if (!plan) throw new Error('Plan not found');
        
        const exportData = {
          plan,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        
        return blob;
      },

      importPlan: async (file: any) => {
        if (!FLAGS.rollback) throw new Error('Rollback not enabled');
        
        const text = await file.text();
        const data = JSON.parse(text);
        
        return get().createPlan(data.plan);
      },

      exportSnapshot: async (snapshotId: any) => {
        if (!FLAGS.rollback) throw new Error('Rollback not enabled');
        
        const snapshot = get().snapshots.find((s: any) => s.id === snapshotId);
        if (!snapshot) throw new Error('Snapshot not found');
        
        const exportData = {
          snapshot,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        
        return blob;
      },

      // System
      sync: async () => {
        if (!FLAGS.rollback) return;
        
        try {
          // Simulate sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set((state: any) => {
            state.lastSync = new Date();
            state.error = null;
          });
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Sync failed';
          });
        }
      },

      // Initialization
      initialize: async () => {
        if (!FLAGS.rollback) return;
        
        try {
          await get().sync();
          
          // Create sample data for development
          if (get().snapshots.length === 0) {
            await get().createSampleData();
          }
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Initialization failed';
          });
        }
      },

      createSampleData: async () => {
        // Create sample snapshot
        const snapshotId = await get().createSnapshot({
          name: 'Pre-Deployment Snapshot',
          version: '1.2.3',
          applicationState: {
            userPreferences: {},
            sessionData: {},
            cachedData: {},
            featureFlags: { multiChart: true, watchlist: false },
            dashboardLayouts: {},
            chartConfigurations: {},
            customSettings: {}
          },
          databaseState: {
            schemaVersion: '1.2.3',
            tables: [
              { name: 'users', schema: 'public', recordCount: 1234, lastModified: new Date(), checksum: 'abc123' },
              { name: 'portfolios', schema: 'public', recordCount: 567, lastModified: new Date(), checksum: 'def456' }
            ],
            recordCounts: { users: 1234, portfolios: 567 },
            dataSize: 50000000,
            backupFormat: 'sql',
            isCompressed: true
          },
          configurationState: {
            environment: { NODE_ENV: 'production' },
            appConfig: { apiUrl: 'https://api.lokifi.com' },
            serviceConfigs: {},
            securityConfig: {}
          },
          tags: ['production', 'stable'],
          description: 'Automatic snapshot before v1.2.4 deployment',
          createdBy: 'deployment-bot',
          status: 'active',
          size: 50000000
        });
        
        // Create sample rollback plan
        const planId = get().createPlan({
          name: 'Emergency Rollback Plan',
          description: 'Standard rollback procedure for production deployments',
          targetSnapshot: snapshotId,
          rollbackSteps: [
            {
              id: 'step1',
              name: 'Stop Application Services',
              type: 'service_restart',
              config: {
                serviceRestart: {
                  services: ['api-server', 'web-server'],
                  restartMode: 'sequential',
                  waitTime: 30
                }
              },
              order: 1,
              isRequired: true,
              timeout: 300,
              canRollback: true,
              dependsOn: []
            },
            {
              id: 'step2',
              name: 'Restore Database',
              type: 'database_restore',
              config: {
                database: {
                  connectionString: 'postgresql://localhost:5432/lokifi',
                  backupPath: '/backups/fynix_backup.sql',
                  schema: 'public'
                }
              },
              order: 2,
              isRequired: true,
              timeout: 1800,
              canRollback: false,
              dependsOn: ['step1']
            }
          ],
          triggers: [
            {
              id: 'trigger1',
              name: 'High Error Rate',
              type: 'error_rate_threshold',
              config: {
                errorRate: {
                  threshold: 5.0,
                  timeWindow: 10,
                  errorTypes: ['5xx']
                }
              },
              isEnabled: true,
              triggerCount: 0,
              cooldown: 300
            }
          ],
          prerequisites: [
            {
              id: 'prereq1',
              name: 'Backup Available',
              type: 'backup_available',
              config: {
                backup: {
                  snapshotId,
                  maxAge: 24,
                  verificationRequired: true
                }
              },
              isRequired: true
            }
          ],
          settings: {
            autoExecute: false,
            executionTimeout: 3600,
            parallelSteps: false,
            validateBeforeRollback: true,
            validateAfterRollback: true,
            stopOnValidationFailure: true,
            notifyOnStart: true,
            notifyOnSuccess: true,
            notifyOnFailure: true,
            notificationChannels: ['slack', 'email'],
            createRecoverySnapshot: true,
            allowNestedRollbacks: false,
            maxRollbackDepth: 3
          },
          isEnabled: true
        });
        
        get().setActivePlan(planId);
      }
    })),
    {
      name: 'lokifi-rollback-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            executions: [],
            currentExecution: null
          };
        }
        return persistedState as RollbackState & RollbackActions;
      }
    }
  )
);

// Helper Functions
function generateChecksum(data: any): string {
  // Simple checksum generation (in real implementation, use crypto)
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Auto-initialize when enabled
if (typeof window !== 'undefined' && FLAGS.rollback) {
  useRollbackStore.getState().initialize();
}

