import { db } from "../src/db";
import { sql } from "drizzle-orm";
import { logger } from "../src/lib/logger";

async function dropAllTables() {
  logger.info("🗑️  Dropping all existing tables...");

  try {
    // Get all table names
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'information_schema%'
    `);

    const tableNames = tables.map((row: any) => row.tablename);

    if (tableNames.length === 0) {
      logger.info("✅ No tables to drop");
      return;
    }

    logger.info(`Found ${tableNames.length} tables to drop:`, { tableNames });

    // Drop all tables in correct order (handle foreign key constraints)
    for (const tableName of tableNames) {
      try {
        await db.execute(
          sql`DROP TABLE IF EXISTS ${sql.raw(tableName)} CASCADE`
        );
        logger.info(`✅ Dropped table: ${tableName}`);
      } catch (error) {
        logger.error(`❌ Failed to drop table ${tableName}:`, error as Error);
      }
    }

    logger.info("🎉 All tables dropped successfully!");
  } catch (error) {
    logger.error("❌ Error dropping tables:", error as Error);
    throw error;
  }
}

// Execute the function
dropAllTables()
  .then(() => {
    logger.info("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("❌ Script failed:", error);
    process.exit(1);
  });
