/**
 * API Client Tests
 * 
 * Tests for the centralized API client utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '@/lib/api-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make successful API call', async () => {
    const mockResponse = {
      success: true,
      data: { id: '123', name: 'Test' },
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient<{ id: string; name: string }>('/api/test');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '123', name: 'Test' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // API client adds X-Request-Id header automatically
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'X-Request-Id': expect.any(String),
      }),
    }));
  });

  it('should handle API errors', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => mockErrorResponse,
    });

    const result = await apiClient('/api/test');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not found');
  });

  it('should handle network errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    const result = await apiClient('/api/test');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should pass request options to fetch', async () => {
    const mockResponse = {
      success: true,
      data: { id: '123' },
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    };

    await apiClient('/api/test', options);

    // API client adds X-Request-Id header to provided options
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Request-Id': expect.any(String),
      }),
    }));
  });

  it('should track request IDs', async () => {
    const mockResponse = {
      success: true,
      data: { id: '123' },
      timestamp: new Date().toISOString(),
      requestId: 'test-request-id',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient('/api/test');

    expect(result.requestId).toBe('test-request-id');
  });

  it('should handle JSON parse errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const result = await apiClient('/api/test');

    expect(result.success).toBe(false);
    // API client wraps JSON parse errors with a standard message
    expect(result.error).toBe('Invalid response format from server');
    expect(result.code).toBe('PARSE_ERROR');
  });

  it('should type responses correctly', async () => {
    interface User {
      id: string;
      email: string;
      name: string;
    }

    const mockResponse = {
      success: true,
      data: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      },
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient<User>('/api/users/123');

    if (result.success && result.data) {
      // TypeScript should infer these types correctly
      expect(result.data.id).toBe('123');
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('Test User');
    }
  });

  it('should generate unique request IDs on error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const result1 = await apiClient('/api/test');
    const result2 = await apiClient('/api/test');

    expect(result1.requestId).toBeDefined();
    expect(result2.requestId).toBeDefined();
    expect(result1.requestId).not.toBe(result2.requestId);
  });
});
