#!/usr/bin/env bun

/**
 * Add Missing Columns Script
 * Adds any missing columns to the database schema
 */

import postgres from "postgres";

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error("❌ No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });

async function addMissingColumns() {
  console.log("🔧 Adding missing database columns...");

  try {
    // Add last_login_at column to users table if it doesn't exist
    console.log("📝 Adding last_login_at column to users table...");
    await client.unsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;
    `);

    // Create index for last_login_at if it doesn't exist
    console.log("📝 Creating index for last_login_at...");
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS users_last_login_idx
      ON users USING btree (last_login_at);
    `);

    // Add deleted_at column to users table if it doesn't exist
    console.log("📝 Adding deleted_at column to users table...");
    await client.unsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
    `);

    // Create index for deleted_at if it doesn't exist
    console.log("📝 Creating index for deleted_at...");
    await client.unsafe(`
      CREATE INDEX IF NOT EXISTS users_deleted_at_idx
      ON users USING btree (deleted_at);
    `);

    console.log("✅ All missing columns added successfully!");
    console.log("🔄 You can now run the setup-first-user script");
  } catch (error) {
    console.error("❌ Error adding missing columns:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if we should run
const shouldRun =
  process.argv.includes("--confirm") || process.argv.includes("-y");

if (!shouldRun) {
  console.log("🚨 This will add missing columns to the database");
  console.log("📝 Columns to add:");
  console.log("  - users.last_login_at");
  console.log("  - users.deleted_at");
  console.log("");
  console.log("Run with --confirm or -y to proceed");
  process.exit(0);
}

addMissingColumns();
