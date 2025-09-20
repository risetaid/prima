#!/usr/bin/env bun

/**
 * Setup First User Script
 * Sets up the first user (davidyusaku13@gmail.com) with Developer role and approval
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { logger } from "@/lib/logger";

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  logger.error("❌ No DATABASE_URL or DIRECT_URL found in environment");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function setupFirstUser() {
  logger.info("🔧 Setting up first user: davidyusaku13@gmail.com");

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "davidyusaku13@gmail.com"))
      .limit(1);

    if (existingUser.length === 0) {
      logger.info("❌ User davidyusaku13@gmail.com not found in database");
      logger.info("💡 Please log in first to create the user record");
      process.exit(1);
    }

    const user = existingUser[0];
    logger.info(`📧 Found user: ${user.email} (ID: ${user.id})`);
    logger.info(`🎭 Current role: ${user.role}`);
    logger.info(`✅ Currently approved: ${user.isApproved}`);

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

    logger.info("✅ User updated successfully!");
    logger.info("🎭 New role: ADMIN");
    logger.info("✅ Approved: true");
    logger.info("🎉 First user setup complete!");

    // Verify the update
    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "davidyusaku13@gmail.com"))
      .limit(1);

    if (updatedUser.length > 0) {
      const finalUser = updatedUser[0];
      logger.info("\n🔍 Verification:");
      logger.info(`Role: ${finalUser.role}`);
      logger.info(`Approved: ${finalUser.isApproved}`);
      logger.info(`Approved At: ${finalUser.approvedAt}`);
    }
  } catch (error) {
    logger.error("❌ Error setting up first user:", error as Error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Check if we should run
const shouldRun =
  process.argv.includes("--confirm") || process.argv.includes("-y");

if (!shouldRun) {
  logger.info("🚨 This will set up the first user with Developer role");
  logger.info("📧 Target user: davidyusaku13@gmail.com");
  logger.info("🎭 Role: DEVELOPER");
  logger.info("✅ Approved: true");
  logger.info("");
  logger.info("Run with --confirm or -y to proceed");
  process.exit(0);
}

setupFirstUser();
