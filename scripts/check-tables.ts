import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function listTables() {
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('Tables in database:');
    console.log(result);
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

listTables();