'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { 
  DashboardStatsCardsSkeleton, 
  CMSContentListSkeleton, 
  FormSkeleton,
  TemplateManagementSkeleton,
  ReminderListSkeleton,
  PatientDetailSkeleton
} from '@/components/ui/dashboard-skeleton'

// Loading component options
type LoadingComponent = 
  | 'dashboard-stats'
  | 'cms-content'
  | 'form'
  | 'template-management'
  | 'reminder-list'
  | 'patient-detail'
  | 'default'

const getLoadingComponent = (type: LoadingComponent) => {
  switch (type) {
    case 'dashboard-stats':
      return <DashboardStatsCardsSkeleton />
    case 'cms-content':
      return <CMSContentListSkeleton />
    case 'form':
      return <FormSkeleton />
    case 'template-management':
      return <TemplateManagementSkeleton />
    case 'reminder-list':
      return <ReminderListSkeleton />
    case 'patient-detail':
      return <PatientDetailSkeleton />
    case 'default':
    default:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      )
  }
}

/**
 * Create a lazy-loaded component with appropriate loading state
 */
export function createLazyComponent<T = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingType: LoadingComponent = 'default',
  options?: {
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    loading: () => getLoadingComponent(loadingType),
    ssr: options?.ssr ?? true
  })
}

/**
 * Create a lazy-loaded page component with background and header structure
 */
export function createLazyPageComponent<T = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingType: LoadingComponent = 'default',
  options?: {
    ssr?: boolean
    showBackground?: boolean
    showHeader?: boolean
  }
) {
  const { ssr = true, showBackground = true, showHeader = true } = options || {}
  
  return dynamic(importFn, {
    loading: () => (
      <div className={`min-h-screen ${showBackground ? 'bg-gray-50 relative' : ''}`}>
        {showBackground && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
              style={{
                backgroundImage: "url(/bg_desktop.png)",
              }}
            />
          </div>
        )}
        
        {showHeader && (
          <div className="relative z-10">
            <div className="bg-white shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="animate-pulse flex items-center justify-between">
                  <div className="h-6 w-32 bg-gray-300 rounded"></div>
                  <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <main className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {getLoadingComponent(loadingType)}
          </div>
        </main>
      </div>
    ),
    ssr
  })
}

/**
 * Pre-configured lazy components for common use cases
 */
export const LazyComponents = {
  // CMS Components
  CMSArticlesPage: createLazyPageComponent(
    () => import('@/app/dashboard/cms/articles/page'),
    'cms-content'
  ),
  // CMSVideosPage: Will be implemented when videos page exists
  // createLazyPageComponent(() => import('@/app/dashboard/cms/videos/page'), 'cms-content'),
  CMSArticleCreate: createLazyPageComponent(
    () => import('@/app/dashboard/cms/articles/create/page'),
    'form'
  ),
  CMSVideoCreate: createLazyPageComponent(
    () => import('@/app/dashboard/cms/videos/create/page'),
    'form'
  ),
  
  // Admin Components
  AdminTemplates: createLazyPageComponent(
    () => import('@/app/dashboard/admin/templates/page'),
    'template-management'
  ),
  AdminUsers: createLazyPageComponent(
    () => import('@/app/dashboard/admin/users/page'),
    'default'
  ),
  
  // Patient Components
  PatientDetail: createLazyPageComponent(
    () => import('@/app/dashboard/pasien/[id]/page'),
    'patient-detail'
  ),
  
  // Reminder Components
  ReminderList: createLazyPageComponent(
    () => import('@/app/dashboard/pengingat/page'),
    'reminder-list'
  )
}

/**
 * Utility for preloading critical routes
 */
export async function preloadCriticalRoutes() {
  if (typeof window !== 'undefined') {
    // Preload high-priority routes after initial load
    const criticalImports = [
      () => import('@/app/dashboard/pasien/page'), // Patient listing (most used)
      () => import('@/app/dashboard/pengingat/page'), // Reminders (core feature)
    ]
    
    // Preload with slight delay to not interfere with initial loading
    setTimeout(() => {
      criticalImports.forEach(importFn => {
        importFn().catch(err => 
          console.warn('Failed to preload route:', err)
        )
      })
    }, 2000)
    
    console.log('🚀 Lazy Loading: Preloading critical routes...')
  }
}

/**
 * Utility for route-based code splitting detection
 */
export function logBundleSplitting() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Track dynamic imports in development
    console.log('📦 Lazy Loading: Bundle splitting enabled for CMS and Admin routes')
  }
}