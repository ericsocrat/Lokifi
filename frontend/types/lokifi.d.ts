// Global type definitions for Lokifi application
import type { Drawing } from '@/types/drawings';
import type { IChartApi, ISeriesApi } from '@/types/lightweight-charts';

export interface PluginSettings {
  [key: string]: unknown;
}

export interface SymbolSettings {
  indicators?: Record<string, unknown>;
  drawings?: Drawing[];
  timeframe?: string;
  [key: string]: unknown;
}

export interface PluginSettingsStore {
  get(): PluginSettings;
  set(settings: PluginSettings): void;
}

export interface PluginSymbolSettings {
  set(symbol: string, timeframe: string, settings: SymbolSettings): void;
  get(symbol: string, timeframe?: string): SymbolSettings | undefined;
  clear?(symbol: string, timeframe?: string): void;
}

export interface HUDData {
  symbol?: string;
  price?: number;
  change?: number;
  volume?: number;
}

export interface FynixWindow extends Window {
  __fynixApplySymbolSettings?: () => void;
  __fynixClearSymbolSettings?: () => void;
  __fynixHUD?: HUDData;
  __fynixHover?: { x: number; y: number; visible: boolean };
  __fynixGhost?: ISeriesApi | null;
  __fynixStopExtras?: () => void;
}

export interface FynixGlobalThis {
  pluginSettingsStore?: PluginSettingsStore;
  pluginSymbolSettings?: PluginSymbolSettings;
}

declare global {
  interface Window extends FynixWindow {}
  interface GlobalThis extends FynixGlobalThis {}
}

// Chart-related types
export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorData {
  time: number;
  value: number;
}

export interface ChartSeries {
  setData(data: ChartData[]): void;
  update(data: ChartData): void;
}

export interface ChartInstance extends IChartApi {
  // Extends lightweight-charts IChartApi with any custom methods
}
