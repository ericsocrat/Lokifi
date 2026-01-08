import { startPriceFeed } from '@/api/price-feed';
import { setVisibleBarCoords } from '@/lib/charts/chartMap';
import type { IChartApi, ISeriesApi, SeriesDataPoint, Time } from 'lightweight-charts';

/**
 * Lightweight-charts extras:
 *  - Feeds precise bar X coords (for X-snap) from real series data
 *  - Starts a live price feed that drives the alerts engine (line/level crossings)
 */
export function wireLightweightChartsExtras(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts types are incomplete
  chart: IChartApi | any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts types are incomplete
  series: ISeriesApi<'Candlestick'> | any,
  getSeriesData: () => Array<SeriesDataPoint>,
  getLastPrice: () => number | null
) {
  if (!chart || !series) return () => {};

  const ts = chart.timeScale?.();

  const collectBarXs = () => {
    try {
      const data = getSeriesData() || [];
      if (!data.length) {
        setVisibleBarCoords([]);
        return;
      }
      const vr = ts?.getVisibleRange?.() ?? ts?.getVisibleLogicalRange?.();
      const slice =
        vr &&
        'from' in vr &&
        'to' in vr &&
        [vr.from, vr.to].every((v) => Number.isFinite(Number(v)))
          ? data.slice(
              Math.max(0, Math.floor(Number(vr.from))),
              Math.min(data.length, Math.ceil(Number(vr.to)) + 1)
            )
          : data.slice(-400);
      const xs: number[] = [];
      for (const bar of slice) {
        const x = ts?.timeToCoordinate?.(bar.time as Time);
        if (typeof x === 'number' && Number.isFinite(x)) xs.push(x);
      }
      setVisibleBarCoords(xs);
    } catch {
      // ignore
    }
  };

  ts?.subscribeVisibleTimeRangeChange?.(collectBarXs);
  ts?.subscribeVisibleLogicalRangeChange?.(collectBarXs);
  collectBarXs();

  const stopFeed = startPriceFeed(getLastPrice, 500);

  return () => {
    try {
      ts?.unsubscribeVisibleTimeRangeChange?.(collectBarXs);
    } catch {}
    try {
      ts?.unsubscribeVisibleLogicalRangeChange?.(collectBarXs);
    } catch {}
    try {
      stopFeed();
    } catch {}
  };
}

