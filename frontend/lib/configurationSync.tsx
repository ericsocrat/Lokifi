import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// H10: Configuration Sync - Centralized configuration management and synchronization
// Version control integration, cross-environment sync, configuration validation

// Configuration Sync Types
export interface ConfigurationItem {
  id: string;
  key: string;
  value: any;
  type: ConfigurationType;
  category: string;
  description: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
  
  // Validation
  schema?: ConfigurationSchema;
  isValid: boolean;
  validationErrors: string[];
  
  // Environment specific
  environmentId?: string;
  inheritedFrom?: string; // parent config id
  
  // Access control
  isReadOnly: boolean;
  isSecret: boolean;
  owner: string;
  
  // Lifecycle
  status: ConfigurationStatus;
  tags: string[];
}

export type ConfigurationType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'secret'
  | 'file'
  | 'json'
  | 'yaml'
  | 'environment'
  | 'feature_flag'
  | 'connection_string'
  | 'api_key'
  | 'certificate'
  | 'custom';

export type ConfigurationStatus = 
  | 'active'
  | 'draft'
  | 'deprecated'
  | 'archived'
  | 'pending_approval'
  | 'rejected';

export interface ConfigurationSchema {
  type: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, ConfigurationSchema>;
  items?: ConfigurationSchema;
  format?: string;
  description?: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: Omit<ConfigurationItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>[];
  variables: TemplateVariable[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  version: number;
  author: string;
  
  // Usage
  usageCount: number;
  environments: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: ConfigurationType;
  defaultValue?: any;
  required: boolean;
  placeholder?: string;
}

export interface ConfigurationEnvironment {
  id: string;
  name: string;
  description: string;
  type: 'development' | 'testing' | 'staging' | 'production' | 'custom';
  
  // Hierarchy
  parentEnvironment?: string;
  childEnvironments: string[];
  
  // Configuration
  configurations: string[]; // configuration item ids
  overrides: Record<string, any>;
  
  // Access
  isReadOnly: boolean;
  allowedUsers: string[];
  
  // Sync
  lastSyncAt?: Date;
  syncStatus: SyncJobStatus;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationVersion {
  id: string;
  configurationId: string;
  version: number;
  value: any;
  changelog: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  
  // Deployment
  deployedEnvironments: string[];
  deploymentStatus: DeploymentStatus;
}

export type DeploymentStatus = 
  | 'pending'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'rolled_back';

export interface ConfigurationChangeRequest {
  id: string;
  title: string;
  description: string;
  
  // Changes
  changes: ConfigurationChange[];
  affectedEnvironments: string[];
  
  // Workflow
  status: ChangeRequestStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // People
  createdBy: string;
  assignedTo?: string;
  reviewers: string[];
  
  // Timeline
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  
  // Approval
  approvals: Approval[];
  requiredApprovals: number;
  
  // Impact analysis
  impactAnalysis?: ImpactAnalysis;
}

export type ChangeRequestStatus = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'deployed'
  | 'failed'
  | 'cancelled';

export interface ConfigurationChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  configurationId: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
}

export interface Approval {
  id: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  timestamp: Date;
}

export interface ImpactAnalysis {
  affectedServices: string[];
  estimatedDowntime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackPlan: string;
  testingRequired: boolean;
}

export interface ConfigurationSyncJob {
  id: string;
  name: string;
  description: string;
  
  // Sync configuration
  sourceEnvironment: string;
  targetEnvironments: string[];
  configurations: string[]; // specific configs to sync, empty = all
  
  // Schedule
  schedule?: string; // cron expression
  isEnabled: boolean;
  
  // Filtering
  includePatterns: string[];
  excludePatterns: string[];
  
  // Options
  dryRun: boolean;
  overwriteTarget: boolean;
  validateBeforeSync: boolean;
  createBackup: boolean;
  
  // Status
  status: SyncJobStatus;
  lastRunAt?: Date;
  nextRunAt?: Date;
  
  // History
  executions: SyncExecution[];
  
  // Notifications
  notificationChannels: string[];
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type SyncJobStatus = 
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'disabled';

export interface SyncExecution {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: SyncJobStatus;
  
  // Results
  configurationsSynced: number;
  configurationsSkipped: number;
  configurationsErrored: number;
  
  // Details
  syncedItems: SyncedItem[];
  errors: SyncError[];
  warnings: SyncWarning[];
  
  // Performance
  duration?: number; // seconds
  
  // Backup
  backupId?: string;
}

export interface SyncedItem {
  configurationId: string;
  key: string;
  action: 'created' | 'updated' | 'deleted' | 'skipped';
  oldValue?: any;
  newValue?: any;
  targetEnvironment: string;
}

export interface SyncError {
  configurationId: string;
  key: string;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface SyncWarning {
  configurationId: string;
  key: string;
  message: string;
  recommendation?: string;
}

export interface ConfigurationBackup {
  id: string;
  name: string;
  description: string;
  
