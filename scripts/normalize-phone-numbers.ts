#!/usr/bin/env bun
/**
 * Phone Number Normalization Script
 *
 * This script:
 * 1. Normalizes all phone numbers from 0xxx to 62xxx format
 * 2. Identifies and removes duplicate patients (keeps 62xxx, removes 0xxx duplicates)
 * 3. Updates related records to point to the kept patient
 */

import { db } from '../src/db';
import { patients } from '../src/db/schema';
import { sql, eq, and, or } from 'drizzle-orm';
import { formatWhatsAppNumber } from '../src/lib/gowa';

interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  verificationStatus: string;
  isActive: boolean;
  createdAt: Date;
}

interface NormalizationResult {
  totalPatients: number;
  normalizedCount: number;
  duplicatesFound: number;
  duplicatesRemoved: number;
  errors: Array<{ patientId: string; error: string }>;
}

async function normalizePhoneNumbers(): Promise<NormalizationResult> {
  const result: NormalizationResult = {
    totalPatients: 0,
    normalizedCount: 0,
    duplicatesFound: 0,
    duplicatesRemoved: 0,
    errors: [],
  };

  console.log('🔄 Starting phone number normalization...\n');

  try {
    // Step 1: Get all patients
    console.log('📊 Fetching all patients...');
    const allPatients = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        verificationStatus: patients.verificationStatus,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
      })
      .from(patients);

    result.totalPatients = allPatients.length;
    console.log(`   Found ${result.totalPatients} patients\n`);

    // Step 2: Normalize all phone numbers to 62xxx format
    console.log('🔧 Normalizing phone numbers to 62xxx format...');
    const normalizedMap = new Map<string, string>(); // old phone -> normalized phone

    for (const patient of allPatients) {
      try {
        const normalized = formatWhatsAppNumber(patient.phoneNumber);

        if (normalized !== patient.phoneNumber) {
          normalizedMap.set(patient.phoneNumber, normalized);

          // Update the patient record
          await db
            .update(patients)
            .set({
              phoneNumber: normalized,
              updatedAt: new Date(),
            })
            .where(eq(patients.id, patient.id));

          result.normalizedCount++;
          console.log(`   ✅ ${patient.name} (${patient.phoneNumber} → ${normalized})`);
        }
      } catch (error) {
        result.errors.push({
          patientId: patient.id,
          error: `Failed to normalize ${patient.phoneNumber}: ${error instanceof Error ? error.message : String(error)}`,
        });
        console.log(`   ❌ Failed to normalize ${patient.name} (${patient.phoneNumber})`);
      }
    }

    console.log(`\n   Normalized ${result.normalizedCount} phone numbers\n`);

    // Step 3: Find duplicates (after normalization)
    console.log('🔍 Finding duplicate patients...');
    const patientsAfterNormalization = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        verificationStatus: patients.verificationStatus,
        isActive: patients.isActive,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .orderBy(patients.phoneNumber, patients.createdAt);

    // Group by phone number
    const phoneGroups = new Map<string, Patient[]>();
    for (const patient of patientsAfterNormalization) {
      const group = phoneGroups.get(patient.phoneNumber) || [];
      group.push(patient as Patient);
      phoneGroups.set(patient.phoneNumber, group);
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(phoneGroups.entries()).filter(
      ([_, group]) => group.length > 1
    );

    result.duplicatesFound = duplicateGroups.reduce(
      (sum, [_, group]) => sum + (group.length - 1),
      0
    );

    console.log(`   Found ${duplicateGroups.length} phone numbers with duplicates`);
    console.log(`   Total ${result.duplicatesFound} duplicate patients to remove\n`);

    // Step 4: Handle duplicates - keep the best patient, remove others
    console.log('🗑️  Removing duplicate patients...');

    for (const [phoneNumber, group] of duplicateGroups) {
      console.log(`\n   📞 Processing duplicates for ${phoneNumber}:`);

      // Sort to determine which patient to keep:
      // Priority: VERIFIED > PENDING > DECLINED
      // Then: isActive = true > false
      // Then: oldest (earliest created_at)
      const sorted = [...group].sort((a, b) => {
        // Priority 1: Verification status
        const statusPriority = { VERIFIED: 3, PENDING: 2, DECLINED: 1 };
        const statusDiff =
          (statusPriority[b.verificationStatus as keyof typeof statusPriority] || 0) -
          (statusPriority[a.verificationStatus as keyof typeof statusPriority] || 0);
        if (statusDiff !== 0) return statusDiff;

        // Priority 2: Active status
        if (a.isActive !== b.isActive) return b.isActive ? 1 : -1;

        // Priority 3: Oldest (earliest created)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const keepPatient = sorted[0];
      const removePatients = sorted.slice(1);

      console.log(`      ✅ KEEP: ${keepPatient.name} (${keepPatient.id.slice(0, 8)}...) - ${keepPatient.verificationStatus}, active: ${keepPatient.isActive}`);

      // Remove duplicate patients
      for (const removePatient of removePatients) {
        try {
          // Update related records to point to the kept patient
          console.log(`      🔄 Migrating related records for ${removePatient.name}...`);

          // Update reminders
          await db.execute(sql`
            UPDATE reminders
            SET patient_id = ${keepPatient.id}
            WHERE patient_id = ${removePatient.id}
          `);

          // Update conversation_states
          await db.execute(sql`
            UPDATE conversation_states
            SET patient_id = ${keepPatient.id}
            WHERE patient_id = ${removePatient.id}
          `);

          // Update manual_confirmations
          await db.execute(sql`
            UPDATE manual_confirmations
            SET patient_id = ${keepPatient.id}
            WHERE patient_id = ${removePatient.id}
          `);

          // Update medical_records
          await db.execute(sql`
            UPDATE medical_records
            SET patient_id = ${keepPatient.id}
            WHERE patient_id = ${removePatient.id}
          `);

          // Delete the duplicate patient
          await db
            .delete(patients)
            .where(eq(patients.id, removePatient.id));

          result.duplicatesRemoved++;
          console.log(`      ❌ REMOVE: ${removePatient.name} (${removePatient.id.slice(0, 8)}...) - ${removePatient.verificationStatus}, active: ${removePatient.isActive}`);
        } catch (error) {
          result.errors.push({
            patientId: removePatient.id,
            error: `Failed to remove duplicate: ${error instanceof Error ? error.message : String(error)}`,
          });
          console.log(`      ⚠️  ERROR removing ${removePatient.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    console.log('\n✅ Phone number normalization complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total patients: ${result.totalPatients}`);
    console.log(`   Normalized: ${result.normalizedCount}`);
    console.log(`   Duplicates found: ${result.duplicatesFound}`);
    console.log(`   Duplicates removed: ${result.duplicatesRemoved}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.forEach(({ patientId, error }) => {
        console.log(`   - ${patientId}: ${error}`);
      });
    }

    return result;
  } catch (error) {
    console.error('\n❌ Fatal error during normalization:', error);
    throw error;
  }
}

// Run the script
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📱 Phone Number Normalization Script');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

normalizePhoneNumbers()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
