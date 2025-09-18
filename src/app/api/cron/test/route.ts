import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { logger } from "@/lib/logger";
import { sql } from "drizzle-orm";

// Simple test endpoint to isolate cron issues
export async function GET() {
  try {
    logger.info("Testing cron endpoint components", { api: true, test: true });

    // Test 1: Environment variables
    const envCheck = {
      CRON_SECRET: process.env.CRON_SECRET ? "✅ Set" : "❌ Missing",
      FONNTE_TOKEN: process.env.FONNTE_TOKEN ? "✅ Set" : "❌ Missing",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
      NODE_ENV: process.env.NODE_ENV || "undefined",
    };

    // Test 2: Database connection
    let dbTest = "❌ Failed";
    try {
      const result = await db.execute(sql`SELECT 1 as test`);
      dbTest = result.length > 0 ? "✅ Connected" : "❌ No response";
    } catch (dbError) {
      dbTest = `❌ Error: ${
        dbError instanceof Error ? dbError.message : "Unknown"
      }`;
    }

    // Test 3: Simple table existence check
    let tableTest = "❌ Failed";
    try {
      // Check multiple core tables to verify schema
      const tableChecks = await Promise.all([
        db.execute(sql`SELECT COUNT(*) FROM patients LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) FROM reminders LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) FROM users LIMIT 1`),
        db.execute(sql`SELECT COUNT(*) FROM conversation_states LIMIT 1`)
      ]);
      
      const tableResults = [
        'patients: ✅',
        'reminders: ✅', 
        'users: ✅',
        'conversation_states: ✅'
      ];
      
      tableTest = `✅ Core tables accessible - ${tableResults.join(', ')}`;
    } catch (tableError) {
      tableTest = `❌ Table error: ${
        tableError instanceof Error ? tableError.message : "Unknown"
      }`;
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbTest,
      tables: tableTest,
      status: "Test completed",
    };

    logger.info("Cron test completed", {
      api: true,
      test: true,
      results: testResults,
    });

    return NextResponse.json(testResults);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error(
      "Cron test failed",
      error instanceof Error ? error : new Error(errorMessage),
      {
        api: true,
        test: true,
      }
    );

    return NextResponse.json(
      {
        error: "Test failed",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for testing with cron secret
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET environment variable is not set" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If auth passes, run the same test as GET
  return GET();
}

