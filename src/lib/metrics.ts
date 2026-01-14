/**
 * Metrics Utility for PRIMA
 *
 * Prometheus-compatible metrics for observability.
 * Provides counters, gauges, and histograms for monitoring.
 */

import { redis } from './redis';
import { db } from '@/db';

// In-memory metrics storage (for single-instance deployments)
// For multi-instance deployments, use Redis with key prefix
interface MetricsStorage {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, number[]>; // Store samples for histograms
}

/**
 * In-memory metrics (primary storage)
 */
const memoryMetrics: MetricsStorage = {
  counters: {},
  gauges: {},
  histograms: {},
};

/**
 * Get the storage key for Redis-based metrics
 */
function getRedisKey(key: string): string {
  return `prima:metrics:${key}`;
}

/**
 * Increment a counter metric
 */
export function incrementCounter(name: string, labels?: Record<string, string | number>): void {
  const key = labels ? `${name}_${Object.entries(labels).map(([k, v]) => `${k}:${v}`).join(',')}` : name;

  // Memory counter
  memoryMetrics.counters[key] = (memoryMetrics.counters[key] || 0) + 1;

  // Note: Redis-based counters disabled - RedisClient wrapper doesn't expose incr method
  // For multi-instance deployments, consider adding incr method to RedisClient
}

/**
 * Increment HTTP request counter
 */
export function incrementHttpRequest(method: string, endpoint: string, status: number): void {
  incrementCounter('http_requests_total', { method, endpoint, status: Math.floor(status / 100) * 100 });
}

/**
 * Set a gauge metric
 */
export function setGauge(name: string, value: number, labels?: Record<string, string | number>): void {
  const key = labels ? `${name}_${Object.entries(labels).map(([k, v]) => `${k}:${v}`).join(',')}` : name;

  // Memory gauge
  memoryMetrics.gauges[key] = value;

  // Redis gauge (for multi-instance) - use set method which exists on RedisClient
  if (redis) {
    redis.set(getRedisKey(`gauge:${key}`), String(value)).catch(() => {
      // Ignore Redis errors
    });
  }
}

/**
 * Update DB pool gauge
 */
export function updateDbPoolMetrics(active: number, idle: number, total: number): void {
  setGauge('db_pool_connections_active', active);
  setGauge('db_pool_connections_idle', idle);
  setGauge('db_pool_connections_total', total);
}

/**
 * Observe a value in a histogram
 */
export function observeHistogram(name: string, value: number, labels?: Record<string, string | number>): void {
  const key = labels ? `${name}_${Object.entries(labels).map(([k, v]) => `${k}:${v}`).join(',')}` : name;

  // Memory histogram
  if (!memoryMetrics.histograms[key]) {
    memoryMetrics.histograms[key] = [];
  }
  memoryMetrics.histograms[key].push(value);

  // Keep only last 1000 samples to prevent memory leaks
  if (memoryMetrics.histograms[key].length > 1000) {
    memoryMetrics.histograms[key] = memoryMetrics.histograms[key].slice(-1000);
  }

  // Note: Redis-based histograms disabled - RedisClient wrapper doesn't expose lpush/ltrim methods
  // For multi-instance deployments, consider adding these methods to RedisClient
}

/**
 * Observe HTTP request duration
 */
export function observeHttpRequestDuration(endpoint: string, durationMs: number): void {
  observeHistogram('http_request_duration_ms', durationMs, { endpoint });
}

/**
 * Generate Prometheus-compatible metrics output
 */
