#!/usr/bin/env bun

/**
 * 🚨 EXTREME DANGER ZONE 🚨
 *
 * COMPLETE DATABASE DROP & RECREATE SCRIPT
 * This script will PERMANENTLY DELETE ALL TABLES and DATA from your database
 * Then recreate the entire schema from migrations
 *
 * Use with EXTREME caution - this action cannot be undone!
 *
 * Run with: bun run scripts/nuke-recreate-database.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error("❌ No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function dropAllTables() {
  console.log("🗑️  Dropping all tables and types...");

  try {
    // Drop tables in reverse dependency order
    const dropQueries = [
      // Drop foreign key constraints first
      `ALTER TABLE IF EXISTS reminder_content_attachments DROP CONSTRAINT IF EXISTS reminder_content_attachments_reminder_schedule_id_fkey;`,
      `ALTER TABLE IF EXISTS conversation_states DROP CONSTRAINT IF EXISTS conversation_states_patient_id_fkey;`,
      `ALTER TABLE IF EXISTS conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_conversation_state_id_fkey;`,

      // Drop tables (child tables first)
      `DROP TABLE IF EXISTS reminder_content_attachments CASCADE;`,
      `DROP TABLE IF EXISTS reminder_logs CASCADE;`,
      `DROP TABLE IF EXISTS manual_confirmations CASCADE;`,
      `DROP TABLE IF EXISTS reminder_schedules CASCADE;`,
      `DROP TABLE IF EXISTS conversation_messages CASCADE;`,
      `DROP TABLE IF EXISTS conversation_states CASCADE;`,
      `DROP TABLE IF EXISTS verification_logs CASCADE;`,
      `DROP TABLE IF EXISTS patient_variables CASCADE;`,
      `DROP TABLE IF EXISTS health_notes CASCADE;`,
      `DROP TABLE IF EXISTS medical_records CASCADE;`,

      `DROP TABLE IF EXISTS cms_articles CASCADE;`,
      `DROP TABLE IF EXISTS cms_videos CASCADE;`,
      `DROP TABLE IF EXISTS whatsapp_templates CASCADE;`,
      `DROP TABLE IF EXISTS patients CASCADE;`,
      `DROP TABLE IF EXISTS users CASCADE;`,

      // Drop enum types
      `DROP TYPE IF EXISTS user_role CASCADE;`,
      `DROP TYPE IF EXISTS cancer_stage CASCADE;`,
      `DROP TYPE IF EXISTS medical_record_type CASCADE;`,
      `DROP TYPE IF EXISTS frequency CASCADE;`,
      `DROP TYPE IF EXISTS reminder_status CASCADE;`,
      `DROP TYPE IF EXISTS confirmation_status CASCADE;`,
      `DROP TYPE IF EXISTS patient_condition CASCADE;`,
      `DROP TYPE IF EXISTS template_category CASCADE;`,
      `DROP TYPE IF EXISTS verification_status CASCADE;`,
      `DROP TYPE IF EXISTS content_category CASCADE;`,
      `DROP TYPE IF EXISTS content_status CASCADE;`,

      // Drop drizzle migration tracking
      `DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;`,
      `DROP SCHEMA IF EXISTS drizzle CASCADE;`,
    ];

    for (const query of dropQueries) {
      try {
        await client.unsafe(query);
      } catch (error) {
        console.warn(`⚠️  Warning during drop: ${error}`);
        // Continue with other drops
      }
    }

    console.log("✅ All tables and types dropped successfully");
  } catch (error) {
    console.error("❌ Error dropping tables:", error);
    throw error;
  }
}

async function recreateSchema() {
  console.log("🔨 Recreating database schema from migrations...");

  try {
    // Get migration files
    const migrationsPath = join(process.cwd(), "drizzle", "migrations");
    const migrationFiles = readdirSync(migrationsPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (migrationFiles.length === 0) {
      throw new Error("No migration files found");
    }

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Run each migration file as a whole (to handle dollar-quoted strings properly)
    for (const migrationFile of migrationFiles) {
      const migrationPath = join(migrationsPath, migrationFile);
      const migrationSQL = readFileSync(migrationPath, "utf-8");

      console.log(`🚀 Running migration: ${migrationFile}`);

      try {
        // Execute the entire migration file as one statement
        // This handles dollar-quoted strings properly
        await client.unsafe(migrationSQL);
        console.log(`✅ Migration ${migrationFile} completed successfully`);
      } catch (error) {
        // Check if it's an expected error we can skip
        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          // Skip "already exists" errors
          if (
            errorMsg.includes("already exists") ||
            errorMsg.includes("duplicate") ||
            errorMsg.includes("does not exist, skipping")
          ) {
            console.log(
              `⚠️  Skipping expected error in ${migrationFile}: ${errorMsg}`
            );
            continue;
          }

          // Skip constraint errors for non-existent constraints
          if (errorMsg.includes("does not exist")) {
            console.log(
              `⚠️  Skipping non-existent constraint in ${migrationFile}`
            );
            continue;
          }
        }

        // If it's not an expected error, re-throw it
        console.error(`❌ Error in migration ${migrationFile}:`, error);
        throw error;
      }
    }

    console.log("✅ Schema recreated successfully");
  } catch (error) {
    console.error("❌ Error recreating schema:", error);
    throw error;
  }
}

async function nukeAndRecreateDatabase() {
  console.log("🚨 STARTING COMPLETE DATABASE DROP & RECREATE 🚨");
  console.log("💀 This will DELETE ALL TABLES AND DATA permanently!");
  console.log("🔄 Then recreate the entire schema with new role names");
  console.log("⏳ Starting process...\n");

  try {
    // Step 1: Drop everything
    await dropAllTables();

    // Step 2: Recreate schema
    await recreateSchema();

    console.log("\n🎉 DATABASE RECREATION COMPLETE!");
    console.log("✅ All tables dropped and recreated with new schema");
    console.log("📝 New role enum: DEVELOPER, ADMIN, RELAWAN");
    console.log("💡 You can now run seed scripts to populate data");
  } catch (error) {
    console.error("❌ Error during database recreation:", error);
    console.error("💡 You may need to manually recreate the database");
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Enhanced confirmation prompt
console.log("🚨 EXTREME DANGER: This will DROP ALL TABLES AND DATA!");
console.log("💀 This action CANNOT be undone!");
console.log("🔄 Database will be recreated with new role names");
console.log("");
console.log("New role enum will be: DEVELOPER, ADMIN, RELAWAN");
console.log("");
console.log('Type "NUKE_AND_RECREATE" to confirm:');

process.stdin.once("data", async (data) => {
  const input = data.toString().trim();

  if (input === "NUKE_AND_RECREATE") {
    console.log(
      "✅ Confirmation received. Proceeding with database drop & recreate...\n"
    );
    await nukeAndRecreateDatabase();
    process.exit(0);
  } else {
    console.log("❌ Operation cancelled. No changes were made.");
    process.exit(0);
  }
});
