// tests/lib/metrics.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector, MetricType } from '@/lib/metrics';

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('should increment counter metrics', () => {
    metrics.increment('whatsapp.send.success');
    metrics.increment('whatsapp.send.success');
    
    const value = metrics.getCounter('whatsapp.send.success');
    expect(value).toBe(2);
  });

  it('should record histogram values', () => {
    metrics.recordHistogram('api.latency', 100);
    metrics.recordHistogram('api.latency', 200);
    metrics.recordHistogram('api.latency', 150);
    
    const stats = metrics.getHistogramStats('api.latency');
    expect(stats?.count).toBe(3);
    expect(stats?.p50).toBeGreaterThan(0);
    expect(stats?.p95).toBeGreaterThan(0);
  });

  it('should set gauge values', () => {
    metrics.setGauge('db.pool.active', 5);
    metrics.setGauge('db.pool.active', 8);
    
    const value = metrics.getGauge('db.pool.active');
    expect(value).toBe(8);
  });

  it('should export metrics as JSON', () => {
    metrics.increment('test.counter');
    metrics.setGauge('test.gauge', 42);
    
    const exported = metrics.exportMetrics();
    expect(exported.counters['test.counter']).toBe(1);
    expect(exported.gauges['test.gauge']).toBe(42);
  });

  it('should reset metrics after export', () => {
    metrics.increment('test.counter');
    metrics.exportMetrics();
    
    const value = metrics.getCounter('test.counter');
    expect(value).toBe(0);
  });
});
