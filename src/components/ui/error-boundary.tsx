'use client'

import React from 'react'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolate?: boolean // If true, errors won't bubble up to parent boundaries
}

/**
 * Error Boundary Component
 * Catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log the error
    logger.error('Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.isolate ? 'isolated' : 'bubbling',
      retryCount: this.retryCount,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.retryCount++
    
    if (this.retryCount <= this.maxRetries) {
      logger.info('Error boundary resetting', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
      })
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      })
    } else {
      logger.warn('Error boundary max retries exceeded', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries,
      })
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} reset={this.handleReset} />
      }

      // Default fallback UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {process.env.NODE_ENV === 'development'
                  ? this.state.error.message
                  : 'An unexpected error occurred. Please try again.'}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                disabled={this.retryCount >= this.maxRetries}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {this.retryCount >= this.maxRetries ? 'Max retries reached' : 'Try again'}
              </button>

              {process.env.NODE_ENV === 'development' && (
                <details className="text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Async Error Boundary for handling async errors in React components
 */
export function AsyncErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Async operation failed
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error.message}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={reset}
                  className="text-sm font-medium text-red-600 hover:text-red-500 underline"
                >
                  Retry operation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('Async Error Boundary caught error', error, {
          componentStack: errorInfo.componentStack,
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * HOC to wrap components with error boundary
 */
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

/**
 * Hook for handling errors in async operations
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error | unknown) => {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    setError(errorObj)
    logger.error('Error captured by useErrorHandler', errorObj)
  }, [])

  // Throw error to be caught by error boundary
  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError,
  }
}

/**
 * Specialized error boundary for CMS components
 */
export function CMSErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                CMS Error
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {process.env.NODE_ENV === 'development'
                  ? error.message
                  : 'Content management system encountered an error. Please try again.'}
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('CMS Error Boundary caught an error', error, {
          componentStack: errorInfo.componentStack,
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Specialized error boundary for Dashboard components
 */
export function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Dashboard Error
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Dashboard encountered an error. Some features may be unavailable.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={reset}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="ml-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        logger.error('Dashboard Error Boundary caught an error', error, {
          componentStack: errorInfo.componentStack,
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
