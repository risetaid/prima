import { db } from "../src/db/index";
import { sql } from "drizzle-orm";
import { logger } from "../src/lib/logger";

async function listTables() {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    logger.info("Tables in database:");
    logger.info("Result:", { result });
  } catch (error) {
    logger.error(
      "Error listing tables:",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

listTables();
