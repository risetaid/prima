/**
 * Performance Monitoring Service for PRIMA system
 * Provides comprehensive performance tracking, database optimization, and automated monitoring
 */

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
      // Performance metrics table was removed from schema
      // Log the metric instead
      logger.debug(`Performance metric recorded: ${metric.name}`, {
        type: metric.type,
        value: metric.value,
        unit: metric.unit
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
    
    // Performance metrics table was removed from schema
    // Return default metrics
    return {
      apiResponseTime: 0,
      databaseQueryTime: 0,
      llmResponseTime: 0,
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
      // Performance metrics table was removed from schema
      // Return empty array
      return [];
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
      // Analytics events table was removed from schema
      // Just log the alert
      logger.warn(`Performance alert created: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async generateSummary(_start: Date, _end: Date) {
    // Performance metrics and analytics events tables were removed from schema
    // Return default summary values
    const systemHealth = this.calculateSystemHealthStatus(0, 0);

    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      systemHealth
    };
  }

  /**
   * Get metrics in date range
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getMetricsInRange(_start: Date, _end: Date): Promise<PerformanceMetrics[]> {
    // Performance metrics table was removed from schema
    // Return empty array
    return [];
  }

  /**
   * Get alerts in date range
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAlertsInRange(_start: Date, _end: Date): Promise<PerformanceAlert[]> {
    // Performance metrics table was removed from schema
    // Return empty array
    return [];
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