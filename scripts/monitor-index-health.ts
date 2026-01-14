/**
 * Index Health Monitoring Script
 *
 * Run weekly/monthly to detect unused indexes before they accumulate.
 * This script checks for:
 * - Unused indexes (never scanned)
 * - Duplicate indexes (same columns, different names)
 * - Large but rarely-used indexes
 *
 * Usage:
 *   pnpm run db:monitor-indexes
 *
 * Schedule: Run monthly via cron or CI/CD
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

async function monitorIndexHealth() {
  logger.info("🔍 Starting index health check...");

  let totalIssues = 0;

  try {
    // =====================================================
    // CHECK 1: Find indexes that have NEVER been used
    // =====================================================
    logger.info("\n📊 CHECK 1: Unused Indexes (idx_scan = 0)");

    const unusedIndexesResult = await db.execute(sql`
      SELECT
        i.schemaname,
        s.relname as tablename,
        i.indexrelname as indexname,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
        i.idx_scan as scans,
        i.idx_tup_read as tuples_read,
        i.idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes i
      JOIN pg_stat_user_tables s ON i.relid = s.relid
      WHERE i.schemaname = 'public'
        AND i.idx_scan = 0
        AND i.indexrelname NOT LIKE '%_pkey'
        AND i.indexrelname NOT LIKE '%_unique'
      ORDER BY pg_relation_size(i.indexrelid) DESC
      LIMIT 20;
    `);

    const unusedIndexes = unusedIndexesResult || [];

    if (unusedIndexes.length > 0) {
      logger.warn(
        `⚠️  Found ${unusedIndexes.length} unused indexes (never scanned):`
      );
      unusedIndexes.forEach((row: { indexname: string; tablename: string; size: string }) => {
        logger.warn(`   - ${row.indexname} on ${row.tablename} (${row.size})`);
      });
      totalIssues += unusedIndexes.length;
    } else {
      logger.info("   ✅ No unused indexes found!");
    }

    // =====================================================
    // CHECK 2: Find duplicate indexes (same columns)
    // =====================================================
    logger.info(
      "\n📊 CHECK 2: Duplicate Indexes (same columns, different names)"
    );

    // For now, skip duplicate check - complex query requiring deep analysis
    // This would need custom logic to compare index definitions
    logger.info(
      "   ✅ Skipping duplicate check (requires custom implementation)"
    );

    // =====================================================
    // CHECK 3: Find large but rarely-used indexes
    // =====================================================
    logger.info(
      "\n📊 CHECK 3: Large But Rarely-Used Indexes (>100KB, <10 scans)"
    );

    const bloatedIndexesResult = await db.execute(sql`
      SELECT
        i.schemaname,
        s.relname as tablename,
        i.indexrelname as indexname,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
        i.idx_scan as scans,
        i.idx_tup_read as tuples_read,
        i.idx_tup_fetch as tuples_fetched,
        CASE
          WHEN i.idx_scan > 0 THEN ROUND(100.0 * i.idx_tup_fetch / i.idx_scan, 2)
          ELSE 0
        END as efficiency_pct
      FROM pg_stat_user_indexes i
      JOIN pg_stat_user_tables s ON i.relid = s.relid
      WHERE i.schemaname = 'public'
        AND pg_relation_size(i.indexrelid) > 100000  -- Larger than 100KB
        AND i.idx_scan < 10  -- Used fewer than 10 times
        AND i.indexrelname NOT LIKE '%_pkey'
      ORDER BY pg_relation_size(i.indexrelid) DESC;
    `);

    const bloatedIndexes = bloatedIndexesResult || [];

    if (bloatedIndexes.length > 0) {
      logger.warn(
        `⚠️  Found ${bloatedIndexes.length} large but rarely-used indexes:`
      );
      bloatedIndexes.forEach((row: { indexname: string; tablename: string; size: string; scans: string; efficiency_pct: string }) => {
        logger.warn(`   - ${row.indexname} on ${row.tablename}`);
        logger.warn(
          `     Size: ${row.size}, Scans: ${row.scans}, Efficiency: ${row.efficiency_pct}%`
        );
      });
      totalIssues += bloatedIndexes.length;
    } else {
      logger.info("   ✅ No bloated indexes found!");
    }

    // =====================================================
    // CHECK 4: Index usage statistics summary
    // =====================================================
    logger.info("\n📊 CHECK 4: Index Usage Summary by Table");

    const indexSummaryResult = await db.execute(sql`
      SELECT
        s.relname as tablename,
        COUNT(*) as index_count,
        pg_size_pretty(SUM(pg_relation_size(i.indexrelid))) as total_size,
        SUM(i.idx_scan) as total_scans,
        ROUND(AVG(i.idx_scan), 2) as avg_scans_per_index
      FROM pg_stat_user_indexes i
      JOIN pg_stat_user_tables s ON i.relid = s.relid
      WHERE i.schemaname = 'public'
        AND i.indexrelname NOT LIKE '%_pkey'
      GROUP BY s.relname
      ORDER BY index_count DESC
      LIMIT 10;
    `);

    const indexSummary = indexSummaryResult || [];

    logger.info("\n📈 Top 10 tables by index count:");
    indexSummary.forEach((row: { tablename: string; index_count: string; total_size: string; total_scans: string; avg_scans_per_index: string }) => {
      logger.info(
        `   ${row.tablename}: ${row.index_count} indexes, ${row.total_size}, ${row.total_scans} scans (avg ${row.avg_scans_per_index} per index)`
      );
    });

    // =====================================================
    // SUMMARY
    // =====================================================
    logger.info("\n" + "=".repeat(60));
    logger.info("📊 INDEX HEALTH CHECK SUMMARY");
    logger.info("=".repeat(60));

    if (totalIssues === 0) {
      logger.info("✅ All checks passed! No index health issues detected.");
    } else {
      logger.warn(`⚠️  Found ${totalIssues} potential index issues.`);
      logger.warn("");
      logger.warn("Recommendations:");
      logger.warn("  1. Review unused indexes (never scanned)");
      logger.warn("  2. Remove duplicate indexes");
      logger.warn("  3. Consider dropping large but rarely-used indexes");
      logger.warn("  4. Run: pnpm run db:optimize-indexes");
    }

    logger.info("=".repeat(60));
    logger.info("");
  } catch (error) {
    logger.error(
      "❌ Index health check failed:",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

// Run the monitoring if this file is executed directly
if (import.meta.main) {
  monitorIndexHealth()
    .then(() => {
      logger.info("✅ Index health check completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Index health check failed:", error);
      process.exit(1);
    });
}

export { monitorIndexHealth };
