# PRIMA Loading States and Error Boundaries Documentation

## Overview

This document outlines the comprehensive loading states and error boundary implementation for the PRIMA healthcare management system, ensuring a robust and user-friendly experience.

## Architecture

### Core Components

#### 1. Loading Components
- **`LoadingSpinner`**: Reusable spinner component with size variants
- **`LoadingOverlay`**: Overlay component for loading states
- **`LoadingButton`**: Button component with built-in loading state
- **`PageLoading`**: Full-page loading component
- **`DataLoading`**: Data-specific loading component

#### 2. Error Boundary System
- **`ErrorBoundary`**: React error boundary class component
- **`DataError`**: Data fetching error component
- **`useErrorHandler`**: Hook for functional component error handling
- **`withErrorBoundary`**: HOC for class component error boundaries

#### 3. Data Fetching Hooks
- **`useAsyncData`**: Hook for async data fetching with loading/error states
- **`useAsyncSubmit`**: Hook for form submissions with loading states
- **`useOptimisticUpdate`**: Hook for optimistic UI updates
- **`usePollingData`**: Hook for polling data at intervals

#### 4. Provider System
- **`AppProviders`**: Root provider with error boundaries and toast notifications
- **`SuspenseWrapper`**: Suspense wrapper with error boundaries

## Implementation Examples

### Basic Loading States

```tsx
import { LoadingSpinner, LoadingButton } from '@/components/ui/loading-spinner'

function PatientList() {
  const [loading, setLoading] = useState(true)

  return (
    <div>
      {loading ? (
        <LoadingSpinner text="Memuat data pasien..." />
      ) : (
        <PatientTable patients={patients} />
      )}

      <LoadingButton
        isLoading={submitting}
        onClick={handleSubmit}
        loadingText="Menyimpan..."
      >
        Simpan Perubahan
      </LoadingButton>
    </div>
  )
}
```

### Error Boundaries

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

function PatientDashboard() {
  return (
    <ErrorBoundary>
      <PatientList />
      <ComplianceChart />
      <ReminderStats />
    </ErrorBoundary>
  )
}
```

### Async Data Fetching

```tsx
import { useAsyncData } from '@/hooks/use-async-data'

function PatientDetail({ patientId }: { patientId: string }) {
  const {
    data: patient,
    loading,
    error,
    refetch
  } = useAsyncData(
    () => fetchPatient(patientId),
    [patientId],
    {
      onError: (error) => {
        toast.error('Gagal memuat data pasien')
      }
    }
  )

  if (loading) return <DataLoading />
  if (error) return <DataError onRetry={refetch} />

  return <PatientCard patient={patient} />
}
```

### Form Submissions

```tsx
import { useAsyncSubmit } from '@/hooks/use-async-data'

function PatientForm({ patientId }: { patientId: string }) {
  const { submit, loading, error, success } = useAsyncSubmit(
    updatePatient,
    {
      onSuccess: () => {
        toast.success('Data pasien berhasil diperbarui')
      },
      onError: () => {
        toast.error('Gagal memperbarui data pasien')
      }
    }
  )

  const handleSubmit = async (formData: FormData) => {
    await submit({ id: patientId, ...formData })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <LoadingButton isLoading={loading}>
        {loading ? 'Menyimpan...' : 'Simpan'}
      </LoadingButton>
    </form>
  )
}
```

### Optimistic Updates

```tsx
import { useOptimisticUpdate } from '@/hooks/use-async-data'

function PatientStatus({ patient }: { patient: Patient }) {
  const { data: currentPatient, loading, update } = useOptimisticUpdate(
    patient,
    async (updatedPatient) => {
      const result = await updatePatientStatus(updatedPatient)
      return result
    }
  )

  const toggleStatus = () => {
    update({
      ...currentPatient,
      isActive: !currentPatient.isActive
    })
  }

  return (
    <button
      onClick={toggleStatus}
      disabled={loading}
      className={loading ? 'opacity-50' : ''}
    >
      {currentPatient.isActive ? 'Nonaktifkan' : 'Aktifkan'}
    </button>
  )
}
```

### Polling Data

```tsx
import { usePollingData } from '@/hooks/use-async-data'