  // Content
  configurations: ConfigurationItem[];
  environments: ConfigurationEnvironment[];
  metadata: BackupMetadata;
  
  // Lifecycle
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  
  // Restoration
  canRestore: boolean;
  restoredAt?: Date;
  restoredBy?: string;
}

export interface BackupMetadata {
  version: string;
  configurationCount: number;
  environmentCount: number;
  totalSize: number; // bytes
  checksum: string;
}

export interface ConfigurationDrift {
  id: string;
  environmentId: string;
  configurationId: string;
  
  // Drift details
  expectedValue: any;
  actualValue: any;
  driftType: DriftType;
  
  // Detection
  detectedAt: Date;
  detectionMethod: 'scan' | 'monitoring' | 'manual';
  
  // Resolution
  status: DriftStatus;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  
  // Impact
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
}

export type DriftType = 
  | 'value_changed'
  | 'type_changed'
  | 'missing'
  | 'unexpected'
  | 'permission_changed';

export type DriftStatus = 
  | 'detected'
  | 'acknowledged'
  | 'resolved'
  | 'ignored'
  | 'false_positive';

export interface ConfigurationAudit {
  id: string;
  action: AuditAction;
  resourceType: 'configuration' | 'environment' | 'template' | 'change_request';
  resourceId: string;
  
  // Details
  oldValue?: any;
  newValue?: any;
  changes: Record<string, { from: any; to: any }>;
  
  // Context
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
  
  // Metadata
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  
  // Additional data
  metadata: Record<string, any>;
}

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'sync'
  | 'deploy'
  | 'rollback'
  | 'approve'
  | 'reject'
  | 'backup'
  | 'restore';

export interface ConfigurationSettings {
  // General
  enableConfigurationSync: boolean;
  defaultEnvironment: string;
  enableVersioning: boolean;
  enableAuditLog: boolean;
  
  // Validation
  enableValidation: boolean;
  strictMode: boolean;
  validateOnSync: boolean;
  
  // Sync
  autoSyncEnabled: boolean;
  syncInterval: number; // minutes
  maxSyncRetries: number;
  syncTimeout: number; // seconds
  
  // Backup
  autoBackupEnabled: boolean;
  backupRetention: number; // days
  backupBeforeSync: boolean;
  
  // Drift Detection
  enableDriftDetection: boolean;
  driftScanInterval: number; // hours
  alertOnDrift: boolean;
  
  // Security
  encryptSecrets: boolean;
  maskSecretsInLogs: boolean;
  requireApprovalForSecrets: boolean;
  
  // Change Management
  enableChangeRequests: boolean;
  requireApprovalForProduction: boolean;
  defaultApprovers: string[];
  
  // Notifications
  enableNotifications: boolean;
  notificationChannels: string[];
  
  // Performance
  enableCaching: boolean;
  cacheTimeout: number; // seconds
  maxCacheSize: number; // MB
}

// Store State
interface ConfigurationSyncState {
  // Configuration Items
  configurations: ConfigurationItem[];
  selectedConfiguration: string | null;
  
  // Templates
  templates: ConfigurationTemplate[];
  
  // Environments
  environments: ConfigurationEnvironment[];
  selectedEnvironment: string | null;
  
  // Change Management
  changeRequests: ConfigurationChangeRequest[];
  
  // Sync Jobs
  syncJobs: ConfigurationSyncJob[];
  
  // Backups
  backups: ConfigurationBackup[];
  
  // Drift Detection
  drifts: ConfigurationDrift[];
  
  // Audit Log
  auditLog: ConfigurationAudit[];
  
  // UI State
  sidebarCollapsed: boolean;
  selectedTab: 'configurations' | 'environments' | 'sync' | 'changes' | 'audit' | 'settings';
  searchQuery: string;
  filters: ConfigurationFilters;
  
  // Status
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
  
