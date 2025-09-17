/**
 * Performance Monitoring Service for PRIMA system
 * Provides comprehensive performance tracking, database optimization, and automated monitoring
 */

import { db } from "@/db";
import { 
  performanceMetrics, 
  analyticsEvents 
} from "@/db/schema";
import { and, gte, lte, sql, count, avg, desc, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

export interface PerformanceMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  llmResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'api_response_time' | 'database_query_time' | 'llm_response_time' | 'memory_usage' | 'cpu_usage' | 'disk_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

export interface PerformanceReport {
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  metrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  recommendations: string[];
  optimization: {
    databaseQueries: Array<{
      query: string;
      avgTime: number;
      count: number;
      recommendation: string;
    }>;
    apiEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      count: number;
      recommendation: string;
    }>;
  };
}

export class PerformanceMonitoringService {
  private readonly ALERT_THRESHOLDS = {
    api_response_time: { warning: 1000, critical: 3000 }, // ms
    database_query_time: { warning: 100, critical: 500 }, // ms
    llm_response_time: { warning: 2000, critical: 5000 }, // ms
    memory_usage: { warning: 80, critical: 90 }, // percentage
    cpu_usage: { warning: 70, critical: 85 }, // percentage
    disk_usage: { warning: 80, critical: 90 }, // percentage
  };

  private readonly CACHE_KEYS = {
    PERFORMANCE_METRICS: 'performance:metrics',
    SYSTEM_HEALTH: 'performance:health',
    ALERTS: 'performance:alerts',
  };

  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Record performance metric
   */
  async recordMetric(metric: {
    type: string;
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const threshold = this.getThreshold(metric.type);
      const isAlert = threshold ? metric.value > threshold.warning : false;

      await db.insert(performanceMetrics).values({
        metricType: metric.type,
        metricName: metric.name,
        value: metric.value.toString(),
        unit: metric.unit,
        tags: metric.tags || {},
        threshold: threshold?.warning?.toString(),
        isAlert
      });

      // Clear cache when new metrics are recorded
      await this.clearCache();

      if (isAlert) {
        await this.createAlert({
          type: metric.type as 'api_response_time' | 'database_query_time' | 'llm_response_time' | 'memory_usage' | 'cpu_usage' | 'disk_usage',
          severity: metric.value > (threshold?.critical || threshold?.warning || 0) ? 'critical' : 'high',
          message: `${metric.name} is ${metric.value}${metric.unit} (threshold: ${threshold?.warning}${metric.unit})`,
          currentValue: metric.value,
          threshold: threshold?.warning || 0,
          timestamp: new Date()
        });
      }

      logger.debug(`Performance metric recorded: ${metric.name}`, {
        type: metric.type,
        value: metric.value,
        unit: metric.unit,
        isAlert
      });
    } catch (error) {
      logger.error("Failed to record performance metric", error as Error);
    }
  }

  /**
   * Get current performance metrics
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    try {
      // Try to get from cache first
      const cached = await redis.get(this.CACHE_KEYS.PERFORMANCE_METRICS);
      if (cached) {
        return JSON.parse(cached);
      }

      const metrics = await this.calculateCurrentMetrics();
      
      // Cache the result
      await redis.set(this.CACHE_KEYS.PERFORMANCE_METRICS, JSON.stringify(metrics), this.CACHE_TTL);
      
      return metrics;
    } catch (error) {
      logger.error("Failed to get current performance metrics", error as Error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Calculate current performance metrics
   */
  private async calculateCurrentMetrics(): Promise<PerformanceMetrics> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [apiMetrics, dbMetrics, llmMetrics] = await Promise.all([
      db.select({
        avgTime: avg(performanceMetrics.value),
        count: count()
      }).from(performanceMetrics).where(
        and(
          gte(performanceMetrics.timestamp, fiveMinutesAgo),
          eq(performanceMetrics.metricType, 'api_response_time')
        )
      ),
      
      db.select({
        avgTime: avg(performanceMetrics.value),
        count: count()
      }).from(performanceMetrics).where(
        and(
          gte(performanceMetrics.timestamp, fiveMinutesAgo),
          eq(performanceMetrics.metricType, 'database_query_time')
        )
      ),
      
      db.select({
        avgTime: avg(performanceMetrics.value),
        count: count()
      }).from(performanceMetrics).where(
        and(
          gte(performanceMetrics.timestamp, fiveMinutesAgo),
          eq(performanceMetrics.metricType, 'llm_response_time')
        )
      )
    ]);

