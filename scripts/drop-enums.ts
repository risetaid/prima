import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

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
    
    console.log('Dropping enums:', enums);
    
    // Drop each enum
    for (const enumName of enums) {
      try {
        await db.execute(sql`DROP TYPE IF EXISTS ${sql.identifier(enumName)} CASCADE;`);
        console.log(`Dropped enum: ${enumName}`);
      } catch (error) {
        console.error(`Error dropping enum ${enumName}:`, error);
      }
    }
    
    console.log('All enums dropped successfully');
  } catch (error) {
    console.error('Error dropping enums:', error);
  }
}

dropAllEnums();