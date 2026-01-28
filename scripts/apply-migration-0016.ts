// Script to run SQL migration manually
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function runMigration() {
  try {
    console.log("📦 Reading migration file...");
    const migrationPath = join(
      process.cwd(),
      "drizzle",
      "migrations",
      "0016_schema_optimizations.sql",
    );
    const migrationSQL = readFileSync(migrationPath, "utf8");

    // Remove comments and split by semicolons
    const lines = migrationSQL.split("\n");
    const statements: string[] = [];
    let currentStatement = "";

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comment lines and statement breakpoints
      if (trimmed.startsWith("--")) continue;
      if (trimmed.includes("--> statement-breakpoint")) continue;

      currentStatement += line + "\n";

      // If line ends with semicolon, we have a complete statement
      if (trimmed.endsWith(";")) {
        const stmt = currentStatement.trim();
        if (stmt) statements.push(stmt);
        currentStatement = "";
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`🚀 Executing ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.replace(/\s+/g, " ").substring(0, 100);
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);
      try {
        await sql.unsafe(statement);
        console.log(`   ✓ Success`);
      } catch (error: any) {
        // Ignore "already exists" errors for CONCURRENTLY indexes
        if (error.message && error.message.includes("already exists")) {
          console.log(`   ⚠️  Already exists (skipped)`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
