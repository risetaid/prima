import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

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
    
    console.log('Enums in database:');
    console.log(result);
  } catch (error) {
    console.error('Error checking enums:', error);
  }
}

checkEnums();