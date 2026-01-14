#!/usr/bin/env bun
/**
 * Analyze database tables to update query planner statistics
 * Usage: pnpm scripts/analyze-tables.ts
 *
 * Run this after creating indexes to help PostgreSQL use them
 */

import postgres from "postgres";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log("\n=== Analyzing Database Tables ===\n", colors.cyan);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log("❌ DATABASE_URL not found!", colors.red);
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: databaseUrl.includes("railway") ? "require" : false,
  });

  try {
    const tables = ["conversation_states", "conversation_messages"];

    for (const table of tables) {
      log(`📊 Analyzing ${table}...`, colors.cyan);
      const start = Date.now();

      await sql.unsafe(`ANALYZE ${table}`);

      const duration = Date.now() - start;
      log(`✅ ${table} analyzed in ${duration}ms`, colors.green);
    }

    log("\n✨ Analysis complete!", colors.green);
    log("\n💡 This updates PostgreSQL query planner statistics.", colors.cyan);
    log(
      "   Indexes should now be considered by the query planner.",
      colors.cyan
    );
    log(
      "\n📊 Check index usage: pnpm scripts/check-index-usage.ts",
      colors.cyan
    );
  } catch (error) {
    log("\n❌ Analysis failed!", colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
