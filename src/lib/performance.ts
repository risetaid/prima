/**
 * Performance monitoring utilities for PRIMA system
 * Tracks Core Web Vitals and custom performance metrics
 */

import { NextWebVitalsMetric } from "next/app";
import { logger } from "@/lib/logger";

/**
 * Report Web Vitals to analytics service
 * Can be extended to send to services like Google Analytics, etc.
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    logger.debug("Web Vital", { metric });
  }

  // In production, you could send to analytics service
  // Example: sendToAnalytics(metric)

  // For now, we'll just log the metrics
  const { name, value } = metric;

  switch (name) {
    case "FCP":
      logger.debug(`First Contentful Paint: ${value}ms`, { name, value });
      break;
    case "LCP":
      logger.debug(`Largest Contentful Paint: ${value}ms`, { name, value });
      break;
    case "CLS":
      logger.debug(`Cumulative Layout Shift: ${value}`, { name, value });
      break;
    case "FID":
      logger.debug(`First Input Delay: ${value}ms`, { name, value });
      break;
    case "TTFB":
      logger.debug(`Time to First Byte: ${value}ms`, { name, value });
      break;
    default:
      break;
  }
}

/**
 * Performance monitoring hook for components
 */
export function usePerformanceMonitoring(componentName: string) {
  const startTime = performance.now();

  const endMeasurement = () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === "development") {
      logger.debug(`${componentName} render time: ${duration.toFixed(2)}ms`, {
        componentName,
        duration,
      });
    }

    return duration;
  };

  return { endMeasurement };
}

/**
 * Measure API response times
 */
export function measureApiCall(apiName: string, startTime: number) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (process.env.NODE_ENV === "development") {
    logger.debug(`API ${apiName}: ${duration.toFixed(2)}ms`, {
      apiName,
      duration,
    });
  }

  // Could send to monitoring service
  return duration;
}

/**
 * Database query performance monitoring
 */
export function measureDatabaseQuery(queryName: string, startTime: number) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (process.env.NODE_ENV === "development") {
    logger.debug(`DB Query ${queryName}: ${duration.toFixed(2)}ms`, {
      queryName,
      duration,
    });
  }

  // Log slow queries (>100ms)
  if (duration > 100) {
    logger.warn(
      `Slow DB query detected: ${queryName} took ${duration.toFixed(2)}ms`,
      { queryName, duration }
    );
  }

  return duration;
}

/**
 * Memory usage monitoring (client-side only)
 */
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function logMemoryUsage(label: string = "Memory Usage") {
  if (typeof window !== "undefined" && "memory" in performance) {
    const memory = (
      performance as typeof performance & { memory: PerformanceMemory }
    ).memory;
    logger.debug(`${label}:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  }
}

/**
 * Bundle size monitoring
 * This would typically be used with build tools to track bundle sizes
 */
export function logBundleInfo() {
  if (process.env.NODE_ENV === "development") {
    // This would be populated by build tools
    logger.debug(
      "Bundle monitoring: Implement with your build tool (Webpack/Vite/etc.)"
    );
  }
}
