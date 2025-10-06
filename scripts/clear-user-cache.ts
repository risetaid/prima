#!/usr/bin/env bun
/**
 * Clear user session cache by Clerk ID
 * Usage: bun scripts/clear-user-cache.ts <clerk_id>
 */

import { del, CACHE_KEYS } from "../src/lib/cache";

const clerkId = process.argv[2];

if (!clerkId) {
  console.error("Usage: bun scripts/clear-user-cache.ts <clerk_id>");
  process.exit(1);
}

async function clearCache() {
  try {
    console.log(`Clearing cache for Clerk ID: ${clerkId}`);

    const sessionKey = CACHE_KEYS.userSession(clerkId);
    const profileKey = CACHE_KEYS.userProfile(clerkId);

    await del(sessionKey);
    console.log(`✓ Cleared session cache: ${sessionKey}`);

    await del(profileKey);
    console.log(`✓ Cleared profile cache: ${profileKey}`);

    console.log("\n✅ Cache cleared successfully!");
    console.log("Please refresh your browser to see the changes.");
  } catch (error) {
    console.error("❌ Failed to clear cache:", error);
    process.exit(1);
  }
}

clearCache();
