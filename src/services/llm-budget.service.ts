/**
 * LLM Budget Service
 * Manages budget configuration and alert notifications for LLM usage
 */

import { promises as fs } from "fs";
import * as path from "path";
import { logger } from "@/lib/logger";

export interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
  alerts: {
    dailyThreshold: number;
    monthlyThreshold: number;
    notifyEmail: string | null;
    slackWebhook: string | null;
    alertCooldownMinutes: number;
  };
  models: Record<string, {
    dailyLimit: number;
    monthlyLimit: number;
  }>;
  version: string;
  lastUpdated: string;
}

export interface BudgetAlert {
  type: "daily_limit" | "monthly_limit" | "model_limit";
  message: string;
  currentUsage: number;
  limit: number;
  threshold: number;
  model?: string;
  timestamp: Date;
}

class LLMBudgetService {
  private static instance: LLMBudgetService;
  private readonly CONFIG_FILE_PATH = path.join(process.cwd(), "src", "config", "llm-budgets.json");
  private config: BudgetConfig | null = null;
  private lastAlertTimes = new Map<string, Date>();

  private constructor() {
    logger.info("LLM Budget Service initialized");
  }

  public static getInstance(): LLMBudgetService {
    if (!LLMBudgetService.instance) {
      LLMBudgetService.instance = new LLMBudgetService();
    }
    return LLMBudgetService.instance;
  }

