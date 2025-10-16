# PriceChart.tsx Test Enhancement Plan

**Component**: `src/components/PriceChart.tsx` (370 lines)  
**Current Tests**: `tests/components/PriceChart.test.tsx` (482 lines, 25 tests)  
**Current Coverage**: 46.4% (Statements), 58.82% (Branches), 66.66% (Functions)  
**Target Coverage**: 80%+  
**Status**: 🔄 Enhancement Needed

---

## 📊 Current State Analysis

### Coverage Gaps
**Uncovered Lines**: 66-86 (20 lines), 101-106 (5 lines), 199-216 (17 lines), 306 (1 line), 331-359 (28 lines)

**Total Uncovered**: ~71 lines (19.2% of file)

### Existing Test Problems

**Issue 1: Shallow Assertions**
Most tests only check `container.firstChild`:
```typescript
it('should display Bollinger Bands when enabled', async () => {
  // ... setup
  const { container } = render(<PriceChart />);
  await waitFor(() => {
    expect(container.firstChild).toBeTruthy(); // ❌ Doesn't verify BB actually rendered
  });
});
```

**Issue 2: No Mock Verification**
Tests don't verify chart method calls:
```typescript
// Missing:
expect(mockChart.addLineSeries).toHaveBeenCalledWith({ /* BB config */ });
expect(mockLineSeries.setData).toHaveBeenCalledWith(expect.arrayContaining([...]));
```

**Issue 3: Missing Edge Cases**
- No error handling tests
- No boundary condition tests (empty data, single candle)
- No concurrent indicator tests
- No dynamic setting change tests

---

## 🎯 Enhancement Strategy

### Phase 1: Improve Existing Tests (Priority: HIGH)
**Goal**: Make current 25 tests actually verify behavior

**Tasks**:
1. Add mock verification to all indicator tests
2. Verify chart method calls instead of DOM checks
3. Add cleanup verification to all tests
4. Add data validation to data loading tests

**Example Improvements**:

```typescript
// BEFORE (shallow)
it('should display Bollinger Bands when enabled', async () => {
  (useChartStore as any).mockReturnValue({
    ...mockStoreState,
    indicators: { ...mockStoreState.indicators, showBB: true },
  });
  
  const { container } = render(<PriceChart />);
  await waitFor(() => {
    expect(container.firstChild).toBeTruthy();
  });
});

// AFTER (deep verification)
it('should display Bollinger Bands when enabled', async () => {
  const mockChart = vi.mocked(createChart).mock.results[0].value;
  const mockLineSeries = vi.fn().mockReturnValue({
    setData: vi.fn(),
    chart: vi.fn(() => mockChart),
    applyOptions: vi.fn(),
    priceScale: vi.fn(),
  });
  mockChart.addLineSeries = mockLineSeries;

  (useChartStore as any).mockReturnValue({
    ...mockStoreState,
    indicators: { ...mockStoreState.indicators, showBB: true },
    indicatorSettings: { bbPeriod: 20, bbMultiplier: 2 },
  });
  
  render(<PriceChart />);
  
  // Wait for indicator effect to run
  await waitFor(() => {
    // Verify 3 line series created (basis, upper, lower)
    expect(mockLineSeries).toHaveBeenCalledTimes(3);
    
    // Verify first series has data (basis line)
    const basisSeries = mockLineSeries.mock.results[0].value;
    expect(basisSeries.setData).toHaveBeenCalled();
    const basisData = basisSeries.setData.mock.calls[0][0];
    expect(basisData.length).toBeGreaterThan(0);
    expect(basisData[0]).toHaveProperty('time');
    expect(basisData[0]).toHaveProperty('value');
  }, { timeout: 200 }); // Account for 60ms debounce + render
});
```

**Time Estimate**: 1-2 hours  
**Coverage Impact**: +5-10%

---

### Phase 2: Add Missing Coverage (Priority: MEDIUM)

#### Test Group 1: Chart Initialization (Lines 66-86)
**Uncovered**: Chart creation, series setup, time scale subscription

**New Tests Needed** (5-7 tests):