    return {
      apiResponseTime: Number(apiMetrics[0]?.avgTime) || 0,
      databaseQueryTime: Number(dbMetrics[0]?.avgTime) || 0,
      llmResponseTime: Number(llmMetrics[0]?.avgTime) || 0,
      memoryUsage: await this.getMemoryUsage(),
      cpuUsage: await this.getCPUUsage(),
      diskUsage: await this.getDiskUsage(),
      timestamp: now
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    status: 'excellent' | 'good' | 'warning' | 'critical';
    metrics: Record<string, number>;
    alerts: PerformanceAlert[];
  }> {
    try {
      // Try to get from cache first
      const cached = await redis.get(this.CACHE_KEYS.SYSTEM_HEALTH);
      if (cached) {
        return JSON.parse(cached);
      }

      const currentMetrics = await this.getCurrentMetrics();
      const alerts = await this.getActiveAlerts();
      
      const metrics = {
        apiResponseTime: currentMetrics.apiResponseTime,
        databaseQueryTime: currentMetrics.databaseQueryTime,
        llmResponseTime: currentMetrics.llmResponseTime,
        memoryUsage: currentMetrics.memoryUsage,
        cpuUsage: currentMetrics.cpuUsage,
        diskUsage: currentMetrics.diskUsage
      };

      const status = this.calculateSystemStatus(metrics, alerts);

      const result = {
        status,
        metrics,
        alerts
      };

      // Cache the result
      await redis.set(this.CACHE_KEYS.SYSTEM_HEALTH, JSON.stringify(result), this.CACHE_TTL);
      
      return result;
    } catch (error) {
      logger.error("Failed to get system health", error as Error);
      return {
        status: 'critical',
        metrics: {},
        alerts: []
      };
    }
  }

