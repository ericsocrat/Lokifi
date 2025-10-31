import type { Draft } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Corporate Action Types
export interface CorporateAction {
  id: string;
  symbol: string;
  type: 'dividend' | 'split' | 'merger' | 'spinoff' | 'rights';
  date: Date;
  exDate: Date;
  payDate?: Date;
  ratio?: number; // For splits (e.g., 2:1 = 2.0)
  amount?: number; // For dividends (per share)
  details: string;
  status: 'upcoming' | 'processed' | 'historical';
}

// Holiday Types
export interface MarketHoliday {
  date: Date;
  name: string;
  market: string; // 'NYSE', 'NASDAQ', 'LSE', etc.
  type: 'full_close' | 'early_close' | 'delayed_open';
  earlyCloseTime?: string; // For early close days
}

// Session Types
export interface TradingSession {
  name: string;
  market: string;
  startTime: string; // HH:mm format
  endTime: string;
  timezone: string;
  color: string;
  isActive: boolean;
}

// OHLC Data Types
export interface OHLCBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface DataQuality {
  symbol: string;
  completeness: number; // 0-1 score
  accuracy: number; // 0-1 score
  timeliness: number; // 0-1 score
  issues: QualityIssue[];
  lastValidated: Date;
}

export interface QualityIssue {
  type: 'missing_data' | 'outlier' | 'stale_data' | 'adjustment_pending';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedBars: number[];
}

// Store State
interface CorporateActionsState {
  // Corporate Actions
  actions: CorporateAction[];
  actionsBySymbol: Map<string, CorporateAction[]>;

  // Market Calendar
  holidays: MarketHoliday[];
  holidaysByMarket: Map<string, MarketHoliday[]>;

  // Trading Sessions
  sessions: TradingSession[];
  activeSessions: string[];

  // Data Quality
  qualityReports: Map<string, DataQuality>;
  showAdjusted: boolean;
  showQualityIndicators: boolean;

  // Settings
  preferredMarkets: string[];
  autoAdjustForActions: boolean;

  // Loading States
  isLoading: boolean;
  error: string | null;
}

// Store Actions
interface CorporateActionsActions {
  // Corporate Actions
  loadActions: (symbol?: string) => Promise<void>;
  getActionsForSymbol: (symbol: string) => CorporateAction[];
  getUpcomingActions: (days: number) => CorporateAction[];

  // Data Adjustment
  adjustOHLCData: (symbol: string, data: OHLCBar[]) => OHLCBar[];
  toggleAdjustedData: () => void;

  // Market Calendar
  loadHolidays: (market: string, year: number) => Promise<void>;
  isMarketOpen: (market: string, date: Date) => boolean;
  getNextTradingDay: (market: string, date: Date) => Date;

  // Trading Sessions
  updateSessions: (sessions: TradingSession[]) => void;
  toggleSession: (sessionName: string) => void;
  getActiveSessionsAt: (time: Date) => TradingSession[];

  // Data Quality
  loadQualityReport: (symbol: string) => Promise<void>;
  toggleQualityIndicators: () => void;

  // Settings
  updatePreferredMarkets: (markets: string[]) => void;
  toggleAutoAdjust: () => void;
}

// Default Trading Sessions
const defaultSessions: TradingSession[] = [
  {
    name: 'US Pre-Market',
    market: 'NYSE',
    startTime: '04:00',
    endTime: '09:30',
    timezone: 'America/New_York',
    color: '#FEF3C7',
    isActive: false,
  },
  {
    name: 'US Regular',
    market: 'NYSE',
    startTime: '09:30',
    endTime: '16:00',
    timezone: 'America/New_York',
    color: '#D1FAE5',
    isActive: true,
  },
  {
    name: 'US After Hours',
    market: 'NYSE',
    startTime: '16:00',
    endTime: '20:00',
    timezone: 'America/New_York',
    color: '#DBEAFE',
    isActive: false,
  },
  {
    name: 'London Session',
    market: 'LSE',
    startTime: '08:00',
    endTime: '16:30',
    timezone: 'Europe/London',
    color: '#F3E8FF',
    isActive: false,
  },
  {
    name: 'Tokyo Session',
    market: 'TSE',
    startTime: '09:00',
    endTime: '15:00',
    timezone: 'Asia/Tokyo',
    color: '#FEE2E2',
    isActive: false,
  },
];

