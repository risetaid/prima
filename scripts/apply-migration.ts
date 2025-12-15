#!/usr/bin/env bun
/**
 * Apply database migration script
 * Usage: bun scripts/apply-migration.ts
 * 
 * This script applies the CONCURRENT index migration to your database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function main() {
  log('\n=== Phase 3 Database Migration Script ===\n', colors.cyan);
  
  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError('DATABASE_URL environment variable not found!');
    logInfo('Please set DATABASE_URL in your .env.local file');
    process.exit(1);
  }

  logInfo('Connecting to database...');
  
  // Create connection
  const sql = postgres(databaseUrl, {
    max: 1, // Only need one connection for migration
    ssl: databaseUrl.includes('railway') ? 'require' : false,
  });

  try {
    // Test connection
    await sql`SELECT 1 as test`;
    logSuccess('Database connection established');

    // Read migration file
    const migrationPath = join(process.cwd(), 'drizzle', 'migrations', '0013_sticky_skreet_CONCURRENT.sql');
    logInfo(`Reading migration file: ${migrationPath}`);
    
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    logSuccess('Migration file loaded');

    // Show what will be executed
    log('\n📝 Migration SQL:', colors.yellow);
    console.log('─'.repeat(80));
    console.log(migrationSql);
    console.log('─'.repeat(80));

    // Ask for confirmation
    log('\n⚠️  WARNING: This will create indexes in your database!', colors.yellow);
    logInfo('The migration uses CONCURRENT keyword for zero-downtime.');
    logInfo('This may take 5-10 minutes depending on table size.');
    
    // In a real script, you'd use readline for confirmation
    // For now, we'll add a safety check
    const autoConfirm = process.argv.includes('--confirm');
    if (!autoConfirm) {
      logWarning('Dry run mode: Add --confirm flag to actually apply migration');
      logInfo('\nExample: bun scripts/apply-migration.ts --confirm');
      await sql.end();
      process.exit(0);
    }

    log('\n🚀 Applying migration...', colors.cyan);
    
    // Split by statement-breakpoint comments and filter empty statements
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    logInfo(`Found ${statements.length} statement(s) to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const indexName = statement.match(/CREATE INDEX CONCURRENTLY[^"]*"([^"]+)"/)?.[1];
      
      logInfo(`\n[${i + 1}/${statements.length}] Creating index: ${indexName || 'unknown'}`);
      logWarning('This may take several minutes...');
      
      const startTime = Date.now();
      
      try {
        // Execute the statement
        await sql.unsafe(statement);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logSuccess(`Index created successfully in ${duration}s`);
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logError(`Failed after ${duration}s: ${error instanceof Error ? error.message : String(error)}`);
        
        // Check if index already exists
        if (error instanceof Error && error.message.includes('already exists')) {
          logWarning('Index already exists - skipping');
          continue;
        }
        
        throw error;
      }
    }

    log('\n✨ Migration completed successfully!', colors.green);
    
    // Verify indexes were created
    log('\n📊 Verifying indexes...', colors.cyan);
    const indexes = await sql`
      SELECT 
        indexname as index_name,
        tablename as table_name,
        indexdef as definition
      FROM pg_indexes 
      WHERE tablename IN ('conversation_states', 'conversation_messages')
      AND (indexname LIKE '%patient_active%' OR indexname LIKE '%state_created%')
      ORDER BY tablename, indexname
    `;

    if (indexes.length > 0) {
      logSuccess(`Found ${indexes.length} index(es):`);
      indexes.forEach((idx: { index_name: string; table_name: string }) => {
        log(`  • ${idx.table_name}.${idx.index_name}`, colors.green);
      });
    } else {
      logWarning('No indexes found - they may have been created with different names');
    }

    // Show next steps
    log('\n📋 Next Steps:', colors.cyan);
    logInfo('1. Monitor index usage: bun scripts/check-index-usage.ts');
    logInfo('2. Check migration health: Visit /api/admin/migration-health');
    logInfo('3. Enable DB_COMPOSITE_INDEXES feature flag in .env.local');
    logInfo('4. Monitor performance for 24 hours');

  } catch (error) {
    logError('\nMigration failed!');
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
    logInfo('\nDatabase connection closed');
  }
}

main().catch(console.error);
