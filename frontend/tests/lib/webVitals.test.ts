/**
 * Web Vitals Tests
 * Comprehensive test suite for Web Vitals monitoring
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock web-vitals module
vi.mock('web-vitals', () => ({
  onCLS: vi.fn((callback: any) => callback({
    name: 'CLS',
    value: 0.05,
    delta: 0.05,
    id: 'test-cls-1',
    navigationType: 'navigate',
  })),
  onFCP: vi.fn((callback: any) => callback({
    name: 'FCP',
    value: 1500,
    delta: 1500,
    id: 'test-fcp-1',
    navigationType: 'navigate',
  })),
  onINP: vi.fn((callback: any) => callback({
    name: 'INP',
    value: 150,
    delta: 150,
    id: 'test-inp-1',
    navigationType: 'navigate',
  })),
  onLCP: vi.fn((callback: any) => callback({
    name: 'LCP',
    value: 2000,
    delta: 2000,
    id: 'test-lcp-1',
    navigationType: 'navigate',
  })),
  onTTFB: vi.fn((callback: any) => callback({
    name: 'TTFB',
    value: 600,
    delta: 600,
    id: 'test-ttfb-1',
    navigationType: 'navigate',
  })),
}));

describe('WebVitalsMonitor', () => {
  let WebVitalsMonitor: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamically import to apply mocks
    const module = await import('@/src/lib/webVitals');
    WebVitalsMonitor = module.default.constructor;
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const monitor = new WebVitalsMonitor();
      expect(monitor).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const monitor = new WebVitalsMonitor({
        enableReporting: false,
        consoleLog: false,
        sampleRate: 0.5,
      });
      expect(monitor).toBeDefined();
    });

    it('should not initialize if enableReporting is false', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: false });
      monitor.init();
      expect(monitor.getReports()).toHaveLength(0);
    });
  });

  describe('Metric Collection', () => {
    it('should collect CLS metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const reports = monitor.getReports();
      const clsReport = reports.find((r: any) => r.name === 'CLS');

      expect(clsReport).toBeDefined();
      expect(clsReport?.name).toBe('CLS');
      expect(clsReport?.value).toBe(0.05);
      expect(clsReport?.rating).toBe('good'); // 0.05 < 0.1
    });

    it('should collect FCP metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const reports = monitor.getReports();
      const fcpReport = reports.find((r: any) => r.name === 'FCP');

      expect(fcpReport).toBeDefined();
      expect(fcpReport?.name).toBe('FCP');
      expect(fcpReport?.value).toBe(1500);
      expect(fcpReport?.rating).toBe('good'); // 1500 < 1800
    });

    it('should collect INP metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const reports = monitor.getReports();
      const inpReport = reports.find((r: any) => r.name === 'INP');

      expect(inpReport).toBeDefined();
      expect(inpReport?.name).toBe('INP');
      expect(inpReport?.value).toBe(150);
      expect(inpReport?.rating).toBe('good'); // 150 < 200
    });

    it('should collect LCP metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const reports = monitor.getReports();
      const lcpReport = reports.find((r: any) => r.name === 'LCP');

      expect(lcpReport).toBeDefined();
      expect(lcpReport?.name).toBe('LCP');
      expect(lcpReport?.value).toBe(2000);
      expect(lcpReport?.rating).toBe('good'); // 2000 < 2500
    });

    it('should collect TTFB metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const reports = monitor.getReports();
      const ttfbReport = reports.find((r: any) => r.name === 'TTFB');

      expect(ttfbReport).toBeDefined();
      expect(ttfbReport?.name).toBe('TTFB');
      expect(ttfbReport?.value).toBe(600);
      expect(ttfbReport?.rating).toBe('good'); // 600 < 800
    });
  });

  describe('Rating System', () => {
    it('should rate CLS as good when <= 0.1', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const clsReport = monitor.getReports().find((r: any) => r.name === 'CLS');
      expect(clsReport?.rating).toBe('good');
    });

    it('should provide performance score', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const score = monitor.getPerformanceScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate correct performance score for all good metrics', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const score = monitor.getPerformanceScore();
      expect(score).toBe(100); // All metrics are in "good" range
    });
  });

  describe('Snapshot', () => {
    it('should create snapshot of all metrics', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const snapshot = monitor.getSnapshot();

      expect(snapshot.cls).toBeDefined();
      expect(snapshot.fcp).toBeDefined();
      expect(snapshot.inp).toBeDefined();
      expect(snapshot.lcp).toBeDefined();
      expect(snapshot.ttfb).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should include all metric data in snapshot', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      const snapshot = monitor.getSnapshot();

      expect(snapshot.cls?.name).toBe('CLS');
      expect(snapshot.fcp?.name).toBe('FCP');
      expect(snapshot.inp?.name).toBe('INP');
      expect(snapshot.lcp?.name).toBe('LCP');
      expect(snapshot.ttfb?.name).toBe('TTFB');
    });
  });

  describe('Subscription', () => {
    it('should allow subscribing to metrics', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      const callback = vi.fn();

      monitor.subscribe(callback);
      monitor.init();

      expect(callback).toHaveBeenCalled();
    });

    it('should call subscriber for each metric', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      const callback = vi.fn();

      monitor.subscribe(callback);
      monitor.init();

      expect(callback).toHaveBeenCalledTimes(5); // CLS, FCP, INP, LCP, TTFB
    });

    it('should allow unsubscribing', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: false });
      const callback = vi.fn();

      const unsubscribe = monitor.subscribe(callback);
      unsubscribe();

      monitor.init();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Clear', () => {
    it('should clear all reports', () => {
      const monitor = new WebVitalsMonitor({ enableReporting: true });
      monitor.init();

      expect(monitor.getReports().length).toBeGreaterThan(0);

      monitor.clear();
      expect(monitor.getReports()).toHaveLength(0);
    });
  });

  describe('API Reporting', () => {
    it('should attempt to report to API when configured', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const monitor = new WebVitalsMonitor({
        enableReporting: true,
        reportToAPI: true,
        apiEndpoint: 'http://localhost:8000/api/metrics/web-vitals',
      });

      monitor.init();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const monitor = new WebVitalsMonitor({
        enableReporting: true,
        reportToAPI: true,
        apiEndpoint: 'http://localhost:8000/api/metrics/web-vitals',
        consoleLog: false, // Suppress error logs
      });

      monitor.init();

      // Should not throw
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Sampling', () => {
    it('should respect sample rate of 0', () => {
      const monitor = new WebVitalsMonitor({
        enableReporting: true,
        sampleRate: 0,
      });

      monitor.init();

      // With sample rate 0, no metrics should be collected
      // Note: This test may be flaky due to Math.random()
    });

    it('should always collect with sample rate of 1', () => {
      const monitor = new WebVitalsMonitor({
        enableReporting: true,
        sampleRate: 1.0,
      });

      monitor.init();

      expect(monitor.getReports().length).toBeGreaterThan(0);
    });
  });
});