```typescript
describe('Chart Initialization', () => {
  it('should create chart with theme-based colors', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    
    (useChartStore as any).mockReturnValue({
      ...mockStoreState,
      theme: 'dark',
    });
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(createChart).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: expect.objectContaining({ color: '#0A0E27' }),
            textColor: '#e0e0e0',
          }),
        })
      );
    });
  });

  it('should create candlestick series for price data', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockChart.addCandlestickSeries).toHaveBeenCalledWith({
        upColor: expect.any(String),
        downColor: expect.any(String),
        wickUpColor: expect.any(String),
        wickDownColor: expect.any(String),
      });
    });
  });

  it('should create histogram series for volume with left scale', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockChart.addHistogramSeries).toHaveBeenCalledWith({
        priceScaleId: 'left',
        priceFormat: { type: 'volume' },
        priceLineVisible: false,
      });
    });
  });

  it('should subscribe to visible time range changes', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const mockTimeScale = mockChart.timeScale();
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockTimeScale.subscribeVisibleTimeRangeChange).toHaveBeenCalled();
    });
  });

  it('should publish chart to chartBus', async () => {
    const chartBusSpy = vi.spyOn(chartBus, 'setChart');
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(chartBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chart: expect.any(Object),
          series: expect.any(Object),
        })
      );
    });
  });

  it('should handle chart creation with light theme', async () => {
    (useChartStore as any).mockReturnValue({
      ...mockStoreState,
      theme: 'light',
    });
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(createChart).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          layout: expect.objectContaining({
            background: expect.objectContaining({ color: '#ffffff' }),
            textColor: '#333',
          }),
        })
      );
    });
  });

  it('should clean up chart on unmount', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const { unmount } = render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockChart).toBeTruthy();
    });
    
    unmount();
    
    expect(mockChart.remove).toHaveBeenCalled();
  });
});
```

**Time Estimate**: 45 minutes  
**Coverage Impact**: +5-7%

---

#### Test Group 2: Resize Handling (Lines 101-106)
**Uncovered**: Window resize events, chart resize, LOD updates

**New Tests Needed** (3-4 tests):

```typescript
describe('Resize Handling', () => {
  it('should resize chart on window resize', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockChart).toBeTruthy();
    });
    
    // Trigger resize
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    await waitFor(() => {
      expect(mockChart.resize).toHaveBeenCalled();
    });
  });

  it('should trigger LOD recomputation on resize', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const mockTimeScale = mockChart.timeScale();
    const rangeSpy = vi.fn();
    mockTimeScale.getVisibleRange = rangeSpy.mockReturnValue({ from: 1000, to: 2000 });
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(mockChart).toBeTruthy();
    });
    
    // Trigger resize
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    await waitFor(() => {
      expect(rangeSpy).toHaveBeenCalled();
    });
  });

  it('should remove resize listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<PriceChart />);
    
    await waitFor(() => {
      expect(createChart).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
```

**Time Estimate**: 30 minutes  
**Coverage Impact**: +1-2%

---

#### Test Group 3: Data Adapter Integration (Lines 135-156, 199-216)
**Uncovered**: Adapter creation, event handling, data updates

**New Tests Needed** (6-8 tests):

