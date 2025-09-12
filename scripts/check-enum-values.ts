#!/usr/bin/env bun

/**
 * Check Enum Values Script
 * Checks what values exist in the user_role enum in the database
 */

import postgres from "postgres";

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error("❌ No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });

async function checkEnumValues() {
  console.log("🔍 Checking user_role enum values in database...");

  try {
    // Check what enum values exist
    console.log("📋 Current enum values:");
    const enumResult = await client.unsafe(`
      SELECT unnest(enum_range(NULL::user_role)) as enum_value;
    `);

    console.log("Current enum values:");
    enumResult.forEach((row: any) => {
      console.log(`  - ${row.enum_value}`);
    });

    // Check if the new values are there
    const hasDeveloper = enumResult.some(
      (row: any) => row.enum_value === "DEVELOPER"
    );
    const hasAdmin = enumResult.some((row: any) => row.enum_value === "ADMIN");
    const hasRelawan = enumResult.some(
      (row: any) => row.enum_value === "RELAWAN"
    );

    console.log("\n✅ Status:");
    console.log(`  DEVELOPER: ${hasDeveloper ? "✅" : "❌"}`);
    console.log(`  ADMIN: ${hasAdmin ? "✅" : "❌"}`);
    console.log(`  RELAWAN: ${hasRelawan ? "✅" : "❌"}`);

    if (!hasDeveloper || !hasAdmin || !hasRelawan) {
      console.log("\n❌ Enum values are incorrect. Need to recreate database.");
      console.log("💡 Run: bun run nuke-recreate-db");
    } else {
      console.log("\n✅ Enum values are correct!");
    }
  } catch (error) {
    console.error("❌ Error checking enum values:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkEnumValues();
