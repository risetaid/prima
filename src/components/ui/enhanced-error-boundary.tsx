'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
  isRetrying: boolean
  lastErrorTime: number
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo, _retryCount: number) => void
  onRetry?: (_retryCount: number) => void | Promise<void>
  showDetails?: boolean
  maxRetries?: number
  retryDelay?: number
  autoRetry?: boolean
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean // Prevent error from bubbling up
  title?: string
  description?: string
}

export interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  retry: () => void
  retryCount: number
  isRetrying: boolean
  canRetry: boolean
  showDetails?: boolean
  title?: string
  description?: string
}

// Enhanced retry mechanism with exponential backoff (currently unused, commented out to avoid lint warnings)

// Enhanced error fallback with better UX
function EnhancedErrorFallback({
  error,
  resetError,
  retry,
  retryCount,
  isRetrying,
  canRetry,
  showDetails = false,
  title = "Terjadi Kesalahan",
  description = "Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama."
}: ErrorFallbackProps) {
  const [showFullDetails, setShowFullDetails] = useState(false)

  // Determine error severity and type
  const errorType = error.name || 'Error'
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isChunkError = error.message.includes('chunk') || error.message.includes('Loading')
  
  const getErrorIcon = () => {
    if (isNetworkError) return <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
    if (isChunkError) return <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4" />
    return <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
  }

  const getErrorMessage = () => {
    if (isNetworkError) return "Terjadi masalah koneksi jaringan. Periksa koneksi internet Anda."
    if (isChunkError) return "Terjadi masalah saat memuat aplikasi. Silakan refresh halaman."
    return description
  }

  const getSuggestions = () => {
    const suggestions = []
    if (isNetworkError) {
      suggestions.push("Periksa koneksi internet Anda")
      suggestions.push("Coba lagi dalam beberapa saat")
    }
    if (isChunkError) {
      suggestions.push("Refresh halaman browser")
      suggestions.push("Clear cache browser")
    }
    if (retryCount > 0) {
      suggestions.push("Restart aplikasi")
      suggestions.push("Hubungi tim support jika masalah berlanjut")
    }
    return suggestions
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-6">
          {getErrorIcon()}
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {title}
          </h2>
          <p className="text-muted-foreground mb-4">
            {getErrorMessage()}
          </p>
          
          {retryCount > 0 && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Percobaan ke-{retryCount} dari maksimal percobaan otomatis
              </p>
            </div>
          )}
        </div>

        {getSuggestions().length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-sm font-medium text-foreground mb-2">Saran:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getSuggestions().map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 justify-center mb-4">
          {canRetry && (
            <Button 
              onClick={retry} 
              disabled={isRetrying}
              variant="outline" 
              size="sm"
              className={cn(isRetrying && "animate-pulse")}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
              {isRetrying ? 'Mencoba...' : 'Coba Lagi'}
            </Button>
          )}
          
          <Button onClick={resetError} variant="outline" size="sm">
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button asChild size="sm">
            <Link href="/pasien">
              <Home className="h-4 w-4 mr-2" />
              Beranda
            </Link>
          </Button>
        </div>

        {showDetails && (
          <div className="text-left">
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-sm text-muted-foreground hover:text-foreground underline mb-2"
            >
              {showFullDetails ? 'Sembunyikan' : 'Tampilkan'} Detail Error
            </button>
            
            {showFullDetails && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-2">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs">
                  <div className="mb-2">
                    <strong>Error Type:</strong> {errorType}
                  </div>
                  <div className="mb-2">
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 overflow-auto max-h-32 text-xs">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export class EnhancedErrorBoundary extends React.Component<
  EnhancedErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, isolate } = this.props
    const { retryCount } = this.state

    // Log the error with context
    logger.error('Enhanced Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      retryCount,
      isolate,
      props: this.props.resetKeys
    })

    // Call custom error handler
    onError?.(error, errorInfo, retryCount)

    this.setState({
      error,
      errorInfo
    })

    // Auto retry if enabled and within limits
    if (this.props.autoRetry && retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry()
    }

    // Prevent error from bubbling up if isolate is true
    if (isolate) {
      // Note: Error objects don't have preventDefault, this was intended for Event objects
      // We can log this for debugging but not call preventDefault
      logger.debug('Error isolated to prevent bubbling', { isolate, error: error.message })
    }
  }

  componentDidUpdate(prevProps: EnhancedErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    // Auto reset on key changes
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      )
      if (hasResetKeyChanged) {
        this.resetError()
      }
    }

    // Reset on any prop change if enabled
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetError()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  scheduleRetry = () => {
    const delay = Math.min(
      (this.props.retryDelay || 1000) * Math.pow(2, this.state.retryCount),
      10000
    )

    this.setState({ isRetrying: true })

    this.retryTimeoutId = setTimeout(() => {
      this.retry()
    }, delay)
  }

  retry = async () => {
    const { onRetry, maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      this.setState({ isRetrying: false })
      return
    }

    try {
      await onRetry?.(retryCount + 1)
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }))
    } catch (error) {
      logger.error('Retry failed', error as Error, { retryCount: retryCount + 1 })
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }))
    }
  }

  resetError = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || EnhancedErrorFallback
      const canRetry = this.state.retryCount < (this.props.maxRetries || 3)

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          retry={this.retry}
          retryCount={this.state.retryCount}
          isRetrying={this.state.isRetrying}
          canRetry={canRetry}
          showDetails={this.props.showDetails}
          title={this.props.title}
          description={this.props.description}
        />
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries with retry logic
export function NetworkErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedErrorBoundary
      title="Masalah Koneksi"
      description="Terjadi masalah dengan koneksi jaringan."
      maxRetries={5}
      retryDelay={2000}
      autoRetry={true}
      onRetry={async () => {
        // Check network connectivity
        if (navigator.onLine) {
          // Try to ping a simple endpoint
          await fetch('/api/health', { method: 'HEAD' })
        } else {
          throw new Error('No internet connection')
        }
      }}
      onError={(error, errorInfo) => {
        logger.error('Network Error Boundary', error, {
          componentStack: errorInfo.componentStack,
          online: navigator.onLine
        })
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

export function ChunkErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedErrorBoundary
      title="Masalah Memuat Aplikasi"
      description="Terjadi masalah saat memuat bagian aplikasi."
      maxRetries={2}
      retryDelay={1000}
      autoRetry={true}
      onRetry={async () => {
        // Force reload for chunk loading errors
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }}
      onError={(error, errorInfo) => {
        logger.error('Chunk Error Boundary', error, {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent
        })
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

// Hook for handling async errors in functional components
export function useAsyncErrorHandler() {
  const [error, setError] = useState<Error | null>(null)
  
  const handleError = useCallback((error: Error) => {
    logger.error('Async error caught', error)
    setError(error)
  }, [])

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async (asyncFn: () => Promise<unknown>) => {
    try {
      resetError()
      return await asyncFn()
    } catch (err) {
      handleError(err as Error)
      throw err
    }
  }, [handleError, resetError])

  return {
    error,
    handleError,
    resetError,
    retry
  }
}
