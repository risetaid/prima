import { db } from "../src/db/index";
import { sql } from "drizzle-orm";
import { logger } from "../src/lib/logger";

async function checkEnums() {
  try {
    const result = await db.execute(sql`
      SELECT t.typname as enum_name, string_agg(e.enumlabel, ', ') as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typtype = 'e'
      GROUP BY t.typname
      ORDER BY t.typname;
    `);

    logger.info("Enums in database:");
    logger.info("Result:", { result });
  } catch (error) {
    logger.error(
      "Error checking enums:",
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

checkEnums();
