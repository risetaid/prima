// Script to apply AI metadata migration safely
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyAIMigration() {
  try {
    console.log('🚀 Applying AI metadata migration...\n');

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'migrations', 'add-ai-metadata-fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n⏳ Executing migration...\n');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Verifying changes...\n');

    // Verify the columns were added
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'conversation_messages'
      AND column_name IN ('llm_response_id', 'llm_model', 'llm_tokens_used', 'llm_response_time_ms', 'llm_cost')
      ORDER BY column_name;
    `);

    console.log('New AI metadata columns:');
    console.table(result.rows);

    console.log('\n✅ All AI metadata fields are now available!');
    console.log('🎉 Phase 1 database migration complete.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
applyAIMigration();
