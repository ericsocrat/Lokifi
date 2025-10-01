import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Alert Types
export interface Alert {
  id: string;
  name: string;
  symbol: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  
  // Condition
  condition: AlertCondition;
  
  // Actions
  actions: AlertAction[];
  
  // Execution
  lastTriggered?: Date;
  triggerCount: number;
  maxTriggers?: number; // null = unlimited
  
  // Scheduling
  schedule?: AlertSchedule;
  
  // Metadata
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}

export interface AlertCondition {
  type: 'price' | 'indicator' | 'volume' | 'pattern' | 'combination';
  
  // Price conditions
  priceOperator?: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'between' | 'outside';
  priceValue?: number | [number, number];
  
  // Indicator conditions
  indicatorType?: string;
  indicatorParams?: Record<string, any>;
  indicatorOperator?: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  indicatorValue?: number;
  
  // Volume conditions
  volumeOperator?: 'above' | 'below' | 'spike' | 'unusual';
  volumeValue?: number;
  volumeBase?: 'absolute' | 'average' | 'percentage';
  
  // Pattern conditions
  patternType?: 'support' | 'resistance' | 'breakout' | 'reversal' | 'custom';
  patternParams?: Record<string, any>;
  
  // Combination conditions (for complex alerts)
  logicalOperator?: 'AND' | 'OR' | 'NOT';
  subConditions?: AlertCondition[];
  
  // Time constraints
  timeframe?: string;
  lookbackPeriods?: number;
}

export interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'sound' | 'auto_trade';
  enabled: boolean;
  
  // Notification action
  notificationTitle?: string;
  notificationBody?: string;
  
  // Email action
  emailTo?: string[];
  emailSubject?: string;
  emailBody?: string;
  
  // Webhook action
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookHeaders?: Record<string, string>;
  webhookBody?: string;
  
  // Sound action
  soundFile?: string;
  soundVolume?: number;
  
  // Auto-trade action (requires paper trading flag)
  tradeAction?: 'buy' | 'sell';
  tradeQuantity?: number;
  tradeType?: 'market' | 'limit' | 'stop';
  tradePrice?: number;
  
  // Retry configuration
  retryAttempts?: number;
  retryDelay?: number; // seconds
}

export interface AlertSchedule {
  startTime?: string; // HH:mm format
  endTime?: string;   // HH:mm format
  weekdays?: number[]; // 0-6, Sunday = 0
  timezone?: string;
  pauseAfterTrigger?: number; // minutes
}

export interface AlertExecution {
  id: string;
  alertId: string;
  triggeredAt: Date;
  conditionsMet: string[];
  actionsExecuted: ActionExecution[];
  success: boolean;
  error?: string;
}

export interface ActionExecution {
  type: AlertAction['type'];
  success: boolean;
  error?: string;
  duration?: number; // milliseconds
  response?: any;
}

// Backtesting Types
export interface AlertBacktest {
  id: string;
  alertId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  
  // Configuration
  config: {
    initialBalance: number;
    commissionRate: number;
    slippageRate: number;
  };
  
  // Results
  results: {
    totalTriggers: number;
    successfulTriggers: number;
    falsePositives: number;
    
    // Performance (if auto-trade enabled)
    totalReturn?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
    
    // Trigger analysis
    avgTimeBetweenTriggers: number;
    triggersByHour: number[];
    triggersByDay: number[];
  };
  
  // Historical executions
  executions: AlertExecution[];
}

// Store State
interface AlertsState {
  // Alerts
  alerts: Alert[];
  alertsBySymbol: Map<string, Alert[]>;
  
  // Active monitoring
  activeAlerts: Set<string>;
  monitoringEnabled: boolean;
  
  // Executions
  recentExecutions: AlertExecution[];
  executionHistory: Map<string, AlertExecution[]>;
  
  // Backtesting
  backtests: AlertBacktest[];
  currentBacktest: AlertBacktest | null;
  isBacktesting: boolean;
  
  // Real-time data
  realtimeConnected: boolean;
  lastUpdate: Date | null;
  
  // Settings
  globalSettings: {
    defaultPriority: Alert['priority'];
    maxConcurrentAlerts: number;
    enableSounds: boolean;
    soundVolume: number;
    batchNotifications: boolean;
    notificationDelay: number; // seconds
  };
  
  // Loading States
  isLoading: boolean;
  error: string | null;
}

