#!/usr/bin/env node
/**
 * CLI Entry Point for Comprehensive Tests
 * Run: pnpm run tests/comprehensive-suite/index.ts
 */

import { ComprehensiveTestRunner } from "./runner";

async function main() {
  const args = process.argv.slice(2);
  const runner = new ComprehensiveTestRunner();

  try {
    // Parse --url argument
    const urlIndex = args.indexOf("--url");
    if (urlIndex !== -1 && args[urlIndex + 1]) {
      process.env.TEST_BASE_URL = args[urlIndex + 1];
      console.log(`✓ Base URL set to: ${args[urlIndex + 1]}\n`);
    }

    if (args.length === 0 || (urlIndex !== -1 && args.length === 2)) {
      // Run all tests
      await runner.runAll();
    } else if (args[0] === "--category" && args[1]) {
      // Run specific category
      const category = args[1] as
        | "auth"
        | "reminder"
        | "whatsapp"
        | "content"
        | "load";
      await runner.runCategory(category);
    } else if (args[0] === "--help" || args[0] === "-h") {
      printHelp();
    } else {
      console.error("Invalid arguments. Use --help for usage information.");
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test execution failed:");
    console.error(error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
PRIMA Comprehensive Test Suite
===============================

Usage:
  pnpm run tests/comprehensive-suite/index.ts [options]

Options:
  (no args)                    Run all tests
  --category <name>           Run specific category only
  --url <url>                 Test against specific URL
  --help, -h                  Show this help message

Environment Variables:
  TEST_BASE_URL               Base URL for testing (e.g., https://prima.railway.app)
  NEXT_PUBLIC_API_URL         Alternative URL variable

Categories:
  auth                        Authentication tests
  reminder                    Reminder system tests
  whatsapp                    WhatsApp integration tests
  content                     Video & Article (berita) tests
  load                        Load & performance tests

Examples:
  # Test localhost
  pnpm run tests/comprehensive-suite/index.ts
  pnpm run tests/comprehensive-suite/index.ts --category auth
  
  # Test Railway deployment
  pnpm run tests/comprehensive-suite/index.ts --url https://prima.railway.app
  pnpm run tests/comprehensive-suite/index.ts --url https://prima.railway.app --category load

Output:
  Results are saved to test-results/ directory:
  - test-report-{timestamp}.html (for non-technical users)
  - test-report-{timestamp}.txt (plain text summary)
  - test-report-{timestamp}.json (for programmatic access)
`);
}

// Run main
main();
