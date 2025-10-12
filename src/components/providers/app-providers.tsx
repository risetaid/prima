'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from 'sonner'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
      </div>
    </ErrorBoundary>
  )
}

// Loading component for page transitions
export function PageLoading() {
  return null;
}

// Loading component for data fetching
export function DataLoading() {
  return null;
}

// Error component for data fetching failures
export function DataError({
  message = 'Terjadi kesalahan saat memuat data',
  onRetry
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-destructive mb-4">
        <svg
          className="h-12 w-12 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">Error</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Coba Lagi
        </button>
      )}
    </div>
  )
}

// Suspense wrapper for async components
export function SuspenseWrapper({
  children,
  fallback = <DataLoading />
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return (
    <ErrorBoundary fallback={() => <DataError />}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Import Suspense here to avoid circular dependencies
import { Suspense } from 'react'

