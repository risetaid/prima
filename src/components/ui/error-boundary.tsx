'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './button'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
}

export interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  showDetails?: boolean
}

function DefaultErrorFallback({ error, resetError, showDetails }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-muted-foreground mb-4">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.
          </p>
        </div>

        {showDetails && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Detail Error
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-32">
              {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="flex gap-2 justify-center">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Coba Lagi
          </Button>
          <Button asChild size="sm">
            <Link href="/pasien">
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Pasien
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    this.setState({
      error,
      errorInfo
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          showDetails={this.props.showDetails}
        />
      )
    }

    return this.props.children
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    logger.error('Error caught by useErrorHandler', error, {
      componentStack: errorInfo?.componentStack,
      hook: true
    })

    // In a real app, you might want to show a toast or modal here
    console.error('Error handled by useErrorHandler:', error)
  }
}

// HOC for class components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Specialized error boundaries for different sections
export function CMSErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Error CMS
            </h2>
            <p className="text-muted-foreground mb-4">
              Terjadi kesalahan saat memuat halaman CMS. Silakan coba lagi.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={resetError} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
              <Button asChild size="sm">
                <Link href="/pasien">
                  <Home className="h-4 w-4 mr-2" />
                  Kembali ke Pasien
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('CMS Error Boundary', error, {
          componentStack: errorInfo.componentStack,
          section: 'cms'
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Error Dashboard
            </h2>
            <p className="text-muted-foreground mb-4">
              Terjadi kesalahan saat memuat dashboard. Silakan coba lagi.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={resetError} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-in">
                  <Home className="h-4 w-4 mr-2" />
                  Kembali ke Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('Dashboard Error Boundary', error, {
          componentStack: errorInfo.componentStack,
          section: 'dashboard'
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

