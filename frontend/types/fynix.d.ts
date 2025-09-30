// Global type definitions for Fynix application
export interface PluginSettingsStore {
  get(): any;
  set(settings: any): void;
}

export interface PluginSymbolSettings {
  set(symbol: string, timeframe: string, settings: any): void;
  get(symbol: string, timeframe?: string): any;
  clear?(symbol: string, timeframe?: string): void;
}

export interface FynixWindow extends Window {
  __fynixApplySymbolSettings?: () => void;
  __fynixClearSymbolSettings?: () => void;
  __fynixHUD?: any;
  __fynixHover?: any;
  __fynixGhost?: any;
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

export interface ChartInstance {
  addCandlestickSeries(): ChartSeries;
  addLineSeries(): ChartSeries;
  addHistogramSeries(): ChartSeries;
  timeScale(): any;
  remove(): void;
  applyOptions(options: any): void;
}