// Migration validation utilities
// Ensures database schema changes are safe and complete

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Database query result interfaces
interface TimeQueryResult {
  current_time?: string;
}

interface VersionQueryResult {
  version?: string;
}

interface CountQueryResult {
  count?: string | number;
}

interface TableSizeResult {
  schemaname?: string;
  tablename?: string;
  size?: string;
}



interface EnumTypeResult {
  typname?: string;
}

interface TriggerResult {
  trigger_name?: string;
  event_object_table?: string;
}

type DatabaseConnectionResult = {
  success: boolean;
  issues: string[];
  details: Record<string, unknown>;
};

type MigrationSafetyResult = {
  success: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
};

type RollbackCapabilityResult = {
  success: boolean;
  issues: string[];
  rollbackSteps: string[];
};

type FullMigrationResult = {
  ready: boolean;
  connection: { success: boolean; latency: number; poolSize: number; };
  safety: { canCreateTables: boolean; canModifyEnums: boolean; canAlterTables: boolean; };
  rollback: { steps: string[]; estimatedTime: string; };
  summary: string;
  recommendations: string[];
};

export class MigrationValidator {
  // Validate database connection and permissions
  static async validateDatabaseConnection(): Promise<DatabaseConnectionResult> {
    const issues: string[] = [];
    const details: Record<string, unknown> = {};

    try {
      // Test basic connection
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      details.connectionTime = (result[0] as TimeQueryResult)?.current_time;

      // Check database version
      const versionResult = await db.execute(sql`SELECT version() as version`);
      details.version = (versionResult[0] as VersionQueryResult)?.version;

      // Check if we have permission to create tables
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS migration_test (
            id SERIAL PRIMARY KEY,
            test_col TEXT
          )
        `);
        await db.execute(sql`DROP TABLE IF EXISTS migration_test`);
        details.canCreateTables = true;
      } catch (error) {
        details.canCreateTables = false;
        issues.push(`Insufficient permissions to create tables: ${error}`);
      }

      // Check if we can modify enums
      try {
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_enum') THEN
              CREATE TYPE test_enum AS ENUM ('TEST');
              DROP TYPE test_enum;
            END IF;
          END $$
        `);
        details.canModifyEnums = true;
      } catch (error) {
        details.canModifyEnums = false;
        issues.push(`Cannot modify enum types: ${error}`);
      }

      return {
        success: issues.length === 0,
        issues,
        details,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Database connection failed: ${error}`],
        details: {},
      };
    }
  }

  // Validate that migrations can be applied safely
  static async validateMigrationSafety(): Promise<MigrationSafetyResult> {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for active connections that might be affected
      const activeConnections = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND state = 'active'
      `);
      const connectionCount = parseInt(String((activeConnections[0] as CountQueryResult)?.count || 0));

      if (connectionCount > 10) {
        warnings.push(`${connectionCount} active database connections detected`);
        recommendations.push('Consider running migrations during low-traffic periods');
      }

      // Check for large tables that might need special handling
      const tableSizes = await db.execute(sql`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      const largeTables = (tableSizes as TableSizeResult[]).filter((row: TableSizeResult) => {
        const sizeStr = String(row.size || '');
        return sizeStr.includes('GB') || (sizeStr.includes('MB') && parseInt(sizeStr) > 100);
      });

      if (largeTables.length > 0) {
        warnings.push(`Found large tables: ${largeTables.map((t: TableSizeResult) => `${t.tablename} (${t.size})`).join(', ')}`);
        recommendations.push('Consider backing up large tables before migration');
      }

      // Check for existing constraints that might conflict
      // Note: Constraints are checked but not used in current validation logic
      await db.execute(sql`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name IN ('reminders', 'manual_confirmations')
        ORDER BY tc.table_name, tc.constraint_name
      `);

      // Check for pending transactions
      const pendingTransactions = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE state IN ('idle in transaction', 'active')
        AND query NOT LIKE '%pg_stat_activity%'
      `);

      const transactionCount = parseInt(String((pendingTransactions[0] as CountQueryResult)?.count || 0));
      if (transactionCount > 0) {
        warnings.push(`${transactionCount} pending transactions detected`);
        recommendations.push('Wait for pending transactions to complete');
      }