export async function generatePrometheusMetrics(): Promise<string> {
  const lines: string[] = [];

  // Helper comments
  lines.push('# PRIMA Metrics');
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // HTTP metrics
  lines.push('# HTTP Request Metrics');
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, value] of Object.entries(memoryMetrics.counters)) {
    if (key.startsWith('http_requests_total')) {
      const labels = key.replace('http_requests_total_', '');
      lines.push(`http_requests_total{${labels}} ${value}`);
    }
  }
  lines.push('');

  // HTTP duration histogram
  lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms histogram');
  for (const [key, samples] of Object.entries(memoryMetrics.histograms)) {
    if (key.startsWith('http_request_duration_ms')) {
      const labels = key.replace('http_request_duration_ms_', '');
      const sorted = [...samples].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const count = sorted.length;

      // Calculate percentiles
      const p50 = sorted[Math.floor(count * 0.50)];
      const p90 = sorted[Math.floor(count * 0.90)];
      const p95 = sorted[Math.floor(count * 0.95)];
      const p99 = sorted[Math.floor(count * 0.99)];

      lines.push(`http_request_duration_ms_sum{${labels}} ${sum.toFixed(2)}`);
      lines.push(`http_request_duration_ms_count{${labels}} ${count}`);
      if (p50) lines.push(`http_request_duration_ms_bucket{${labels},le="${p50}"} ${count}`);
      if (p90) lines.push(`http_request_duration_ms_bucket{${labels},le="${p90}"} ${count}`);
      if (p95) lines.push(`http_request_duration_ms_bucket{${labels},le="${p95}"} ${count}`);
      if (p99) lines.push(`http_request_duration_ms_bucket{${labels},le="${p99}"} ${count}`);
      lines.push(`http_request_duration_ms_bucket{${labels},le="+Inf"} ${count}`);
    }
  }
  lines.push('');

  // DB pool metrics
  lines.push('# Database Pool Metrics');
  lines.push('# HELP db_pool_connections_active Active database connections');
  lines.push('# TYPE db_pool_connections_active gauge');
  for (const [key, value] of Object.entries(memoryMetrics.gauges)) {
    if (key.startsWith('db_pool_connections')) {
      const labels = key.replace('db_pool_connections_', '');
      lines.push(`db_pool_connections_${labels} ${value}`);
    }
  }
  lines.push('');

  // Business metrics
  lines.push('# Business Metrics');
  lines.push('# HELP patients_total Total number of patients');
  lines.push('# TYPE patients_total gauge');

  // Get patient count from database
  try {
    const { patients } = await import('@/db');
    const result = await db.select({ count: patients.id }).from(patients).where(sql`${patients.deletedAt} IS NULL`);
    const patientCount = result.length || 0;
    lines.push(`patients_total ${patientCount}`);
  } catch {
    lines.push(`patients_total 0`);
  }

  lines.push('# HELP reminders_sent_total Total number of reminders sent');
  lines.push('# TYPE reminders_sent_total counter');
  const remindersSent = memoryMetrics.counters['reminders_sent_total'] || 0;
  lines.push(`reminders_sent_total ${remindersSent}`);

  lines.push('# HELP whatsapp_messages_total Total number of WhatsApp messages sent');
  lines.push('# TYPE whatsapp_messages_total counter');
  const whatsappMessages = memoryMetrics.counters['whatsapp_messages_total'] || 0;
  lines.push(`whatsapp_messages_total ${whatsappMessages}`);
  lines.push('');

  // Redis metrics
  lines.push('# Redis Metrics');
  lines.push('# HELP redis_memory_used_bytes Memory used by Redis in bytes');
  lines.push('# TYPE redis_memory_used_bytes gauge');

  if (redis) {
    try {
      const info = await redis.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      const usedMemory = match ? parseInt(match[1]) : 0;
      lines.push(`redis_memory_used_bytes ${usedMemory}`);
    } catch {
      lines.push(`redis_memory_used_bytes 0`);
    }
  } else {
    lines.push(`redis_memory_used_bytes 0`);
  }

  lines.push('');

  // Circuit breaker states
  lines.push('# Circuit Breaker Metrics');
  lines.push('# HELP redis_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)');
  lines.push('# TYPE redis_circuit_breaker_state gauge');
  for (const [key, value] of Object.entries(memoryMetrics.gauges)) {
    if (key.startsWith('circuit_breaker_')) {
      const service = key.replace('circuit_breaker_', '');
      lines.push(`redis_circuit_breaker_state{service="${service}"} ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  memoryMetrics.counters = {};
  memoryMetrics.gauges = {};
  memoryMetrics.histograms = {};
}

// Import sql for the patient count query
import { sql } from 'drizzle-orm';
