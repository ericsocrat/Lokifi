/**
 * Performance Monitoring Utilities for Tests
 *
 * Helpers for measuring and tracking performance in unit tests.
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsed?: number;
  iterations?: number;
  averageTime?: number;
}

export interface PerformanceThresholds {
  maxDuration?: number;
  maxMemory?: number;
  maxAverageTime?: number;
}

/**
 * Measures the execution time of a function
 * @param fn - Function to measure
 * @param label - Optional label for logging
 * @returns Performance metrics
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  label?: string
): Promise<PerformanceMetrics & { result: T }> {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();

  const result = await fn();

  const endTime = performance.now();
  const endMemory = getMemoryUsage();

  const metrics: PerformanceMetrics = {
    duration: endTime - startTime,
    ...(endMemory !== undefined && startMemory !== undefined
      ? { memoryUsed: endMemory - startMemory }
      : {}),
  };

  if (label) {
    console.log(
      `⏱️  ${label}: ${metrics.duration.toFixed(2)}ms` +
        (metrics.memoryUsed ? ` | Memory: ${formatBytes(metrics.memoryUsed)}` : '')
    );
  }

  return { ...metrics, result };
}

/**
 * Measures multiple iterations of a function
 * @param fn - Function to measure
 * @param iterations - Number of iterations
 * @param label - Optional label for logging
 * @returns Aggregated performance metrics
 */
export async function measureIterations<T>(
  fn: () => T | Promise<T>,
  iterations: number,
  label?: string
): Promise<PerformanceMetrics> {
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measurePerformance(fn);
    durations.push(duration);
  }

  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const averageTime = totalDuration / iterations;
  const minTime = Math.min(...durations);
  const maxTime = Math.max(...durations);

  const metrics: PerformanceMetrics = {
    duration: totalDuration,
    iterations,
    averageTime,
  };

  if (label) {
    console.log(
      `⏱️  ${label} (${iterations}x):\n` +
        `   Average: ${averageTime.toFixed(2)}ms\n` +
        `   Min: ${minTime.toFixed(2)}ms\n` +
        `   Max: ${maxTime.toFixed(2)}ms\n` +
        `   Total: ${totalDuration.toFixed(2)}ms`
    );
  }

  return metrics;
}

/**
 * Asserts that performance metrics meet thresholds
 * @param metrics - Measured performance metrics
 * @param thresholds - Performance thresholds
 * @throws Error if thresholds are exceeded
 */
export function assertPerformance(metrics: PerformanceMetrics, thresholds: PerformanceThresholds) {
  if (thresholds.maxDuration && metrics.duration > thresholds.maxDuration) {
    throw new Error(
      `Performance threshold exceeded!\n` +
        `  Duration: ${metrics.duration.toFixed(2)}ms\n` +
        `  Threshold: ${thresholds.maxDuration}ms`
    );
  }

  if (thresholds.maxMemory && metrics.memoryUsed && metrics.memoryUsed > thresholds.maxMemory) {
    throw new Error(
      `Memory threshold exceeded!\n` +
        `  Memory Used: ${formatBytes(metrics.memoryUsed)}\n` +
        `  Threshold: ${formatBytes(thresholds.maxMemory)}`
    );
  }

  if (
    thresholds.maxAverageTime &&
    metrics.averageTime &&
    metrics.averageTime > thresholds.maxAverageTime
  ) {
    throw new Error(
      `Average time threshold exceeded!\n` +
        `  Average: ${metrics.averageTime.toFixed(2)}ms\n` +
        `  Threshold: ${thresholds.maxAverageTime}ms`
    );
  }
}

/**
 * Creates a performance monitor for tracking multiple measurements
 */
