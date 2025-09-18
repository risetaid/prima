import { execSync } from "child_process";
import fs from "fs";

console.log("🗑️  Dropping all existing tables...");

// Read the SQL file
const sql = fs.readFileSync("drop-all-tables.sql", "utf8");

// Execute the SQL using psql
try {
  execSync(
    `psql "${process.env.DATABASE_URL}" -c "${sql.replace(/"/g, '\\"')}"`,
    {
      stdio: "inherit",
    }
  );
  console.log("✅ All tables dropped successfully");
} catch (error) {
  console.error("❌ Failed to drop tables:", error.message);
  process.exit(1);
}

console.log("🚀 Running clean migration...");

// Run the migration
try {
  execSync("bun run db:migrate", { stdio: "inherit" });
  console.log("✅ Clean schema migration completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
}
