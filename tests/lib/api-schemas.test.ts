/**
 * API Schema Validation Tests
 * 
 * Tests for Zod validation schemas used across the API
 */

import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  paginationSchema,
  dateStringSchema,
  timeStringSchema,
  createPatientBodySchema,
  updatePatientBodySchema,
  createReminderBodySchema,
  userRoleSchema,
} from '@/lib/api-schemas';

describe('API Schemas - Common Patterns', () => {
  describe('uuidSchema', () => {
    it('should accept valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = uuidSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidUuid = 'not-a-uuid';
      const result = uuidSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination params', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20 });
    });

    it('should apply default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20 });
    });

    it('should coerce string numbers', () => {
      const result = paginationSchema.safeParse({ page: '2', limit: '50' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 2, limit: 50 });
    });

    it('should reject page < 1', () => {
      const result = paginationSchema.safeParse({ page: 0, limit: 20 });
      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('dateStringSchema', () => {
    it('should accept valid date string', () => {
      const result = dateStringSchema.safeParse('2025-10-08');
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = dateStringSchema.safeParse('08-10-2025');
      expect(result.success).toBe(false);
    });

    it('should reject invalid date string', () => {
      const result = dateStringSchema.safeParse('not-a-date');
      expect(result.success).toBe(false);
    });
  });

  describe('timeStringSchema', () => {
    it('should accept valid time string', () => {
      const result = timeStringSchema.safeParse('14:30');
      expect(result.success).toBe(true);
    });

    it('should accept time with leading zeros', () => {
      const result = timeStringSchema.safeParse('09:05');
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const result = timeStringSchema.safeParse('25:00');
      expect(result.success).toBe(false);
    });

    it('should reject time with seconds', () => {
      const result = timeStringSchema.safeParse('14:30:00');
      expect(result.success).toBe(false);
    });
  });
});

describe('API Schemas - Patient', () => {
  describe('createPatientBodySchema', () => {
    it('should accept valid patient data', () => {
      const validData = {
        name: 'John Doe',
        phoneNumber: '081234567890',
      };
      const result = createPatientBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should normalize phone number from 0xxx to 62xxx', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '081234567890',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneNumber).toBe('6281234567890');
      }
    });

    it('should handle phone number with +62 prefix', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '+6281234567890',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneNumber).toBe('6281234567890');
      }
    });

    it('should remove non-digit characters from phone', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '0812-3456-7890',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneNumber).toBe('6281234567890');
      }
    });

    it('should reject invalid phone number', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '123',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require name', () => {
      const data = {
        phoneNumber: '081234567890',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '081234567890',
        address: '123 Street',
        birthDate: '1990-01-01',
        diagnosisDate: '2023-01-01',
        cancerStage: 'II' as const,
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '081234567891',
        notes: 'Some notes',
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate cancer stage enum', () => {
      const data = {
        name: 'John Doe',
        phoneNumber: '081234567890',
        cancerStage: 'V', // Invalid stage
      };
      const result = createPatientBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePatientBodySchema', () => {
    it('should allow partial updates', () => {
      const data = {
        name: 'John Doe Updated',
      };
      const result = updatePatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should normalize phone number on update', () => {
      const data = {
        phoneNumber: '081234567890',
      };
      const result = updatePatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phoneNumber).toBe('6281234567890');
      }
    });

    it('should allow updating verification status', () => {
      const data = {
        verificationStatus: 'VERIFIED' as const,
      };
      const result = updatePatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow updating isActive', () => {
      const data = {
        isActive: false,
      };
      const result = updatePatientBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('API Schemas - Reminder', () => {
  describe('createReminderBodySchema', () => {
    it('should accept valid reminder data', () => {
      const validData = {
        message: 'Take your medicine',
        time: '14:30',
      };
      const result = createReminderBodySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require message', () => {
      const data = {
        time: '14:30',
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require time', () => {
      const data = {
        message: 'Take your medicine',
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept custom recurrence', () => {
      const data = {
        message: 'Take your medicine',
        time: '14:30',
        customRecurrence: {
          frequency: 'day' as const,
          interval: 1,
          endType: 'never' as const,
        },
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate custom recurrence frequency', () => {
      const data = {
        message: 'Take your medicine',
        time: '14:30',
        customRecurrence: {
          frequency: 'invalid',
          interval: 1,
          endType: 'never' as const,
        },
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require interval >= 1', () => {
      const data = {
        message: 'Take your medicine',
        time: '14:30',
        customRecurrence: {
          frequency: 'day' as const,
          interval: 0,
          endType: 'never' as const,
        },
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept attached content', () => {
      const data = {
        message: 'Take your medicine',
        time: '14:30',
        attachedContent: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            type: 'article' as const,
            title: 'Health Article',
          },
        ],
      };
      const result = createReminderBodySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('API Schemas - User', () => {
  describe('userRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(userRoleSchema.safeParse('ADMIN').success).toBe(true);
      expect(userRoleSchema.safeParse('DEVELOPER').success).toBe(true);
      expect(userRoleSchema.safeParse('RELAWAN').success).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(userRoleSchema.safeParse('INVALID').success).toBe(false);
      expect(userRoleSchema.safeParse('admin').success).toBe(false);
    });
  });
});
