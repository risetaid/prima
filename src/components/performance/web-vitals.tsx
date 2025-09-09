'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { logMemoryUsage } from '@/lib/performance'

/**
 * Performance monitoring component
 * Logs basic performance metrics (Web Vitals temporarily disabled)
 */
export function WebVitalsReporter() {
  const pathname = usePathname()

  useEffect(() => {
    // Web Vitals monitoring temporarily disabled due to TypeScript compatibility issues
    // TODO: Re-enable when web-vitals types are properly configured
    console.log('Performance monitoring active (Web Vitals disabled for TypeScript compatibility)')

    // Log memory usage on route changes
    logMemoryUsage(`Route: ${pathname}`)

    // Log performance marks if available
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Log navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        console.log('Navigation Timing:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        })
      }
    }
  }, [pathname])

  return null
}