// Store Actions
interface AlertsActions {
  // Alert Management
  createAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>) => string;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  deleteAlert: (id: string) => void;
  duplicateAlert: (id: string, newName: string) => string;
  
  // Alert Control
  activateAlert: (id: string) => void;
  deactivateAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  
  // Monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
  checkAlerts: () => Promise<void>;
  
  // Execution
  executeAlert: (alertId: string, force?: boolean) => Promise<AlertExecution>;
  executeAction: (action: AlertAction, alertContext: Alert) => Promise<ActionExecution>;
  
  // Backtesting
  startBacktest: (alertId: string, startDate: Date, endDate: Date, config?: AlertBacktest['config']) => Promise<string>;
  stopBacktest: () => void;
  getBacktestResults: (backtestId: string) => AlertBacktest | null;
  
  // Data Management
  loadAlerts: () => Promise<void>;
  loadExecutionHistory: (alertId: string) => Promise<void>;
  clearExecutionHistory: (alertId: string) => void;
  
  // Real-time Connection
  connectRealtime: () => void;
  disconnectRealtime: () => void;
  
  // Bulk Operations
  activateMultiple: (alertIds: string[]) => void;
  deactivateMultiple: (alertIds: string[]) => void;
  deleteMultiple: (alertIds: string[]) => void;
  
  // Settings
  updateGlobalSettings: (settings: Partial<AlertsState['globalSettings']>) => void;
  
  // Search & Filter
  getAlertsBySymbol: (symbol: string) => Alert[];
  getActiveAlerts: () => Alert[];
  getRecentExecutions: (count?: number) => AlertExecution[];
}