export function createPerformanceMonitor(label: string) {
  const measurements: Array<{ label: string; metrics: PerformanceMetrics }> = [];

  return {
    /**
     * Measures and records a function execution
     */
    async measure<T>(fn: () => T | Promise<T>, measureLabel?: string): Promise<T> {
      const { result, ...metrics } = await measurePerformance(fn);
      measurements.push({
        label: measureLabel || 'Unnamed',
        metrics,
      });
      return result;
    },

    /**
     * Gets all recorded measurements
     */
    getMeasurements() {
      return [...measurements];
    },

    /**
     * Gets summary statistics
     */
    getSummary() {
      if (measurements.length === 0) {
        return null;
      }

      const durations = measurements.map((m) => m.metrics.duration);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);

      return {
        count: measurements.length,
        totalDuration,
        averageDuration: totalDuration / measurements.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
    },

    /**
     * Prints a report of all measurements
     */
    report() {
      console.log(`\n📊 Performance Report: ${label}`);
      console.log('='.repeat(50));

      measurements.forEach(({ label: measureLabel, metrics }) => {
        console.log(
          `  ${measureLabel}: ${metrics.duration.toFixed(2)}ms` +
            (metrics.memoryUsed ? ` | ${formatBytes(metrics.memoryUsed)}` : '')
        );
      });

      const summary = this.getSummary();
      if (summary) {
        console.log('='.repeat(50));
        console.log(`  Total: ${summary.totalDuration.toFixed(2)}ms`);
        console.log(`  Average: ${summary.averageDuration.toFixed(2)}ms`);
        console.log(`  Min: ${summary.minDuration.toFixed(2)}ms`);
        console.log(`  Max: ${summary.maxDuration.toFixed(2)}ms`);
      }

      console.log('');
    },

    /**
     * Clears all measurements
     */
    clear() {
      measurements.length = 0;
    },
  };
}

/**
 * Benchmark a function against a baseline
 * @param baseline - Baseline function
 * @param test - Test function to compare
 * @param iterations - Number of iterations
 * @returns Comparison results
 */
export async function benchmark<T>(
  baseline: () => T | Promise<T>,
  test: () => T | Promise<T>,
  iterations = 100
): Promise<{
  baseline: PerformanceMetrics;
  test: PerformanceMetrics;
  improvement: number;
  faster: 'baseline' | 'test' | 'equal';
}> {
  const baselineMetrics = await measureIterations(baseline, iterations, 'Baseline');
  const testMetrics = await measureIterations(test, iterations, 'Test');

  const baselineAvg = baselineMetrics.averageTime!;
  const testAvg = testMetrics.averageTime!;

  const improvement = ((baselineAvg - testAvg) / baselineAvg) * 100;
  const faster = Math.abs(improvement) < 1 ? 'equal' : improvement > 0 ? 'test' : 'baseline';

  console.log(
    `\n📊 Benchmark Results:\n` +
      `   Baseline: ${baselineAvg.toFixed(2)}ms\n` +
      `   Test: ${testAvg.toFixed(2)}ms\n` +
      `   ${faster === 'test' ? '✅' : '❌'} Test is ${Math.abs(improvement).toFixed(1)}% ${faster === 'test' ? 'faster' : 'slower'}\n`
  );

  return {
    baseline: baselineMetrics,
    test: testMetrics,
    improvement,
    faster,
  };
}

/**
 * Gets current memory usage (Node.js only)
 */
function getMemoryUsage(): number | undefined {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return undefined;
}

/**
 * Formats bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Example usage patterns
 *
 * @example Basic performance measurement
 * ```typescript
 * const { duration } = await measurePerformance(() => {
 *   // Code to measure
 * }, 'My Operation');
 *
 * assertPerformance({ duration }, { maxDuration: 100 });
 * ```
 *
 * @example Performance monitor
 * ```typescript
 * const monitor = createPerformanceMonitor('API Tests');
 *
 * await monitor.measure(() => fetchUsers(), 'Fetch Users');
 * await monitor.measure(() => updateUser(), 'Update User');
 *
 * monitor.report();
 * ```
 *
 * @example Benchmark comparison
 * ```typescript
 * await benchmark(
 *   () => oldImplementation(),
 *   () => newImplementation(),
 *   1000
 * );
 * ```
 */