function LiveCompliance({ patientId }: { patientId: string }) {
  const {
    data: compliance,
    loading,
    error,
    stopPolling,
    startPolling
  } = usePollingData(
    () => fetchComplianceData(patientId),
    30000, // Poll every 30 seconds
    true // Start polling immediately
  )

  return (
    <div>
      <ComplianceDisplay compliance={compliance} />
      <button onClick={stopPolling}>Stop Live Update</button>
      <button onClick={startPolling}>Start Live Update</button>
    </div>
  )
}
```

## Error Handling Patterns

### Global Error Boundary

```tsx
// app/layout.tsx
import { AppProviders } from '@/components/providers/app-providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
```

### API Error Handling

```tsx
// lib/api-client.ts
import { handleApiError } from '@/lib/api-utils'

export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    return handleApiError(error, `API request to ${url}`)
  }
}
```

### Toast Notifications

```tsx
// components/ui/toast.tsx
import { toast } from 'sonner'

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right'
  })
}

export const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 5000,
    position: 'top-right'
  })
}
```

## Performance Considerations

### Loading State Optimization
1. **Debounced Loading States**: Prevent flickering for fast operations
2. **Skeleton Loading**: Use skeleton components for better perceived performance
3. **Progressive Loading**: Load critical data first, then secondary data
4. **Background Updates**: Update data in background without blocking UI

### Error Boundary Best Practices
1. **Granular Boundaries**: Use multiple boundaries for different sections
2. **Fallback UI**: Provide meaningful fallback content
3. **Error Reporting**: Log errors for monitoring and debugging
4. **Recovery Options**: Allow users to retry failed operations

### Memory Management
1. **Cleanup Effects**: Properly clean up event listeners and timers
2. **Polling Management**: Stop polling when components unmount
3. **Cache Management**: Implement proper cache invalidation
4. **Memory Leak Prevention**: Avoid memory leaks in long-running components

## Testing Strategies

### Unit Tests
```typescript
// __tests__/useAsyncData.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAsyncData } from '@/hooks/use-async-data'

describe('useAsyncData', () => {
  it('should handle successful data fetching', async () => {
    const mockData = { id: 1, name: 'Test' }
    const mockFn = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() => useAsyncData(mockFn))

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
  })
})
```

### Integration Tests
```typescript
// __tests__/PatientForm.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PatientForm } from '@/components/PatientForm'

describe('PatientForm Integration', () => {
  it('should handle form submission with loading states', async () => {
    render(<PatientForm patientId="123" />)

    const submitButton = screen.getByRole('button', { name: /simpan/i })
    const nameInput = screen.getByLabelText(/nama/i)

    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    fireEvent.click(submitButton)

    // Check loading state
    expect(screen.getByText('Menyimpan...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Data berhasil disimpan')).toBeInTheDocument()
    })
  })
})
```

## Monitoring and Analytics

### Performance Metrics
- **Loading Time**: Track time to first meaningful paint
- **Error Rate**: Monitor error boundary triggers
- **User Interactions**: Track retry attempts and user recovery actions
- **Memory Usage**: Monitor for memory leaks in long sessions

### Error Tracking
```typescript
// lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs'

export const reportError = (error: Error, context?: any) => {
  Sentry.captureException(error, {
    tags: {
      component: 'error-boundary',
      ...context
    }
  })
}
```

## Accessibility Considerations

### Loading States
- **Screen Reader Announcements**: Announce loading states to assistive technologies
- **Focus Management**: Maintain focus during loading transitions
- **Keyboard Navigation**: Ensure keyboard accessibility during loading

### Error States
- **Clear Error Messages**: Provide clear, actionable error messages
- **Alternative Actions**: Offer alternative ways to complete tasks
- **Recovery Guidance**: Guide users on how to recover from errors

## Conclusion

The loading states and error boundaries implementation provides a robust foundation for user experience in the PRIMA system. By following these patterns and best practices, the application maintains high usability even during error conditions and loading states.

### Key Benefits
- **Improved User Experience**: Clear feedback during loading and error states
- **Better Error Recovery**: Users can easily retry failed operations
- **Enhanced Reliability**: Comprehensive error boundary coverage
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Accessibility**: Screen reader friendly loading and error states

### Maintenance Guidelines
1. **Consistent Patterns**: Use the established hooks and components consistently
2. **Error Monitoring**: Regularly review error logs and user feedback
3. **Performance Testing**: Monitor loading times and optimize slow operations
4. **User Testing**: Test error scenarios with real users
5. **Documentation Updates**: Keep this documentation current with new patterns

---

*This implementation ensures that PRIMA provides a professional, reliable, and user-friendly experience for healthcare professionals managing patient care.*