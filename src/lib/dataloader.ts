/**
 * DataLoader Utility for Batch Loading
 *
 * Prevents N+1 queries by batching patient lookups.
 * CRITICAL: Must be instantiated per request to prevent cache leaks.
 */

import DataLoader from 'dataloader';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { inArray, isNull, and } from 'drizzle-orm';

// Patient type matching the database schema
export interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  verificationStatus: string;
  isActive: boolean;
  cancerStage?: string | null;
  assignedVolunteerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Creates a new DataLoader instance for each request.
 * Use this in your request context to batch patient lookups.
 */
export function createPatientLoader(): DataLoader<string, Patient | null> {
  return new DataLoader<string, Patient | null>(async (ids) => {
    // Batch fetch all patients by IDs, excluding soft-deleted
    // Note: DataLoader passes readonly array, need to spread to mutable array for inArray
    const results = await db
      .select()
      .from(patients)
      .where(and(
        inArray(patients.id, [...ids]),
        isNull(patients.deletedAt)
      ))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          // Ensure date fields are properly typed
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as unknown as string),
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as unknown as string),
          deletedAt: row.deletedAt
            ? row.deletedAt instanceof Date
              ? row.deletedAt
              : new Date(row.deletedAt as unknown as string)
            : null,
        }))
      );

    // Create a map for O(1) lookup
    const patientMap = new Map(results.map((p) => [p.id, p]));

    // Return results in same order as input IDs
    return ids.map((id) => patientMap.get(id) || null);
  });
}

/**
 * Creates a DataLoader for patients by phone number.
 * Useful for webhook processing where we look up by phone.
 */
export function createPatientByPhoneLoader(): DataLoader<string, Patient | null> {
  return new DataLoader<string, Patient | null>(async (phoneNumbers) => {
    // Batch fetch all patients by phone numbers, excluding soft-deleted
    // Note: DataLoader passes readonly array, need to spread to mutable array for inArray
    const results = await db
      .select()
      .from(patients)
      .where(and(
        inArray(patients.phoneNumber, [...phoneNumbers]),
        isNull(patients.deletedAt)
      ))
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as unknown as string),
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt as unknown as string),
          deletedAt: row.deletedAt
            ? row.deletedAt instanceof Date
              ? row.deletedAt
              : new Date(row.deletedAt as unknown as string)
            : null,
        }))
      );

    // Create a map for O(1) lookup
    const patientMap = new Map(results.map((p) => [p.phoneNumber, p]));

    // Return results in same order as input phone numbers
    return phoneNumbers.map((phone) => patientMap.get(phone) || null);
  });
}

/**
 * Context type for request-scoped DataLoaders
 */
export interface PatientLoaderContext {
  patientLoader: DataLoader<string, Patient | null>;
  patientByPhoneLoader: DataLoader<string, Patient | null>;
}

/**
 * Creates a new set of DataLoaders for a request
 */
export function createPatientLoaders(): PatientLoaderContext {
  return {
    patientLoader: createPatientLoader(),
    patientByPhoneLoader: createPatientByPhoneLoader(),
  };
}