  /**
   * Load budget configuration
   */
  async loadConfig(): Promise<BudgetConfig> {
    try {
      if (this.config) {
        return this.config;
      }

      const configContent = await fs.readFile(this.CONFIG_FILE_PATH, 'utf-8');
      this.config = JSON.parse(configContent);

      // Validate configuration
      if (this.isValidBudgetConfig(this.config)) {
        this.validateConfig(this.config);
      } else {
        throw new Error("Invalid budget configuration structure");
      }

      return this.config;
    } catch (error) {
      logger.warn("Failed to load budget config, using defaults", {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return default configuration
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Update budget configuration
   */
  async updateConfig(updates: Partial<BudgetConfig>): Promise<void> {
    try {
      const currentConfig = await this.loadConfig();
      const newConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };

      this.validateConfig(newConfig);

      await fs.writeFile(this.CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      this.config = newConfig;

      logger.info("Budget configuration updated", { updates });
    } catch (error) {
      logger.error("Failed to update budget configuration", error as Error);
      throw error;
    }
  }

  /**
   * Check if usage exceeds budget limits and generate alerts
   */
  async checkBudgetLimits(
    dailyTokens: number,
    monthlyTokens: number,
    modelUsage?: Record<string, { inputTokens: number; outputTokens: number; cost: number }>
  ): Promise<BudgetAlert[]> {
    const config = await this.loadConfig();
    const alerts: BudgetAlert[] = [];
    const now = new Date();

    // Check daily limit
    const dailyPercentage = dailyTokens / config.dailyLimit;
    if (dailyPercentage >= config.alerts.dailyThreshold) {
      const alertKey = `daily_${now.toDateString()}`;
      if (this.shouldSendAlert(alertKey, config.alerts.alertCooldownMinutes)) {
        alerts.push({
          type: "daily_limit",
          message: `Daily token usage at ${dailyPercentage.toFixed(1)}% of limit (${dailyTokens}/${config.dailyLimit})`,
          currentUsage: dailyTokens,
          limit: config.dailyLimit,
          threshold: config.alerts.dailyThreshold,
          timestamp: now,
        });
        this.lastAlertTimes.set(alertKey, now);
      }
    }

    // Check monthly limit
    const monthlyPercentage = monthlyTokens / config.monthlyLimit;
    if (monthlyPercentage >= config.alerts.monthlyThreshold) {
      const alertKey = `monthly_${now.getFullYear()}_${now.getMonth()}`;
      if (this.shouldSendAlert(alertKey, config.alerts.alertCooldownMinutes)) {
        alerts.push({
          type: "monthly_limit",
          message: `Monthly token usage at ${monthlyPercentage.toFixed(1)}% of limit (${monthlyTokens}/${config.monthlyLimit})`,
          currentUsage: monthlyTokens,
          limit: config.monthlyLimit,
          threshold: config.alerts.monthlyThreshold,
          timestamp: now,
        });
        this.lastAlertTimes.set(alertKey, now);
      }
    }

    // Check model-specific limits
    if (modelUsage) {
      for (const [model, usage] of Object.entries(modelUsage)) {
        const modelConfig = config.models[model];
        if (modelConfig) {
          const totalTokens = usage.inputTokens + usage.outputTokens;
          const dailyPercentage = totalTokens / modelConfig.dailyLimit;

          if (dailyPercentage >= config.alerts.dailyThreshold) {
            const alertKey = `model_${model}_daily_${now.toDateString()}`;
            if (this.shouldSendAlert(alertKey, config.alerts.alertCooldownMinutes)) {
              alerts.push({
                type: "model_limit",
                message: `${model} daily usage at ${dailyPercentage.toFixed(1)}% of limit (${totalTokens}/${modelConfig.dailyLimit})`,
                currentUsage: totalTokens,
                limit: modelConfig.dailyLimit,
                threshold: config.alerts.dailyThreshold,
                model,
                timestamp: now,
              });
              this.lastAlertTimes.set(alertKey, now);
            }
          }
        }
      }
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }

    return alerts;
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<{
    dailyLimit: number;
    monthlyLimit: number;
    currentDailyUsage: number;
    currentMonthlyUsage: number;
    dailyPercentage: number;
    monthlyPercentage: number;
    alerts: BudgetAlert[];
  }> {
    const config = await this.loadConfig();
    const { llmUsageService } = await import("@/services/llm-usage.service");
    const usageStats = await llmUsageService.getUsageStats();

    const dailyPercentage = usageStats.dailyTokens / config.dailyLimit;
    const monthlyPercentage = usageStats.monthlyTokens / config.monthlyLimit;

    const alerts = await this.checkBudgetLimits(
      usageStats.dailyTokens,
      usageStats.monthlyTokens
    );

    return {
      dailyLimit: config.dailyLimit,
      monthlyLimit: config.monthlyLimit,
      currentDailyUsage: usageStats.dailyTokens,
      currentMonthlyUsage: usageStats.monthlyTokens,
      dailyPercentage,
      monthlyPercentage,
      alerts,
    };
  }

  /**
   * Send alerts via configured channels
   */
  private async sendAlerts(alerts: BudgetAlert[]): Promise<void> {
    const config = await this.loadConfig();

    for (const alert of alerts) {
      logger.warn("LLM Budget Alert", {
        type: alert.type,
        message: alert.message,
        currentUsage: alert.currentUsage,
        limit: alert.limit,
        threshold: alert.threshold,
        model: alert.model,
      });

      // Send email alert if configured
      if (config.alerts.notifyEmail) {
        await this.sendEmailAlert(alert, config.alerts.notifyEmail);
      }

      // Send Slack alert if configured
      if (config.alerts.slackWebhook) {
        await this.sendSlackAlert(alert, config.alerts.slackWebhook);
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: BudgetAlert, email: string): Promise<void> {
    try {
      // In a real implementation, you would integrate with your email service
      // For now, just log the alert
      logger.info("Email alert would be sent", {
        to: email,
        subject: `LLM Budget Alert: ${alert.type}`,
        message: alert.message,
      });
    } catch (error) {
      logger.error("Failed to send email alert", error as Error, { alert });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: BudgetAlert, webhookUrl: string): Promise<void> {
    try {
      const payload = {
        text: `🚨 LLM Budget Alert`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${alert.type.toUpperCase()} ALERT*\n${alert.message}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Current Usage:* ${alert.currentUsage.toLocaleString()}`,
              },
              {
                type: "mrkdwn",
                text: `*Limit:* ${alert.limit.toLocaleString()}`,
              },
              {
                type: "mrkdwn",
                text: `*Threshold:* ${(alert.threshold * 100).toFixed(0)}%`,
              },
              {
                type: "mrkdwn",
                text: `*Time:* ${alert.timestamp.toISOString()}`,
              },
            ],
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      logger.info("Slack alert sent successfully", { alert });
    } catch (error) {
      logger.error("Failed to send Slack alert", error as Error, { alert });
    }
  }

  /**
   * Check if alert should be sent based on cooldown
   */
  private shouldSendAlert(alertKey: string, cooldownMinutes: number): boolean {
    const lastAlert = this.lastAlertTimes.get(alertKey);
    if (!lastAlert) {
      return true;
    }

    const now = new Date();
    const timeDiff = (now.getTime() - lastAlert.getTime()) / (1000 * 60); // minutes
    return timeDiff >= cooldownMinutes;
  }

  /**
   * Validate budget configuration
   */
  private validateConfig(config: BudgetConfig): void {
    if (!config.dailyLimit || config.dailyLimit <= 0) {
      throw new Error("Invalid dailyLimit in budget configuration");
    }
    if (!config.monthlyLimit || config.monthlyLimit <= 0) {
      throw new Error("Invalid monthlyLimit in budget configuration");
    }
    if (!config.alerts) {
      throw new Error("Missing alerts configuration");
    }
    if (config.alerts.dailyThreshold < 0 || config.alerts.dailyThreshold > 1) {
      throw new Error("dailyThreshold must be between 0 and 1");
    }
    if (config.alerts.monthlyThreshold < 0 || config.alerts.monthlyThreshold > 1) {
      throw new Error("monthlyThreshold must be between 0 and 1");
    }
  }

  /**
   * Check if object is valid budget config
   */
  private isValidBudgetConfig(obj: unknown): obj is BudgetConfig {
    const candidate = obj as Record<string, unknown>;
    return (
      candidate != null &&
      typeof candidate === 'object' &&
      typeof candidate.dailyLimit === 'number' &&
      typeof candidate.monthlyLimit === 'number' &&
      candidate.alerts != null &&
      typeof candidate.alerts === 'object' &&
      typeof candidate.version === 'string'
    );
  }

  /**
   * Get default budget configuration
   */
  private getDefaultConfig(): BudgetConfig {
    return {
      dailyLimit: 50000,
      monthlyLimit: 1000000,
      alerts: {
        dailyThreshold: 0.8,
        monthlyThreshold: 0.9,
        notifyEmail: null,
        slackWebhook: null,
        alertCooldownMinutes: 60,
      },
      models: {
        "claude-3-5-haiku": {
          dailyLimit: 20000,
          monthlyLimit: 400000,
        },
        "claude-3-5-sonnet": {
          dailyLimit: 15000,
          monthlyLimit: 300000,
        },
        "claude-3-opus": {
          dailyLimit: 5000,
          monthlyLimit: 100000,
        },
      },
      version: "1.0",
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const llmBudgetService = LLMBudgetService.getInstance();
