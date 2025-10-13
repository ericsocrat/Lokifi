import { describe, it, expect, beforeEach } from 'vitest';
import { usePaneStore } from '@/lib/stores/paneStore';

describe('PaneStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePaneStore.getState().resetPanes();
  });

  it('should initialize with default price pane', () => {
    const { panes } = usePaneStore.getState();
    
    expect(panes).toHaveLength(1);
    expect(panes[0].type).toBe('price');
    expect(panes[0].id).toBe('price-pane');
    expect(panes[0].height).toBe(400);
    expect(panes[0].visible).toBe(true);
    expect(panes[0].locked).toBe(false);
  });

  it('should add indicator pane', () => {
    const { addPane } = usePaneStore.getState();
    
    const newPaneId = addPane('indicator', ['rsi']);
    const { panes } = usePaneStore.getState();
    
    expect(panes).toHaveLength(2);
    
    const indicatorPane = panes.find((pane: any) => pane.id === newPaneId);
    expect(indicatorPane).toBeDefined();
    expect(indicatorPane?.type).toBe('indicator');
    expect(indicatorPane?.height).toBe(150);
    expect(indicatorPane?.indicators).toEqual(['rsi']);
  });

  it('should add indicator to existing pane', () => {
    const { addIndicatorToPane, panes } = usePaneStore.getState();
    const pricePane = panes[0];
    
    addIndicatorToPane(pricePane.id, 'sma');
    
    const updatedPanes = usePaneStore.getState().panes;
    const updatedPricePane = updatedPanes.find((pane: any) => pane.id === pricePane.id);
    
    expect(updatedPricePane?.indicators).toContain('sma');
  });

  it('should remove indicator from pane', () => {
    const { addIndicatorToPane, removeIndicatorFromPane, panes } = usePaneStore.getState();
    const pricePane = panes[0];
    
    // Add indicator
    addIndicatorToPane(pricePane.id, 'sma');
    
    // Remove indicator
    removeIndicatorFromPane(pricePane.id, 'sma');
    
    const updatedPanes = usePaneStore.getState().panes;
    const updatedPricePane = updatedPanes.find((pane: any) => pane.id === pricePane.id);
    
    expect(updatedPricePane?.indicators).not.toContain('sma');
  });

  it('should move indicator between panes', () => {
    const { addPane, addIndicatorToPane, moveIndicatorToPane, panes } = usePaneStore.getState();
    
    const pricePane = panes[0];
    const indicatorPaneId = addPane('indicator', []);
    
    // Add indicator to price pane
    addIndicatorToPane(pricePane.id, 'sma');
    
    // Move to indicator pane
    moveIndicatorToPane('sma', pricePane.id, indicatorPaneId);
    
    const updatedPanes = usePaneStore.getState().panes;
    const updatedPricePane = updatedPanes.find((pane: any) => pane.id === pricePane.id);
    const updatedIndicatorPane = updatedPanes.find((pane: any) => pane.id === indicatorPaneId);
    
    expect(updatedPricePane?.indicators).not.toContain('sma');
    expect(updatedIndicatorPane?.indicators).toContain('sma');
  });

  it('should toggle pane visibility', () => {
    const { togglePaneVisibility, panes } = usePaneStore.getState();
    const pricePane = panes[0];
    
    expect(pricePane.visible).toBe(true);
    
    togglePaneVisibility(pricePane.id);
    
    const updatedPanes = usePaneStore.getState().panes;
    const updatedPricePane = updatedPanes.find((pane: any) => pane.id === pricePane.id);
    
    expect(updatedPricePane?.visible).toBe(false);
  });

  it('should update pane height', () => {
    const { updatePaneHeight, panes } = usePaneStore.getState();
    const pricePane = panes[0];
    
    updatePaneHeight(pricePane.id, 500);
    
    const updatedPanes = usePaneStore.getState().panes;
    const updatedPricePane = updatedPanes.find((pane: any) => pane.id === pricePane.id);
    
    expect(updatedPricePane?.height).toBe(500);
  });

  it('should remove pane', () => {
    const { addPane, removePane } = usePaneStore.getState();
    
    const indicatorPaneId = addPane('indicator', ['rsi']);
    let { panes } = usePaneStore.getState();
    expect(panes).toHaveLength(2);
    
    removePane(indicatorPaneId);
    panes = usePaneStore.getState().panes;
    expect(panes).toHaveLength(1);
    expect(panes.find((pane: any) => pane.id === indicatorPaneId)).toBeUndefined();
  });

  it('should reorder panes', () => {
    const { addPane, reorderPanes, panes } = usePaneStore.getState();
    
    const pane1Id = panes[0].id;
    const pane2Id = addPane('indicator', ['rsi']);
    const pane3Id = addPane('indicator', ['macd']);
    
    // Reorder: move pane3 to first position
    reorderPanes([pane3Id, pane1Id, pane2Id]);
    
    const reorderedPanes = usePaneStore.getState().panes;
    expect(reorderedPanes[0].id).toBe(pane3Id);
    expect(reorderedPanes[1].id).toBe(pane1Id);
    expect(reorderedPanes[2].id).toBe(pane2Id);
  });
});

