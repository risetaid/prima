#!/usr/bin/env bun

/**
 * Setup First User Script
 * Sets up the first user (davidyusaku13@gmail.com) with Developer role and approval
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error("❌ No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function setupFirstUser() {
  console.log("🔧 Setting up first user: davidyusaku13@gmail.com");

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "davidyusaku13@gmail.com"))
      .limit(1);

    if (existingUser.length === 0) {
      console.log("❌ User davidyusaku13@gmail.com not found in database");
      console.log("💡 Please log in first to create the user record");
      process.exit(1);
    }

    const user = existingUser[0];
    console.log(`📧 Found user: ${user.email} (ID: ${user.id})`);
    console.log(`🎭 Current role: ${user.role}`);
    console.log(`✅ Currently approved: ${user.isApproved}`);

    // Update user to Admin role and approve them
    await db
      .update(schema.users)
      .set({
        role: "ADMIN",
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: user.id, // Self-approval for first user
        updatedAt: new Date(),
      })
      .where(eq(schema.users.email, "davidyusaku13@gmail.com"));

    console.log("✅ User updated successfully!");
    console.log("🎭 New role: ADMIN");
    console.log("✅ Approved: true");
    console.log("🎉 First user setup complete!");

    // Verify the update
    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "davidyusaku13@gmail.com"))
      .limit(1);

    if (updatedUser.length > 0) {
      const finalUser = updatedUser[0];
      console.log("\n🔍 Verification:");
      console.log(`Role: ${finalUser.role}`);
      console.log(`Approved: ${finalUser.isApproved}`);
      console.log(`Approved At: ${finalUser.approvedAt}`);
    }
  } catch (error) {
    console.error("❌ Error setting up first user:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if we should run
const shouldRun =
  process.argv.includes("--confirm") || process.argv.includes("-y");

if (!shouldRun) {
  console.log("🚨 This will set up the first user with Developer role");
  console.log("📧 Target user: davidyusaku13@gmail.com");
  console.log("🎭 Role: DEVELOPER");
  console.log("✅ Approved: true");
  console.log("");
  console.log("Run with --confirm or -y to proceed");
  process.exit(0);
}

setupFirstUser();
