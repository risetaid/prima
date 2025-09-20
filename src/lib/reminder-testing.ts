// Testing utilities for the reminder system
// Comprehensive test helpers and validation tools

import { db, reminders, manualConfirmations } from '@/db';
import { sql } from 'drizzle-orm';
import type { Reminder, ManualConfirmation } from '@/lib/reminder-types';
import { ReminderHelpers } from '@/lib/reminder-helpers';

export class ReminderTesting {
  // Test data creation helpers
  static async createTestReminder(overrides: Partial<{
    patientId: string;
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
    scheduledTime: string;
    message: string;
    startDate: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }> = {}): Promise<Reminder> {
    const testData = {
      patientId: overrides.patientId || 'test-patient-id',
      reminderType: overrides.reminderType || 'MEDICATION' as const,
      scheduledTime: overrides.scheduledTime || '08:00',
      message: overrides.message || 'Test reminder message',
      startDate: overrides.startDate || new Date(),
      priority: overrides.priority || 'medium' as const,
      isActive: true,
      createdById: 'test-user-id',
      status: 'PENDING' as const,
    };

    const [reminder] = await db
      .insert(reminders)
      .values(testData)
      .returning();

    return reminder;
  }

  // Note: ReminderLog table was removed from schema

  static async createTestManualConfirmation(overrides: Partial<{
    patientId: string;
    reminderType: 'MEDICATION' | 'APPOINTMENT' | 'GENERAL';
    confirmationType: 'VISIT' | 'PHONE_CALL' | 'MESSAGE' | 'GENERAL';
    notes: string;
  }> = {}): Promise<ManualConfirmation> {
    const [confirmation] = await db
      .insert(manualConfirmations)
      .values({
        patientId: overrides.patientId || 'test-patient-id',
        volunteerId: 'test-volunteer-id',
        reminderType: overrides.reminderType || 'MEDICATION',
        confirmationType: overrides.confirmationType || 'VISIT',
        notes: overrides.notes || 'Test confirmation notes',
      })
      .returning();

    return confirmation;
  }

  // Schema validation tests
  static async validateSchemaStructure(): Promise<{
    success: boolean;
    issues: string[];
    details: Record<string, unknown>;
  }> {
    const issues: string[] = [];
    const details: Record<string, unknown> = {};

    try {
      // Test reminder table structure
      const reminderColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'reminders'
        ORDER BY ordinal_position
      `);
      details.reminderColumns = reminderColumns;

      // Check required columns
      const requiredColumns = ['id', 'patient_id', 'reminder_type', 'scheduled_time', 'message', 'start_date'];
      const reminderColumnNames = reminderColumns.map((col) => (col as { column_name: string }).column_name);

      for (const col of requiredColumns) {
        if (!reminderColumnNames.includes(col)) {
          issues.push(`Missing required column: ${col}`);
        }
      }

      // Test reminder_logs table structure
      const logColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'reminder_logs'
        ORDER BY ordinal_position
      `);
      details.logColumns = logColumns;

      // Test manual_confirmations table structure
      const confirmationColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'manual_confirmations'
        ORDER BY ordinal_position
      `);
      details.confirmationColumns = confirmationColumns;

      // Test enum values
      const enumResult = await db.execute(sql`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reminder_type')
        ORDER BY enumlabel
      `);
      details.reminderTypeValues = enumResult;

      const expectedTypes = ['MEDICATION', 'APPOINTMENT', 'GENERAL'];
      const actualTypes = enumResult.map((row) => (row as { enumlabel: string }).enumlabel);

      for (const type of expectedTypes) {
        if (!actualTypes.includes(type)) {
          issues.push(`Missing reminder type: ${type}`);
        }
      }

      // Test indexes
      const indexes = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename IN ('reminders', 'reminder_logs', 'manual_confirmations')
        ORDER BY tablename, indexname
      `);
      details.indexes = indexes;