  // Settings
  settings: ConfigurationSettings;
}

export interface ConfigurationFilters {
  category: string[];
  type: ConfigurationType[];
  status: ConfigurationStatus[];
  environment: string[];
  owner: string[];
  tags: string[];
}

// Store Actions
interface ConfigurationSyncActions {
  // Configuration Management
  createConfiguration: (config: Omit<ConfigurationItem, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => string;
  updateConfiguration: (configId: string, updates: Partial<ConfigurationItem>) => void;
  deleteConfiguration: (configId: string) => void;
  cloneConfiguration: (configId: string, targetEnvironment?: string) => string;
  setSelectedConfiguration: (configId: string | null) => void;
  
  // Configuration Values
  getConfigurationValue: (key: string, environmentId?: string) => any;
  setConfigurationValue: (key: string, value: any, environmentId?: string) => void;
  
  // Validation
  validateConfiguration: (configId: string) => Promise<string[]>;
  validateAllConfigurations: () => Promise<Record<string, string[]>>;
  
  // Templates
  createTemplate: (template: Omit<ConfigurationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount'>) => string;
  updateTemplate: (templateId: string, updates: Partial<ConfigurationTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  applyTemplate: (templateId: string, environmentId: string, variables: Record<string, any>) => Promise<string[]>;
  
  // Environment Management
  createEnvironment: (env: Omit<ConfigurationEnvironment, 'id' | 'createdAt' | 'updatedAt' | 'configurations' | 'childEnvironments'>) => string;
  updateEnvironment: (envId: string, updates: Partial<ConfigurationEnvironment>) => void;
  deleteEnvironment: (envId: string) => void;
  setSelectedEnvironment: (envId: string | null) => void;
  
  // Change Management
  createChangeRequest: (request: Omit<ConfigurationChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'approvals'>) => string;
  updateChangeRequest: (requestId: string, updates: Partial<ConfigurationChangeRequest>) => void;
  approveChangeRequest: (requestId: string, reviewerId: string, comment?: string) => void;
  rejectChangeRequest: (requestId: string, reviewerId: string, comment: string) => void;
  deployChangeRequest: (requestId: string) => Promise<void>;
  
  // Sync Management
  createSyncJob: (job: Omit<ConfigurationSyncJob, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'executions'>) => string;
  updateSyncJob: (jobId: string, updates: Partial<ConfigurationSyncJob>) => void;
  deleteSyncJob: (jobId: string) => void;
  runSyncJob: (jobId: string) => Promise<string>;
  
  // Manual Sync
  syncConfiguration: (configId: string, sourceEnv: string, targetEnv: string) => Promise<void>;
  syncEnvironment: (sourceEnv: string, targetEnv: string, configIds?: string[]) => Promise<SyncExecution>;
  
  // Backup & Restore
  createBackup: (name: string, environmentIds: string[], configIds?: string[]) => Promise<string>;
  restoreBackup: (backupId: string, targetEnvironment: string) => Promise<void>;
  deleteBackup: (backupId: string) => void;
  
  // Drift Detection
  scanForDrift: (environmentId?: string) => Promise<ConfigurationDrift[]>;
  resolveDrift: (driftId: string, resolution: 'accept_actual' | 'revert_to_expected' | 'ignore') => Promise<void>;
  
  // Import/Export
  exportConfigurations: (configIds: string[], format: 'json' | 'yaml' | 'env') => Promise<Blob>;
  importConfigurations: (file: File, environmentId: string, mergeStrategy: 'replace' | 'merge' | 'skip') => Promise<string[]>;
  
  // Search & Filtering
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ConfigurationFilters>) => void;
  clearFilters: () => void;
  
  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedTab: (tab: ConfigurationSyncState['selectedTab']) => void;
  
  // Settings
  updateSettings: (settings: Partial<ConfigurationSettings>) => void;
  
  // Audit
  addAuditEntry: (entry: Omit<ConfigurationAudit, 'id' | 'timestamp'>) => void;
  
  // Initialization
  initialize: () => Promise<void>;
  createDefaultEnvironments: () => void;
  createDefaultConfigurations: () => void;
}

// Initial State
const createInitialState = (): ConfigurationSyncState => ({
  configurations: [],
  selectedConfiguration: null,
  templates: [],
  environments: [],
  selectedEnvironment: null,
  changeRequests: [],
  syncJobs: [],
  backups: [],
  drifts: [],
  auditLog: [],
  sidebarCollapsed: false,
  selectedTab: 'configurations',
  searchQuery: '',
  filters: {
    category: [],
    type: [],
    status: [],
    environment: [],
    owner: [],
    tags: []
  },
  isLoading: false,
  isSyncing: false,
  lastSyncAt: null,
  error: null,
  settings: {
    enableConfigurationSync: true,
    defaultEnvironment: 'development',
    enableVersioning: true,
    enableAuditLog: true,
    enableValidation: true,
    strictMode: false,
    validateOnSync: true,
    autoSyncEnabled: false,
    syncInterval: 30,
    maxSyncRetries: 3,
    syncTimeout: 300,
    autoBackupEnabled: true,
    backupRetention: 30,
    backupBeforeSync: true,
    enableDriftDetection: true,
    driftScanInterval: 24,
    alertOnDrift: true,
    encryptSecrets: true,
    maskSecretsInLogs: true,
    requireApprovalForSecrets: true,
    enableChangeRequests: true,
    requireApprovalForProduction: true,
    defaultApprovers: [],
    enableNotifications: true,
    notificationChannels: [],
    enableCaching: true,
    cacheTimeout: 300,
    maxCacheSize: 100
  }
});

// Create Store
export const useConfigurationSyncStore = create<ConfigurationSyncState & ConfigurationSyncActions>()(
  persist(
    immer<ConfigurationSyncState & ConfigurationSyncActions>((set, get) => ({
      ...createInitialState(),

      // Configuration Management
      createConfiguration: (configData) => {
        if (!FLAGS.configurationSync) return '';
        
        const id = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const config: ConfigurationItem = {
          ...configData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          isValid: true,
          validationErrors: []
        };
        
        set((state) => {
          state.configurations.push(config);
        });
        
        // Add audit entry
        get().addAuditEntry({
          action: 'create',
          resourceType: 'configuration',
          resourceId: id,
          newValue: config,
          changes: {},
          userId: 'current_user',
          success: true,
          metadata: { key: config.key }
        });
        
        return id;
      },

      updateConfiguration: (configId, updates) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const config = state.configurations.find(c => c.id === configId);
          if (config) {
            const oldValue = { ...config };
            Object.assign(config, { ...updates, updatedAt: new Date(), version: config.version + 1 });
            
            // Add audit entry
            get().addAuditEntry({
              action: 'update',
              resourceType: 'configuration',
              resourceId: configId,
              oldValue,
              newValue: config,
              userId: 'current_user',
              success: true,
              changes: Object.fromEntries(
                Object.entries(updates).map(([key, value]) => [key, { from: oldValue[key as keyof typeof oldValue], to: value }])
              ),
              metadata: { key: config.key }
            });
          }
        });
      },

      deleteConfiguration: (configId) => {
        if (!FLAGS.configurationSync) return;
        
        const config = get().configurations.find(c => c.id === configId);
        if (!config) return;
        
        set((state) => {
          state.configurations = state.configurations.filter(c => c.id !== configId);
          if (state.selectedConfiguration === configId) {
            state.selectedConfiguration = null;
          }
        });
        
        // Add audit entry
        get().addAuditEntry({
          action: 'delete',
          resourceType: 'configuration',
          resourceId: configId,
          oldValue: config,
          changes: {},
          userId: 'current_user',
          success: true,
          metadata: { key: config.key }
        });
      },

      cloneConfiguration: (configId, targetEnvironment) => {
        if (!FLAGS.configurationSync) return '';
        
        const config = get().configurations.find(c => c.id === configId);
        if (!config) return '';
        
        return get().createConfiguration({
          ...config,
          key: `${config.key}_clone`,
          environmentId: targetEnvironment,
          inheritedFrom: configId
        });
      },

      setSelectedConfiguration: (configId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.selectedConfiguration = configId;
        });
      },

      // Configuration Values
      getConfigurationValue: (key, environmentId) => {
        if (!FLAGS.configurationSync) return undefined;
        
        const config = get().configurations.find(c => 
          c.key === key && 
          (environmentId ? c.environmentId === environmentId : true)
        );
        
        return config?.value;
      },

      setConfigurationValue: (key, value, environmentId) => {
        if (!FLAGS.configurationSync) return;
        
        const config = get().configurations.find(c => 
          c.key === key && 
          (environmentId ? c.environmentId === environmentId : true)
        );
        
        if (config) {
          get().updateConfiguration(config.id, { value });
        }
      },

      // Validation
      validateConfiguration: async (configId) => {
        if (!FLAGS.configurationSync) return [];
        
        const config = get().configurations.find(c => c.id === configId);
        if (!config || !config.schema) return [];
        
        // Simulate validation
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        const errors: string[] = [];
        
        // Sample validation logic
        if (config.schema.required && (config.value === null || config.value === undefined)) {
          errors.push('Value is required');
        }
        
        if (config.schema.type === 'string' && typeof config.value !== 'string') {
          errors.push('Value must be a string');
        }
        
        if (config.schema.minimum && config.value < config.schema.minimum) {
          errors.push(`Value must be at least ${config.schema.minimum}`);
        }
        
        // Update configuration with validation results
        set((state) => {
          const c = state.configurations.find(c => c.id === configId);
          if (c) {
            c.isValid = errors.length === 0;
            c.validationErrors = errors;
          }
        });
        
        return errors;
      },

      validateAllConfigurations: async () => {
        if (!FLAGS.configurationSync) return {};
        
        const results: Record<string, string[]> = {};
        
        for (const config of get().configurations) {
          results[config.id] = await get().validateConfiguration(config.id);
        }
        
        return results;
      },

      // Templates
      createTemplate: (templateData) => {
        if (!FLAGS.configurationSync) return '';
        
        const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const template: ConfigurationTemplate = {
          ...templateData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          usageCount: 0
        };
        
        set((state) => {
          state.templates.push(template);
        });
        
        return id;
      },

      updateTemplate: (templateId, updates) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const template = state.templates.find(t => t.id === templateId);
          if (template) {
            Object.assign(template, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deleteTemplate: (templateId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.templates = state.templates.filter(t => t.id !== templateId);
        });
      },

      applyTemplate: async (templateId, environmentId, variables) => {
        if (!FLAGS.configurationSync) return [];
        
        const template = get().templates.find(t => t.id === templateId);
        if (!template) return [];
        
        const configIds: string[] = [];
        
        for (const item of template.items) {
          // Apply variable substitutions
          let value = item.value;
          if (typeof value === 'string') {
            for (const [key, val] of Object.entries(variables)) {
              value = value.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
            }
          }
          
          const configId = get().createConfiguration({
            ...item,
            value,
            environmentId
          });
          
          configIds.push(configId);
        }
        
        // Update template usage count
        set((state) => {
          const t = state.templates.find(t => t.id === templateId);
          if (t) {
            t.usageCount += 1;
            if (!t.environments.includes(environmentId)) {
              t.environments.push(environmentId);
            }
          }
        });
        
        return configIds;
      },

      // Environment Management
      createEnvironment: (envData) => {
        if (!FLAGS.configurationSync) return '';
        
        const id = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const environment: ConfigurationEnvironment = {
          ...envData,
          id,
          configurations: [],
          childEnvironments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'idle'
        };
        
        set((state) => {
          state.environments.push(environment);
          
          // Add to parent's children if specified
          if (environment.parentEnvironment) {
            const parent = state.environments.find(e => e.id === environment.parentEnvironment);
            if (parent && !parent.childEnvironments.includes(id)) {
              parent.childEnvironments.push(id);
            }
          }
        });
        
        return id;
      },

      updateEnvironment: (envId, updates) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const env = state.environments.find(e => e.id === envId);
          if (env) {
            Object.assign(env, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deleteEnvironment: (envId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const env = state.environments.find(e => e.id === envId);
          if (env) {
            // Remove from parent's children
            if (env.parentEnvironment) {
              const parent = state.environments.find(e => e.id === env.parentEnvironment);
              if (parent) {
                parent.childEnvironments = parent.childEnvironments.filter(id => id !== envId);
              }
            }
            
            // Update children to remove parent reference
            env.childEnvironments.forEach(childId => {
              const child = state.environments.find(e => e.id === childId);
              if (child) {
                child.parentEnvironment = undefined;
              }
            });
          }
          
          state.environments = state.environments.filter(e => e.id !== envId);
          if (state.selectedEnvironment === envId) {
            state.selectedEnvironment = null;
          }
        });
      },

      setSelectedEnvironment: (envId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.selectedEnvironment = envId;
        });
      },