  /**
   * Calculate system status based on metrics and alerts
   */
  private calculateSystemStatus(
    metrics: Record<string, number>, 
    alerts: PerformanceAlert[]
  ): 'excellent' | 'good' | 'warning' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;

    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 2) return 'critical';
    if (highAlerts > 0) return 'warning';
    
    // Check individual metrics
    const metricsStatus = Object.entries(metrics).every(([key, value]) => {
      const threshold = this.getThreshold(key);
      if (!threshold) return true;
      return value <= threshold.warning;
    });

    return metricsStatus ? 'excellent' : 'good';
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    try {
      // Try to get from cache first
      const cached = await redis.get(this.CACHE_KEYS.ALERTS);
      if (cached) {
        return JSON.parse(cached);
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const alerts = await db
        .select({
          id: performanceMetrics.id,
          type: performanceMetrics.metricType,
          severity: sql<string>`CASE 
            WHEN ${performanceMetrics.value} > ${performanceMetrics.threshold} * 1.5 THEN 'critical'
            WHEN ${performanceMetrics.value} > ${performanceMetrics.threshold} THEN 'high'
            ELSE 'medium'
          END`,
          message: performanceMetrics.metricName,
          currentValue: performanceMetrics.value,
          threshold: performanceMetrics.threshold,
          timestamp: performanceMetrics.timestamp
        })
        .from(performanceMetrics)
        .where(
          and(
            gte(performanceMetrics.timestamp, twentyFourHoursAgo),
            eq(performanceMetrics.isAlert, true)
          )
        )
        .orderBy(desc(performanceMetrics.timestamp))
        .limit(20);

      const formattedAlerts = alerts.map(alert => ({
        id: alert.id,
        type: alert.type as 'api_response_time' | 'database_query_time' | 'llm_response_time' | 'memory_usage' | 'cpu_usage' | 'disk_usage',
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        message: alert.message,
        currentValue: Number(alert.currentValue),
        threshold: Number(alert.threshold) || 0,
        timestamp: alert.timestamp
      }));

      // Cache the result
      await redis.set(this.CACHE_KEYS.ALERTS, JSON.stringify(formattedAlerts), 60); // Cache alerts for 1 minute
      
      return formattedAlerts;
    } catch (error) {
      logger.error("Failed to get active alerts", error as Error);
      return [];
    }
  }

  /**
   * Create performance alert
   */
  private async createAlert(alert: Omit<PerformanceAlert, 'id'>): Promise<void> {
    try {
      await db.insert(analyticsEvents).values({
        eventType: 'system_alert',
        eventName: 'performance_alert',
        sessionId: 'system',
        eventData: {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          currentValue: alert.currentValue,
          threshold: alert.threshold
        },
        metadata: {
          timestamp: alert.timestamp.toISOString()
        },
        processedAt: new Date()
      });

      logger.warn(`Performance alert created: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });

      // Clear alerts cache
      await redis.del(this.CACHE_KEYS.ALERTS);
    } catch (error) {
      logger.error("Failed to create performance alert", error as Error);
    }
  }

  /**
   * Generate performance report
   */
  async generateReport(dateRange?: { start: Date; end: Date }): Promise<PerformanceReport> {
    try {
      const start = dateRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = dateRange?.end || new Date();

      const [summary, metrics, alerts, optimization] = await Promise.all([
        this.generateSummary(start, end),
        this.getMetricsInRange(start, end),
        this.getAlertsInRange(start, end),
        this.generateOptimizationRecommendations(start, end)
      ]);

      const recommendations = this.generateGeneralRecommendations(summary, alerts);

      return {
        summary,
        metrics,
        alerts,
        recommendations,
        optimization
      };
    } catch (error) {
      logger.error("Failed to generate performance report", error as Error);
      throw error;
    }
  }

  /**
   * Generate performance summary
   */
  private async generateSummary(start: Date, end: Date) {
    const [totalRequests, avgResponseTime, errorCount] = await Promise.all([
      db.select({ count: count() })
        .from(performanceMetrics)
        .where(
          and(
            gte(performanceMetrics.timestamp, start),
            lte(performanceMetrics.timestamp, end),
            eq(performanceMetrics.metricType, 'api_response_time')
          )
        ),
      
      db.select({ avg: avg(performanceMetrics.value) })
        .from(performanceMetrics)
        .where(
          and(
            gte(performanceMetrics.timestamp, start),
            lte(performanceMetrics.timestamp, end),
            eq(performanceMetrics.metricType, 'api_response_time')
          )
        ),
      
      db.select({ count: count() })
        .from(analyticsEvents)
        .where(
          and(
            gte(analyticsEvents.timestamp, start),
            lte(analyticsEvents.timestamp, end),
            sql`${analyticsEvents.eventName} ILIKE '%error%'`
          )
        )
    ]);

    const totalRequestsNum = Number(totalRequests[0]?.count) || 0;
    const errorRate = totalRequestsNum > 0 
      ? (Number(errorCount[0]?.count) || 0) / totalRequestsNum * 100 
      : 0;

    const systemHealth = this.calculateSystemHealthStatus(
      Number(avgResponseTime[0]?.avg) || 0,
      errorRate
    );

    return {
      totalRequests: totalRequestsNum,
      averageResponseTime: Number(avgResponseTime[0]?.avg) || 0,
      errorRate,
      systemHealth
    };
  }

  /**
   * Get metrics in date range
   */
  private async getMetricsInRange(start: Date, end: Date): Promise<PerformanceMetrics[]> {
    const metrics = await db
      .select({
        timestamp: sql<string>`DATE_TRUNC('hour', ${performanceMetrics.timestamp})`,
        apiResponseTime: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'api_response_time' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`,
        databaseQueryTime: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'database_query_time' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`,
        llmResponseTime: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'llm_response_time' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`,
        memoryUsage: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'memory_usage' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`,
        cpuUsage: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'cpu_usage' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`,
        diskUsage: sql<number>`AVG(CASE WHEN ${performanceMetrics.metricType} = 'disk_usage' THEN CAST(${performanceMetrics.value} AS FLOAT) ELSE NULL END)`
      })
      .from(performanceMetrics)
      .where(
        and(
          gte(performanceMetrics.timestamp, start),
          lte(performanceMetrics.timestamp, end)
        )
      )
      .groupBy(sql`DATE_TRUNC('hour', ${performanceMetrics.timestamp})`)
      .orderBy(sql`DATE_TRUNC('hour', ${performanceMetrics.timestamp})`);

    return metrics.map(m => ({
      apiResponseTime: Number(m.apiResponseTime) || 0,
      databaseQueryTime: Number(m.databaseQueryTime) || 0,
      llmResponseTime: Number(m.llmResponseTime) || 0,
      memoryUsage: Number(m.memoryUsage) || 0,
      cpuUsage: Number(m.cpuUsage) || 0,
      diskUsage: Number(m.diskUsage) || 0,
      timestamp: new Date(m.timestamp)
    }));
  }

  /**
   * Get alerts in date range
   */
  private async getAlertsInRange(start: Date, end: Date): Promise<PerformanceAlert[]> {
    const alerts = await db
      .select({
        id: performanceMetrics.id,
        type: performanceMetrics.metricType,
        severity: sql<string>`CASE 
          WHEN ${performanceMetrics.value} > ${performanceMetrics.threshold} * 1.5 THEN 'critical'
          WHEN ${performanceMetrics.value} > ${performanceMetrics.threshold} THEN 'high'
          ELSE 'medium'
        END`,
        message: performanceMetrics.metricName,
        currentValue: performanceMetrics.value,
        threshold: performanceMetrics.threshold,
        timestamp: performanceMetrics.timestamp
      })
      .from(performanceMetrics)
      .where(
        and(
          gte(performanceMetrics.timestamp, start),
          lte(performanceMetrics.timestamp, end),
          eq(performanceMetrics.isAlert, true)
        )
      )
      .orderBy(desc(performanceMetrics.timestamp));

    return alerts.map(alert => ({
      id: alert.id,
      type: alert.type as 'api_response_time' | 'database_query_time' | 'llm_response_time' | 'memory_usage' | 'cpu_usage' | 'disk_usage',
      severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
      message: alert.message,
      currentValue: Number(alert.currentValue),
      threshold: Number(alert.threshold) || 0,
      timestamp: alert.timestamp
    }));
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _start: Date, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _end: Date
  ) {
    // This would typically involve analyzing slow queries and endpoints
    // For now, we'll return placeholder data
    return {
      databaseQueries: [],
      apiEndpoints: []
    };
  }

  /**
   * Generate general recommendations
   */
  private generateGeneralRecommendations(summary: { averageResponseTime: number; errorRate: number; systemHealth: 'excellent' | 'good' | 'warning' | 'critical' }, alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    if (summary.averageResponseTime > 1000) {
      recommendations.push("Consider implementing caching for frequently accessed data");
    }

    if (summary.errorRate > 5) {
      recommendations.push("High error rate detected. Review error logs and implement better error handling");
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push("Critical performance alerts detected. Immediate attention required");
    }

    if (summary.systemHealth === 'critical') {
      recommendations.push("System health is critical. Consider scaling resources or optimizing performance");
    }

    return recommendations;
  }

  /**
   * Calculate system health status
   */
  private calculateSystemHealthStatus(avgResponseTime: number, errorRate: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (avgResponseTime > 3000 || errorRate > 10) return 'critical';
    if (avgResponseTime > 1000 || errorRate > 5) return 'warning';
    if (avgResponseTime > 500 || errorRate > 1) return 'good';
    return 'excellent';
  }

  /**
   * Get threshold for metric type
   */
  private getThreshold(type: string) {
    return this.ALERT_THRESHOLDS[type as keyof typeof this.ALERT_THRESHOLDS];
  }

  /**
   * Get memory usage (mock implementation)
   */
  private async getMemoryUsage(): Promise<number> {
    // In production, this would use system monitoring tools
    return Math.random() * 100;
  }

  /**
   * Get CPU usage (mock implementation)
   */
  private async getCPUUsage(): Promise<number> {
    // In production, this would use system monitoring tools
    return Math.random() * 100;
  }

  /**
   * Get disk usage (mock implementation)
   */
  private async getDiskUsage(): Promise<number> {
    // In production, this would use system monitoring tools
    return Math.random() * 100;
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      apiResponseTime: 0,
      databaseQueryTime: 0,
      llmResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      timestamp: new Date()
    };
  }

  /**
   * Clear performance cache
   */
  private async clearCache(): Promise<void> {
    try {
      await redis.del(this.CACHE_KEYS.PERFORMANCE_METRICS);
      await redis.del(this.CACHE_KEYS.SYSTEM_HEALTH);
      await redis.del(this.CACHE_KEYS.ALERTS);
    } catch (error) {
      logger.error("Failed to clear performance cache", error as Error);
    }
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();