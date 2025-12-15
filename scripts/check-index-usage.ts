#!/usr/bin/env bun
/**
 * Check database index usage
 * Usage: bun scripts/check-index-usage.ts
 * 
 * This script checks if the new indexes are being used by queries
 */

import postgres from 'postgres';

// ANSI color codes
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

async function main() {
  log('\n=== Database Index Usage Report ===\n', colors.cyan);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('❌ DATABASE_URL not found!', colors.red);
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes('railway') ? 'require' : false,
  });

  try {
    // Get index usage statistics
    log('📊 Index Usage Statistics\n', colors.cyan);
    
    const indexStats = await sql`
      SELECT 
        schemaname as schema,
        tablename as table_name,
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('conversation_states', 'conversation_messages')
      ORDER BY idx_scan DESC
    `;

    console.table(indexStats.map((row: { schema: string; table_name: string; index_name: string; scans: string; tuples_read: string; tuples_fetched: string; size: string }) => ({
      Schema: row.schema,
      Table: row.table_name,
      Index: row.index_name,
      Scans: row.scans,
      'Tuples Read': row.tuples_read,
      'Tuples Fetched': row.tuples_fetched,
      Size: row.size,
    })));

    // Check if new indexes exist
    log('\n🔍 New Indexes Status\n', colors.cyan);
    
    const newIndexes = await sql`
      SELECT 
        indexrelname as index_name,
        tablename as table_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as size,
        idx_scan as scans
      FROM pg_stat_user_indexes 
      WHERE indexrelname IN (
        'conversation_states_patient_active_expires_idx',
        'conversation_messages_state_created_idx'
      )
    `;

    if (newIndexes.length === 0) {
      log('⚠️  New indexes not found! Have you run the migration?', colors.yellow);
      log('   Run: bun scripts/apply-migration.ts --confirm', colors.blue);
    } else {
      newIndexes.forEach((idx: { index_name: string; table_name: string; size: string; scans: string }) => {
        const hasBeenUsed = parseInt(idx.scans) > 0;
        const status = hasBeenUsed ? '✅' : '⏳';
        log(`${status} ${idx.table_name}.${idx.index_name}`, hasBeenUsed ? colors.green : colors.yellow);
        log(`   Size: ${idx.size} | Scans: ${idx.scans}`, colors.blue);
      });

      if (newIndexes.some((idx: { scans: string }) => parseInt(idx.scans) === 0)) {
        log('\n⏳ Some indexes have not been used yet. This is normal if:', colors.yellow);
        log('   • The indexes were just created', colors.yellow);
        log('   • No queries have run yet that use these indexes', colors.yellow);
        log('   • Query planner statistics need updating (run ANALYZE)', colors.yellow);
      }
    }

    // Show table statistics
    log('\n📈 Table Statistics\n', colors.cyan);
    
    const tableStats = await sql`
      SELECT 
        schemaname as schema,
        tablename as table_name,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE tablename IN ('conversation_states', 'conversation_messages')
    `;

    tableStats.forEach((table: { schema: string; table_name: string; live_rows: number; dead_rows: number; last_analyze: Date | null; last_autoanalyze: Date | null }) => {
      log(`📋 ${table.table_name}`, colors.cyan);
      log(`   Live rows: ${table.live_rows.toLocaleString()}`, colors.blue);
      log(`   Dead rows: ${table.dead_rows.toLocaleString()}`, colors.blue);
      
      const lastAnalyze = table.last_analyze || table.last_autoanalyze;
      if (lastAnalyze) {
        const analyzeAge = Math.floor((Date.now() - new Date(lastAnalyze).getTime()) / 1000 / 60);
        log(`   Last analyzed: ${analyzeAge} minutes ago`, colors.blue);
      } else {
        log(`   ⚠️  Never analyzed - run ANALYZE ${table.table_name}`, colors.yellow);
      }
      log('');
    });

    // Test query performance
    log('🚀 Testing Query Performance\n', colors.cyan);
    
    try {
      // Test 1: Active conversation lookup
      const start1 = Date.now();
      const result1 = await sql`
        EXPLAIN ANALYZE
        SELECT * FROM conversation_states
        WHERE is_active = true
        AND expires_at > NOW()
        LIMIT 10
      `.catch(() => null);
      const duration1 = Date.now() - start1;

      log(`Query 1: Active conversations (${duration1}ms)`, colors.green);
      if (result1 && result1.length > 0) {
        const plan = result1.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
        if (plan.includes('Index Scan')) {
          log('   ✅ Using index scan', colors.green);
        } else if (plan.includes('Seq Scan')) {
          log('   ⚠️  Using sequential scan (index not being used)', colors.yellow);
        }
      }

      // Test 2: Message history
      const start2 = Date.now();
      const result2 = await sql`
        EXPLAIN ANALYZE
        SELECT * FROM conversation_messages
        ORDER BY created_at DESC
        LIMIT 10
      `.catch(() => null);
      const duration2 = Date.now() - start2;

      log(`\nQuery 2: Recent messages (${duration2}ms)`, colors.green);
      if (result2 && result2.length > 0) {
        const plan = result2.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
        if (plan.includes('Index Scan')) {
          log('   ✅ Using index scan', colors.green);
        } else if (plan.includes('Seq Scan')) {
          log('   ⚠️  Using sequential scan (index not being used)', colors.yellow);
        }
      }
    } catch (error) {
      log('⚠️  Could not test query performance', colors.yellow);
    }

    // Recommendations
    log('\n💡 Recommendations\n', colors.cyan);
    log('1. If indexes show 0 scans, run: ANALYZE conversation_states; ANALYZE conversation_messages;', colors.blue);
    log('2. Monitor index usage over 24 hours to confirm they are being used', colors.blue);
    log('3. Check /api/admin/migration-health for application-level metrics', colors.blue);
    log('4. Enable DB_COMPOSITE_INDEXES feature flag if performance looks good', colors.blue);

  } catch (error) {
    log('\n❌ Error checking index usage', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
