/**
 * Cost Monitoring Service
 * Provides real-time cost tracking, alerts, and budget management for LLM operations
 */

import { db } from "@/db";
import { conversationMessages, conversationStates } from "@/db/schema";
import { and, eq, gte, lte, sql, sum } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  enhancedCostManager,
  CostBreakdown,
} from "@/lib/enhanced-cost-manager";

export interface CostThreshold {
  id: string;
  type: "daily" | "weekly" | "monthly" | "per_user" | "per_conversation";
  threshold: number;
  userId?: string;
  conversationId?: string;
  enabled: boolean;
  createdAt: Date;
}

export interface CostBudget {
  id: string;
  name: string;
  amount: number;
  period: "daily" | "weekly" | "monthly";
  userId?: string;
  alertThreshold: number; // Percentage (e.g., 80 for 80%)
  resetDate: Date;
  currentSpent: number;
  enabled: boolean;
  createdAt: Date;
}

export interface CostTrackingEvent {
  id: string;
  conversationId: string;
  messageId: string;
  userId: string;
  operationType: CostBreakdown["operationType"];
  model: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class CostMonitorService {
  private thresholds: CostThreshold[] = [];
  private budgets: CostBudget[] = [];
  private trackingEvents: CostTrackingEvent[] = [];
  private readonly MAX_EVENTS_MEMORY = 1000;

  /**
   * Track cost for a message in real-time
   */
  async trackMessageCost(
    conversationId: string,
    messageId: string,
    userId: string,
    inputText: string,
    outputText: string,
    model: string,
    operationType: CostBreakdown["operationType"],
    metadata?: Record<string, unknown>
  ): Promise<CostTrackingEvent> {
    try {
      // Calculate cost breakdown
      const costBreakdown = await enhancedCostManager.calculateEnhancedCost(
        inputText,
        outputText,
        model,
        operationType
      );

      // Create tracking event
      const event: CostTrackingEvent = {
        id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        messageId,
        userId,
        operationType,
        model,
        tokensUsed: costBreakdown.totalTokens,
        cost: costBreakdown.totalCost,
        timestamp: new Date(),
        metadata,
      };

      // Store in memory for quick access
      this.trackingEvents.push(event);
      if (this.trackingEvents.length > this.MAX_EVENTS_MEMORY) {
        this.trackingEvents = this.trackingEvents.slice(
          -this.MAX_EVENTS_MEMORY
        );
      }

      // Check thresholds and budgets
      await this.checkThresholds(event);
      await this.checkBudgets(event);

      // Log for analytics
      logger.info("Message cost tracked", {
        conversationId,
        messageId,
        userId,
        operationType,
        model,
        tokensUsed: costBreakdown.totalTokens,
        cost: costBreakdown.totalCost,
      });

      return event;
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to track message cost", err, {
        conversationId,
        messageId,
        userId,
        errorType: err.constructor.name,
        errorMessage: err.message,
      });

      // Don't throw error - return a minimal tracking event to prevent blocking LLM responses
      logger.warn(
        "Cost tracking failed, returning minimal event to prevent blocking",
        {
          conversationId,
          messageId,
          userId,
        }
      );

      return {
        id: `cost_fallback_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        conversationId,
        messageId,
        userId,
        operationType,
        model: model || "unknown",
        tokensUsed: 0,
        cost: 0,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          costTrackingFailed: true,
          error: err.message,
        },
      };
    }
  }

  /**
   * Add a cost threshold
   */
  addThreshold(threshold: Omit<CostThreshold, "id" | "createdAt">): string {
    const id = `threshold_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newThreshold: CostThreshold = {
      ...threshold,
      id,
      createdAt: new Date(),
    };

    this.thresholds.push(newThreshold);
    logger.info("Cost threshold added", {
      id,
      type: threshold.type,
      threshold: threshold.threshold,
    });
    return id;
  }

  /**
   * Remove a cost threshold
   */
  removeThreshold(thresholdId: string): boolean {
    const index = this.thresholds.findIndex((t) => t.id === thresholdId);
    if (index !== -1) {
      this.thresholds.splice(index, 1);
      logger.info("Cost threshold removed", { thresholdId });
      return true;
    }
    return false;
  }

  /**
   * Add a cost budget
   */
  addBudget(
    budget: Omit<CostBudget, "id" | "createdAt" | "currentSpent">
  ): string {
    const id = `budget_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newBudget: CostBudget = {
      ...budget,
      id,
      currentSpent: 0,
      createdAt: new Date(),
    };

    this.budgets.push(newBudget);
    logger.info("Cost budget added", {
      id,
      name: budget.name,
      amount: budget.amount,
    });
    return id;
  }

  /**
   * Update budget spending
   */
  async updateBudgetSpending(
    budgetId: string,
    additionalCost: number
  ): Promise<void> {
    const budget = this.budgets.find((b) => b.id === budgetId);
    if (budget) {
      budget.currentSpent += additionalCost;

      // Check if budget exceeded
      if (budget.currentSpent >= budget.amount) {
        logger.warn("Budget exceeded", {
          budgetId,
          name: budget.name,
          spent: budget.currentSpent,
          limit: budget.amount,
        });
      }
    }
  }

  /**
   * Check if cost event exceeds any thresholds
   */
  private async checkThresholds(event: CostTrackingEvent): Promise<void> {
    const alerts: string[] = [];

    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue;

      let currentValue = 0;
      let thresholdExceeded = false;

      switch (threshold.type) {
        case "per_user":
          if (threshold.userId === event.userId) {
            currentValue = await this.getUserCostInPeriod(
              event.userId,
              new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              new Date()
            );
            thresholdExceeded = currentValue >= threshold.threshold;
          }
          break;

        case "per_conversation":
          if (threshold.conversationId === event.conversationId) {
            currentValue = await this.getConversationCost(event.conversationId);
            thresholdExceeded = currentValue >= threshold.threshold;
          }
          break;

        case "daily":
          currentValue = await this.getTotalCostInPeriod(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            new Date()
          );
          thresholdExceeded = currentValue >= threshold.threshold;
          break;

        case "weekly":
          currentValue = await this.getTotalCostInPeriod(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date()
          );
          thresholdExceeded = currentValue >= threshold.threshold;
          break;

        case "monthly":
          currentValue = await this.getTotalCostInPeriod(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            new Date()
          );
          thresholdExceeded = currentValue >= threshold.threshold;
          break;
      }

      if (thresholdExceeded) {
        const alertMessage = `Cost threshold exceeded: ${
          threshold.type
        } limit of $${
          threshold.threshold
        } reached (current: $${currentValue.toFixed(2)})`;
        alerts.push(alertMessage);

        logger.warn("Cost threshold exceeded", {
          thresholdId: threshold.id,
          type: threshold.type,
          threshold: threshold.threshold,
          current: currentValue,
          userId: event.userId,
          conversationId: event.conversationId,
        });
      }
    }

    // Send alerts if any thresholds exceeded
    if (alerts.length > 0) {
      await this.sendCostAlerts(alerts, event);
    }
  }

  /**
   * Check if cost event affects any budgets
   */
  private async checkBudgets(event: CostTrackingEvent): Promise<void> {
    for (const budget of this.budgets) {
      if (!budget.enabled) continue;

      // Check if this event applies to the budget
      const appliesToBudget = !budget.userId || budget.userId === event.userId;

      if (appliesToBudget) {
        await this.updateBudgetSpending(budget.id, event.cost);

        // Check alert threshold
        const usagePercentage = (budget.currentSpent / budget.amount) * 100;
        if (usagePercentage >= budget.alertThreshold) {
          logger.warn("Budget alert threshold reached", {
            budgetId: budget.id,
            name: budget.name,
            usagePercentage,
            spent: budget.currentSpent,
            limit: budget.amount,
          });

          await this.sendBudgetAlert(budget, usagePercentage, event);
        }
      }
    }
  }

  /**
   * Get user cost in a specific period
   */
  private async getUserCostInPeriod(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Get conversations for this user
      const conversations = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(
          and(
            eq(conversationStates.patientId, userId),
            gte(conversationStates.createdAt, startDate),
            lte(conversationStates.createdAt, endDate)
          )
        );

      if (conversations.length === 0) return 0;

      const conversationIds = conversations.map((c) => c.id);

      // Get cost for these conversations
      const result = await db
        .select({ total: sum(conversationMessages.llmCost) })
        .from(conversationMessages)
        .where(
          and(
            sql`${conversationMessages.conversationStateId} IN ${conversationIds}`,
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      return Number(result[0]?.total) || 0;
    } catch (error) {
      logger.error("Failed to get user cost in period", error as Error, {
        userId,
      });
      return 0;
    }
  }

  /**
   * Get conversation total cost
   */
  private async getConversationCost(conversationId: string): Promise<number> {
    try {
      const result = await db
        .select({ total: sum(conversationMessages.llmCost) })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.conversationStateId, conversationId),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      return Number(result[0]?.total) || 0;
    } catch (error) {
      logger.error("Failed to get conversation cost", error as Error, {
        conversationId,
      });
      return 0;
    }
  }

  /**
   * Get total cost in a specific period
   */
  private async getTotalCostInPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const result = await db
        .select({ total: sum(conversationMessages.llmCost) })
        .from(conversationMessages)
        .where(
          and(
            gte(conversationMessages.createdAt, startDate),
            lte(conversationMessages.createdAt, endDate),
            sql`${conversationMessages.llmCost} IS NOT NULL`
          )
        );

      return Number(result[0]?.total) || 0;
    } catch (error) {
      logger.error("Failed to get total cost in period", error as Error);
      return 0;
    }
  }

  /**
   * Send cost alerts
   */
  private async sendCostAlerts(
    alerts: string[],
    event: CostTrackingEvent
  ): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    // For now, we'll just log them
    for (const alert of alerts) {
      logger.warn("Cost Alert", {
        alert,
        userId: event.userId,
        conversationId: event.conversationId,
        cost: event.cost,
        operationType: event.operationType,
      });
    }
  }

  /**
   * Send budget alerts
   */
  private async sendBudgetAlert(
    budget: CostBudget,
    usagePercentage: number,
    event: CostTrackingEvent
  ): Promise<void> {
    logger.warn("Budget Alert", {
      budgetId: budget.id,
      budgetName: budget.name,
      usagePercentage,
      spent: budget.currentSpent,
      limit: budget.amount,
      userId: event.userId,
      conversationId: event.conversationId,
    });
  }

  /**
   * Get cost monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<{
    activeThresholds: CostThreshold[];
    activeBudgets: CostBudget[];
    recentEvents: CostTrackingEvent[];
    costSummary: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
    alertsTriggered: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayCost, weekCost, monthCost] = await Promise.all([
      this.getTotalCostInPeriod(today, now),
      this.getTotalCostInPeriod(weekAgo, now),
      this.getTotalCostInPeriod(monthAgo, now),
    ]);

    return {
      activeThresholds: this.thresholds.filter((t) => t.enabled),
      activeBudgets: this.budgets.filter((b) => b.enabled),
      recentEvents: this.trackingEvents.slice(-10), // Last 10 events
      costSummary: {
        today: todayCost,
        thisWeek: weekCost,
        thisMonth: monthCost,
      },
      alertsTriggered: this.trackingEvents.filter((e) =>
        this.thresholds.some((t) => {
          // Simplified check - in practice you'd want more sophisticated alert tracking
          return t.enabled && e.cost > t.threshold;
        })
      ).length,
    };
  }

  /**
   * Reset budgets at the end of their periods
   */
  resetExpiredBudgets(): void {
    const now = new Date();

    for (const budget of this.budgets) {
      const shouldReset = this.shouldResetBudget(budget, now);
      if (shouldReset) {
        logger.info("Resetting budget", {
          budgetId: budget.id,
          name: budget.name,
          previousSpent: budget.currentSpent,
        });
        budget.currentSpent = 0;
        budget.resetDate = this.getNextResetDate(budget);
      }
    }
  }

  /**
   * Check if budget should be reset
   */
  private shouldResetBudget(budget: CostBudget, now: Date): boolean {
    switch (budget.period) {
      case "daily":
        return now >= budget.resetDate;
      case "weekly":
        return now.getDay() === 1 && now >= budget.resetDate; // Monday
      case "monthly":
        return now.getDate() === 1 && now >= budget.resetDate; // First day of month
      default:
        return false;
    }
  }

  /**
   * Get next reset date for budget
   */
  private getNextResetDate(budget: CostBudget): Date {
    const now = new Date();

    switch (budget.period) {
      case "daily":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case "weekly":
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        return new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
      case "monthly":
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Clean up old tracking events
   */
  cleanupOldEvents(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    this.trackingEvents = this.trackingEvents.filter(
      (event) => event.timestamp >= cutoffTime
    );
  }
}

// Export singleton instance
export const costMonitor = new CostMonitorService();

// Set up periodic cleanup
setInterval(() => {
  costMonitor.cleanupOldEvents();
  costMonitor.resetExpiredBudgets();
}, 60 * 60 * 1000); // Every hour
