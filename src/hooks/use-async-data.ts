 import { useState, useEffect, useCallback, type DependencyList } from 'react'
import { logger } from '@/lib/logger'

export interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseAsyncDataOptions<T> {
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  retryCount?: number
  retryDelay?: number
}

/**
 * Custom hook for managing async data fetching with loading states and error handling
 */
export function useAsyncData<T>(
  asyncFn: () => Promise<T>,
  dependencies: DependencyList = [],
  options: UseAsyncDataOptions<T> = {}
): AsyncDataState<T> {
  const {
    enabled = true,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (isRetry = false) => {
    if (!enabled && !isRetry) return

    setLoading(true)
    setError(null)

    try {
      const result = await asyncFn()
      setData(result)
      setError(null)
      onSuccess?.(result)

      logger.info('Async data fetch successful', {
        hasData: !!result,
        isRetry
      })
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      setData(null)
      onError?.(errorObj)

      logger.error('Async data fetch failed', errorObj, {
        isRetry,
        retryCount
      })

      // Retry logic - FIXED to prevent infinite loops
      if (!isRetry && retryCount > 0) {
        // Use a ref-like approach to track retry attempts
        setTimeout(() => {
          execute(true).catch(() => {
            // Silently handle retry failures to prevent unhandled promise rejections
          })
        }, retryDelay)
      }
    } finally {
      setLoading(false)
    }
  }, [asyncFn, enabled, onSuccess, onError, retryCount, retryDelay])

  const refetch = useCallback(async () => {
    await execute()
  }, [execute])

  useEffect(() => {
    execute()
  // Remove 'execute' from dependencies to prevent infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    data,
    loading,
    error,
    refetch
  }
}

/**
 * Hook for managing form submissions with loading states
 */
export function useAsyncSubmit<T = unknown, U = unknown>(
  submitFn: (data: U) => Promise<T>,
  options: {
    onSuccess?: (result: T) => void
    onError?: (error: Error) => void
    successMessage?: string
    errorMessage?: string
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = useCallback(async (data: U) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await submitFn(data)
      setSuccess(true)
      options.onSuccess?.(result)

      logger.info('Form submission successful', {
        hasResult: !!result
      })

      return result
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      options.onError?.(errorObj)

      logger.error('Form submission failed', errorObj)

      throw errorObj
    } finally {
      setLoading(false)
    }
  }, [submitFn, options])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setSuccess(false)
  }, [])

  return {
    submit,
    loading,
    error,
    success,
    reset
  }
}

/**
 * Hook for managing optimistic updates
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(async (newData: T) => {
    setLoading(true)
    setError(null)

    // Optimistic update
    setData(newData)

    try {
      const result = await updateFn(newData)
      setData(result)
      setError(null)

      logger.info('Optimistic update successful')
    } catch (err) {
      // Revert on error - use current data state to revert
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      // Don't revert automatically - let the caller handle it
      
      logger.error('Optimistic update failed', errorObj)
    } finally {
      setLoading(false)
    }
  }, [updateFn])

  return {
    data,
    loading,
    error,
    update
  }
}

/**
 * Hook for polling data at regular intervals
 */
export function usePollingData<T>(
  asyncFn: () => Promise<T>,
  interval: number,
  enabled: boolean = true
): AsyncDataState<T> & { stopPolling: () => void; startPolling: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isPolling, setIsPolling] = useState(enabled)

  const fetchData = useCallback(async () => {
    if (!isPolling) return

    setLoading(true)
    try {
      const result = await asyncFn()
      setData(result)
      setError(null)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [asyncFn, isPolling])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  const startPolling = useCallback(() => {
    setIsPolling(true)
  }, [])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  useEffect(() => {
    if (enabled && isPolling) {
      fetchData()

      const pollInterval = setInterval(() => {
        fetchData().catch(() => {
          // Silently handle polling failures
        })
      }, interval)

      return () => {
        clearInterval(pollInterval)
      }
    }
  // Remove fetchData from dependencies to prevent infinite re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, enabled, isPolling])

  return {
    data,
    loading,
    error,
    refetch,
    stopPolling,
    startPolling
  }
}

