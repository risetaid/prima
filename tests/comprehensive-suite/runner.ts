/**
 * Main Test Runner
 * Executes all comprehensive tests and generates reports
 */

import { mkdirSync } from "fs";
import { join } from "path";
import { TestSuiteReport, TestCategoryResult, TestResult, LoadTestResult } from "./types";
import { TestReporter } from "./reporter";
import { CLIReporter } from "./cli-reporter";
import { AuthTests } from "./auth.test";
import { ReminderTests } from "./reminder.test";
import { WhatsAppTests } from "./whatsapp.test";
import { ContentTests } from "./content.test";
import { LoadTests } from "./load.test";

export class ComprehensiveTestRunner {
  private reporter = new TestReporter();
  private cliReporter = new CLIReporter();
  private responseTimeResults: Array<{ endpoint: string; avg: string; min: string; max: string }> = [];

  /**
   * Run all comprehensive tests
   */
  async runAll() {
    const baseURL =
      process.env.TEST_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000";
    const isProduction = !baseURL.includes("localhost");

    console.log("═══════════════════════════════════════════════════════");
    console.log("    PRIMA COMPREHENSIVE TEST SUITE");
    console.log("    Testing: Auth, Reminders, WhatsApp, Content, Load");
    console.log("═══════════════════════════════════════════════════════");
    console.log(
      `\n🌐 Target Environment: ${
        isProduction ? "🚀 Production (Railway)" : "💻 Local Development"
      }`
    );
    console.log(`📍 Base URL: ${baseURL}\n`);

    if (isProduction) {
      console.log("⚠️  WARNING: Testing production environment!");
      console.log("   - Tests will run against live data");
      console.log("   - Some tests may create temporary test records");
      console.log("   - Load tests will stress production server\n");
    }

    const startTime = Date.now();

    // Run all test categories
    const authTests = new AuthTests();
    const reminderTests = new ReminderTests();
    const whatsappTests = new WhatsAppTests();
    const contentTests = new ContentTests();
    const loadTests = new LoadTests();

    // Execute tests sequentially to avoid overwhelming the system
    const authResults = await authTests.runAll();
    const reminderResults = await reminderTests.runAll();
    const whatsappResults = await whatsappTests.runAll();
    const contentResults = await contentTests.runAll();

    console.log("\n" + "═".repeat(55));
    console.log("  Starting Load & Performance Tests");
    console.log("═".repeat(55));

    const loadResults = await loadTests.runAll();

    // Response time analysis and save results
    console.log("\n" + "═".repeat(55));
    this.responseTimeResults = await loadTests.analyzeResponseTimes();

    const duration = Date.now() - startTime;

    // Compile results
    const report: TestSuiteReport = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      categories: {
        auth: this.compileCategory(authResults),
        reminder: this.compileCategory(reminderResults),
        whatsapp: this.compileCategory(whatsappResults),
        content: this.compileCategory(contentResults),
        load: {
          concurrent10: loadResults.concurrent10,
          concurrent25: loadResults.concurrent25,
          concurrent50: loadResults.concurrent50,
          stress100: loadResults.stress100,
        },
      },
    };

    // Calculate totals
    Object.values(report.categories).forEach((category) => {
      if (typeof category === "object" && "total" in category) {
        const cat = category as { total: number; passed: number; failed: number };
        report.totalTests += cat.total;
        report.passed += cat.passed;
        report.failed += cat.failed;
      }
    });

    // Generate and save reports
    console.log("\n" + "═".repeat(55));
    console.log("  Generating Reports...");
    console.log("═".repeat(55));

    await this.saveReports(report);

    // Print summary to console
    this.printConsoleSummary(report);