// Create Store
export const useCorporateActionsStore = create<CorporateActionsState & CorporateActionsActions>()(
  persist(
    // @ts-expect-error - Zustand v5 middleware type inference issue
    immer<CorporateActionsState & CorporateActionsActions>((set, get, store) => ({
      // Initial State
      actions: [],
      actionsBySymbol: new Map(),
      holidays: [],
      holidaysByMarket: new Map(),
      sessions: defaultSessions,
      activeSessions: ['US Regular'],
      qualityReports: new Map(),
      showAdjusted: true,
      showQualityIndicators: false,
      preferredMarkets: ['NYSE', 'NASDAQ'],
      autoAdjustForActions: true,
      isLoading: false,
      error: null,

      // Corporate Actions
      loadActions: async (symbol?: string) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const url = symbol ? `/api/corporate-actions?symbol=${symbol}` : '/api/corporate-actions';
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to load corporate actions');

          const actions: CorporateAction[] = await response.json();

          set((draft: Draft<CorporateActionsState>) => {
            draft.actions = actions;

            // Group by symbol for faster lookups
            draft.actionsBySymbol.clear();
            for (const action of actions) {
              if (!draft.actionsBySymbol.has(action.symbol)) {
                draft.actionsBySymbol.set(action.symbol, []);
              }
              draft.actionsBySymbol.get(action.symbol)?.push(action);
            }

            draft.isLoading = false;
          });
        } catch (error) {
          set((draft: Draft<CorporateActionsState>) => {
            draft.error = error instanceof Error ? error.message : 'Failed to load actions';
            draft.isLoading = false;
          });
        }
      },

      getActionsForSymbol: (symbol: string) => {
        const { actionsBySymbol } = get();
        return actionsBySymbol.get(symbol.toUpperCase()) || [];
      },

      getUpcomingActions: (days: number) => {
        const { actions } = get();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);

        return actions.filter((action: CorporateAction) => {
          const actionDate = new Date(action.date);
          return actionDate >= new Date() && actionDate <= cutoff;
        });
      },

      // Data Adjustment
      adjustOHLCData: (symbol: string, data: OHLCBar[]) => {
        if (!FLAGS.corpActions) return data;

        const { showAdjusted, autoAdjustForActions, getActionsForSymbol } = get();

        if (!showAdjusted || !autoAdjustForActions) return data;

        const actions = getActionsForSymbol(symbol);
        if (actions.length === 0) return data;

        // Apply adjustments in reverse chronological order
        const sortedActions = [...actions]
          .filter((action: CorporateAction) => action.status === 'processed')
          .sort(
            (a: CorporateAction, b: CorporateAction) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        let adjustedData = [...data];

        for (const action of sortedActions) {
          adjustedData = applyAdjustment(adjustedData, action);
        }

        return adjustedData;
      },

      toggleAdjustedData: () => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.showAdjusted = !draft.showAdjusted;
        });
      },

      // Market Calendar
      loadHolidays: async (market: string, year: number) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await fetch(`/api/market-calendar?market=${market}&year=${year}`);
          if (!response.ok) throw new Error('Failed to load holidays');

          const holidays: MarketHoliday[] = await response.json();

          set((draft: Draft<CorporateActionsState>) => {
            // Merge new holidays
            const existingHolidays = draft.holidaysByMarket.get(market) || [];
            const allHolidays = [...existingHolidays, ...holidays];

            // Remove duplicates by date
            const uniqueHolidays = allHolidays.filter(
              (holiday, index, array) =>
                array.findIndex(
                  (h: MarketHoliday) =>
                    h.date.getTime() === holiday.date.getTime() && h.market === holiday.market
                ) === index
            );

            draft.holidaysByMarket.set(market, uniqueHolidays);
            draft.holidays = Array.from(draft.holidaysByMarket.values()).flat();
            draft.isLoading = false;
          });
        } catch (error) {
          set((draft: Draft<CorporateActionsState>) => {
            draft.error = error instanceof Error ? error.message : 'Failed to load holidays';
            draft.isLoading = false;
          });
        }
      },

      isMarketOpen: (market: string, date: Date) => {
        const { holidaysByMarket } = get();
        const holidays = holidaysByMarket.get(market) || [];

        // Check if it's a weekend
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;

        // Check if it's a holiday
        const dateString = date.toDateString();
        return !holidays.some(
          (holiday: MarketHoliday) =>
            holiday.date.toDateString() === dateString && holiday.type === 'full_close'
        );
      },

      getNextTradingDay: (market: string, date: Date) => {
        const { isMarketOpen } = get();
        const nextDay = new Date(date);

        do {
          nextDay.setDate(nextDay.getDate() + 1);
        } while (!isMarketOpen(market, nextDay));

        return nextDay;
      },

      // Trading Sessions
      updateSessions: (sessions: TradingSession[]) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.sessions = sessions;
        });
      },

      toggleSession: (sessionName: string) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          const session = draft.sessions.find((s: TradingSession) => s.name === sessionName);
          if (session) {
            session.isActive = !session.isActive;

            if (session.isActive) {
              draft.activeSessions.push(sessionName);
            } else {
              const index = draft.activeSessions.indexOf(sessionName);
              if (index !== -1) {
                draft.activeSessions.splice(index, 1);
              }
            }
          }
        });
      },

      getActiveSessionsAt: (time: Date) => {
        const { sessions } = get();

        return sessions.filter((session: TradingSession) => {
          if (!session.isActive) return false;

          // Convert session times to the given date
          const startTime = new Date(time);
          const endTime = new Date(time);

          const [startHour, startMin] = session.startTime.split(':').map(Number);
          const [endHour, endMin] = session.endTime.split(':').map(Number);

          startTime.setHours(startHour, startMin, 0, 0);
          endTime.setHours(endHour, endMin, 0, 0);

          // Handle sessions that cross midnight
          if (endTime < startTime) {
            endTime.setDate(endTime.getDate() + 1);
          }

          return time >= startTime && time <= endTime;
        });
      },

      // Data Quality
      loadQualityReport: async (symbol: string) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await fetch(`/api/data-quality?symbol=${symbol}`);
          if (!response.ok) throw new Error('Failed to load quality report');

          const quality: DataQuality = await response.json();

          set((draft: Draft<CorporateActionsState>) => {
            draft.qualityReports.set(symbol, quality);
            draft.isLoading = false;
          });
        } catch (error) {
          set((draft: Draft<CorporateActionsState>) => {
            draft.error = error instanceof Error ? error.message : 'Failed to load quality report';
            draft.isLoading = false;
          });
        }
      },

      toggleQualityIndicators: () => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.showQualityIndicators = !draft.showQualityIndicators;
        });
      },

      // Settings
      updatePreferredMarkets: (markets: string[]) => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.preferredMarkets = markets;
        });
      },

      toggleAutoAdjust: () => {
        if (!FLAGS.corpActions) return;

        set((draft: Draft<CorporateActionsState>) => {
          draft.autoAdjustForActions = !draft.autoAdjustForActions;
        });
      },
    })),
    {
      name: 'lokifi-corporate-actions-storage',
      version: 1,
      migrate: (persistedState: Partial<CorporateActionsState>, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            qualityReports: new Map(),
            showQualityIndicators: false,
          };
        }
        return persistedState as CorporateActionsState & CorporateActionsActions;
      },
    }
  )
);