// Create Store
export const useAlertsStore = create<AlertsState & AlertsActions>()(
  persist(
      immer<AlertsState & AlertsActions>((set, get, store) => ({
        // Initial State
        alerts: [],
        alertsBySymbol: new Map(),
        activeAlerts: new Set(),
        monitoringEnabled: false,
        recentExecutions: [],
        executionHistory: new Map(),
        backtests: [],
        currentBacktest: null,
        isBacktesting: false,
        realtimeConnected: false,
        lastUpdate: null,
        globalSettings: {
          defaultPriority: 'medium',
          maxConcurrentAlerts: 50,
          enableSounds: true,
          soundVolume: 0.5,
          batchNotifications: false,
          notificationDelay: 0
        },
        isLoading: false,
        error: null,
        
        // Alert Management
        createAlert: (alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>) => {
          if (!FLAGS.alertsV2) return '';
          
          const id = `alert_${Date.now()}`;
          const now = new Date();
          
          const alert: Alert = {
            ...alertData,
            id,
            createdAt: now,
            updatedAt: now,
            triggerCount: 0
          };
          
          set((state) => {
            state.alerts.push(alert);
            
            // Update symbol index
            if (!state.alertsBySymbol.has(alert.symbol)) {
              state.alertsBySymbol.set(alert.symbol, []);
            }
            state.alertsBySymbol.get(alert.symbol)?.push(alert);
            
            // Add to active set if enabled
            if (alert.isActive) {
              state.activeAlerts.add(id);
            }
          });
          
          return id;
        },
        
        updateAlert: (id: string, updates: Partial<Alert>) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            const alert = state.alerts.find(a => a.id === id);
            if (alert) {
              const oldSymbol = alert.symbol;
              Object.assign(alert, updates);
              alert.updatedAt = new Date();
              
              // Update active set
              if (updates.isActive !== undefined) {
                if (updates.isActive) {
                  state.activeAlerts.add(id);
                } else {
                  state.activeAlerts.delete(id);
                }
              }
              
              // Update symbol index if symbol changed
              if (updates.symbol && updates.symbol !== oldSymbol) {
                // Remove from old symbol
                const oldAlerts = state.alertsBySymbol.get(oldSymbol);
                if (oldAlerts) {
                  const index = oldAlerts.findIndex(a => a.id === id);
                  if (index !== -1) {
                    oldAlerts.splice(index, 1);
                  }
                }
                
                // Add to new symbol
                if (!state.alertsBySymbol.has(updates.symbol)) {
                  state.alertsBySymbol.set(updates.symbol, []);
                }
                state.alertsBySymbol.get(updates.symbol)?.push(alert);
              }
            }
          });
        },
        
        deleteAlert: (id: string) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            const alertIndex = state.alerts.findIndex(a => a.id === id);
            if (alertIndex !== -1) {
              const alert = state.alerts[alertIndex];
              
              // Remove from alerts array
              state.alerts.splice(alertIndex, 1);
              
              // Remove from symbol index
              const symbolAlerts = state.alertsBySymbol.get(alert.symbol);
              if (symbolAlerts) {
                const symbolIndex = symbolAlerts.findIndex(a => a.id === id);
                if (symbolIndex !== -1) {
                  symbolAlerts.splice(symbolIndex, 1);
                }
              }
              
              // Remove from active set
              state.activeAlerts.delete(id);
              
              // Clear execution history
              state.executionHistory.delete(id);
            }
          });
        },
        
        duplicateAlert: (id: string, newName: string) => {
          if (!FLAGS.alertsV2) return '';
          
          const { alerts, createAlert } = get();
          const alert = alerts.find(a => a.id === id);
          
          if (!alert) return '';
          
          return createAlert({
            ...alert,
            name: newName,
            isActive: false // Start duplicated alerts as inactive
          });
        },
        
        // Alert Control
        activateAlert: (id: string) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            const alert = state.alerts.find(a => a.id === id);
            if (alert) {
              alert.isActive = true;
              alert.updatedAt = new Date();
              state.activeAlerts.add(id);
            }
          });
        },
        
        deactivateAlert: (id: string) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            const alert = state.alerts.find(a => a.id === id);
            if (alert) {
              alert.isActive = false;
              alert.updatedAt = new Date();
              state.activeAlerts.delete(id);
            }
          });
        },
        
        toggleAlert: (id: string) => {
          if (!FLAGS.alertsV2) return;
          
          const { alerts } = get();
          const alert = alerts.find(a => a.id === id);
          
          if (alert) {
            if (alert.isActive) {
              get().deactivateAlert(id);
            } else {
              get().activateAlert(id);
            }
          }
        },
        
        // Monitoring
        startMonitoring: () => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.monitoringEnabled = true;
          });
          
          // Start periodic alert checking
          const checkInterval = setInterval(() => {
            if (get().monitoringEnabled) {
              get().checkAlerts();
            } else {
              clearInterval(checkInterval);
            }
          }, 1000); // Check every second
        },
        
        stopMonitoring: () => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.monitoringEnabled = false;
          });
        },
        
        checkAlerts: async () => {
          if (!FLAGS.alertsV2) return;
          
          const { activeAlerts, alerts } = get();
          
          for (const alertId of activeAlerts) {
            const alert = alerts.find(a => a.id === alertId);
            if (!alert) continue;
            
            try {
              // Check if alert should be evaluated based on schedule
              if (!shouldEvaluateAlert(alert)) continue;
              
              // Evaluate alert condition
              const conditionMet = await evaluateAlertCondition(alert);
              
              if (conditionMet) {
                await get().executeAlert(alertId);
              }
              
            } catch (error) {
              console.error(`Error checking alert ${alertId}:`, error);
            }
          }
          
          set((state) => {
            state.lastUpdate = new Date();
          });
        },
        
        // Execution
        executeAlert: async (alertId: string, force = false) => {
          if (!FLAGS.alertsV2) throw new Error('Alerts v2 not enabled');
          
          const { alerts } = get();
          const alert = alerts.find(a => a.id === alertId);
          
          if (!alert) throw new Error('Alert not found');
          
          // Check trigger limits
          if (!force && alert.maxTriggers && alert.triggerCount >= alert.maxTriggers) {
            throw new Error('Alert has reached maximum trigger count');
          }
          
          const execution: AlertExecution = {
            id: `exec_${Date.now()}`,
            alertId,
            triggeredAt: new Date(),
            conditionsMet: ['manual'], // TODO: Get actual conditions that were met
            actionsExecuted: [],
            success: true
          };
          
          try {
            // Execute all enabled actions
            for (const action of alert.actions) {
              if (!action.enabled) continue;
              
              const actionExecution = await get().executeAction(action, alert);
              execution.actionsExecuted.push(actionExecution);
              
              if (!actionExecution.success) {
                execution.success = false;
              }
            }
            
            // Update alert trigger count and last triggered
            set((state) => {
              const alertToUpdate = state.alerts.find(a => a.id === alertId);
              if (alertToUpdate) {
                alertToUpdate.triggerCount++;
                alertToUpdate.lastTriggered = new Date();
                alertToUpdate.updatedAt = new Date();
              }
              
              // Add to execution history
              state.recentExecutions.unshift(execution);
              
              // Limit recent executions
              if (state.recentExecutions.length > 100) {
                state.recentExecutions = state.recentExecutions.slice(0, 100);
              }
              
              // Add to alert-specific history
              if (!state.executionHistory.has(alertId)) {
                state.executionHistory.set(alertId, []);
              }
              state.executionHistory.get(alertId)?.unshift(execution);
            });
            
            return execution;
            
          } catch (error) {
            execution.success = false;
            execution.error = error instanceof Error ? error.message : 'Unknown error';
            
            set((state) => {
              state.recentExecutions.unshift(execution);
            });
            
            throw error;
          }
        },
        
        executeAction: async (action: AlertAction, alertContext: Alert) => {
          const startTime = Date.now();
          
          const actionExecution: ActionExecution = {
            type: action.type,
            success: true,
            duration: 0
          };
          
          try {
            switch (action.type) {
              case 'notification':
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(
                    action.notificationTitle || `Alert: ${alertContext.name}`,
                    {
                      body: action.notificationBody || `${alertContext.symbol} alert triggered`,
                      icon: '/favicon.ico'
                    }
                  );
                }
                break;
                
              case 'sound':
                if (get().globalSettings.enableSounds && action.soundFile) {
                  const audio = new Audio(action.soundFile);
                  audio.volume = action.soundVolume || get().globalSettings.soundVolume;
                  await audio.play();
                }
                break;
                
              case 'webhook':
                if (action.webhookUrl) {
                  const response = await fetch(action.webhookUrl, {
                    method: action.webhookMethod || 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...action.webhookHeaders
                    },
                    body: action.webhookBody || JSON.stringify({
                      alert: alertContext.name,
                      symbol: alertContext.symbol,
                      timestamp: new Date().toISOString()
                    })
                  });
                  
                  actionExecution.response = {
                    status: response.status,
                    statusText: response.statusText
                  };
                  
                  if (!response.ok) {
                    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
                  }
                }
                break;
                
              case 'email':
                // Email would be handled by backend API
                const emailResponse = await fetch('/api/alerts/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: action.emailTo,
                    subject: action.emailSubject || `Alert: ${alertContext.name}`,
                    body: action.emailBody || `${alertContext.symbol} alert triggered`
                  })
                });
                
                if (!emailResponse.ok) {
                  throw new Error('Email sending failed');
                }
                break;
                
              case 'auto_trade':
                if (FLAGS.paperTrading && action.tradeAction) {
                  // Auto-trade would integrate with paper trading system
                  const tradeResponse = await fetch('/api/paper-trading/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      symbol: alertContext.symbol,
                      action: action.tradeAction,
                      quantity: action.tradeQuantity,
                      type: action.tradeType,
                      price: action.tradePrice
                    })
                  });
                  
                  if (!tradeResponse.ok) {
                    throw new Error('Auto-trade execution failed');
                  }
                  
                  actionExecution.response = await tradeResponse.json();
                }
                break;
            }
            
          } catch (error) {
            actionExecution.success = false;
            actionExecution.error = error instanceof Error ? error.message : 'Unknown error';
          } finally {
            actionExecution.duration = Date.now() - startTime;
          }
          
          return actionExecution;
        },
        
        // Backtesting
        startBacktest: async (alertId: string, startDate: Date, endDate: Date, config?: AlertBacktest['config']) => {
          if (!FLAGS.alertsV2) throw new Error('Alerts v2 not enabled');
          
          set((state) => {
            state.isBacktesting = true;
            state.error = null;
          });
          
          try {
            const response = await fetch('/api/alerts/backtest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                alertId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                config: config || {
                  initialBalance: 10000,
                  commissionRate: 0.001,
                  slippageRate: 0.0005
                }
              })
            });
            
            if (!response.ok) throw new Error('Backtest failed to start');
            
            const backtest: AlertBacktest = await response.json();
            
            set((state) => {
              state.backtests.push(backtest);
              state.currentBacktest = backtest;
              state.isBacktesting = false;
            });
            
            return backtest.id;
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Backtest failed';
              state.isBacktesting = false;
            });
            throw error;
          }
        },
        
        stopBacktest: () => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.isBacktesting = false;
            state.currentBacktest = null;
          });
        },
        
        getBacktestResults: (backtestId: string) => {
          const { backtests } = get();
          return backtests.find(b => b.id === backtestId) || null;
        },
        
        // Data Management
        loadAlerts: async () => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await fetch('/api/alerts');
            if (!response.ok) throw new Error('Failed to load alerts');
            
            const alerts: Alert[] = await response.json();
            
            set((state) => {
              state.alerts = alerts;
              state.alertsBySymbol.clear();
              state.activeAlerts.clear();
              
              // Rebuild indexes
              for (const alert of alerts) {
                if (!state.alertsBySymbol.has(alert.symbol)) {
                  state.alertsBySymbol.set(alert.symbol, []);
                }
                state.alertsBySymbol.get(alert.symbol)?.push(alert);
                
                if (alert.isActive) {
                  state.activeAlerts.add(alert.id);
                }
              }
              
              state.isLoading = false;
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load alerts';
              state.isLoading = false;
            });
          }
        },
        
        loadExecutionHistory: async (alertId: string) => {
          if (!FLAGS.alertsV2) return;
          
          try {
            const response = await fetch(`/api/alerts/${alertId}/executions`);
            if (!response.ok) throw new Error('Failed to load execution history');
            
            const executions: AlertExecution[] = await response.json();
            
            set((state) => {
              state.executionHistory.set(alertId, executions);
            });
            
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load execution history';
            });
          }
        },
        
        clearExecutionHistory: (alertId: string) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.executionHistory.delete(alertId);
            state.recentExecutions = state.recentExecutions.filter(e => e.alertId !== alertId);
          });
        },
        
        // Real-time Connection
        connectRealtime: () => {
          if (!FLAGS.alertsV2) return;
          
          // WebSocket connection for real-time price updates
          const ws = new WebSocket('/ws/alerts');
          
          ws.onopen = () => {
            set((state) => {
              state.realtimeConnected = true;
            });
          };
          
          ws.onclose = () => {
            set((state) => {
              state.realtimeConnected = false;
            });
          };
          
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // Handle real-time price updates
            if (data.type === 'price_update') {
              // Trigger alert checking for affected symbols
              get().checkAlerts();
            }
          };
        },
        
        disconnectRealtime: () => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            state.realtimeConnected = false;
          });
        },
        
        // Bulk Operations
        activateMultiple: (alertIds: string[]) => {
          if (!FLAGS.alertsV2) return;
          
          alertIds.forEach(id => get().activateAlert(id));
        },
        
        deactivateMultiple: (alertIds: string[]) => {
          if (!FLAGS.alertsV2) return;
          
          alertIds.forEach(id => get().deactivateAlert(id));
        },
        
        deleteMultiple: (alertIds: string[]) => {
          if (!FLAGS.alertsV2) return;
          
          alertIds.forEach(id => get().deleteAlert(id));
        },
        
        // Settings
        updateGlobalSettings: (settings: Partial<AlertsState['globalSettings']>) => {
          if (!FLAGS.alertsV2) return;
          
          set((state) => {
            Object.assign(state.globalSettings, settings);
          });
        },
        
        // Search & Filter
        getAlertsBySymbol: (symbol: string) => {
          const { alertsBySymbol } = get();
          return alertsBySymbol.get(symbol.toUpperCase()) || [];
        },
        
        getActiveAlerts: () => {
          const { alerts, activeAlerts } = get();
          return alerts.filter(alert => activeAlerts.has(alert.id));
        },
        
        getRecentExecutions: (count = 20) => {
          const { recentExecutions } = get();
          return recentExecutions.slice(0, count);
        }
      })),
      {
        name: 'lokifi-alerts-v2-storage',
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              backtests: [],
              currentBacktest: null,
              isBacktesting: false
            };
          }
          return persistedState as AlertsState & AlertsActions;
        }
      }
    )
  );

