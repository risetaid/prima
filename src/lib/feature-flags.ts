// src/lib/feature-flags.ts
import { logger } from '@/lib/logger';
import { FLAG_DEFINITIONS, FlagDefinition } from './feature-flag-config';

export interface FlagMetadata {
  enabled: boolean;
  rolloutPercentage: number;
  enabledAt: Date | null;
  definition: FlagDefinition;
}

export class FeatureFlags {
  private flags: Map<string, boolean>;
  private metadata: Map<string, FlagMetadata>;

  constructor() {
    this.flags = new Map();
    this.metadata = new Map();
    this.initialize();
  }

  private initialize(): void {
    // Load all flag definitions
    Object.entries(FLAG_DEFINITIONS).forEach(([key, definition]) => {
      const envKey = `FEATURE_FLAG_${key}`;
      const envValue = process.env[envKey];
      
      let enabled = definition.defaultEnabled;
      
      if (envValue !== undefined) {
        if (envValue === 'true') {
          enabled = true;
        } else if (envValue === 'false') {
          enabled = false;
        } else {
          logger.warn(`Invalid feature flag value for ${key}: ${envValue}, defaulting to false`);
          enabled = false;
        }
      }

      this.flags.set(key, enabled);
      this.metadata.set(key, {
        enabled,
        rolloutPercentage: enabled ? 100 : 0,
        enabledAt: enabled ? new Date() : null,
        definition,
      });

      if (enabled) {
        logger.info(`Feature flag enabled: ${key}`, { flag: key, category: definition.category });
      }
    });
  }

  /**
   * Check if a feature flag is enabled
   * Returns false for unknown flags (safe default)
   */
  public isEnabled(flagName: string): boolean {
    try {
      return this.flags.get(flagName) ?? false;
    } catch (error) {
      logger.error(`Error checking feature flag ${flagName}`, error instanceof Error ? error : undefined);
      return false; // Fail closed
    }
  }

  /**
   * Get metadata for a feature flag
   */
  public getMetadata(flagName: string): FlagMetadata | null {
    return this.metadata.get(flagName) ?? null;
  }

  /**
   * Get all enabled flags
   */
  public getEnabledFlags(): string[] {
    return Array.from(this.flags.entries())
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }

  /**
   * Get all flag metadata for monitoring dashboard
   */
  public getAllMetadata(): Record<string, FlagMetadata> {
    const result: Record<string, FlagMetadata> = {};
    this.metadata.forEach((metadata, key) => {
      result[key] = metadata;
    });
    return result;
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlags();
