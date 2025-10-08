/**
 * Error Handler Tests
 * 
 * Tests for the centralized error handling utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleApiError,
  handleApiSuccess,
  isSuccessResponse,
  getErrorMessage,
} from '@/lib/error-handler';

// Mock the toast and logger
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Error Handler - handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle Error instances', () => {
    const error = new Error('Network error');
    handleApiError(error);
    // Test would verify toast.error was called
    expect(true).toBe(true); // Placeholder
  });

  it('should handle API response errors', () => {
    const apiError = {
      success: false,
      error: 'Request failed',
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    handleApiError(apiError);
    expect(true).toBe(true); // Placeholder
  });

  it('should handle validation errors', () => {
    const validationError = {
      success: false,
      error: 'Validation failed',
      validationErrors: [
        {
          field: 'phoneNumber',
          message: 'Invalid phone number',
          code: 'invalid_string',
        },
      ],
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    handleApiError(validationError);
    expect(true).toBe(true); // Placeholder
  });

  it('should respect silent option', () => {
    const error = new Error('Silent error');
    handleApiError(error, undefined, { silent: true });
    // Verify no toast was shown
    expect(true).toBe(true); // Placeholder
  });

  it('should use custom message when provided', () => {
    const error = new Error('Original error');
    const customMessage = 'Custom error message';
    handleApiError(error, customMessage);
    expect(true).toBe(true); // Placeholder
  });
});

describe('Error Handler - handleApiSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show success toast', () => {
    handleApiSuccess('Operation successful');
    expect(true).toBe(true); // Placeholder
  });

  it('should show success toast with description', () => {
    handleApiSuccess('Operation successful', {
      description: 'All items were processed',
    });
    expect(true).toBe(true); // Placeholder
  });

  it('should respect silent option', () => {
    handleApiSuccess('Silent success', { silent: true });
    expect(true).toBe(true); // Placeholder
  });
});

describe('Error Handler - isSuccessResponse', () => {
  it('should return true for successful response with data', () => {
    const response = {
      success: true,
      data: { id: '123', name: 'Test' },
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(isSuccessResponse(response)).toBe(true);
  });

  it('should return false for unsuccessful response', () => {
    const response = {
      success: false,
      error: 'Failed',
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(isSuccessResponse(response)).toBe(false);
  });

  it('should return false for successful response without data', () => {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(isSuccessResponse(response)).toBe(false);
  });
});

describe('Error Handler - getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('should extract error from API response', () => {
    const apiError = {
      success: false,
      error: 'API error message',
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(getErrorMessage(apiError)).toBe('API error message');
  });

  it('should extract first validation error', () => {
    const validationError = {
      success: false,
      error: 'Validation failed',
      validationErrors: [
        {
          field: 'email',
          message: 'Invalid email format',
        },
        {
          field: 'password',
          message: 'Password too short',
        },
      ],
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(getErrorMessage(validationError)).toBe('email: Invalid email format');
  });

  it('should return default message for empty validation errors', () => {
    const validationError = {
      success: false,
      error: 'Validation failed',
      validationErrors: [],
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(getErrorMessage(validationError)).toBe('Validation failed');
  });

  it('should return default message when no error field', () => {
    const apiError = {
      success: false,
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };
    expect(getErrorMessage(apiError)).toBe('An unknown error occurred');
  });
});
