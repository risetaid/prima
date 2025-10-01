/**
 * LLM Usage Service
 * Provides file-based storage for LLM usage tracking with atomic operations
 * Handles daily/monthly rollover and model-specific usage tracking
 */

import { promises as fs } from "fs";
import * as path from "path";
import { logger } from "@/lib/logger";

export interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
}

export interface MonthlyUsage {
  month: string;
  tokens: number;
  cost: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface UsageData {
  daily: DailyUsage;
  monthly: MonthlyUsage;
  models: Record<string, ModelUsage>;
  lastUpdated: string;
  version: string;
}

export interface UsageStats {
  dailyTokens: number;
  dailyCost: number;
  monthlyTokens: number;
  monthlyCost: number;
  models: Record<string, ModelUsage>;
  lastUpdated: Date;
}

class LLMUsageService {
  private static instance: LLMUsageService;
  private readonly USAGE_FILE_PATH = path.join(process.cwd(), "src", "data", "llm-usage.json");
  private readonly BACKUP_SUFFIX = ".backup";
  private isWriting = false;

  private constructor() {
    logger.info("LLM Usage Service initialized", { filePath: this.USAGE_FILE_PATH });
  }

  public static getInstance(): LLMUsageService {
    if (!LLMUsageService.instance) {
      LLMUsageService.instance = new LLMUsageService();
    }
    return LLMUsageService.instance;
  }

  /**
   * Track usage for a request
   */
  async trackUsage(
    inputTokens: number,
    outputTokens: number,
    cost: number,
    model: string
  ): Promise<void> {
    await this.atomicUpdate(async (data) => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.toISOString().slice(0, 7);

      // Update daily usage
      if (data.daily.date !== today) {
        // Rollover daily data
        data.daily = {
          date: today,
          tokens: 0,
          cost: 0
        };
        logger.info("Daily usage rollover", { newDate: today });
      }
      data.daily.tokens += inputTokens + outputTokens;
      data.daily.cost += cost;

      // Update monthly usage
      if (data.monthly.month !== thisMonth) {
        // Rollover monthly data
        data.monthly = {
          month: thisMonth,
          tokens: 0,
          cost: 0
        };
        logger.info("Monthly usage rollover", { newMonth: thisMonth });
      }
      data.monthly.tokens += inputTokens + outputTokens;
      data.monthly.cost += cost;

      // Update model-specific usage
      if (!data.models[model]) {
        data.models[model] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0
        };
      }
      data.models[model].inputTokens += inputTokens;
      data.models[model].outputTokens += outputTokens;
      data.models[model].cost += cost;

      data.lastUpdated = now.toISOString();
    });
  }

  /**
   * Get current usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const data = await this.readUsageData();

    return {
      dailyTokens: data.daily.tokens,
      dailyCost: data.daily.cost,
      monthlyTokens: data.monthly.tokens,
      monthlyCost: data.monthly.cost,
      models: data.models,
      lastUpdated: new Date(data.lastUpdated)
    };
  }

  /**
   * Get usage for a specific model
   */
  async getModelUsage(model: string): Promise<ModelUsage | null> {
    const data = await this.readUsageData();
    return data.models[model] || null;
  }

  /**
   * Reset usage data (for testing or manual reset)
   */
  async resetUsage(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = now.toISOString().slice(0, 7);

    const resetData: UsageData = {
      daily: {
        date: today,
        tokens: 0,
        cost: 0
      },
      monthly: {
        month: thisMonth,
        tokens: 0,
        cost: 0
      },
      models: {},
      lastUpdated: now.toISOString(),
      version: "1.0"
    };

    await this.atomicWrite(resetData);
    logger.info("Usage data reset");
  }

  /**
   * Get historical usage data (full data structure)
   */
  async getUsageData(): Promise<UsageData> {
    return await this.readUsageData();
  }

  /**
   * Export usage data to a file
   */
  async exportUsageData(filePath: string): Promise<void> {
    const data = await this.readUsageData();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info("Usage data exported", { exportPath: filePath });
  }

  /**
   * Atomic update operation with file locking
   */
  private async atomicUpdate(updateFn: (data: UsageData) => void | Promise<void>): Promise<void> {
    if (this.isWriting) {
      // Wait for current write to complete
      await new Promise(resolve => {
        const checkWriting = () => {
          if (!this.isWriting) {
            resolve(void 0);
          } else {
            setTimeout(checkWriting, 10);
          }
        };
        checkWriting();
      });
    }

    this.isWriting = true;

    try {
      const data = await this.readUsageData();
      await updateFn(data);
      await this.atomicWrite(data);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Atomic write with backup
   */
  private async atomicWrite(data: UsageData): Promise<void> {
    const tempPath = `${this.USAGE_FILE_PATH}.tmp`;
    const backupPath = `${this.USAGE_FILE_PATH}${this.BACKUP_SUFFIX}`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

      // Create backup of current file if it exists
      try {
        await fs.access(this.USAGE_FILE_PATH);
        await fs.copyFile(this.USAGE_FILE_PATH, backupPath);
      } catch {
        // No existing file, skip backup
      }

      // Atomic move (rename) to final location
      await fs.rename(tempPath, this.USAGE_FILE_PATH);

      // Clean up backup after successful write
      try {
        await fs.unlink(backupPath);
      } catch {
        // Backup cleanup failed, but write succeeded
      }

    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Temp file cleanup failed
      }

      // Restore from backup if available
      try {
        await fs.access(backupPath);
        await fs.copyFile(backupPath, this.USAGE_FILE_PATH);
        logger.warn("Restored usage data from backup after write failure");
      } catch {
        // No backup available
      }

      throw error;
    }
  }

  /**
   * Read usage data with error handling
   */
  private async readUsageData(): Promise<UsageData> {
    try {
      const content = await fs.readFile(this.USAGE_FILE_PATH, 'utf-8');
      const data = JSON.parse(content);

      // Validate data structure
      if (!this.isValidUsageData(data)) {
        throw new Error("Invalid usage data structure");
      }

      return data;
    } catch (error) {
      logger.warn("Failed to read usage data, initializing new data", {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return default data structure
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thisMonth = now.toISOString().slice(0, 7);

      return {
        daily: {
          date: today,
          tokens: 0,
          cost: 0
        },
        monthly: {
          month: thisMonth,
          tokens: 0,
          cost: 0
        },
        models: {},
        lastUpdated: now.toISOString(),
        version: "1.0"
      };
    }
  }

  /**
   * Validate usage data structure
   */
  private isValidUsageData(data: unknown): data is UsageData {
    const candidate = data as Record<string, unknown>;
    const daily = candidate?.daily as Record<string, unknown>;
    const monthly = candidate?.monthly as Record<string, unknown>;

    return (
      candidate != null &&
      typeof candidate === 'object' &&
      daily != null &&
      typeof daily.date === 'string' &&
      typeof daily.tokens === 'number' &&
      typeof daily.cost === 'number' &&
      monthly != null &&
      typeof monthly.month === 'string' &&
      typeof monthly.tokens === 'number' &&
      typeof monthly.cost === 'number' &&
      candidate.models != null &&
      typeof candidate.models === 'object' &&
      typeof candidate.lastUpdated === 'string' &&
      typeof candidate.version === 'string'
    );
  }
}

// Export singleton instance
export const llmUsageService = LLMUsageService.getInstance();
