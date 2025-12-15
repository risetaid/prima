// src/lib/metrics.ts
import { logger } from '@/lib/logger';

export enum MetricType {
  COUNTER = 'counter',
  HISTOGRAM = 'histogram',
  GAUGE = 'gauge',
}

export interface HistogramStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  counters: Record<string, number>;
  histograms: Record<string, HistogramStats>;
  gauges: Record<string, number>;
}

export class MetricsCollector {
  private counters: Map<string, number>;
  private histograms: Map<string, number[]>;
  private gauges: Map<string, number>;
  private lastExportTime: number;

  constructor() {
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.lastExportTime = Date.now();
  }

  /**
   * Increment a counter metric
   */
  public increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record a histogram value (for latency, sizes, etc.)
   */
  public recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
  }

  /**
   * Set a gauge value (for current state metrics)
   */
  public setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Get current counter value
   */
  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get current gauge value
   */
  public getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Calculate histogram statistics
   */
  public getHistogramStats(name: string): HistogramStats | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const min = sorted[0];
    const max = sorted[count - 1];

    const p50 = sorted[Math.floor(count * 0.5)];
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];

    return { count, sum, min, max, p50, p95, p99 };
  }

  /**
   * Export all metrics as JSON and reset counters/histograms
   * Gauges are NOT reset (they represent current state)
   */
  public exportMetrics(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date().toISOString(),
      counters: {},
      histograms: {},
      gauges: {},
    };

    // Export counters
    this.counters.forEach((value, key) => {
      snapshot.counters[key] = value;
    });

    // Export histograms with stats
    this.histograms.forEach((values, key) => {
      const stats = this.getHistogramStats(key);
      if (stats) {
        snapshot.histograms[key] = stats;
      }
    });

    // Export gauges
    this.gauges.forEach((value, key) => {
      snapshot.gauges[key] = value;
    });

    // Reset counters and histograms after export
    this.counters.clear();
    this.histograms.clear();
    // Gauges are NOT cleared

    this.lastExportTime = Date.now();

    return snapshot;
  }

  /**
   * Start periodic export to logs (every 60 seconds)
   */
  public startPeriodicExport(intervalMs: number = 60000): NodeJS.Timeout {
    const interval = setInterval(() => {
      const snapshot = this.exportMetrics();
      logger.info('Metrics snapshot', {
        operation: 'metrics.export',
        metrics: snapshot,
      });
    }, intervalMs);

    return interval;
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

// Start periodic export in production
if (process.env.NODE_ENV === 'production') {
  metrics.startPeriodicExport();
}
