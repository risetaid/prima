/**
 * Performance monitoring utilities for PRIMA system
 * Tracks Core Web Vitals and custom performance metrics
 */

import { NextWebVitalsMetric } from 'next/app'

/**
 * Report Web Vitals to analytics service
 * Can be extended to send to services like Google Analytics, Vercel Analytics, etc.
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric)
  }

  // In production, you could send to analytics service
  // Example: sendToAnalytics(metric)

  // For now, we'll just log the metrics
  const { name, value } = metric

  switch (name) {
    case 'FCP':
      console.log(`First Contentful Paint: ${value}ms`)
      break
    case 'LCP':
      console.log(`Largest Contentful Paint: ${value}ms`)
      break
    case 'CLS':
      console.log(`Cumulative Layout Shift: ${value}`)
      break
    case 'FID':
      console.log(`First Input Delay: ${value}ms`)
      break
    case 'TTFB':
      console.log(`Time to First Byte: ${value}ms`)
      break
    default:
      break
  }
}

/**
 * Performance monitoring hook for components
 */
export function usePerformanceMonitoring(componentName: string) {
  const startTime = performance.now()

  const endMeasurement = () => {
    const endTime = performance.now()
    const duration = endTime - startTime

    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render time: ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  return { endMeasurement }
}

/**
 * Measure API response times
 */
export function measureApiCall(apiName: string, startTime: number) {
  const endTime = performance.now()
  const duration = endTime - startTime

  if (process.env.NODE_ENV === 'development') {
    console.log(`API ${apiName}: ${duration.toFixed(2)}ms`)
  }

  // Could send to monitoring service
  return duration
}

/**
 * Database query performance monitoring
 */
export function measureDatabaseQuery(queryName: string, startTime: number) {
  const endTime = performance.now()
  const duration = endTime - startTime

  if (process.env.NODE_ENV === 'development') {
    console.log(`DB Query ${queryName}: ${duration.toFixed(2)}ms`)
  }

  // Log slow queries (>100ms)
  if (duration > 100) {
    console.warn(`Slow DB query detected: ${queryName} took ${duration.toFixed(2)}ms`)
  }

  return duration
}

/**
 * Memory usage monitoring (client-side only)
 */
interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

export function logMemoryUsage(label: string = 'Memory Usage') {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as typeof performance & { memory: PerformanceMemory }).memory
    console.log(`${label}:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
    })
  }
}

/**
 * Bundle size monitoring
 * This would typically be used with build tools to track bundle sizes
 */
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    // This would be populated by build tools
    console.log('Bundle monitoring: Implement with your build tool (Webpack/Vite/etc.)')
  }
}

