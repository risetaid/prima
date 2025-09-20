import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import { logger } from '../src/lib/logger';

async function dropAllEnums() {
  try {
    // Get all enum types
    const enumsResult = await db.execute(sql`
      SELECT t.typname as enum_name
      FROM pg_type t
      WHERE t.typtype = 'e'
      ORDER BY t.typname;
    `);

    const enums = enumsResult.map((row: any) => row.enum_name as string);

    logger.info('Dropping enums:', { enums });

    // Drop each enum
    for (const enumName of enums) {
      try {
        await db.execute(sql`DROP TYPE IF EXISTS ${sql.identifier(enumName)} CASCADE;`);
        logger.info(`Dropped enum: ${enumName}`);
      } catch (error) {
        logger.error(`Error dropping enum ${enumName}:`, error as Error);
      }
    }

    logger.info('All enums dropped successfully');
  } catch (error) {
    logger.error('Error dropping enums:', error as Error);
  }
}

dropAllEnums();