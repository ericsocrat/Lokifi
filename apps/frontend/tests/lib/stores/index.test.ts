import * as stores from '@/lib/stores';
import { drawStore } from '@/lib/stores/drawStore';
import { useDrawingStore } from '@/lib/stores/drawingStore';
import { indicatorStore } from '@/lib/stores/indicatorStore';
import { useMultiChartStore } from '@/lib/stores/multiChartStore';

describe('lib/stores barrel exports', () => {
  it('re-exports drawing stores without conflicts', () => {
    expect(stores.useDrawingStore).toBe(useDrawingStore);
    expect(stores.drawStore).toBe(drawStore);
  });

  it('re-exports core charting stores', () => {
    expect(stores.indicatorStore).toBe(indicatorStore);
    expect(stores.useMultiChartStore).toBe(useMultiChartStore);
  });
});