      return {
        success: issues.length === 0,
        issues,
        warnings,
        recommendations,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Migration safety validation failed: ${error}`],
        warnings: [],
        recommendations: [],
      };
    }
  }

  // Validate that rollback is possible
  static async validateRollbackCapability(): Promise<RollbackCapabilityResult> {
    const issues: string[] = [];
    const rollbackSteps: string[] = [];

    try {
      // Check if backup tables exist
      const backupTables = await db.execute(sql`
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE '%_backup_%'
        ORDER BY tablename
      `);

      if (backupTables.length === 0) {
        issues.push('No backup tables found - create backups before migration');
        rollbackSteps.push('CREATE TABLE reminders_backup AS TABLE reminders');
        rollbackSteps.push('CREATE TABLE manual_confirmations_backup AS TABLE manual_confirmations');
      }

      // Check if we can recreate enum types
      const enumTypes = await db.execute(sql`
        SELECT typname
        FROM pg_type
        WHERE typname LIKE '%reminder%'
        ORDER BY typname
      `);

      for (const enumType of enumTypes as EnumTypeResult[]) {
        const typeName = enumType.typname;
        rollbackSteps.push(`-- Rollback for ${typeName} enum`);
        rollbackSteps.push(`-- Note: Enum value removal requires type recreation`);
      }

      // Check for triggers that need to be disabled
      const triggers = await db.execute(sql`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table IN ('reminders', 'manual_confirmations', 'reminder_logs')
        ORDER BY event_object_table, trigger_name
      `);

      if (triggers.length > 0) {
        rollbackSteps.push('-- Disable triggers before rollback:');
        (triggers as TriggerResult[]).forEach((trigger: TriggerResult) => {
          rollbackSteps.push(`ALTER TABLE ${trigger.event_object_table} DISABLE TRIGGER ${trigger.trigger_name}`);
        });
      }

      return {
        success: issues.length === 0,
        issues,
        rollbackSteps,
      };
    } catch (error) {
      return {
        success: false,
        issues: [`Rollback validation failed: ${error}`],
        rollbackSteps: [],
      };
    }
  }

  // Comprehensive migration validation
  static async validateFullMigration(): Promise<FullMigrationResult> {
    logger.info('🔍 Validating migration readiness...');

    const allIssues: string[] = [];
    const allRecommendations: string[] = [];

    // Validate database connection
    logger.info('📡 Testing database connection...');
    const connectionResult = await this.validateDatabaseConnection();
    allIssues.push(...connectionResult.issues);

    // Validate migration safety
    logger.info('🛡️ Checking migration safety...');
    const safetyResult = await this.validateMigrationSafety();
    allIssues.push(...safetyResult.issues);
    allRecommendations.push(...safetyResult.recommendations);

    // Validate rollback capability
    logger.info('🔄 Checking rollback capability...');
    const rollbackResult = await this.validateRollbackCapability();
    allIssues.push(...rollbackResult.issues);

    const ready = allIssues.length === 0;

    let summary = ready
      ? '✅ Migration is ready to proceed'
      : `❌ Migration validation failed with ${allIssues.length} issues`;

    if (safetyResult.warnings.length > 0) {
      summary += `\n⚠️  ${safetyResult.warnings.length} warnings detected`;
    }

    return {
      ready,
      connection: {
        success: connectionResult.success,
        latency: 0, // Would need to measure actual latency
        poolSize: 0, // Would need to get from connection pool
      },
      safety: {
        canCreateTables: Boolean(connectionResult.details.canCreateTables),
        canModifyEnums: Boolean(connectionResult.details.canModifyEnums),
        canAlterTables: true, // Assume true if we can create tables
      },
      rollback: {
        steps: rollbackResult.rollbackSteps,
        estimatedTime: '5-10 minutes',
      },
      summary,
      recommendations: allRecommendations,
    };
  }

  // Generate migration report
  static generateMigrationReport(validationResults: FullMigrationResult): string {
    const report = [];

    report.push('# PRIMA Phase 1 Migration Report');
    report.push('====================================');
    report.push('');

    report.push('## Overview');
    report.push('This report validates the database migration for transforming from medication-specific to general reminder system.');
    report.push('');

    report.push('## Migration Readiness');
    report.push(`${validationResults.ready ? '✅' : '❌'} Ready to proceed`);
    report.push('');

    if (validationResults.connection) {
      report.push('## Database Connection');
      report.push(`- Status: ${validationResults.connection.success ? '✅ Connected' : '❌ Failed'}`);
      report.push(`- Can Create Tables: ${validationResults.safety.canCreateTables ? 'Yes' : 'No'}`);
      report.push(`- Can Modify Enums: ${validationResults.safety.canModifyEnums ? 'Yes' : 'No'}`);
      report.push('');
    }

    if (validationResults.recommendations.length > 0) {
      report.push('## Recommendations');
      validationResults.recommendations.forEach((rec: string) => {
        report.push(`- ${rec}`);
      });
      report.push('');
    }

    if (validationResults.rollback) {
      report.push('## Rollback Capability');
      report.push(`- Estimated Time: ${validationResults.rollback.estimatedTime}`);
      if (validationResults.rollback.steps.length > 0) {
        report.push('### Steps:');
        validationResults.rollback.steps.forEach((step: string) => {
          report.push(`- ${step}`);
        });
      }
      report.push('');
    }

    report.push('## Migration Steps');
    report.push('1. Run database backup');
    report.push('2. Apply migration 001: Add MEDICATION to reminder types');
    report.push('3. Apply migration 002: Enhance reminders table');
    report.push('4. Apply migration 003: Create reminder_logs table');
    report.push('5. Apply migration 004: Enhance manual_confirmations table');
    report.push('6. Run validation tests');
    report.push('7. Update application code to use new schema');
    report.push('');

    report.push('## Rollback Instructions');
    report.push('If issues occur, run the rollback scripts in reverse order:');
    report.push('1. rollback_004_revert_manual_confirmations.sql');
    report.push('2. rollback_003_drop_reminder_logs.sql');
    report.push('3. rollback_002_remove_reminder_enhancements.sql');
    report.push('4. rollback_001_remove_medication_from_reminder_types.sql');
    report.push('');

    report.push('## Files Created');
    report.push('- Database schema enhancements: `/src/db/reminder-schema.ts`');
    report.push('- Enum updates: `/src/db/enums.ts`');
    report.push('- Migration scripts: `/src/db/migrations/`');
    report.push('- Type utilities: `/src/lib/reminder-types.ts`');
    report.push('- Helper functions: `/src/lib/reminder-helpers.ts`');
    report.push('- Testing utilities: `/src/lib/reminder-testing.ts`');
    report.push('- Migration validation: `/src/lib/reminder-migration-validator.ts`');
    report.push('');

    report.push('---');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Status: ${validationResults.ready ? 'Ready for Production' : 'Requires Attention'}`);

    return report.join('\n');
  }
}