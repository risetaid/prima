'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals'
import { logMemoryUsage } from '@/lib/performance'
import { logger } from '@/lib/logger'

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  entries: PerformanceEntry[]
}

/**
 * Enhanced Web Vitals monitoring component
 * Tracks Core Web Vitals and custom performance metrics
 */
export function WebVitalsReporter() {
  const pathname = usePathname()
  const metricsRef = useRef<Map<string, WebVitalMetric>>(new Map())

  useEffect(() => {
    // Initialize Web Vitals monitoring
    const handleMetric = (metric: WebVitalMetric) => {
      metricsRef.current.set(metric.name, metric)
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${metric.name}] ${metric.value}ms (${metric.rating})`)
      }

      // Log to our logger system
      logger.info(`Web Vital: ${metric.name}`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        pathname,
        timestamp: Date.now()
      })

      // Send to analytics (if configured)
      if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as Window & { gtag: (...args: unknown[]) => void }).gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          custom_map: {
            metric_rating: metric.rating,
            metric_delta: metric.delta
          }
        })
      }

      // Alert on poor metrics in development
      if (process.env.NODE_ENV === 'development' && metric.rating === 'poor') {
        console.warn(`⚠️ Poor ${metric.name} score: ${metric.value}ms`, {
          metric,
          suggestions: getMetricSuggestions(metric.name)
        })
      }
    }

    // Register Web Vitals observers
    onCLS(handleMetric)
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)

    // Log memory usage on route changes
    logMemoryUsage(`Route: ${pathname}`)

    // Enhanced navigation timing
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const timings = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart,
          domProcessing: navigation.domComplete - navigation.domContentLoadedEventStart,
          resourceLoad: navigation.loadEventEnd - navigation.domContentLoadedEventEnd
        }

        logger.info('Navigation Timing', { timings, pathname })

        if (process.env.NODE_ENV === 'development') {
          console.table(timings)
        }
      }

      // Log resource timing for large resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const largeResources = resources
        .filter(resource => resource.transferSize > 100000) // > 100KB
        .map(resource => ({
          name: resource.name,
          size: resource.transferSize,
          duration: resource.duration,
          type: resource.initiatorType
        }))

      if (largeResources.length > 0) {
        logger.info('Large Resources Detected', { resources: largeResources, pathname })
      }

      // Monitor long tasks
      if ('PerformanceObserver' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              logger.warn('Long Task Detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                pathname
              })
            }
          })
        })

        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] })
        } catch {
          // Long task API not supported
        }

        return () => {
          longTaskObserver.disconnect()
        }
      }
    }
  }, [pathname])

  // Report metrics summary on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const metrics = Array.from(metricsRef.current.values())
      if (metrics.length > 0) {
        logger.info('Web Vitals Summary', {
          metrics: metrics.reduce((acc, metric) => {
            acc[metric.name] = {
              value: metric.value,
              rating: metric.rating
            }
            return acc
          }, {} as Record<string, { value: number; rating: string }>),
          pathname
        })
      }
    }
  }, [pathname])

  return null
}

// Helper function to provide performance suggestions
function getMetricSuggestions(metricName: string) {
  const suggestions: Record<string, string[]> = {
    CLS: [
      'Add size attributes to images and videos',
      'Reserve space for dynamic content',
      'Avoid inserting content above existing content',
      'Use CSS transforms instead of changing layout properties'
    ],
    FID: [
      'Break up long-running tasks',
      'Optimize third-party scripts',
      'Use web workers for heavy computations',
      'Reduce JavaScript execution time'
    ],
    FCP: [
      'Eliminate render-blocking resources',
      'Minify CSS and JavaScript',
      'Remove unused CSS',
      'Optimize images and use modern formats'
    ],
    LCP: [
      'Optimize images and use modern formats',
      'Preload important resources',
      'Remove unused JavaScript',
      'Use a CDN for static assets'
    ],
    TTFB: [
      'Optimize server response time',
      'Use a CDN',
      'Cache resources effectively',
      'Minimize redirects'
    ]
  }

  return suggestions[metricName] || ['Check Chrome DevTools for specific recommendations']
}

// Performance monitoring hook for components
export function useWebVitalsMonitoring() {
  const metrics = useRef<Map<string, WebVitalMetric>>(new Map())

  const getMetrics = () => Array.from(metrics.current.values())
  
  const getMetricsByRating = (rating: 'good' | 'needs-improvement' | 'poor') => 
    getMetrics().filter(metric => metric.rating === rating)

  const hasGoodPerformance = () => 
    getMetrics().every(metric => metric.rating === 'good')

  return {
    getMetrics,
    getMetricsByRating,
    hasGoodPerformance
  }
}