    return report;
  }

  /**
   * Compile test results into category result
   */
  private compileCategory(results: TestResult[]): TestCategoryResult {
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const duration = results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total: results.length,
      passed,
      failed,
      duration,
      tests: results,
    };
  }

  /**
   * Save reports to disk
   */
  private async saveReports(report: TestSuiteReport) {
    // Create results directory
    const resultsDir = join(process.cwd(), "test-results");
    try {
      mkdirSync(resultsDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    // Save reports
    const paths = await this.reporter.saveReports(report, resultsDir);

    return paths;
  }

  /**
   * Print console summary - Tabular Format
   */
  private printConsoleSummary(report: TestSuiteReport) {
    // Use the new CLI Reporter for tabular output with response time data
    this.cliReporter.printStructuredReport(report, this.responseTimeResults);
  }

  /**
   * Run specific test category
   */
  async runCategory(
    category: "auth" | "reminder" | "whatsapp" | "content" | "load"
  ) {
    const baseURL =
      process.env.TEST_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000";
    const isProduction = !baseURL.includes("localhost");

    console.log("═══════════════════════════════════════════════════════");
    console.log(`    PRIMA ${category.toUpperCase()} TEST SUITE`);
    console.log("═══════════════════════════════════════════════════════");
    console.log(`\n🌐 Target: ${isProduction ? "🚀 Production" : "💻 Local"}`);
    console.log(`📍 URL: ${baseURL}\n`);

    const startTime = Date.now();
    let results: TestResult[] | null = null;
    let loadResults: { concurrent10?: LoadTestResult; concurrent25?: LoadTestResult; concurrent50?: LoadTestResult; stress100?: LoadTestResult } | null = null;

    switch (category) {
      case "auth":
        results = await new AuthTests().runAll();
        break;
      case "reminder":
        results = await new ReminderTests().runAll();
        break;
      case "whatsapp":
        results = await new WhatsAppTests().runAll();
        break;
      case "content":
        results = await new ContentTests().runAll();
        break;
      case "load":
        const loadTests = new LoadTests();
        loadResults = await loadTests.runAll();
        this.responseTimeResults = await loadTests.analyzeResponseTimes();
        break;
    }

    const duration = Date.now() - startTime;

    // Print category summary
    this.printCategorySummary(category, results, loadResults, duration);

    return results || loadResults;
  }

  /**
   * Print summary for single category test
   */
  private printCategorySummary(
    category: string,
    results: TestResult[] | null,
    loadResults: { concurrent10?: LoadTestResult; concurrent25?: LoadTestResult; concurrent50?: LoadTestResult; stress100?: LoadTestResult } | null,
    duration: number
  ) {
    console.log("\n" + "═".repeat(55));
    console.log("  TEST RESULTS SUMMARY");
    console.log("═".repeat(55));

    if (category === "load" && loadResults) {
      // Load test summary
      console.log(`\n🔥 Load Testing Results:\n`);

      const scenarios = [
        { name: "10 Users", data: loadResults.concurrent10 },
        { name: "25 Users", data: loadResults.concurrent25 },
        { name: "50 Users", data: loadResults.concurrent50 },
        { name: "100 Users (Stress)", data: loadResults.stress100 },
      ];

      scenarios.forEach(({ name, data }) => {
        if (data) {
          const icon =
            data.metrics.successRate >= 0.95
              ? "✅"
              : data.metrics.successRate >= 0.8
              ? "⚠️"
              : "❌";
          console.log(
            `   ${icon} ${name.padEnd(20)} Success: ${(
              data.metrics.successRate * 100
            ).toFixed(1)}%  Avg: ${data.metrics.averageResponseTime.toFixed(
              0
            )}ms`
          );
        }
      });

      if (this.responseTimeResults.length > 0) {
        console.log(`\n📊 Response Time Analysis:\n`);
        this.responseTimeResults.forEach((r) => {
          const avgNum = parseInt(r.avg);
          const icon = avgNum < 200 ? "✅" : avgNum < 500 ? "⚠️" : "❌";
          console.log(
            `   ${icon} ${r.endpoint.padEnd(22)} Avg: ${r.avg}ms  Min: ${
              r.min
            }ms  Max: ${r.max}ms`
          );
        });
      }
    } else if (results && Array.isArray(results)) {
      // Regular test summary
      const passed = results.filter((r) => r.status === "passed").length;
      const failed = results.filter((r) => r.status === "failed").length;
      const total = results.length;
      const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";

      const statusIcon = failed === 0 ? "✅" : "❌";
      const statusText =
        failed === 0 ? "ALL TESTS PASSED" : `${failed} TESTS FAILED`;

      console.log(`\n   ${statusIcon} ${statusText}`);
      console.log(
        `\n   📊 Results: ${passed}/${total} passed (${successRate}%)`
      );
      console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s\n`);

      // Show passed tests
      const passedTests = results.filter((r) => r.status === "passed");
      if (passedTests.length > 0) {
        console.log("   ✅ Passed Tests:");
        passedTests.forEach((t) => {
          const endpoint = t.details?.endpoint
            ? ` (${t.details.method || "GET"} ${t.details.endpoint})`
            : "";
          console.log(
            `      • ${t.name}${endpoint} - ${t.duration.toFixed(0)}ms`
          );
        });
      }

      // Show failed tests with errors
      const failedTests = results.filter((r) => r.status === "failed");
      if (failedTests.length > 0) {
        console.log("\n   ❌ Failed Tests:");
        failedTests.forEach((t) => {
          console.log(`      • ${t.name}`);
          if (t.error) {
            console.log(`        Error: ${t.error}`);
          }
        });
      }
    }

    console.log("\n" + "═".repeat(55));
    console.log(`  Completed in ${(duration / 1000).toFixed(2)} seconds`);
    console.log("═".repeat(55) + "\n");
  }
}

// Export for use in other scripts
export {
  TestReporter,
  AuthTests,
  ReminderTests,
  WhatsAppTests,
  ContentTests,
  LoadTests,
};
