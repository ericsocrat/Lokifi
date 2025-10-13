import * as chartMapModule from '@/lib/charts/chartMap';
import { wireLightweightChartsMappings } from '@/lib/charts/lw-mapping';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the chartMap module
vi.mock('@/lib/charts/chartMap', () => ({
  setMappers: vi.fn(),
  setVisibleBarCoords: vi.fn(),
  setVisiblePriceLevels: vi.fn(),
}));

const mockSetMappers = chartMapModule.setMappers as ReturnType<typeof vi.fn>;
const mockSetVisibleBarCoords = chartMapModule.setVisibleBarCoords as ReturnType<typeof vi.fn>;
const mockSetVisiblePriceLevels = chartMapModule.setVisiblePriceLevels as ReturnType<typeof vi.fn>;

describe('wireLightweightChartsMappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns early if chart is null', () => {
      wireLightweightChartsMappings(null, {} as any);
      expect(mockSetMappers).not.toHaveBeenCalled();
    });

    it('returns early if series is null', () => {
      wireLightweightChartsMappings({} as any, null);
      expect(mockSetMappers).not.toHaveBeenCalled();
    });

    it('returns early if both chart and series are null', () => {
      wireLightweightChartsMappings(null, null);
      expect(mockSetMappers).not.toHaveBeenCalled();
    });

    it('calls setMappers with coordinate conversion functions', () => {
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(100),
        priceToCoordinate: vi.fn().mockReturnValue(50),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn().mockReturnValue(1000000),
          timeToCoordinate: vi.fn().mockReturnValue(200),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: {
          clientHeight: 600,
        },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      expect(mockSetMappers).toHaveBeenCalledWith(
        expect.objectContaining({
          yToPrice: expect.any(Function),
          priceToY: expect.any(Function),
          xToTime: expect.any(Function),
          timeToX: expect.any(Function),
        })
      );
    });
  });

  describe('coordinate conversion - yToPrice', () => {
    it('converts Y coordinate to price successfully', () => {
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(100.5),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          timeToCoordinate: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      // Get the yToPrice function from the call
      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const yToPrice = mappersArg?.yToPrice;

      expect(yToPrice).toBeDefined();
      const result = yToPrice(50);
      expect(result).toBe(100.5);
      expect(mockSeries.coordinateToPrice).toHaveBeenCalledWith(50);
    });

    it('returns null when coordinateToPrice returns non-number', () => {
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(undefined),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          timeToCoordinate: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const yToPrice = mappersArg?.yToPrice;

      const result = yToPrice(50);
      expect(result).toBeNull();
    });

    it('handles missing coordinateToPrice method', () => {
      const mockSeries = {};

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          timeToCoordinate: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const yToPrice = mappersArg?.yToPrice;

      const result = yToPrice(50);
      expect(result).toBeNull();
    });
  });

  describe('coordinate conversion - priceToY', () => {
    it('converts price to Y coordinate successfully', () => {
      const mockSeries = {
        priceToCoordinate: vi.fn().mockReturnValue(75),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          timeToCoordinate: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const priceToY = mappersArg?.priceToY;

      expect(priceToY).toBeDefined();
      const result = priceToY(100.5);
      expect(result).toBe(75);
      expect(mockSeries.priceToCoordinate).toHaveBeenCalledWith(100.5);
    });

    it('returns null when priceToCoordinate returns non-number', () => {
      const mockSeries = {
        priceToCoordinate: vi.fn().mockReturnValue(null),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          timeToCoordinate: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const priceToY = mappersArg?.priceToY;

      const result = priceToY(100.5);
      expect(result).toBeNull();
    });
  });

  describe('coordinate conversion - xToTime', () => {
    it('converts X coordinate to time successfully', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn().mockReturnValue(1609459200),
        timeToCoordinate: vi.fn(),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {};

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const xToTime = mappersArg?.xToTime;

      expect(xToTime).toBeDefined();
      const result = xToTime(300);
      expect(result).toBe(1609459200);
      expect(mockTimeScale.coordinateToTime).toHaveBeenCalledWith(300);
    });

    it('returns null when coordinateToTime is unavailable', () => {
      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {};

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const xToTime = mappersArg?.xToTime;

      const result = xToTime(300);
      expect(result).toBeNull();
    });
  });

  describe('coordinate conversion - timeToX', () => {
    it('converts time to X coordinate successfully', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(250),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {};

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const timeToX = mappersArg?.timeToX;

      expect(timeToX).toBeDefined();
      const result = timeToX(1609459200);
      expect(result).toBe(250);
      expect(mockTimeScale.timeToCoordinate).toHaveBeenCalledWith(1609459200);
    });

    it('handles string time input', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(250),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {};

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const timeToX = mappersArg?.timeToX;

      const result = timeToX('2021-01-01');
      expect(result).toBe(250);
    });

    it('returns null when timeToCoordinate is unavailable', () => {
      const mockChart = {
        timeScale: vi.fn().mockReturnValue({
          coordinateToTime: vi.fn(),
          subscribeVisibleTimeRangeChange: vi.fn(),
          subscribeVisibleLogicalRangeChange: vi.fn(),
          getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
        }),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {};

      wireLightweightChartsMappings(mockChart, mockSeries);

      const mappersArg = mockSetMappers.mock.calls[0]?.[0];
      const timeToX = mappersArg?.timeToX;

      const result = timeToX(1609459200);
      expect(result).toBeNull();
    });
  });

  describe('visible range updates', () => {
    it('calls setVisibleBarCoords with coordinate array', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      // Should call setVisibleBarCoords with an array of ~50 coordinates
      expect(mockSetVisibleBarCoords).toHaveBeenCalled();
      const coords = mockSetVisibleBarCoords.mock.calls[0]?.[0];
      expect(Array.isArray(coords)).toBe(true);
      expect(coords.length).toBeGreaterThan(0);
    });

    it('calls setVisiblePriceLevels with price levels', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      // Should call setVisiblePriceLevels with an array of price levels
      expect(mockSetVisiblePriceLevels).toHaveBeenCalled();
      const levels = mockSetVisiblePriceLevels.mock.calls[0]?.[0];
      expect(Array.isArray(levels)).toBe(true);
    });

    it('subscribes to visible time range changes', () => {
      const subscribeVisibleTimeRangeChange = vi.fn();
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange,
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      expect(subscribeVisibleTimeRangeChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('subscribes to visible logical range changes', () => {
      const subscribeVisibleLogicalRangeChange = vi.fn();
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange,
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      wireLightweightChartsMappings(mockChart, mockSeries);

      expect(subscribeVisibleLogicalRangeChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('handles missing getVisibleRange gracefully', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleLogicalRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      // Should not throw
      expect(() => {
        wireLightweightChartsMappings(mockChart, mockSeries);
      }).not.toThrow();
    });

    it('handles errors in feedVisible gracefully', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockImplementation(() => {
          throw new Error('Mock error');
        }),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: { clientHeight: 600 },
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      // Should not throw, error is caught
      expect(() => {
        wireLightweightChartsMappings(mockChart, mockSeries);
      }).not.toThrow();
    });

    it('uses default height when chartElement.clientHeight is unavailable', () => {
      const mockTimeScale = {
        coordinateToTime: vi.fn(),
        timeToCoordinate: vi.fn().mockReturnValue(100),
        subscribeVisibleTimeRangeChange: vi.fn(),
        subscribeVisibleLogicalRangeChange: vi.fn(),
        getVisibleRange: vi.fn().mockReturnValue({ from: 0, to: 100 }),
      };

      const mockChart = {
        timeScale: vi.fn().mockReturnValue(mockTimeScale),
        chartElement: {},
      };
      const mockSeries = {
        coordinateToPrice: vi.fn().mockReturnValue(50),
      };

      // Should not throw
      expect(() => {
        wireLightweightChartsMappings(mockChart, mockSeries);
      }).not.toThrow();
    });
  });
});
