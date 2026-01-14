/**
 * DataLoader Tests
 *
 * Tests for the batch loading utility that prevents N+1 queries.
 */

import { describe, it, expect, vi } from 'vitest';
import DataLoader from 'dataloader';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([
          { id: 'patient-1', name: 'Patient 1', phoneNumber: '+62812345601', isActive: true },
          { id: 'patient-2', name: 'Patient 2', phoneNumber: '+62812345602', isActive: true },
        ])),
      })),
    })),
  },
  patients: {
    id: 'id',
    name: 'name',
    phoneNumber: 'phoneNumber',
    isActive: 'isActive',
    deletedAt: 'deletedAt',
  },
}));

describe('DataLoader', () => {
  describe('createPatientLoader', () => {
    it('should create a new DataLoader instance', async () => {
      const { createPatientLoader } = await import('@/lib/dataloader');

      const loader = createPatientLoader();

      expect(loader).toBeInstanceOf(DataLoader);
    });

    it('should batch multiple requests into single query', async () => {
      const { createPatientLoader } = await import('@/lib/dataloader');
      const { db } = await import('@/db');

      const loader = createPatientLoader();

      // Make multiple parallel requests
      const promise1 = loader.load('patient-1');
      const promise2 = loader.load('patient-2');
      const promise3 = loader.load('patient-3');

      const results = await Promise.all([promise1, promise2, promise3]);

      // Database should only be called once
      expect(db.select).toHaveBeenCalledTimes(1);

      // Results should be returned in order
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeNull(); // patient-3 not found
    });

    it('should return null for non-existent patient', async () => {
      const { createPatientLoader } = await import('@/lib/dataloader');

      const loader = createPatientLoader();
      const result = await loader.load('non-existent');

      expect(result).toBeNull();
    });

    it('should cache loaded patients', async () => {
      const { createPatientLoader } = await import('@/lib/dataloader');
      const { db } = await import('@/db');

      const loader = createPatientLoader();

      // First load
      await loader.load('patient-1');
      // Second load should hit cache
      await loader.load('patient-1');

      // Database should only be called once
      expect(db.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPatientByPhoneLoader', () => {
    it('should create a phone-based DataLoader', async () => {
      const { createPatientByPhoneLoader } = await import('@/lib/dataloader');

      const loader = createPatientByPhoneLoader();

      expect(loader).toBeInstanceOf(DataLoader);
    });

    it('should batch phone lookups into single query', async () => {
      const { createPatientByPhoneLoader } = await import('@/lib/dataloader');
      const { db } = await import('@/db');

      const loader = createPatientByPhoneLoader();

      const promise1 = loader.load('+62812345601');
      const promise2 = loader.load('+62812345602');

      await Promise.all([promise1, promise2]);

      expect(db.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPatientLoaders', () => {
    it('should create both loaders', async () => {
      const { createPatientLoaders } = await import('@/lib/dataloader');

      const loaders = createPatientLoaders();

      expect(loaders.patientLoader).toBeInstanceOf(DataLoader);
      expect(loaders.patientByPhoneLoader).toBeInstanceOf(DataLoader);
    });

    it('should return independent loaders', async () => {
      const { createPatientLoaders } = await import('@/lib/dataloader');

      const loaders1 = createPatientLoaders();
      const loaders2 = createPatientLoaders();

      // Different instances
      expect(loaders1.patientLoader).not.toBe(loaders2.patientLoader);
      expect(loaders1.patientByPhoneLoader).not.toBe(loaders2.patientByPhoneLoader);
    });
  });

  describe('PatientLoaderContext', () => {
    it('should have correct type definition', async () => {
      const { createPatientLoaders } = await import('@/lib/dataloader');

      const loaders = createPatientLoaders();

      // Type check - these should exist and be DataLoader instances
      expect(loaders.patientLoader).toBeDefined();
      expect(loaders.patientByPhoneLoader).toBeDefined();
    });
  });
});
