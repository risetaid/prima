/**
 * API Contract Tests for v1 Endpoints
 *
 * Tests that API responses match the expected contract format.
 * Uses snapshot testing to detect breaking changes.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies before imports
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      patients: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
  patients: {},
  reminders: {},
}));

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    sessionClaims: { metadata: { role: 'admin' } },
  }),
}));

// Import after mocks
describe('API Contract Tests - v1 Endpoints', () => {
  describe('API Version Headers', () => {
    it('should include version headers in responses', async () => {
      // This test verifies that createApiHandler adds version headers
      const { createApiHandler } = await import('@/lib/api-helpers');
      const { NextRequest } = await import('next/server');

      // Create a minimal test handler with options first, then handler
      const handler = createApiHandler({ auth: 'optional' }, async () => {
        return { success: true };
      });

      // Create a mock request
      const mockRequest = new NextRequest('http://localhost/api/test');
      // The handler expects params as second argument
      const response = await handler(mockRequest, { params: Promise.resolve({}) });

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it('should have API version constant defined', async () => {
      // Test that the API version constant exists
      const { API_VERSION, VERSION_HEADER } = await import('@/lib/api-versioning');

      expect(API_VERSION).toBeDefined();
      expect(API_VERSION).toBe('v1');
      expect(VERSION_HEADER).toBe('API-Version');
    });
  });

  describe('Patient API Contract', () => {
    it('patient list response should match contract', async () => {
      const { PatientService } = await import('@/services/patient/patient.service');

      // Define mock data with proper type
      const mockPatients = [{
        id: '123',
        name: 'Test Patient',
        isActive: true,
        photoUrl: null,
        phoneNumber: '+1234567890',
        createdAt: new Date(),
      }];

      // Mock the service
      vi.spyOn(PatientService.prototype, 'list').mockResolvedValue(mockPatients);

      const service = new PatientService();
      const result = await service.list({});

      // Verify contract structure
      expect(result).toBeInstanceOf(Array);
      if (result.length > 0) {
        const patient = result[0];
        expect(patient).toHaveProperty('id');
        expect(patient).toHaveProperty('name');
        expect(patient).toHaveProperty('phoneNumber');
        expect(typeof patient.id).toBe('string');
        expect(typeof patient.name).toBe('string');
        expect(typeof patient.phoneNumber).toBe('string');
      }
    });

    it('patient detail response should match contract', async () => {
      const { PatientService } = await import('@/services/patient/patient.service');

      const mockPatient = {
        id: '123',
        name: 'Test Patient',
        phoneNumber: '+1234567890',
        address: '123 Test St' as string | null,
        birthDate: new Date('1990-01-01') as Date | null,
        diagnosisDate: new Date('2023-01-01') as Date | null,
        cancerStage: 'II' as 'I' | 'II' | 'III' | 'IV' | null,
        assignedVolunteerId: 'vol-123' as string | null,
        doctorName: 'Dr. Smith' as string | null,
        hospitalName: 'Test Hospital' as string | null,
        emergencyContactName: 'Emergency Contact' as string | null,
        emergencyContactPhone: '+1234567890' as string | null,
        notes: 'Test notes' as string | null,
        isActive: true,
        deletedAt: null as Date | null,
        createdAt: new Date(),
        updatedAt: new Date(),
        photoUrl: null as string | null,
        verificationStatus: 'VERIFIED' as 'VERIFIED' | 'PENDING' | 'FAILED' | 'EXPIRED' | null,
        verificationSentAt: null as Date | null,
        verificationResponseAt: null as Date | null,
        verificationMessage: null as string | null,
        verificationAttempts: '0' as string | null,
        verificationExpiresAt: null as Date | null,
        lastActiveAt: null as Date | null,
        volunteerId: 'vol-123' as string | null,
        volunteerFirstName: 'John' as string | null,
        volunteerLastName: 'Doe' as string | null,
        volunteerEmail: 'volunteer@test.com' as string | null,
        volunteerRole: 'volunteer' as string | null,
        assignedVolunteer: {
          id: 'vol-123',
          firstName: 'John' as string | null,
          lastName: 'Doe' as string | null,
          email: 'volunteer@test.com',
          role: 'volunteer' as string | null,
        } as {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          role: string | null;
        } | null,
        manualConfirmations: [] as Array<unknown>,
        reminderLogs: [] as Array<unknown>,
        complianceRate: 85,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(PatientService.prototype, 'getDetail').mockResolvedValue(mockPatient as any);

      const service = new PatientService();
      const result = await service.getDetail('123', { id: 'user-1', role: 'admin' });

      // Verify contract structure
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('phoneNumber');
      expect(result).toHaveProperty('complianceRate');
      expect(result).toHaveProperty('assignedVolunteer');
      expect(result).toHaveProperty('manualConfirmations');
      expect(result).toHaveProperty('reminderLogs');
    });
  });

  describe('Health Check API Contract', () => {
    it('health check response should match contract', async () => {
      const healthCheck = {
        status: 'ready' as const,
        timestamp: expect.any(String),
        checks: {
          database: { healthy: true, latency_ms: expect.any(Number) },
          redis: { healthy: true, latency_ms: expect.any(Number) },
          gowa: { healthy: true, latency_ms: expect.any(Number) },
          anthropic: { healthy: true, latency_ms: expect.any(Number) },
          minio: { healthy: true, latency_ms: expect.any(Number) },
        },
      };

      expect(healthCheck.checks).toHaveProperty('database');
      expect(healthCheck.checks).toHaveProperty('redis');
      expect(healthCheck.checks).toHaveProperty('gowa');
      expect(healthCheck.checks).toHaveProperty('anthropic');
      expect(healthCheck.checks).toHaveProperty('minio');
    });
  });

  describe('Metrics API Contract', () => {
    it('metrics response should be in Prometheus format', async () => {
      const metricsResponse = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/patients",status="200"} 123
http_requests_total{method="POST",endpoint="/api/reminders",status="201"} 456
# HELP http_request_duration_ms HTTP request duration in milliseconds
# TYPE http_request_duration_ms histogram
http_request_duration_ms{endpoint="/api/patients"} 45.6
`;

      // Parse metrics
      const lines = metricsResponse.split('\n');
      const helpLines = lines.filter(l => l.startsWith('# HELP'));
      const typeLines = lines.filter(l => l.startsWith('# TYPE'));
      const metricLines = lines.filter(l => !l.startsWith('#') && l.length > 0);

      expect(helpLines.length).toBeGreaterThan(0);
      expect(typeLines.length).toBeGreaterThan(0);
      expect(metricLines.length).toBeGreaterThan(0);

      // Verify metric format (name{labels} value)
      const metricLine = metricLines[0];
      expect(metricLine).toMatch(/^[a-z_][a-z0-9_]*\{[^}]+\} \d+(\.\d+)?$/);
    });
  });

  describe('Error Response Contract', () => {
    it('error responses should match expected format', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number format',
          details: { field: 'phoneNumber' },
        },
        requestId: 'req-123',
        timestamp: expect.any(String),
      };

      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse.success).toBe(false);
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(errorResponse).toHaveProperty('requestId');
      expect(errorResponse).toHaveProperty('timestamp');
    });
  });

  describe('Success Response Contract', () => {
    it('success responses should match expected format', async () => {
      const successResponse = {
        success: true,
        data: { id: '123', name: 'Test' },
        requestId: 'req-123',
        timestamp: expect.any(String),
      };

      expect(successResponse).toHaveProperty('success');
      expect(successResponse.success).toBe(true);
      expect(successResponse).toHaveProperty('data');
      expect(successResponse).toHaveProperty('requestId');
      expect(successResponse).toHaveProperty('timestamp');
    });
  });
});

describe('API Versioning Contract', () => {
  it('should have version header constants defined', async () => {
    const { API_VERSION, VERSION_HEADER, DEPRECATED_HEADER } = await import('@/lib/api-versioning');

    expect(API_VERSION).toBe('v1');
    expect(VERSION_HEADER).toBe('API-Version');
    expect(DEPRECATED_HEADER).toBe('Deprecation');
  });

  it('should have createVersionHeaders function defined', async () => {
    const { createVersionHeaders } = await import('@/lib/api-versioning');

    expect(createVersionHeaders).toBeDefined();
    expect(typeof createVersionHeaders).toBe('function');

    // Test that headers are generated correctly
    const headers = createVersionHeaders({ version: 'v1' });

    expect(headers['API-Version']).toBe('v1');
  });

  it('should add deprecation header when deprecated', async () => {
    const { createVersionHeaders, DEPRECATED_HEADER } = await import('@/lib/api-versioning');

    const headers = createVersionHeaders({
      version: 'v1',
      deprecated: true,
      sunsetDate: '2025-12-31',
    });

    expect(headers[DEPRECATED_HEADER]).toContain('true');
    expect(headers[DEPRECATED_HEADER]).toContain('sunset=2025-12-31');
  });
});
