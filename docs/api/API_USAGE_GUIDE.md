# PRIMA API Usage Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Making API Requests](#making-api-requests)
5. [Error Handling](#error-handling)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Introduction

The PRIMA API provides a comprehensive interface for managing patient records, scheduling reminders, and managing educational content. This guide will help you effectively use the API in your development work.

### Key Features
- **Type-Safe**: Full TypeScript support with Zod validation
- **Consistent**: Standardized response format across all endpoints
- **Secure**: Clerk-based authentication with role-based access control
- **Documented**: OpenAPI/Swagger specification available
- **Tested**: Comprehensive test coverage for reliability

---

## Getting Started

### Prerequisites
- Node.js 18+ or Bun runtime
- Valid Clerk account and API keys
- Access to the PRIMA development environment

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://prima.example.com`

---

## Authentication

PRIMA uses [Clerk](https://clerk.com) for authentication. All authenticated endpoints require a valid session token.

### Client-Side Authentication

In React components, use the Clerk hooks:

```tsx
import { useAuth } from '@clerk/nextjs';

function MyComponent() {
  const { getToken } = useAuth();
  
  const fetchData = async () => {
    const token = await getToken();
    
    const response = await fetch('/api/patients', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
  };
}
```

### Server-Side Authentication

In API routes, authentication is handled automatically by the `createApiHandler`:

```typescript
export const GET = createApiHandler({
  auth: 'required', // or 'optional' or 'none'
}, async (body, context) => {
  // context.user contains authenticated user info
  const userId = context.user?.id;
  
  // Your logic here
});
```

### Role-Based Access Control

Check user roles in your handlers:

```typescript
export const POST = createApiHandler({
  auth: 'required',
}, async (body, context) => {
  const userRole = context.user?.publicMetadata?.role;
  
  if (userRole !== 'ADMIN') {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
  
  // Admin-only logic
});
```

---

## Making API Requests

### Using the API Client

PRIMA provides a typed API client utility for making requests:

```typescript
import { apiClient } from '@/lib/api-client';

// Type-safe API call
const result = await apiClient<Patient>('/api/patients/123');

if (result.success && result.data) {
  console.log('Patient:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### POST Request Example

```typescript
import { apiClient } from '@/lib/api-client';

const result = await apiClient<Patient>('/api/patients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    phoneNumber: '628123456789',
    dateOfBirth: '1990-01-15',
    gender: 'MALE',
  }),
});

if (result.success && result.data) {
  console.log('Patient created:', result.data.id);
} else {
  console.error('Failed to create patient:', result.error);
}
```

### PATCH Request Example

```typescript
const result = await apiClient<Patient>('/api/patients/123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    notes: 'Updated medical notes',
  }),
});
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```typescript
{
  success: false,
  error: string,           // Human-readable error message
  code: string,            // Machine-readable error code
  timestamp: string,       // ISO 8601 timestamp
  requestId: string,       // 8-character tracking ID
  validationErrors?: Array<{
    field: string,
    message: string,
    code: string
  }>
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `UNAUTHORIZED` | Missing or invalid auth | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict | 409 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `NETWORK_ERROR` | Network issue | N/A |
| `PARSE_ERROR` | Response parsing failed | N/A |
| `INTERNAL_ERROR` | Server error | 500 |

### Handling Errors

```typescript
import { apiClient, handleApiError } from '@/lib/api-client';

const result = await apiClient<Patient>('/api/patients/123');

if (!result.success) {
  // Use the error handler for consistent error messages
  const errorMessage = handleApiError(result);
  toast.error(errorMessage);
  
  // Handle specific error codes
  switch (result.code) {
    case 'NOT_FOUND':
      router.push('/patients');
      break;
    case 'VALIDATION_ERROR':
      // Display validation errors in form
      result.validationErrors?.forEach(err => {
        setError(err.field, { message: err.message });
      });
      break;
    default:
      console.error('Unexpected error:', result.error);
  }
}
```

### Validation Errors

When validation fails, you'll receive detailed field-level errors:

```typescript
const result = await apiClient<Patient>('/api/patients', {
  method: 'POST',
  body: JSON.stringify({ name: '', phoneNumber: 'invalid' }),
});

if (!result.success && result.validationErrors) {
  result.validationErrors.forEach(error => {
    console.log(`${error.field}: ${error.message}`);
  });
  
  // Output:
  // name: Name is required
  // phoneNumber: Invalid Indonesian phone number format
}
```

---

## Common Patterns

### Pagination

For endpoints that return lists, use query parameters:

```typescript
const result = await apiClient<Patient[]>('/api/patients?page=1&limit=20');
```

### Filtering

Filter results using query parameters:

```typescript
const result = await apiClient<Patient[]>(
  '/api/patients?status=VERIFIED&isActive=true'
);
```

### Searching

Use the search parameter:

```typescript
const result = await apiClient<Patient[]>(
  '/api/patients?search=John'
);
```

### Optimistic Updates

For better UX, update UI optimistically:

```typescript
// Update UI immediately
setPatients(prev => prev.map(p => 
  p.id === patientId ? { ...p, notes: newNotes } : p
));

// Make API call
const result = await apiClient(`/api/patients/${patientId}`, {
  method: 'PATCH',
  body: JSON.stringify({ notes: newNotes }),
});

