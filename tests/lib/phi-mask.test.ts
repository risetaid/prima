import { describe, it, expect } from 'vitest';
import {
  sanitizeForAudit,
  maskPatientObject,
  extractPatientReference,
  isPHIField,
  PHI_FIELD_NAMES,
  sanitizeContext,
} from '@/lib/phi-mask';

describe('PHI Masking Utilities', () => {
  describe('sanitizeForAudit', () => {
    it('masks patient name in logs', () => {
      const result = sanitizeForAudit({
        name: 'John Doe',
        id: '123',
        action: 'test',
      });
      expect(result.name).toBe('[PHI-REDACTED]');
      expect(result.id).toBe('123');
      expect(result.action).toBe('test');
    });

    it('masks phoneNumber in logs', () => {
      const result = sanitizeForAudit({
        phoneNumber: '+62812345678',
        patientId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.phoneNumber).toBe('[PHI-REDACTED]');
      expect(result.patientId).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      ); // UUID preserved
    });

    it('masks nested patient objects', () => {
      const result = sanitizeForAudit({
        patient: {
          name: 'Jane Doe',
          phoneNumber: '+62898765432',
          dateOfBirth: '1990-01-01',
          address: '123 Main St',
        },
        action: 'lookup',
      });
      expect(result.patient).toEqual({
        name: '[PHI-REDACTED]',
        phoneNumber: '[PHI-REDACTED]',
        dateOfBirth: '[PHI-REDACTED]',
        address: '[PHI-REDACTED]',
      });
      expect(result.action).toBe('lookup');
    });

    it('handles arrays of patient objects', () => {
      const patients = [
        { name: 'Patient 1', id: '1' },
        { name: 'Patient 2', id: '2' },
      ];
      const result = sanitizeForAudit({ patients });
      expect(result.patients).toEqual([
        { name: '[PHI-REDACTED]', id: '1' },
        { name: '[PHI-REDACTED]', id: '2' },
      ]);
    });

    it('preserves non-PHI fields', () => {
      const result = sanitizeForAudit({
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        count: 42,
        isActive: true,
      });
      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.status).toBe('active');
      expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(result.count).toBe(42);
      expect(result.isActive).toBe(true);
    });

    it('handles null and undefined values', () => {
      const result = sanitizeForAudit({
        name: null,
        phoneNumber: undefined,
        action: 'test',
      });
      expect(result.name).toBeNull();
      expect(result.phoneNumber).toBeUndefined();
      expect(result.action).toBe('test');
    });

    it('handles deeply nested structures', () => {
      const result = sanitizeForAudit({
        level1: {
          level2: {
            level3: {
              name: 'Deeply Nested Patient',
              patientId: '550e8400-e29b-41d4-a716-446655440000',
            },
          },
        },
      });
      expect(
        (result.level1 as Record<string, unknown>).level2
      ).toEqual({
        level3: {
          name: '[PHI-REDACTED]',
          patientId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });
    });

    it('handles all PHI field variations', () => {
      const testCases = [
        'name',
        'patientName',
        'patient_name',
        'emergencyContactName',
        'emergency_contact_name',
        'phoneNumber',
        'phone',
        'phone_number',
        'address',
        'fullAddress',
        'full_address',
        'email',
        'dateOfBirth',
        'date_of_birth',
        'dob',
        'diagnosis',
        'notes',
        'medicalRecordNumber',
        'medical_record_number',
        'mrn',
        'insuranceId',
        'insurance_id',
        'ssn',
        'ipAddress',
        'ip_address',
        'deviceId',
        'device_id',
        'sessionId',
        'session_id',
      ];

      const data: Record<string, string> = {};
      testCases.forEach((field) => {
        data[field] = 'should be masked';
      });

      const result = sanitizeForAudit(data);
      testCases.forEach((field) => {
        expect(result[field as keyof typeof result]).toBe('[PHI-REDACTED]');
      });
    });

    it('does not mask non-UUID id fields with similar names', () => {
      const result = sanitizeForAudit({
        patientId: 'not-a-uuid',
        id: 'not-a-uuid',
      });
      expect(result.patientId).toBe('[PHI-REDACTED]');
      expect(result.id).toBe('[PHI-REDACTED]');
    });
  });

  describe('maskPatientObject', () => {
    it('masks all patient identifiers', () => {
      const patient = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        phoneNumber: '+62812345678',
        email: 'john@example.com',
        address: '123 Main St',
        dateOfBirth: '1990-01-01',
        status: 'active',
      };
      const masked = maskPatientObject(patient);
      expect(masked.id).toBe('550e8400-e29b-41d4-a716-446655440000'); // UUID kept
      expect(masked.name).toBe('[REDACTED]');
      expect(masked.phoneNumber).toBe('[REDACTED]');
      expect(masked.email).toBe('[REDACTED]');
      expect(masked.address).toBe('[REDACTED]');
      expect(masked.dateOfBirth).toBe('[REDACTED]');
      expect(masked.status).toBe('active'); // Non-PHI preserved
    });
  });

  describe('extractPatientReference', () => {
    it('returns only patient UUID', () => {
      const patient = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Should Not Be Included',
        phoneNumber: 'Should Not Be Included',
      };
      const ref = extractPatientReference(patient);
      expect(ref).toEqual({ patientId: patient.id });
    });
  });

  describe('isPHIField', () => {
    it('returns true for PHI fields', () => {
      expect(isPHIField('name')).toBe(true);
      expect(isPHIField('phoneNumber')).toBe(true);
      expect(isPHIField('patientName')).toBe(true);
      expect(isPHIField('address')).toBe(true);
    });

    it('returns false for non-PHI fields', () => {
      expect(isPHIField('id')).toBe(false);
      expect(isPHIField('status')).toBe(false);
      expect(isPHIField('createdAt')).toBe(false);
      expect(isPHIField('count')).toBe(false);
    });
  });

  describe('PHI_FIELD_NAMES', () => {
    it('contains all expected PHI field names', () => {
      expect(PHI_FIELD_NAMES).toContain('name');
      expect(PHI_FIELD_NAMES).toContain('phoneNumber');
      expect(PHI_FIELD_NAMES).toContain('email');
      expect(PHI_FIELD_NAMES).toContain('address');
      expect(PHI_FIELD_NAMES).toContain('dateOfBirth');
    });

    it('has a reasonable number of PHI fields', () => {
      expect(PHI_FIELD_NAMES.length).toBeGreaterThan(20);
      expect(PHI_FIELD_NAMES.length).toBeLessThan(50);
    });
  });

  describe('sanitizeContext', () => {
    it('sanitizes context objects for safe logging', () => {
      const context = {
        userId: 'user-123',
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        patientName: 'John Doe', // Should be masked
        operation: 'lookup',
      };
      const sanitized = sanitizeContext(context);
      expect(sanitized.userId).toBe('user-123');
      expect(sanitized.patientId).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(sanitized.patientName).toBe('[PHI-REDACTED]');
      expect(sanitized.operation).toBe('lookup');
    });
  });
});