      // Test foreign key constraints
      const constraints = await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('reminders', 'reminder_logs', 'manual_confirmations')
      `);
      details.foreignKeys = constraints;

      return {
        success: issues.length === 0,
        issues,
        details,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Schema validation failed: ${error}`],
        details: { error },
      };
    }
  }

  // Performance tests
  static async testQueryPerformance(): Promise<{
    success: boolean;
    results: Record<string, number>;
    issues: string[];
  }> {
    const issues: string[] = [];
    const results: Record<string, number> = {};

    try {
      // Test active reminders query
      const start1 = Date.now();
      await ReminderHelpers.getActiveRemindersByPatient('test-patient-id');
      results.activeRemindersQuery = Date.now() - start1;

      // Test reminders by type query
      const start2 = Date.now();
      await ReminderHelpers.getRemindersByType('MEDICATION');
      results.remindersByTypeQuery = Date.now() - start2;

      // Test today's reminders query
      const start3 = Date.now();
      await ReminderHelpers.getTodaysReminders();
      results.todaysRemindersQuery = Date.now() - start3;

      // Test reminder logs query
      const start4 = Date.now();
      await ReminderHelpers.getReminderLogs('test-reminder-id');
      results.reminderLogsQuery = Date.now() - start4;

      // Test analytics query
      const start5 = Date.now();
      await ReminderHelpers.getReminderStats();
      results.reminderStatsQuery = Date.now() - start5;

      // Check performance thresholds (in milliseconds)
      const thresholds = {
        activeRemindersQuery: 100,
        remindersByTypeQuery: 100,
        todaysRemindersQuery: 200,
        reminderLogsQuery: 100,
        reminderStatsQuery: 150,
      };

      for (const [query, time] of Object.entries(results)) {
        const threshold = thresholds[query as keyof typeof thresholds];
        if (time > threshold) {
          issues.push(`${query} took ${time}ms (threshold: ${threshold}ms)`);
        }
      }

      return {
        success: issues.length === 0,
        results,
        issues,
      };
    } catch (error) {
      return {
        success: false,
        results: {},
        issues: [`Performance test failed: ${error}`],
      };
    }
  }

  // Data integrity tests
  static async testDataIntegrity(): Promise<{
    success: boolean;
    issues: string[];
    stats: {
      orphanedLogs: number;
      orphanedConfirmations: number; 
      invalidReminders: number;
      futureReminders: number;
      noEndDateReminders: number;
      overall: Record<string, unknown>;
    };
  }> {
    const issues: string[] = [];
    const stats = {
      orphanedLogs: 0,
      orphanedConfirmations: 0,
      invalidReminders: 0,
      futureReminders: 0,
      noEndDateReminders: 0,
      overall: {} as Record<string, unknown>,
    };

    try {
      // Check for orphaned reminder logs
      const orphanedLogs = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM reminder_logs rl
        LEFT JOIN reminders r ON rl.reminder_id = r.id
        WHERE r.id IS NULL
      `);
      stats.orphanedLogs = Number((orphanedLogs[0] as { count: number })?.count) || 0;

      if (stats.orphanedLogs > 0) {
        issues.push(`Found ${stats.orphanedLogs} orphaned reminder logs`);
      }

      // Check for orphaned manual confirmations
      const orphanedConfirmations = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM manual_confirmations mc
        LEFT JOIN reminders r ON mc.reminder_id = r.id
        WHERE mc.reminder_id IS NOT NULL AND r.id IS NULL
      `);
      stats.orphanedConfirmations = Number((orphanedConfirmations[0] as { count: number })?.count) || 0;

      if (stats.orphanedConfirmations > 0) {
        issues.push(`Found ${stats.orphanedConfirmations} orphaned manual confirmations`);
      }

      // Check for reminders without required fields
      const invalidReminders = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM reminders
        WHERE
          patient_id IS NULL OR
          reminder_type IS NULL OR
          scheduled_time IS NULL OR
          message IS NULL OR
          start_date IS NULL
      `);
      stats.invalidReminders = Number((invalidReminders[0] as { count: number })?.count) || 0;

      if (stats.invalidReminders > 0) {
        issues.push(`Found ${stats.invalidReminders} reminders with missing required fields`);
      }

      // Check for future start dates
      const futureReminders = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM reminders
        WHERE start_date > NOW()
      `);
      stats.futureReminders = Number((futureReminders[0] as { count: number })?.count) || 0;

      // Check for reminders without end dates (should be rare)
      const noEndDateReminders = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM reminders
        WHERE end_date IS NULL
      `);
      stats.noEndDateReminders = Number((noEndDateReminders[0] as { count: number })?.count) || 0;

      // Get overall statistics
      const overallStats = await db.execute(sql`
        SELECT
          COUNT(*) as total_reminders,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_reminders,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_reminders,
          COUNT(CASE WHEN confirmation_status = 'CONFIRMED' THEN 1 END) as confirmed_reminders,
          COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_reminders
        FROM reminders
        WHERE deleted_at IS NULL
      `);
      stats.overall = overallStats[0];

      return {
        success: issues.length === 0,
        issues,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Data integrity test failed: ${error}`],
        stats: {
          orphanedLogs: 0,
          orphanedConfirmations: 0,
          invalidReminders: 0,
          futureReminders: 0,
          noEndDateReminders: 0,
          overall: {},
        },
      };
    }
  }

  // Migration dry run test
  static async testMigrationDryRun(): Promise<{
    success: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if migration tables exist
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'reminder_logs'
        ) as logs_exist,
        EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'drizzle_migrations'
        ) as migrations_exist
      `);

      const hasLogs = tableCheck[0]?.logs_exist;
      const hasMigrations = tableCheck[0]?.migrations_exist;

      if (!hasLogs) {
        warnings.push('reminder_logs table does not exist - will be created by migration');
      }

      if (!hasMigrations) {
        warnings.push('drizzle_migrations table does not exist - first migration needed');
      }

      // Check enum values before migration
      const currentTypes = await db.execute(sql`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reminder_type')
        ORDER BY enumlabel
      `);

      const typeList = currentTypes.map((row) => (row as { enumlabel: string }).enumlabel);
      if (!typeList.includes('MEDICATION')) {
        warnings.push('MEDICATION type not found in enum - will be added by migration');
      }

      // Check if enhanced columns exist
      const columnCheck = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'reminders'
        AND column_name IN ('title', 'description', 'priority', 'recurrence_pattern', 'metadata')
      `);

      const enhancedColumns = columnCheck.map((row) => (row as { column_name: string }).column_name);
      const missingColumns = ['title', 'description', 'priority', 'recurrence_pattern', 'metadata']
        .filter(col => !enhancedColumns.includes(col));

      if (missingColumns.length > 0) {
        warnings.push(`Missing enhanced columns: ${missingColumns.join(', ')}`);
      }

      return {
        success: issues.length === 0,
        issues,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Migration dry run test failed: ${error}`],
        warnings: [],
      };
    }
  }

  // Comprehensive test runner
  static async runAllTests(): Promise<{
    overallSuccess: boolean;
    results: {
      schema: { success: boolean; issues: string[]; details: Record<string, unknown> };
      performance: { success: boolean; results: Record<string, number>; issues: string[] };
      integrity: { success: boolean; issues: string[]; stats: Record<string, unknown> };
      migration: { success: boolean; issues: string[]; warnings: string[] };
    };
    summary: string;
  }> {
    const results = {} as {
      schema: { success: boolean; issues: string[]; details: Record<string, unknown> };
      performance: { success: boolean; results: Record<string, number>; issues: string[] };
      integrity: { success: boolean; issues: string[]; stats: Record<string, unknown> };
      migration: { success: boolean; issues: string[]; warnings: string[] };
    };
    const allIssues: string[] = [];

    console.log('🧪 Running comprehensive reminder system tests...');

    // Schema validation
    console.log('📋 Testing schema structure...');
    results.schema = await this.validateSchemaStructure();
    allIssues.push(...results.schema.issues);

    // Performance testing
    console.log('⚡ Testing query performance...');
    results.performance = await this.testQueryPerformance();
    allIssues.push(...results.performance.issues);

    // Data integrity
    console.log('🔍 Testing data integrity...');
    results.integrity = await this.testDataIntegrity();
    allIssues.push(...results.integrity.issues);

    // Migration dry run
    console.log('🔄 Testing migration readiness...');
    results.migration = await this.testMigrationDryRun();
    allIssues.push(...results.migration.issues);

    const overallSuccess = allIssues.length === 0;

    const summary = overallSuccess
      ? '✅ All tests passed successfully!'
      : `❌ Found ${allIssues.length} issues:\n${allIssues.join('\n')}`;

    return {
      overallSuccess,
      results,
      summary,
    };
  }

  // Cleanup test data
  static async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // Note: reminderLogs table was removed from schema

    await db
      .delete(manualConfirmations)
      .where(sql`patient_id LIKE 'test-%'`);

    await db
      .delete(reminders)
      .where(sql`patient_id LIKE 'test-%'`);

    console.log('✅ Test data cleaned up');
  }
}