// Helper function to apply adjustments
function applyAdjustment(data: OHLCBar[], action: CorporateAction): OHLCBar[] {
  const actionDate = new Date(action.date).getTime();

  return data.map((bar: OHLCBar) => {
    // Only adjust bars before the action date
    if (bar.timestamp >= actionDate) return bar;

    let adjustmentFactor = 1;

    switch (action.type) {
      case 'split':
        if (action.ratio) {
          adjustmentFactor = 1 / action.ratio;
        }
        break;

      case 'dividend':
        if (action.amount) {
          // For dividends, we typically don't adjust OHLC, but this could be configurable
          adjustmentFactor = 1;
        }
        break;

      default:
        return bar;
    }

    if (adjustmentFactor === 1) return bar;

    const adjusted = {
      open: bar.open * adjustmentFactor,
      high: bar.high * adjustmentFactor,
      low: bar.low * adjustmentFactor,
      close: bar.close * adjustmentFactor,
    };

    return {
      ...bar,
      adjusted,
    };
  });
}

// Selectors
export const useMarketHolidays = (market?: string) =>
  useCorporateActionsStore((state: CorporateActionsState & CorporateActionsActions) =>
    market ? state.holidaysByMarket.get(market) || [] : state.holidays
  );

export const useActiveSessions = () =>
  useCorporateActionsStore((state: CorporateActionsState & CorporateActionsActions) =>
    state.sessions.filter((s: TradingSession) => s.isActive)
  );

export const useUpcomingActions = (days = 7) =>
  useCorporateActionsStore((state: CorporateActionsState & CorporateActionsActions) =>
    state.getUpcomingActions(days)
  );

export const useDataQuality = (symbol: string) =>
  useCorporateActionsStore((state: CorporateActionsState & CorporateActionsActions) =>
    state.qualityReports.get(symbol)
  );

// Initialize store with default data
if (typeof window !== 'undefined' && FLAGS.corpActions) {
  const store = useCorporateActionsStore.getState();
  // Load current year holidays for preferred markets
  store.preferredMarkets.forEach((market: string) => {
    store.loadHolidays(market, new Date().getFullYear());
  });
}
