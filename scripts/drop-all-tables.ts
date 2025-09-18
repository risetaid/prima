import { db } from '../src/db'
import { sql } from 'drizzle-orm'

async function dropAllTables() {
  console.log('🗑️  Dropping all existing tables...')
  
  try {
    // Get all table names
    const tables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'information_schema%'
    `)
    
    const tableNames = tables.map((row: any) => row.tablename)
    
    if (tableNames.length === 0) {
      console.log('✅ No tables to drop')
      return
    }
    
    console.log(`Found ${tableNames.length} tables to drop:`, tableNames)
    
    // Drop all tables in correct order (handle foreign key constraints)
    for (const tableName of tableNames) {
      try {
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.raw(tableName)} CASCADE`)
        console.log(`✅ Dropped table: ${tableName}`)
      } catch (error) {
        console.error(`❌ Failed to drop table ${tableName}:`, error)
      }
    }
    
    console.log('🎉 All tables dropped successfully!')
    
  } catch (error) {
    console.error('❌ Error dropping tables:', error)
    throw error
  }
}

// Execute the function
dropAllTables()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })