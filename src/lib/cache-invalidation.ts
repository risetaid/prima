/**
 * Systematic Cache Invalidation Service for PRIMA Medical System
 *
 * This service provides centralized, systematic cache invalidation strategies
 * to ensure data consistency across the application.
 */

import {
  invalidateMultipleCache,
  safeInvalidateCache,
  CACHE_KEYS,
} from "@/lib/cache";
import { logger } from "@/lib/logger";

// Cache tags for grouping related cache entries
export const CACHE_TAGS = {
  PATIENT: "patient",
  REMINDER: "reminder",
  USER: "user",
  TEMPLATE: "template",
  DASHBOARD: "dashboard",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Cache Invalidation Strategies
 */
export class CacheInvalidationService {
  /**
   * Invalidate all cache entries related to a patient
   */
  static async invalidatePatientData(patientId: string): Promise<void> {
    const keysToInvalidate = [
      CACHE_KEYS.patient(patientId),
      CACHE_KEYS.reminderStats(patientId),
      CACHE_KEYS.remindersAll(patientId),
      CACHE_KEYS.healthNotes(patientId),
    ];

    logger.info("Invalidating patient-related cache", {
      cache: true,
      operation: "invalidate_patient_data",
      patientId,
      keysCount: keysToInvalidate.length,
    });

    await invalidateMultipleCache(keysToInvalidate);
  }

  /**
   * Safe invalidation of patient data with error handling and result reporting
   */
  static async safeInvalidatePatientData(patientId: string): Promise<{
    success: boolean;
    successfulKeys: string[];
    failedKeys: string[];
    errors: string[];
  }> {
    const keysToInvalidate = [
      CACHE_KEYS.patient(patientId),
      CACHE_KEYS.reminderStats(patientId),
      CACHE_KEYS.remindersAll(patientId),
      CACHE_KEYS.healthNotes(patientId),
    ];

    logger.info("Safe invalidating patient-related cache", {
      cache: true,
      operation: "safe_invalidate_patient_data",
      patientId,
      keysCount: keysToInvalidate.length,
    });

    return await CacheInvalidationService.safeInvalidate(keysToInvalidate);
  }

  /**
   * Invalidate all cache entries related to a user
   */
  static async invalidateUserData(userId: string): Promise<void> {
    const keysToInvalidate = [
      CACHE_KEYS.userProfile(userId),
      CACHE_KEYS.userSession(userId),
    ];

    logger.info("Invalidating user-related cache", {
      cache: true,
      operation: "invalidate_user_data",
      userId,
      keysCount: keysToInvalidate.length,
    });

    await invalidateMultipleCache(keysToInvalidate);
  }

  /**
   * Invalidate reminder-related cache for a patient
   */
  static async invalidateReminderData(patientId: string): Promise<void> {
    const keysToInvalidate = [
      CACHE_KEYS.reminderStats(patientId),
      CACHE_KEYS.remindersAll(patientId),
    ];

    logger.info("Invalidating reminder-related cache", {
      cache: true,
      operation: "invalidate_reminder_data",
      patientId,
      keysCount: keysToInvalidate.length,
    });

    await invalidateMultipleCache(keysToInvalidate);
  }

  /**
   * Invalidate dashboard/overview cache
   */
  static async invalidateDashboardData(): Promise<void> {
    // Dashboard cache keys (to be defined in CACHE_KEYS if not already)
    const keysToInvalidate = [
      "dashboard:overview",
      "dashboard:stats",
      "dashboard:recent-activity",
    ];

    logger.info("Invalidating dashboard cache", {
      cache: true,
      operation: "invalidate_dashboard_data",
      keysCount: keysToInvalidate.length,
    });

    await invalidateMultipleCache(keysToInvalidate);
  }

  /**
   * Safe invalidation of dashboard data with error handling and result reporting
   */
  static async safeInvalidateDashboardData(): Promise<{
    success: boolean;
    successfulKeys: string[];
    failedKeys: string[];
    errors: string[];
  }> {
    const keysToInvalidate = [
      "dashboard:overview",
      "dashboard:stats",
      "dashboard:recent-activity",
    ];

    logger.info("Safe invalidating dashboard cache", {
      cache: true,
      operation: "safe_invalidate_dashboard_data",
      keysCount: keysToInvalidate.length,
    });

    return await CacheInvalidationService.safeInvalidate(keysToInvalidate);
  }

  /**
   * Invalidate template-related cache
   */
  static async invalidateTemplateData(): Promise<void> {
    const keysToInvalidate = [CACHE_KEYS.templates];

    logger.info("Invalidating template cache", {
      cache: true,
      operation: "invalidate_template_data",
      keysCount: keysToInvalidate.length,
    });

    await invalidateMultipleCache(keysToInvalidate);
  }

  /**
   * Safe invalidation with comprehensive error handling
   */
  static async safeInvalidate(keys: string[]): Promise<{
    success: boolean;
    successfulKeys: string[];
    failedKeys: string[];
    errors: string[];
  }> {
    const results = await Promise.allSettled(
      keys.map((key) => safeInvalidateCache(key))
    );

    const successfulKeys: string[] = [];
    const failedKeys: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === "rejected") {
        failedKeys.push(key);
        errors.push(`Failed to invalidate ${key}: ${result.reason}`);
      } else if (!result.value.success) {
        failedKeys.push(key);
        errors.push(
          `Cache invalidation failed for ${key}: ${result.value.error}`
        );
      } else {
        successfulKeys.push(key);
      }
    });

    const success = failedKeys.length === 0;

    if (!success) {
      logger.warn("Cache invalidation partially failed", {
        cache: true,
        operation: "safe_invalidate",
        totalKeys: keys.length,
        successfulKeys: successfulKeys.length,
        failedKeys: failedKeys.length,
        errors,
      });
    } else {
      logger.info("Cache invalidation completed successfully", {
        cache: true,
        operation: "safe_invalidate",
        keysCount: keys.length,
      });
    }

    return {
      success,
      successfulKeys,
      failedKeys,
      errors,
    };
  }

  /**
   * Invalidate cache by tags (for future cache tagging system)
   */
  static async invalidateByTag(tag: CacheTag): Promise<void> {
    // This would be implemented with a cache tagging system
    // For now, we'll invalidate based on known patterns

    switch (tag) {
      case CACHE_TAGS.PATIENT:
        // Invalidate all patient-related patterns
        logger.info("Invalidating all patient cache entries", {
          cache: true,
          operation: "invalidate_by_tag",
          tag,
        });
        // This would require a more sophisticated cache system
        break;

      case CACHE_TAGS.REMINDER:
        logger.info("Invalidating all reminder cache entries", {
          cache: true,
          operation: "invalidate_by_tag",
          tag,
        });
        break;

      case CACHE_TAGS.USER:
        logger.info("Invalidating all user cache entries", {
          cache: true,
          operation: "invalidate_by_tag",
          tag,
        });
        break;

      default:
        logger.warn("Unknown cache tag for invalidation", {
          cache: true,
          operation: "invalidate_by_tag",
          tag,
        });
    }
  }

  /**
   * Comprehensive invalidation for patient operations with robust error handling
   */
  static async invalidateAfterPatientOperation(
    patientId: string,
    operation: "create" | "update" | "delete" | "reactivate"
  ): Promise<{ success: boolean; errors: string[] }> {
    logger.info("Invalidating cache after patient operation", {
      cache: true,
      operation: "patient_operation_invalidation",
      patientId,
      patientOperation: operation,
    });

    const allErrors: string[] = [];

    try {
      // Always invalidate patient-specific data with retry logic
      const patientResult = await CacheInvalidationService.safeInvalidatePatientData(patientId);
      if (!patientResult.success) {
        allErrors.push(...patientResult.errors);
        logger.warn("Patient cache invalidation failed, attempting retry", {
          cache: true,
          operation: "patient_operation_invalidation_retry",
          patientId,
          errors: patientResult.errors,
        });

        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        const retryResult = await CacheInvalidationService.safeInvalidatePatientData(patientId);
        if (!retryResult.success) {
          allErrors.push(...retryResult.errors);
        logger.error("Patient cache invalidation failed after retry", new Error("Cache invalidation retry failed"));
        }
      }
    } catch (error) {
      const errorMsg = `Patient cache invalidation threw error: ${error instanceof Error ? error.message : String(error)}`;
      allErrors.push(errorMsg);
      logger.error("Patient cache invalidation exception", error instanceof Error ? error : new Error(String(error)), {
        cache: true,
        operation: "patient_operation_invalidation_exception",
        patientId,
      });
    }

    // For create/update operations, also invalidate dashboard
    if (
      operation === "create" ||
      operation === "update" ||
      operation === "delete"
    ) {
      try {
        const dashboardResult = await CacheInvalidationService.safeInvalidateDashboardData();
        if (!dashboardResult.success) {
          allErrors.push(...dashboardResult.errors);
          logger.warn("Dashboard cache invalidation failed", {
            cache: true,
            operation: "dashboard_invalidation_failed",
            patientId,
            errors: dashboardResult.errors,
          });
        }
      } catch (error) {
        const errorMsg = `Dashboard cache invalidation threw error: ${error instanceof Error ? error.message : String(error)}`;
        allErrors.push(errorMsg);
        logger.error("Dashboard cache invalidation exception", error instanceof Error ? error : new Error(String(error)), {
          cache: true,
          operation: "dashboard_invalidation_exception",
          patientId,
        });
      }
    }

    const success = allErrors.length === 0;

    if (!success) {
      logger.error("Cache invalidation completed with errors", undefined, {
        cache: true,
        operation: "patient_operation_invalidation_completed_with_errors",
        patientId,
        patientOperation: operation,
        errorCount: allErrors.length,
        errors: allErrors,
      });
    } else {
      logger.info("Cache invalidation completed successfully", {
        cache: true,
        operation: "patient_operation_invalidation_success",
        patientId,
        patientOperation: operation,
      });
    }

    return { success, errors: allErrors };
  }

  /**
   * Comprehensive invalidation for reminder operations
   */
  static async invalidateAfterReminderOperation(
    patientId: string,
    operation: "create" | "update" | "delete" | "send"
  ): Promise<void> {
    logger.info("Invalidating cache after reminder operation", {
      cache: true,
      operation: "reminder_operation_invalidation",
      patientId,
      reminderOperation: operation,
    });

    // Always invalidate reminder-specific data
    await CacheInvalidationService.invalidateReminderData(patientId);

    // For create/update/delete operations, also invalidate patient data
    if (
      operation === "create" ||
      operation === "update" ||
      operation === "delete"
    ) {
      await CacheInvalidationService.invalidatePatientData(patientId);
    }
  }

  /**
   * Comprehensive invalidation for user operations
   */
  static async invalidateAfterUserOperation(
    userId: string,
    operation: "create" | "update" | "delete" | "login"
  ): Promise<void> {
    logger.info("Invalidating cache after user operation", {
      cache: true,
      operation: "user_operation_invalidation",
      userId,
      userOperation: operation,
    });

    await CacheInvalidationService.invalidateUserData(userId);

    // For admin operations, also invalidate dashboard
    if (operation === "create" || operation === "delete") {
      await CacheInvalidationService.invalidateDashboardData();
    }
  }
}

/**
 * Convenience functions for common invalidation patterns
 */
export const invalidatePatientData =
  CacheInvalidationService.invalidatePatientData;
export const invalidateUserData = CacheInvalidationService.invalidateUserData;
export const invalidateReminderData =
  CacheInvalidationService.invalidateReminderData;
export const invalidateDashboardData =
  CacheInvalidationService.invalidateDashboardData;
export const invalidateTemplateData =
  CacheInvalidationService.invalidateTemplateData;

/**
 * Operation-specific invalidation helpers
 */
export const invalidateAfterPatientOperation =
  CacheInvalidationService.invalidateAfterPatientOperation;
export const invalidateAfterReminderOperation =
  CacheInvalidationService.invalidateAfterReminderOperation;
export const invalidateAfterUserOperation =
  CacheInvalidationService.invalidateAfterUserOperation;