// Revert on error
if (!result.success) {
  setPatients(prev => prev.map(p => 
    p.id === patientId ? { ...p, notes: oldNotes } : p
  ));
  toast.error('Failed to update patient');
}
```

---

## Best Practices

### 1. Always Use Type Safety

```typescript
// ✅ Good: Type-safe
interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
}

const result = await apiClient<Patient>('/api/patients/123');
if (result.success && result.data) {
  console.log(result.data.name); // TypeScript knows this is a string
}

// ❌ Bad: No type safety
const response = await fetch('/api/patients/123');
const data = await response.json();
console.log(data.name); // No type checking
```

### 2. Handle All Error Cases

```typescript
// ✅ Good: Comprehensive error handling
const result = await apiClient<Patient>('/api/patients/123');

if (result.success && result.data) {
  // Handle success
} else if (result.code === 'NOT_FOUND') {
  // Handle not found
} else if (result.code === 'UNAUTHORIZED') {
  // Handle auth error
} else {
  // Handle other errors
}

// ❌ Bad: Only checking success
if (result.success) {
  // Handle success
}
// Errors are ignored!
```

### 3. Use Request IDs for Debugging

Every response includes a unique `requestId`. Use it for tracking issues:

```typescript
const result = await apiClient('/api/patients');

if (!result.success) {
  console.error(`Request ${result.requestId} failed:`, result.error);
  // Include requestId in error reports
}
```

### 4. Leverage Validation Schemas

Use the shared Zod schemas for client-side validation:

```typescript
import { schemas } from '@/lib/api-schemas';

// Validate before sending
const validation = schemas.createPatient.safeParse({
  name: 'John Doe',
  phoneNumber: '628123456789',
});

if (!validation.success) {
  // Display validation errors without API call
  validation.error.errors.forEach(err => {
    console.log(`${err.path}: ${err.message}`);
  });
  return;
}

// Now make the API call
const result = await apiClient('/api/patients', {
  method: 'POST',
  body: JSON.stringify(validation.data),
});
```

### 5. Handle Loading States

```typescript
const [loading, setLoading] = useState(false);

const loadPatient = async (id: string) => {
  setLoading(true);
  try {
    const result = await apiClient<Patient>(`/api/patients/${id}`);
    if (result.success && result.data) {
      setPatient(result.data);
    } else {
      toast.error(result.error);
    }
  } finally {
    setLoading(false);
  }
};
```

### 6. Implement Retry Logic for Critical Operations

```typescript
import { retryWithBackoff } from '@/lib/simple-retry';

const result = await retryWithBackoff(
  () => apiClient('/api/patients/critical-update', { method: 'POST' }),
  {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  }
);
```

---

## Examples

### Example 1: Creating a Patient

```typescript
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { schemas } from '@/lib/api-schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function CreatePatientForm() {
  const [loading, setLoading] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(schemas.createPatient),
  });
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    
    const result = await apiClient<Patient>('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    setLoading(false);
    
    if (result.success && result.data) {
      toast.success('Patient created successfully!');
      router.push(`/patients/${result.data.id}`);
    } else {
      toast.error(result.error || 'Failed to create patient');
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Patient'}
      </button>
    </form>
  );
}
```

### Example 2: Listing Patients with Filtering

```typescript
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

function PatientList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filter, setFilter] = useState({ status: 'VERIFIED' });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPatients();
  }, [filter]);
  
  const loadPatients = async () => {
    setLoading(true);
    
    const query = new URLSearchParams({
      status: filter.status,
      isActive: 'true',
    });
    
    const result = await apiClient<Patient[]>(
      `/api/patients?${query.toString()}`
    );
    
    setLoading(false);
    
    if (result.success && result.data) {
      setPatients(result.data);
    } else {
      toast.error('Failed to load patients');
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
```

### Example 3: Scheduling a Reminder

```typescript
async function scheduleReminder(patientId: string, message: string, scheduledFor: Date) {
  const result = await apiClient<Reminder>(
    `/api/patients/${patientId}/reminders`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        scheduledFor: scheduledFor.toISOString(),
        recurrence: {
          type: 'WEEKLY',
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    }
  );
  
  if (result.success && result.data) {
    toast.success('Reminder scheduled successfully!');
    return result.data;
  } else {
    toast.error(result.error || 'Failed to schedule reminder');
    return null;
  }
}
```

### Example 4: Handling Webhook Events

```typescript
// src/app/api/webhooks/custom/route.ts
import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook signature
    const signature = request.headers.get('x-webhook-signature');
    if (!isValidSignature(signature, body)) {
      return createApiResponse(null, 401, 'Invalid signature', 'UNAUTHORIZED');
    }
    
    // Process webhook event
    await processWebhookEvent(body);
    
    return createApiResponse({ received: true });
  } catch (error) {
    return createApiResponse(null, 500, 'Webhook processing failed', 'INTERNAL_ERROR');
  }
}
```

---

## Additional Resources

- [OpenAPI Specification](./openapi.yaml)
- [Testing Guide](../../TESTING_SETUP.md)
- [API Analysis Plan](../../API_ANALYSIS_PLAN.md)
- [Error Handler Documentation](../../src/lib/error-handler.ts)
- [API Schemas](../../src/lib/api-schemas.ts)

---

## Support

For issues or questions:
1. Check the [API Analysis Plan](../../API_ANALYSIS_PLAN.md) for known issues
2. Review test files in `tests/` for usage examples
3. Consult the OpenAPI specification for endpoint details
4. Contact the development team

---

**Last Updated**: October 8, 2025  
**Version**: 1.0.0
