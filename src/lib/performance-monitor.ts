import { logger } from '@/lib/logger'

export interface QueryMetrics {
  queryName: string
  duration: number
  timestamp: Date
  success: boolean
  rowCount?: number
  error?: string
}

export interface PerformanceMetrics {
  totalQueries: number
  averageDuration: number
  slowestQuery: QueryMetrics | null
  fastestQuery: QueryMetrics | null
  errorCount: number
  successRate: number
}

export interface DatabaseHealthMetrics {
  connectionPoolSize: number
  activeConnections: number
  idleConnections: number
  waitingClients: number
  totalCount: number
  idleCount: number
  waitingCount: number
}

/**
 * Performance monitoring service for database queries and system health
 */
export class PerformanceMonitor {
  private static metrics: QueryMetrics[] = []
  private static readonly MAX_METRICS_HISTORY = 1000

  /**
   * Monitor a database query execution
   */
  static async monitorQuery(
    queryName: string,
    queryFn: () => Promise<unknown>,
    options: {
      logSlowQueries?: boolean
      slowQueryThreshold?: number
      includeRowCount?: boolean
    } = {}
  ): Promise<unknown> {
    const startTime = Date.now()
    const {
      logSlowQueries = true,
      slowQueryThreshold = 1000, // 1 second
      includeRowCount = false
    } = options

    try {
      const result: unknown = await queryFn()
      const duration = Date.now() - startTime

      const metrics: QueryMetrics = {
        queryName,
        duration,
        timestamp: new Date(),
        success: true,
        rowCount: includeRowCount && Array.isArray(result) ? (result as unknown[]).length : undefined
      }

      this.recordMetrics(metrics)

      // Log slow queries
      if (logSlowQueries && duration > slowQueryThreshold) {
        logger.performance(`SLOW QUERY: ${queryName}`, duration, {
          threshold: slowQueryThreshold,
          rowCount: metrics.rowCount
        })
      } else if (duration > 100) { // Log queries over 100ms
        logger.performance(queryName, duration, { rowCount: metrics.rowCount })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      const metrics: QueryMetrics = {
        queryName,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }

      this.recordMetrics(metrics)

      logger.error(`Query failed: ${queryName}`, error instanceof Error ? error : new Error(String(error)), {
        duration,
        queryName
      })

      throw error
    }
  }

  /**
   * Record query metrics for analysis
   */
  private static recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics)

    // Maintain history limit
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY)
    }
  }

  /**
   * Get performance metrics for a time period
   */
  static getPerformanceMetrics(hours: number = 1): PerformanceMetrics {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000))

    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime)

    if (relevantMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowestQuery: null,
        fastestQuery: null,
        errorCount: 0,
        successRate: 0
      }
    }

    const totalQueries = relevantMetrics.length
    const errorCount = relevantMetrics.filter(m => !m.success).length
    const successRate = ((totalQueries - errorCount) / totalQueries) * 100

    const successfulQueries = relevantMetrics.filter(m => m.success)
    const averageDuration = successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length

    const slowestQuery = successfulQueries.reduce((slowest, current) =>
      current.duration > slowest.duration ? current : slowest,
      successfulQueries[0]
    )

    const fastestQuery = successfulQueries.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest,
      successfulQueries[0]
    )

    return {
      totalQueries,
      averageDuration,
      slowestQuery,
      fastestQuery,
      errorCount,
      successRate
    }
  }

  /**
   * Get query performance by name
   */
  static getQueryPerformance(queryName: string, hours: number = 1): {
    averageDuration: number
    totalExecutions: number
    successRate: number
    lastExecuted: Date | null
  } {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000))

    const queryMetrics = this.metrics.filter(m =>
      m.queryName === queryName && m.timestamp >= cutoffTime
    )

    if (queryMetrics.length === 0) {
      return {
        averageDuration: 0,
        totalExecutions: 0,
        successRate: 0,
        lastExecuted: null
      }
    }

    const totalExecutions = queryMetrics.length
    const errorCount = queryMetrics.filter(m => !m.success).length
    const successRate = ((totalExecutions - errorCount) / totalExecutions) * 100

    const successfulQueries = queryMetrics.filter(m => m.success)
    const averageDuration = successfulQueries.length > 0
      ? successfulQueries.reduce((sum, m) => sum + m.duration, 0) / successfulQueries.length
      : 0

    const lastExecuted = queryMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || null

    return {
      averageDuration,
      totalExecutions,
      successRate,
      lastExecuted
    }
  }

  /**
   * Clear old metrics to free memory
   */
  static clearOldMetrics(hoursOld: number = 24): void {
    const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000))
    const beforeCount = this.metrics.length

    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime)

    const removedCount = beforeCount - this.metrics.length
    if (removedCount > 0) {
      logger.info(`Cleared ${removedCount} old performance metrics`, { hoursOld })
    }
  }

  /**
   * Get system health overview
   */
  static getHealthOverview(): {
    metrics: PerformanceMetrics
    memoryUsage: NodeJS.MemoryUsage
    uptime: number
  } {
    const metrics = this.getPerformanceMetrics(1) // Last hour

    return {
      metrics,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  }

  /**
   * Log performance summary
   */
  static logPerformanceSummary(hours: number = 1): void {
    const metrics = this.getPerformanceMetrics(hours)

    logger.info('Performance Summary', {
      period: `${hours} hour(s)`,
      totalQueries: metrics.totalQueries,
      averageDuration: `${metrics.averageDuration.toFixed(2)}ms`,
      successRate: `${metrics.successRate.toFixed(2)}%`,
      errorCount: metrics.errorCount,
      slowestQuery: metrics.slowestQuery ? {
        name: metrics.slowestQuery.queryName,
        duration: `${metrics.slowestQuery.duration}ms`
      } : null
    })
  }
}

/**
 * Decorator for monitoring database operations
 */
export function monitorQuery(
  queryName: string,
  options: {
    logSlowQueries?: boolean
    slowQueryThreshold?: number
    includeRowCount?: boolean
  } = {}
) {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>

    descriptor.value = async function (...args: unknown[]) {
      return PerformanceMonitor.monitorQuery(
        queryName,
        () => originalMethod.apply(this, args),
        options
      )
    }

    return descriptor
  }
}

