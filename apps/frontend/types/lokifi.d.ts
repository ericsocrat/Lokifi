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

export interface LokifiWindow extends Window {
  __lokifiApplySymbolSettings?: () => void;
  __lokifiClearSymbolSettings?: () => void;
  __lokifiHUD?: HUDData;
  __lokifiHover?: { x: number; y: number; visible: boolean };
  __lokifiGhost?: ISeriesApi | null;
  __lokifiStopExtras?: () => void;
}

export interface LokifiGlobalThis {
  pluginSettingsStore?: PluginSettingsStore;
  pluginSymbolSettings?: PluginSymbolSettings;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window extends FynixWindow {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChartInstance extends IChartApi {
  // Extends lightweight-charts IChartApi with any custom methods
}

// Extend Window interface with custom Lokifi globals
declare global {
  interface Window {
    __lokifi_toast?: (message: string) => void;
    __lokifi_lastSnapshotPng?: string;
  }
}
