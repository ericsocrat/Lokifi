import type { Drawing } from '@/lib/utils/drawings';
import {
  describeDrawing,
  DEFAULT_LABEL_CONFIG,
  type LabelConfig,
} from '@/lib/utils/labels';
import { useChartStore } from '@/state/store';
import React, { useMemo, useSyncExternalStore } from 'react';

/** Extended config that includes enabled flag for UI toggle */
interface ExtendedLabelConfig extends LabelConfig {
  readonly enabled: boolean;
}

/** Default config with enabled flag */
const DEFAULT_CONFIG: ExtendedLabelConfig = {
  ...DEFAULT_LABEL_CONFIG,
  enabled: true,
};

/** Layer visibility info */
interface LayerInfo {
  readonly id: string;
  readonly visible: boolean;
  readonly opacity?: number;
}

export default function LabelsLayer() {
  // Use useSyncExternalStore for better React 18 concurrent mode support
  const drawings = useSyncExternalStore(
    useChartStore.subscribe,
    () => useChartStore.getState().drawings,
    () => useChartStore.getState().drawings
  );

  const layers = useSyncExternalStore(
    useChartStore.subscribe,
    () => useChartStore.getState().layers,
    () => useChartStore.getState().layers
  );

  const autoLabels = useSyncExternalStore(
    useChartStore.subscribe,
    () => useChartStore.getState().autoLabels,
    () => useChartStore.getState().autoLabels
  );

  const cfg: ExtendedLabelConfig = autoLabels || DEFAULT_CONFIG;
  // Create layer lookup map for O(1) access
  const layerMap = useMemo(() => {
    const map = new Map<string, LayerInfo>();
    layers?.forEach((l: LayerInfo) => map.set(l.id, l));
    return map;
  }, [layers]);

  // Memoize label calculations - only recalculate when drawings or config change
  const labels = useMemo(() => {
    if (!cfg.enabled) return [];

    return drawings
      .map((d: Drawing) => {
        // Check layer visibility using O(1) map lookup
        const layer = (d.layerId ? layerMap.get(d.layerId) : undefined) || { visible: true, opacity: 1 };
        if (!layer.visible || (layer.opacity ?? 1) === 0) return null;

        const info = describeDrawing(d, cfg);
        if (!info) return null;

        return {
          id: d.id,
          text: info.text,
          x: info.anchor.x + 8,
          y: info.anchor.y - 8,
        };
      })
      .filter(Boolean);
  }, [drawings, cfg, layerMap]);

  if (labels.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {labels.map((label) => (
        <div
          key={`lab-${label!.id}`}
          style={{
            position: 'absolute',
            left: label!.x,
            top: label!.y,
            transform: 'translateY(-100%)',
          }}
          className="text-[11px] leading-none px-2 py-1 rounded bg-black/70 border border-white/10 text-white/90"
        >
          {label!.text}
        </div>
      ))}
    </div>
  );
}
