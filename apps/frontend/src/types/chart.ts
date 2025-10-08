export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  order: number;
  locked: boolean;
}

export interface IndicatorSettings {
  stdChannelPeriod: number;
  stdChannelMult: number;
}

export interface AutoLabels {
  showValue: boolean;
  showPercent: boolean;
  showAngle: boolean;
  showRR: boolean;
  enabled: boolean;
}

export interface ChartState {
  symbol: string;
  timeframe: string;
  drawings: any[];
  drawingSettings: {
    lineWidth: number;
    color: string;
    opacity: number;
    fontSize: number;
  };
  selection: Set<string>;
  activeLayerId: string | null;
  layers: Layer[];
  indicatorSettings: IndicatorSettings;
  autoLabels: AutoLabels;
  activeTool: string | null;
  alerts: any[];
  hotkeys: Record<string, string>;
  updateIndicatorSettings: (settings: Partial<IndicatorSettings>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  moveLayer: (layerId: string, direction: 'up' | 'down') => void;
  setActiveLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  addLayer: (name: string) => void;
  toggleLockSelected: () => void;
  toggleVisibilitySelected: () => void;
  renameSelected: (name: string) => void;
  setSelectedStyle: (style: Partial<{stroke: string}>) => void;
}