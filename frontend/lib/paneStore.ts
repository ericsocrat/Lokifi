"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Pane {
  id: string;
  type: 'price' | 'indicator';
  height: number;
  indicators: string[];
  visible: boolean;
  locked: boolean;
}

interface PaneState {
  panes: Pane[];
  draggedPane: string | null;
  
  // Actions
  addPane: (type: 'price' | 'indicator', indicators?: string[]) => string;
  removePane: (paneId: string) => void;
  updatePaneHeight: (paneId: string, height: number) => void;
  addIndicatorToPane: (paneId: string, indicatorId: string) => void;
  removeIndicatorFromPane: (paneId: string, indicatorId: string) => void;
  moveIndicatorToPane: (indicatorId: string, fromPaneId: string, toPaneId: string) => void;
  togglePaneVisibility: (paneId: string) => void;
  togglePaneLock: (paneId: string) => void;
  reorderPanes: (paneIds: string[]) => void;
  setDraggedPane: (paneId: string | null) => void;
  resetPanes: () => void;
}

const DEFAULT_PANES: Pane[] = [
  {
    id: 'price-pane',
    type: 'price',
    height: 400,
    indicators: ['sma', 'ema', 'bb', 'vwap'], // Price overlay indicators
    visible: true,
    locked: false,
  },
];

export const usePaneStore = create<PaneState>()(
  persist(
    (set: (partial: Partial<PaneState> | ((state: PaneState) => Partial<PaneState>)) => void, get: () => PaneState) => ({
      panes: DEFAULT_PANES,
      draggedPane: null,

      addPane: (type: 'price' | 'indicator', indicators: string[] = []) => {
        const newPane: Pane = {
          id: `${type}-pane-${Date.now()}`,
          type,
          height: type === 'price' ? 400 : 150,
          indicators,
          visible: true,
          locked: false,
        };

        set(state => ({
          panes: [...state.panes, newPane]
        }));

        return newPane.id;
      },

      removePane: (paneId: string) => {
        set(state => ({
          panes: state.panes.filter((pane: Pane) => pane.id !== paneId)
        }));
      },

      updatePaneHeight: (paneId: string, height: number) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) =>
            pane.id === paneId ? { ...pane, height } : pane
          )
        }));
      },

      addIndicatorToPane: (paneId: string, indicatorId: string) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) =>
            pane.id === paneId 
              ? { ...pane, indicators: [...pane.indicators, indicatorId] }
              : pane
          )
        }));
      },

      removeIndicatorFromPane: (paneId: string, indicatorId: string) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) =>
            pane.id === paneId
              ? { ...pane, indicators: pane.indicators.filter((id: string) => id !== indicatorId) }
              : pane
          )
        }));
      },

      moveIndicatorToPane: (indicatorId: string, fromPaneId: string, toPaneId: string) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) => {
            if (pane.id === fromPaneId) {
              return { ...pane, indicators: pane.indicators.filter((id: string) => id !== indicatorId) };
            }
            if (pane.id === toPaneId) {
              return { ...pane, indicators: [...pane.indicators, indicatorId] };
            }
            return pane;
          })
        }));
      },

      togglePaneVisibility: (paneId: string) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) =>
            pane.id === paneId ? { ...pane, visible: !pane.visible } : pane
          )
        }));
      },

      togglePaneLock: (paneId: string) => {
        set(state => ({
          panes: state.panes.map((pane: Pane) =>
            pane.id === paneId ? { ...pane, locked: !pane.locked } : pane
          )
        }));
      },

      reorderPanes: (paneIds: string[]) => {
        const { panes } = get();
        const reorderedPanes = paneIds.map(id => panes.find((pane: Pane) => pane.id === id)!).filter(Boolean);
        set({ panes: reorderedPanes });
      },

      setDraggedPane: (paneId: string | null) => {
        set({ draggedPane: paneId });
      },

      resetPanes: () => {
        set({ panes: DEFAULT_PANES, draggedPane: null });
      },
    }),
    {
      name: 'lokifi-panes',
      partialize: (state: PaneState) => ({ panes: state.panes }),
    }
  )
);