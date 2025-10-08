/**
 * Web Vitals Monitoring System
 * Implements comprehensive Core Web Vitals tracking and reporting
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface WebVitalsReport {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  timestamp: number;
  navigationType: string;
}

export interface WebVitalsSnapshot {
  cls: WebVitalsReport | null;
  fcp: WebVitalsReport | null;
  inp: WebVitalsReport | null; // Interaction to Next Paint (replaces FID)
  lcp: WebVitalsReport | null;
  ttfb: WebVitalsReport | null;
  timestamp: number;
}

export interface WebVitalsConfig {
  enableReporting: boolean;
  reportToAPI: boolean;
  apiEndpoint?: string;
  consoleLog: boolean;
  sampleRate: number; // 0-1, for sampling
}

// Thresholds based on Web Vitals recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

class WebVitalsMonitor {
  private reports: WebVitalsReport[] = [];
  private config: WebVitalsConfig;
  private listeners: Array<(report: WebVitalsReport) => void> = [];

  constructor(config: Partial<WebVitalsConfig> = {}) {
    this.config = {
      enableReporting: true,
      reportToAPI: false,
      consoleLog: process.env.NODE_ENV === 'development',
      sampleRate: 1.0,
      ...config,
    };
  }

  /**
   * Initialize Web Vitals monitoring
   */
  init(): void {
    if (!this.config.enableReporting) return;
    if (typeof window === 'undefined') return;

    // Check if we should sample this session
    if (Math.random() > this.config.sampleRate) return;

    // Initialize all Core Web Vitals metrics
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this)); // Replaces FID
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    if (this.config.consoleLog) {
      console.log('📊 Web Vitals monitoring initialized');
    }
  }

  /**
   * Handle metric reported by web-vitals library
   */
  private handleMetric(metric: Metric): void {
    const report: WebVitalsReport = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      delta: metric.delta,
      timestamp: Date.now(),
      navigationType: metric.navigationType,
    };

    this.reports.push(report);

    // Notify listeners
    this.listeners.forEach((listener) => listener(report));

    // Console logging
    if (this.config.consoleLog) {
      const emoji = report.rating === 'good' ? '✅' : report.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(
        `${emoji} ${report.name}: ${report.value.toFixed(2)} (${report.rating})`
      );
    }

    // Report to API
    if (this.config.reportToAPI && this.config.apiEndpoint) {
      this.reportToAPI(report);
    }
  }

  /**
   * Get rating based on metric name and value
   */
  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = THRESHOLDS[name as keyof typeof THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Report metric to API endpoint
   */
  private async reportToAPI(report: WebVitalsReport): Promise<void> {
    if (!this.config.apiEndpoint) return;

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: (navigator as any).connection?.effectiveType,
        }),
        keepalive: true,
      });
    } catch (error) {
      if (this.config.consoleLog) {
        console.error('Failed to report Web Vitals:', error);
      }
    }
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(listener: (report: WebVitalsReport) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get all collected metrics
   */
  getReports(): WebVitalsReport[] {
    return [...this.reports];
  }

  /**
   * Get current snapshot of all metrics
   */
  getSnapshot(): WebVitalsSnapshot {
    return {
      cls: this.reports.find((r) => r.name === 'CLS') || null,
      fcp: this.reports.find((r) => r.name === 'FCP') || null,
      inp: this.reports.find((r) => r.name === 'INP') || null,
      lcp: this.reports.find((r) => r.name === 'LCP') || null,
      ttfb: this.reports.find((r) => r.name === 'TTFB') || null,
      timestamp: Date.now(),
    };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const snapshot = this.getSnapshot();
    let score = 0;
    let count = 0;

    // Weight each metric equally
    const metrics = [snapshot.cls, snapshot.fcp, snapshot.inp, snapshot.lcp, snapshot.ttfb];

    for (const metric of metrics) {
      if (!metric) continue;
      count++;

      switch (metric.rating) {
        case 'good':
          score += 100;
          break;
        case 'needs-improvement':
          score += 50;
          break;
        case 'poor':
          score += 0;
          break;
      }
    }

    return count > 0 ? Math.round(score / count) : 0;
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.reports = [];
  }
}

// Global singleton instance
export const webVitalsMonitor = new WebVitalsMonitor({
  enableReporting: true,
  reportToAPI: process.env.NODE_ENV === 'production',
  apiEndpoint: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/metrics/web-vitals` : undefined,
  consoleLog: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in production
});

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  webVitalsMonitor.init();
}

export default webVitalsMonitor;