```typescript
describe('Data Adapter Integration', () => {
  it('should create MarketDataAdapter with provider, symbol, timeframe', async () => {
    const adapterSpy = vi.spyOn(MarketDataAdapter.prototype, 'constructor' as any);
    
    (useChartStore as any).mockReturnValue({
      ...mockStoreState,
      symbol: 'ETHUSDT',
      timeframe: '5m',
    });
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(adapterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'mock',
          symbol: 'ETHUSDT',
          timeframe: '5m',
        })
      );
    });
  });

  it('should subscribe to adapter events', async () => {
    const subscribeSpy = vi.spyOn(MarketDataAdapter.prototype, 'on');
    
    render(<PriceChart />);
    
    await waitFor(() => {
      expect(subscribeSpy).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });

  it('should update candles on data events', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const mockSeries = mockChart.addCandlestickSeries.mock.results[0].value;
    
    render(<PriceChart />);
    
    // Simulate adapter emitting data
    const adapter = MarketDataAdapter.prototype;
    const dataHandler = (adapter.on as any).mock.calls.find(
      (call: any[]) => call[0] === 'data'
    )?.[1];
    
    const newCandles = [
      { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    ];
    
    act(() => {
      dataHandler({ candles: newCandles });
    });
    
    await waitFor(() => {
      expect(mockSeries.setData).toHaveBeenCalledWith(
        expect.arrayContaining(newCandles)
      );
    });
  });

  it('should stop adapter on unmount', async () => {
    const stopSpy = vi.spyOn(MarketDataAdapter.prototype, 'stop');
    const { unmount } = render(<PriceChart />);
    
    await waitFor(() => {
      expect(createChart).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should recreate adapter on symbol change', async () => {
    const { rerender } = render(<PriceChart />);
    
    await waitFor(() => {
      expect(MarketDataAdapter).toHaveBeenCalledTimes(1);
    });
    
    // Change symbol
    (useChartStore as any).mockReturnValue({
      ...mockStoreState,
      symbol: 'ETHUSDT',
    });
    
    rerender(<PriceChart />);
    
    await waitFor(() => {
      expect(MarketDataAdapter).toHaveBeenCalledTimes(2);
    });
  });

  it('should recreate adapter on timeframe change', async () => {
    const { rerender } = render(<PriceChart />);
    
    await waitFor(() => {
      expect(MarketDataAdapter).toHaveBeenCalledTimes(1);
    });
    
    // Change timeframe
    (useChartStore as any).mockReturnValue({
      ...mockStoreState,
      timeframe: '15m',
    });
    
    rerender(<PriceChart />);
    
    await waitFor(() => {
      expect(MarketDataAdapter).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Time Estimate**: 1 hour  
**Coverage Impact**: +8-12%

---

#### Test Group 4: Indicator Calculations (Lines 219-306)
**Uncovered**: BB, VWAP, VWMA, StdChannels calculations with settings

**New Tests Needed** (12-15 tests):

```typescript
describe('Indicator Calculations', () => {
  describe('Bollinger Bands', () => {
    it('should use correct period from settings', async () => {
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const mockLineSeries = vi.fn();
      mockChart.addLineSeries = mockLineSeries;
      
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { ...mockStoreState.indicators, showBB: true },
        indicatorSettings: { bbPeriod: 50, bbMultiplier: 2 },
      });
      
      render(<PriceChart />);
      
      await waitFor(() => {
        expect(mockLineSeries).toHaveBeenCalledTimes(3); // basis, upper, lower
      }, { timeout: 200 });
    });

    it('should use correct multiplier from settings', async () => {
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const mockLineSeries = vi.fn();
      mockChart.addLineSeries = mockLineSeries;
      
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { ...mockStoreState.indicators, showBB: true },
        indicatorSettings: { bbPeriod: 20, bbMultiplier: 3 },
      });
      
      render(<PriceChart />);
      
      await waitFor(() => {
        expect(mockLineSeries).toHaveBeenCalledTimes(3);
      }, { timeout: 200 });
    });

    it('should apply band fill when enabled', async () => {
      // Test bandFill option
    });

    it('should recalculate on period change', async () => {
      // Test dynamic setting updates
    });
  });

  describe('VWAP', () => {
    it('should respect vwapAnchorIndex setting', async () => {
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const mockLineSeries = vi.fn();
      mockChart.addLineSeries = mockLineSeries;
      
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { ...mockStoreState.indicators, showVWAP: true },
        indicatorSettings: { vwapAnchorIndex: 100 },
      });
      
      render(<PriceChart />);
      
      await waitFor(() => {
        expect(mockLineSeries).toHaveBeenCalled();
        const vwapSeries = mockLineSeries.mock.results[0].value;
        expect(vwapSeries.setData).toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('should handle anchor beyond data range', async () => {
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { ...mockStoreState.indicators, showVWAP: true },
        indicatorSettings: { vwapAnchorIndex: 99999 },
      });
      
      const { container } = render(<PriceChart />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
      // Should not crash
    });
  });

  describe('VWMA', () => {
    it('should calculate with correct period', async () => {
      // Test VWMA period
    });
  });

  describe('Standard Deviation Channels', () => {
    it('should create 3 line series (mid, upper, lower)', async () => {
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const mockLineSeries = vi.fn();
      mockChart.addLineSeries = mockLineSeries;
      
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { ...mockStoreState.indicators, showStdChannels: true },
      });
      
      render(<PriceChart />);
      
      await waitFor(() => {
        expect(mockLineSeries).toHaveBeenCalledTimes(3);
      }, { timeout: 200 });
    });
  });

  describe('Multiple Indicators', () => {
    it('should handle all indicators simultaneously', async () => {
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const mockLineSeries = vi.fn();
      mockChart.addLineSeries = mockLineSeries;
      
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: {
          showBB: true,
          showVWAP: true,
          showVWMA: true,
          showStdChannels: true,
        },
      });
      
      render(<PriceChart />);
      
      await waitFor(() => {
        // BB: 3 series, VWAP: 1, VWMA: 1, StdCh: 3 = 8 total
        expect(mockLineSeries).toHaveBeenCalledTimes(8);
      }, { timeout: 200 });
    });

    it('should toggle individual indicators without affecting others', async () => {
      const { rerender } = render(<PriceChart />);
      
      // Enable BB
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { showBB: true, showVWAP: false },
      });
      rerender(<PriceChart />);
      
      await waitFor(() => {
        expect(window._bbSeries).toBeDefined();
      });
      
      // Enable VWAP, keep BB
      (useChartStore as any).mockReturnValue({
        ...mockStoreState,
        indicators: { showBB: true, showVWAP: true },
      });
      rerender(<PriceChart />);
      
      await waitFor(() => {
        expect(window._vwap).toBeDefined();
        expect(window._bbSeries).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty candles array', async () => {
      // Set empty candles
      const mockChart = vi.mocked(createChart).mock.results[0].value;
      const adapter = MarketDataAdapter.prototype;
      const dataHandler = (adapter.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];
      
      render(<PriceChart />);
      
      act(() => {
        dataHandler({ candles: [] });
      });
      
      await waitFor(() => {
        expect(mockChart).toBeTruthy();
      });
      // Should not crash
    });

    it('should handle single candle', async () => {
      // Similar test with 1 candle
    });

    it('should handle insufficient data for period', async () => {
      // BB with period 20 but only 10 candles
    });
  });
});
```

**Time Estimate**: 2-2.5 hours  
**Coverage Impact**: +15-20%

---

#### Test Group 5: Dynamic LOD (Lines 331-359)
**Uncovered**: Visible range detection, downsampling, updates

**New Tests Needed** (5-7 tests):

```typescript
describe('Dynamic Level of Detail', () => {
  it('should compute visible range on pan/zoom', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const mockTimeScale = mockChart.timeScale();
    const rangeSpy = vi.fn().mockReturnValue({ from: 1000, to: 2000 });
    mockTimeScale.getVisibleRange = rangeSpy;
    
    render(<PriceChart />);
    
    // Trigger visible range change
    const rangeHandler = mockTimeScale.subscribeVisibleTimeRangeChange.mock.calls[0][0];
    act(() => {
      rangeHandler({ from: 1500, to: 2500 });
    });
    
    await waitFor(() => {
      expect(rangeSpy).toHaveBeenCalled();
    });
  });

  it('should slice candles to visible window', async () => {
    // Test window slicing logic
  });

  it('should downsample based on screen width', async () => {
    // Test bucket calculation
  });

  it('should handle different time formats', async () => {
    // Test Time type conversions (number, string, {day, month, year})
  });

  it('should update both candlestick and volume series', async () => {
    const mockChart = vi.mocked(createChart).mock.results[0].value;
    const mockCandleSeries = mockChart.addCandlestickSeries.mock.results[0].value;
    const mockVolumeSeries = mockChart.addHistogramSeries.mock.results[0].value;
    
    render(<PriceChart />);
    
    const rangeHandler = mockChart.timeScale().subscribeVisibleTimeRangeChange.mock.calls[0][0];
    act(() => {
      rangeHandler({ from: 1000, to: 2000 });
    });
    
    await waitFor(() => {
      expect(mockCandleSeries.setData).toHaveBeenCalled();
      expect(mockVolumeSeries.setData).toHaveBeenCalled();
    });
  });

  it('should handle very large datasets efficiently', async () => {
    // Test with 10000+ candles
  });

  it('should handle minimal data (< 10 candles)', async () => {
    // Test edge case
  });
});
```

**Time Estimate**: 1 hour  
**Coverage Impact**: +5-8%

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Do First)
- [ ] Fix existing mock setup to be more complete
- [ ] Add mock verification helpers
- [ ] Update all 25 existing tests to verify behavior
- [ ] Ensure all tests clean up properly

### Phase 2: Coverage Expansion
- [ ] Add Chart Initialization tests (7 tests)
- [ ] Add Resize Handling tests (3-4 tests)
- [ ] Add Data Adapter Integration tests (6-8 tests)
- [ ] Add Indicator Calculation tests (12-15 tests)
- [ ] Add Dynamic LOD tests (5-7 tests)

### Phase 3: Validation
- [ ] Run full test suite
- [ ] Check coverage report
- [ ] Verify all uncovered lines are now covered
- [ ] Ensure no test regressions

### Phase 4: Documentation
- [ ] Update test file header with coverage info
- [ ] Add comments for complex test setups
- [ ] Document any remaining uncovered edge cases

---

## 🎯 Expected Outcomes

### Test Metrics
- **Current**: 25 tests, 46.4% coverage
- **Target**: 60-70 tests, 80%+ coverage
- **Tests to Add**: 35-45 tests

### Time Investment
- **Phase 1** (Improve existing): 1-2 hours
- **Phase 2** (Add new tests): 4-5 hours
- **Total**: **5-7 hours**

### Coverage Improvement
- **Statements**: 46.4% → 80%+ (+33.6%)
- **Branches**: 58.82% → 75%+ (+16.18%)
- **Functions**: 66.66% → 85%+ (+18.34%)
- **Lines**: 46.4% → 80%+ (+33.6%)

### Frontend Coverage Impact
- Current frontend: 9.4%
- Expected after enhancement: **10.5-11%** (+1-1.5%)

---

## 🚧 Known Challenges

### Challenge 1: lightweight-charts Mock Complexity
**Problem**: Chart library has extensive API surface  
**Solution**: Create comprehensive mock factory function

```typescript
function createMockChart() {
  const mockSeries = createMockSeries();
  const mockTimeScale = createMockTimeScale();
  
  return {
    addCandlestickSeries: vi.fn(() => mockSeries),
    addLineSeries: vi.fn(() => createMockSeries()),
    addHistogramSeries: vi.fn(() => mockSeries),
    timeScale: vi.fn(() => mockTimeScale),
    resize: vi.fn(),
    remove: vi.fn(),
    // ... complete API
  };
}
```

### Challenge 2: Async Effect Timing
**Problem**: Multiple effects with debouncing/throttling  
**Solution**: Use longer timeouts in waitFor, test with act()

```typescript
await waitFor(() => {
  expect(mockChart.addLineSeries).toHaveBeenCalled();
}, { timeout: 200 }); // Account for 60ms debounce + render time
```

### Challenge 3: MarketDataAdapter Mocking
**Problem**: Need to emit events for testing  
**Solution**: Mock constructor and provide event emission helpers

```typescript
const mockAdapter = {
  on: vi.fn(),
  stop: vi.fn(),
  emit: (event: string, data: any) => {
    const handler = mockAdapter.on.mock.calls.find(c => c[0] === event)?.[1];
    handler?.(data);
  },
};
```

### Challenge 4: Indicator Math Verification
**Problem**: Hard to verify calculations without implementation knowledge  
**Solution**: Test structure, not exact values; verify data shape

```typescript
// Don't test exact BB values (implementation detail)
expect(basisData[0].value).toBe(123.45); // ❌ Brittle