// Helper Functions
function shouldEvaluateAlert(alert: Alert): boolean {
  if (!alert.schedule) return true;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentDay = now.getDay();
  
  // Check time range
  if (alert.schedule.startTime && alert.schedule.endTime) {
    if (currentTime < alert.schedule.startTime || currentTime > alert.schedule.endTime) {
      return false;
    }
  }
  
  // Check weekdays
  if (alert.schedule.weekdays && !alert.schedule.weekdays.includes(currentDay)) {
    return false;
  }
  
  // Check pause after trigger
  if (alert.schedule.pauseAfterTrigger && alert.lastTriggered) {
    const minutesSinceLastTrigger = (now.getTime() - alert.lastTriggered.getTime()) / (1000 * 60);
    if (minutesSinceLastTrigger < alert.schedule.pauseAfterTrigger) {
      return false;
    }
  }
  
  return true;
}

async function evaluateAlertCondition(alert: Alert): Promise<boolean> {
  // This would be implemented with actual market data
  // For now, return false to prevent accidental executions
  return false;
}

// Selectors
export const useActiveAlertsCount = () =>
  useAlertsStore((state) => state.activeAlerts.size);

export const useAlertsBySymbol = (symbol: string) =>
  useAlertsStore((state) => state.getAlertsBySymbol(symbol));

export const useRecentExecutions = (count?: number) =>
  useAlertsStore((state) => state.getRecentExecutions(count));

// Initialize store
if (typeof window !== 'undefined' && FLAGS.alertsV2) {
  const store = useAlertsStore.getState();
  store.loadAlerts();
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}