      // Change Management
      createChangeRequest: (requestData) => {
        if (!FLAGS.configurationSync) return '';
        
        const id = `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const request: ConfigurationChangeRequest = {
          ...requestData,
          id,
          status: 'draft',
          approvals: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => {
          state.changeRequests.push(request);
        });
        
        return id;
      },

      updateChangeRequest: (requestId, updates) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const request = state.changeRequests.find(r => r.id === requestId);
          if (request) {
            Object.assign(request, { ...updates, updatedAt: new Date() });
          }
        });
      },

      approveChangeRequest: (requestId, reviewerId, comment) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const request = state.changeRequests.find(r => r.id === requestId);
          if (request) {
            const existingApproval = request.approvals.find(a => a.reviewerId === reviewerId);
            if (existingApproval) {
              existingApproval.status = 'approved';
              existingApproval.comment = comment;
              existingApproval.timestamp = new Date();
            } else {
              request.approvals.push({
                id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                reviewerId,
                status: 'approved',
                comment,
                timestamp: new Date()
              });
            }
            
            // Check if all required approvals are met
            const approvedCount = request.approvals.filter(a => a.status === 'approved').length;
            if (approvedCount >= request.requiredApprovals && request.status === 'pending_review') {
              request.status = 'approved';
            }
            
            request.updatedAt = new Date();
          }
        });
      },

      rejectChangeRequest: (requestId, reviewerId, comment) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const request = state.changeRequests.find(r => r.id === requestId);
          if (request) {
            const existingApproval = request.approvals.find(a => a.reviewerId === reviewerId);
            if (existingApproval) {
              existingApproval.status = 'rejected';
              existingApproval.comment = comment;
              existingApproval.timestamp = new Date();
            } else {
              request.approvals.push({
                id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                reviewerId,
                status: 'rejected',
                comment,
                timestamp: new Date()
              });
            }
            
            request.status = 'rejected';
            request.updatedAt = new Date();
          }
        });
      },

      deployChangeRequest: async (requestId) => {
        if (!FLAGS.configurationSync) return;
        
        const request = get().changeRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'approved') return;
        
        set((state) => {
          const r = state.changeRequests.find(r => r.id === requestId);
          if (r) {
            r.status = 'deployed';
            r.completedAt = new Date();
          }
        });
        
        // Apply changes
        try {
          for (const change of request.changes) {
            switch (change.type) {
              case 'create':
                // Create new configuration
                break;
              case 'update':
                get().updateConfiguration(change.configurationId, { value: change.newValue });
                break;
              case 'delete':
                get().deleteConfiguration(change.configurationId);
                break;
            }
          }
          
          // Simulate deployment
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
          
        } catch (error) {
          set((state) => {
            const r = state.changeRequests.find(r => r.id === requestId);
            if (r) {
              r.status = 'failed';
            }
          });
          throw error;
        }
      },

      // Sync Management
      createSyncJob: (jobData) => {
        if (!FLAGS.configurationSync) return '';
        
        const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const job: ConfigurationSyncJob = {
          ...jobData,
          id,
          status: 'idle',
          executions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        set((state) => {
          state.syncJobs.push(job);
        });
        
        return id;
      },

      updateSyncJob: (jobId, updates) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const job = state.syncJobs.find(j => j.id === jobId);
          if (job) {
            Object.assign(job, { ...updates, updatedAt: new Date() });
          }
        });
      },

      deleteSyncJob: (jobId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.syncJobs = state.syncJobs.filter(j => j.id !== jobId);
        });
      },

      runSyncJob: async (jobId) => {
        if (!FLAGS.configurationSync) return '';
        
        const job = get().syncJobs.find(j => j.id === jobId);
        if (!job) return '';
        
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = new Date();
        
        // Create execution record
        const execution: SyncExecution = {
          id: executionId,
          startedAt: startTime,
          status: 'running',
          configurationsSynced: 0,
          configurationsSkipped: 0,
          configurationsErrored: 0,
          syncedItems: [],
          errors: [],
          warnings: []
        };
        
        set((state) => {
          const j = state.syncJobs.find(j => j.id === jobId);
          if (j) {
            j.status = 'running';
            j.lastRunAt = startTime;
            j.executions.push(execution);
          }
          state.isSyncing = true;
        });
        
        try {
          // Simulate sync execution
          await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
          
          const syncedCount = Math.floor(Math.random() * 20) + 1;
          const hasErrors = Math.random() < 0.2;
          
          set((state) => {
            const j = state.syncJobs.find(j => j.id === jobId);
            if (j) {
              j.status = hasErrors ? 'failed' : 'completed';
              
              const exec = j.executions.find(e => e.id === executionId);
              if (exec) {
                exec.completedAt = new Date();
                exec.status = hasErrors ? 'failed' : 'completed';
                exec.configurationsSynced = syncedCount;
                exec.duration = (exec.completedAt.getTime() - exec.startedAt.getTime()) / 1000;
                
                if (hasErrors) {
                  exec.errors.push({
                    configurationId: 'config_123',
                    key: 'database.connection_string',
                    message: 'Failed to sync due to validation error',
                    severity: 'error'
                  });
                }
              }
            }
            state.isSyncing = false;
            state.lastSyncAt = new Date();
          });
          
          return executionId;
          
        } catch (error) {
          set((state) => {
            const j = state.syncJobs.find(j => j.id === jobId);
            if (j) {
              j.status = 'failed';
              
              const exec = j.executions.find(e => e.id === executionId);
              if (exec) {
                exec.completedAt = new Date();
                exec.status = 'failed';
                exec.errors.push({
                  configurationId: '',
                  key: '',
                  message: error instanceof Error ? error.message : 'Sync failed',
                  severity: 'error'
                });
              }
            }
            state.isSyncing = false;
            state.error = error instanceof Error ? error.message : 'Sync failed';
          });
          throw error;
        }
      },

      // Manual Sync
      syncConfiguration: async (configId, sourceEnv, targetEnv) => {
        if (!FLAGS.configurationSync) return;
        
        const config = get().configurations.find(c => c.id === configId && c.environmentId === sourceEnv);
        if (!config) throw new Error('Configuration not found');
        
        // Create or update in target environment
        const targetConfig = get().configurations.find(c => c.key === config.key && c.environmentId === targetEnv);
        
        if (targetConfig) {
          get().updateConfiguration(targetConfig.id, { value: config.value });
        } else {
          get().createConfiguration({
            ...config,
            environmentId: targetEnv
          });
        }
      },

      syncEnvironment: async (sourceEnv, targetEnv, configIds) => {
        if (!FLAGS.configurationSync) throw new Error('Configuration sync not enabled');
        
        const execution: SyncExecution = {
          id: `manual_sync_${Date.now()}`,
          startedAt: new Date(),
          status: 'running',
          configurationsSynced: 0,
          configurationsSkipped: 0,
          configurationsErrored: 0,
          syncedItems: [],
          errors: [],
          warnings: []
        };
        
        try {
          const configsToSync = get().configurations.filter(c => 
            c.environmentId === sourceEnv && 
            (!configIds || configIds.includes(c.id))
          );
          
          for (const config of configsToSync) {
            try {
              await get().syncConfiguration(config.id, sourceEnv, targetEnv);
              execution.configurationsSynced++;
              execution.syncedItems.push({
                configurationId: config.id,
                key: config.key,
                action: 'updated',
                newValue: config.value,
                targetEnvironment: targetEnv
              });
            } catch (error) {
              execution.configurationsErrored++;
              execution.errors.push({
                configurationId: config.id,
                key: config.key,
                message: error instanceof Error ? error.message : 'Sync failed',
                severity: 'error'
              });
            }
          }
          
          execution.completedAt = new Date();
          execution.status = execution.configurationsErrored > 0 ? 'failed' : 'completed';
          execution.duration = (execution.completedAt.getTime() - execution.startedAt.getTime()) / 1000;
          
          return execution;
          
        } catch (error) {
          execution.completedAt = new Date();
          execution.status = 'failed';
          throw error;
        }
      },

      // Backup & Restore
      createBackup: async (name, environmentIds, configIds) => {
        if (!FLAGS.configurationSync) return '';
        
        const configurations = get().configurations.filter(c => 
          (!environmentIds.length || environmentIds.includes(c.environmentId || '')) &&
          (!configIds || configIds.includes(c.id))
        );
        
        const environments = get().environments.filter(e => 
          !environmentIds.length || environmentIds.includes(e.id)
        );
        
        const id = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const backup: ConfigurationBackup = {
          id,
          name,
          description: `Backup of ${configurations.length} configurations`,
          configurations,
          environments,
          metadata: {
            version: '1.0',
            configurationCount: configurations.length,
            environmentCount: environments.length,
            totalSize: JSON.stringify({ configurations, environments }).length,
            checksum: 'checksum_' + Math.random().toString(36)
          },
          createdAt: new Date(),
          createdBy: 'current_user',
          canRestore: true
        };
        
        set((state) => {
          state.backups.push(backup);
        });
        
        return id;
      },

      restoreBackup: async (backupId, targetEnvironment) => {
        if (!FLAGS.configurationSync) return;
        
        const backup = get().backups.find(b => b.id === backupId);
        if (!backup) throw new Error('Backup not found');
        
        // Restore configurations
        for (const config of backup.configurations) {
          get().createConfiguration({
            ...config,
            environmentId: targetEnvironment
          });
        }
        
        set((state) => {
          const b = state.backups.find(b => b.id === backupId);
          if (b) {
            b.restoredAt = new Date();
            b.restoredBy = 'current_user';
          }
        });
      },

      deleteBackup: (backupId) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.backups = state.backups.filter(b => b.id !== backupId);
        });
      },

      // Drift Detection
      scanForDrift: async (environmentId) => {
        if (!FLAGS.configurationSync) return [];
        
        // Simulate drift detection
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        const drifts: ConfigurationDrift[] = [];
        
        // Sample drift detection
        if (Math.random() < 0.3) {
          const drift: ConfigurationDrift = {
            id: `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            environmentId: environmentId || 'env_1',
            configurationId: 'config_1',
            expectedValue: 'expected_value',
            actualValue: 'actual_value',
            driftType: 'value_changed',
            detectedAt: new Date(),
            detectionMethod: 'scan',
            status: 'detected',
            severity: 'medium',
            affectedServices: ['api-service']
          };
          