// Instead test data structure
expect(basisData[0]).toMatchObject({
  time: expect.any(Number),
  value: expect.any(Number),
});
expect(basisData.length).toBeGreaterThan(0);
```

---

## 🔄 Alternative: Incremental Approach

If 5-7 hours is too much investment at once:

### Option A: Quick Win (~2 hours, +15-20% coverage)
1. Improve existing 25 tests (Phase 1 only)
2. Add Chart Initialization tests (7 tests)
3. Add Data Adapter tests (6 tests)
4. **Result**: ~38 tests, 65% coverage

### Option B: Targeted Enhancement (~3 hours, +20-25% coverage)
1. Fix existing tests (Phase 1)
2. Add Indicator tests only (Phase 2 - Group 4)
3. **Result**: ~40 tests, 70% coverage

### Option C: Defer Until Later
1. Document gaps in this plan
2. Move to other batches for quicker wins
3. Return when ready for deeper dive

---

## 📚 References

### Related Files
- `src/components/PriceChart.tsx` (370 lines) - Source component
- `tests/components/PriceChart.test.tsx` (482 lines) - Existing tests
- `src/lib/indicators/*.ts` - Indicator calculation functions
- `src/lib/utils/lod.ts` - Level of Detail downsampling
- `src/data/adapter.ts` - MarketDataAdapter

### Documentation
- [lightweight-charts API](https://tradingview.github.io/lightweight-charts/docs/api)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

### Related Test Files
- `tests/components/SymbolTfBar.test.tsx` - Example of excellent coverage (98.86%)
- `tests/hooks/useMarketData.test.ts` - Similar adapter testing patterns

---

**Status**: 📋 Plan Created - Ready for Implementation

**Recommendation**: Start with Option A (Quick Win) to get to 65% coverage in ~2 hours, then decide if deeper enhancement is worth the additional time investment.