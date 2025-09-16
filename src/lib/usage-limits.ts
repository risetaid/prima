/**
 * Usage Limits and Alerts Service for LLM cost management
 * Implements rate limiting, usage quotas, and automated alerts
 */

import { db } from '@/db'
import { conversationMessages } from '@/db/schema'
import { and, gte, lte, sql, count, sum } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export interface UsageLimit {
  type: 'daily' | 'monthly' | 'per_user'
  limit: number
  current: number
  resetDate: Date
  userId?: string
}

export interface UsageAlert {
  id: string
  type: 'limit_approaching' | 'limit_exceeded' | 'rate_limit' | 'cost_spike'
  message: string
  severity: 'warning' | 'error' | 'critical'
  threshold: number
  current: number
  userId?: string
  createdAt: Date
  resolvedAt?: Date
}

export class UsageLimitsService {
  private readonly DAILY_TOKEN_LIMIT = parseInt(process.env.DAILY_TOKEN_LIMIT || '50000')
  private readonly MONTHLY_TOKEN_LIMIT = parseInt(process.env.MONTHLY_TOKEN_LIMIT || '1000000')
  private readonly COST_ALERT_THRESHOLD = parseFloat(process.env.COST_ALERT_THRESHOLD || '100')
  private readonly RATE_LIMIT_REQUESTS_PER_HOUR = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '1000')

  private alerts: UsageAlert[] = []
  private lastCheckTime = new Date()

  /**
   * Check if a user/request is within usage limits
   */
  async checkLimits(userId?: string): Promise<{
    allowed: boolean
    limits: UsageLimit[]
    alerts: UsageAlert[]
  }> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const limits: UsageLimit[] = []
    let allowed = true

    // Check daily token limit
    const dailyUsage = await this.getTokenUsage(today, now)
    const dailyLimit: UsageLimit = {
      type: 'daily',
      limit: this.DAILY_TOKEN_LIMIT,
      current: dailyUsage,
      resetDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      userId
    }
    limits.push(dailyLimit)

    if (dailyUsage >= this.DAILY_TOKEN_LIMIT) {
      allowed = false
      await this.createAlert({
        type: 'limit_exceeded',
        message: `Daily token limit exceeded: ${dailyUsage}/${this.DAILY_TOKEN_LIMIT}`,
        severity: 'error',
        threshold: this.DAILY_TOKEN_LIMIT,
        current: dailyUsage,
        userId
      })
    } else if (dailyUsage >= this.DAILY_TOKEN_LIMIT * 0.8) {
      await this.createAlert({
        type: 'limit_approaching',
        message: `Daily token limit approaching: ${dailyUsage}/${this.DAILY_TOKEN_LIMIT}`,
        severity: 'warning',
        threshold: this.DAILY_TOKEN_LIMIT,
        current: dailyUsage,
        userId
      })
    }

    // Check monthly token limit
    const monthlyUsage = await this.getTokenUsage(thisMonth, now)
    const monthlyLimit: UsageLimit = {
      type: 'monthly',
      limit: this.MONTHLY_TOKEN_LIMIT,
      current: monthlyUsage,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      userId
    }
    limits.push(monthlyLimit)

    if (monthlyUsage >= this.MONTHLY_TOKEN_LIMIT) {
      allowed = false
      await this.createAlert({
        type: 'limit_exceeded',
        message: `Monthly token limit exceeded: ${monthlyUsage}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: 'critical',
        threshold: this.MONTHLY_TOKEN_LIMIT,
        current: monthlyUsage,
        userId
      })
    } else if (monthlyUsage >= this.MONTHLY_TOKEN_LIMIT * 0.9) {
      await this.createAlert({
        type: 'limit_approaching',
        message: `Monthly token limit approaching: ${monthlyUsage}/${this.MONTHLY_TOKEN_LIMIT}`,
        severity: 'warning',
        threshold: this.MONTHLY_TOKEN_LIMIT,
        current: monthlyUsage,
        userId
      })
    }

    // Check rate limit (requests per hour)
    const hourlyRequests = await this.getRequestCount(
      new Date(now.getTime() - 60 * 60 * 1000),
      now
    )

    if (hourlyRequests >= this.RATE_LIMIT_REQUESTS_PER_HOUR) {
      allowed = false
      await this.createAlert({
        type: 'rate_limit',
        message: `Rate limit exceeded: ${hourlyRequests}/${this.RATE_LIMIT_REQUESTS_PER_HOUR} requests/hour`,
        severity: 'error',
        threshold: this.RATE_LIMIT_REQUESTS_PER_HOUR,
        current: hourlyRequests,
        userId
      })
    }

    // Check for cost spikes
    const recentCost = await this.getCostInPeriod(
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
      now
    )

    if (recentCost > this.COST_ALERT_THRESHOLD) {
      await this.createAlert({
        type: 'cost_spike',
        message: `High cost detected: $${recentCost.toFixed(2)} in last 24 hours`,
        severity: 'warning',
        threshold: this.COST_ALERT_THRESHOLD,
        current: recentCost,
        userId
      })
    }

    return {
      allowed,
      limits,
      alerts: this.getActiveAlerts(userId)
    }
  }

  /**
   * Get token usage for a specific period
   */
  private async getTokenUsage(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const query = db
        .select({ tokens: sum(conversationMessages.llmTokensUsed) })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        )

      // Note: We don't have userId in conversationMessages, so we can't filter by user
      // This would need to be added if per-user limits are required

      const result = await query
      return Number(result[0]?.tokens) || 0
    } catch (error) {
      logger.error('Failed to get token usage', error as Error)
      return 0
    }
  }

  /**
   * Get request count for a specific period
   */
  private async getRequestCount(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const query = db
        .select({ count: count() })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmTokensUsed} IS NOT NULL`
          )
        )

      const result = await query
      return Number(result[0]?.count) || 0
    } catch (error) {
      logger.error('Failed to get request count', error as Error)
      return 0
    }
  }

  /**
   * Get cost for a specific period
   */
  private async getCostInPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const query = db
        .select({ cost: sum(conversationMessages.llmCost) })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        )

      const result = await query
      return Number(result[0]?.cost) || 0
    } catch (error) {
      logger.error('Failed to get cost in period', error as Error)
      return 0
    }
  }

  /**
   * Create a usage alert
   */
  private async createAlert(alertData: Omit<UsageAlert, 'id' | 'createdAt'>): Promise<void> {
    // Check if similar alert already exists and is active
    const existingAlert = this.alerts.find(alert =>
      alert.type === alertData.type &&
      alert.userId === alertData.userId &&
      !alert.resolvedAt &&
      alert.createdAt.getTime() > Date.now() - 60 * 60 * 1000 // Within last hour
    )

    if (existingAlert) {
      // Update existing alert
      existingAlert.current = alertData.current
      existingAlert.message = alertData.message
      return
    }

    const alert: UsageAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      createdAt: new Date()
    }

    this.alerts.push(alert)

    logger.warn('Usage alert created', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      userId: alert.userId
    })

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(userId?: string): UsageAlert[] {
    return this.alerts.filter(alert =>
      !alert.resolvedAt &&
      (!userId || alert.userId === userId)
    )
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolvedAt = new Date()
      logger.info('Usage alert resolved', { alertId, type: alert.type })
    }
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStats(): Promise<{
    dailyUsage: number
    monthlyUsage: number
    hourlyRequests: number
    totalCost: number
    activeAlerts: number
  }> {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    const [dailyTokens, monthlyTokens, hourlyRequests, totalCost] = await Promise.all([
      this.getTokenUsage(today, now),
      this.getTokenUsage(thisMonth, now),
      this.getRequestCount(lastHour, now),
      this.getCostInPeriod(thisMonth, now)
    ])

    return {
      dailyUsage: dailyTokens,
      monthlyUsage: monthlyTokens,
      hourlyRequests,
      totalCost,
      activeAlerts: this.getActiveAlerts().length
    }
  }

  /**
   * Clean up old alerts
   */
  cleanupOldAlerts(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(alert =>
      !alert.resolvedAt || alert.createdAt > oneWeekAgo
    )
  }
}

// Export singleton instance
export const usageLimits = new UsageLimitsService()

// Clean up old alerts every hour
setInterval(() => {
  usageLimits.cleanupOldAlerts()
}, 60 * 60 * 1000)