          drifts.push(drift);
        }
        
        set((state) => {
          state.drifts.push(...drifts);
        });
        
        return drifts;
      },

      resolveDrift: async (driftId, resolution) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          const drift = state.drifts.find(d => d.id === driftId);
          if (drift) {
            drift.status = resolution === 'ignore' ? 'ignored' : 'resolved';
            drift.resolvedAt = new Date();
            drift.resolvedBy = 'current_user';
            drift.resolution = resolution;
          }
        });
      },

      // Import/Export
      exportConfigurations: async (configIds, format) => {
        if (!FLAGS.configurationSync) throw new Error('Configuration sync not enabled');
        
        const configurations = get().configurations.filter(c => configIds.includes(c.id));
        
        let content: string;
        let mimeType: string;
        
        switch (format) {
          case 'json':
            content = JSON.stringify(configurations, null, 2);
            mimeType = 'application/json';
            break;
          case 'yaml':
            // Simplified YAML export
            content = configurations.map(c => `${c.key}: ${JSON.stringify(c.value)}`).join('\n');
            mimeType = 'text/yaml';
            break;
          case 'env':
            content = configurations.map(c => `${c.key.toUpperCase().replace(/\./g, '_')}=${c.value}`).join('\n');
            mimeType = 'text/plain';
            break;
        }
        
        return new Blob([content], { type: mimeType });
      },

      importConfigurations: async (file, environmentId, mergeStrategy) => {
        if (!FLAGS.configurationSync) return [];
        
        const text = await file.text();
        let importData: any;
        
        try {
          importData = JSON.parse(text);
        } catch {
          throw new Error('Invalid file format');
        }
        
        const importedIds: string[] = [];
        
        for (const config of importData) {
          const existingConfig = get().configurations.find(c => 
            c.key === config.key && c.environmentId === environmentId
          );
          
          if (existingConfig) {
            if (mergeStrategy === 'replace') {
              get().updateConfiguration(existingConfig.id, { value: config.value });
              importedIds.push(existingConfig.id);
            } else if (mergeStrategy === 'skip') {
              continue;
            }
          } else {
            const configId = get().createConfiguration({
              ...config,
              environmentId
            });
            importedIds.push(configId);
          }
        }
        
        return importedIds;
      },

      // Search & Filtering
      setSearchQuery: (query) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.searchQuery = query;
        });
      },

      setFilters: (filters) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          Object.assign(state.filters, filters);
        });
      },

      clearFilters: () => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.filters = {
            category: [],
            type: [],
            status: [],
            environment: [],
            owner: [],
            tags: []
          };
          state.searchQuery = '';
        });
      },

      // UI Actions
      setSidebarCollapsed: (collapsed) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.sidebarCollapsed = collapsed;
        });
      },

      setSelectedTab: (tab) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          state.selectedTab = tab;
        });
      },

      // Settings
      updateSettings: (settings) => {
        if (!FLAGS.configurationSync) return;
        
        set((state) => {
          Object.assign(state.settings, settings);
        });
      },

      // Audit
      addAuditEntry: (entryData) => {
        if (!FLAGS.configurationSync) return;
        
        const entry: ConfigurationAudit = {
          ...entryData,
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        set((state) => {
          state.auditLog.unshift(entry);
          
          // Keep only last 1000 entries
          if (state.auditLog.length > 1000) {
            state.auditLog = state.auditLog.slice(0, 1000);
          }
        });
      },

      // Initialization
      initialize: async () => {
        if (!FLAGS.configurationSync) return;
        
        try {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          // Create defaults if none exist
          if (get().environments.length === 0) {
            get().createDefaultEnvironments();
          }
          
          if (get().configurations.length === 0) {
            get().createDefaultConfigurations();
          }
          
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Initialization failed';
          });
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      createDefaultEnvironments: () => {
        // Development Environment
        get().createEnvironment({
          name: 'Development',
          description: 'Development environment',
          type: 'development',
          overrides: {},
          isReadOnly: false,
          allowedUsers: ['dev-team'],
          syncStatus: 'idle'
        });
        
        // Production Environment
        get().createEnvironment({
          name: 'Production',
          description: 'Production environment',
          type: 'production',
          overrides: {},
          isReadOnly: true,
          allowedUsers: ['ops-team'],
          syncStatus: 'idle'
        });
      },

      createDefaultConfigurations: () => {
        const devEnv = get().environments.find(e => e.type === 'development');
        const prodEnv = get().environments.find(e => e.type === 'production');
        
        if (!devEnv || !prodEnv) return;
        
        // Database Configuration
        get().createConfiguration({
          key: 'database.host',
          value: 'localhost',
          type: 'string',
          category: 'database',
          description: 'Database host address',
          environmentId: devEnv.id,
          schema: { type: 'string', required: true },
          isValid: true,
          validationErrors: [],
          isReadOnly: false,
          isSecret: false,
          owner: 'system',
          status: 'active',
          tags: ['database', 'infrastructure']
        });
        
        get().createConfiguration({
          key: 'database.host',
          value: 'prod-db.example.com',
          type: 'string',
          category: 'database',
          description: 'Database host address',
          environmentId: prodEnv.id,
          schema: { type: 'string', required: true },
          isValid: true,
          validationErrors: [],
          isReadOnly: true,
          isSecret: false,
          owner: 'system',
          status: 'active',
          tags: ['database', 'infrastructure']
        });
        
        // API Configuration
        get().createConfiguration({
          key: 'api.rate_limit',
          value: 1000,
          type: 'number',
          category: 'api',
          description: 'API rate limit per minute',
          environmentId: devEnv.id,
          schema: { type: 'number', minimum: 1, maximum: 10000 },
          isValid: true,
          validationErrors: [],
          isReadOnly: false,
          isSecret: false,
          owner: 'system',
          status: 'active',
          tags: ['api', 'performance']
        });
        
        get().createConfiguration({
          key: 'api.rate_limit',
          value: 10000,
          type: 'number',
          category: 'api',
          description: 'API rate limit per minute',
          environmentId: prodEnv.id,
          schema: { type: 'number', minimum: 1, maximum: 100000 },
          isValid: true,
          validationErrors: [],
          isReadOnly: true,
          isSecret: false,
          owner: 'system',
          status: 'active',
          tags: ['api', 'performance']
        });
      }
    })),
    {
      name: 'fynix-configuration-sync-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            changeRequests: [],
            syncJobs: [],
            backups: [],
            drifts: [],
            auditLog: []
          };
        }
        return persistedState as ConfigurationSyncState & ConfigurationSyncActions;
      }
    }
  )
);

// Auto-initialize when enabled
if (typeof window !== 'undefined' && FLAGS.configurationSync) {
  useConfigurationSyncStore.getState().initialize();
}