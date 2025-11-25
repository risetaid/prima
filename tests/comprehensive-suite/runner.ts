/**
 * Main Test Runner
 * Executes all comprehensive tests and generates reports
 */

import { mkdirSync } from "fs";
import { join } from "path";
import { TestSuiteReport, TestCategoryResult } from "./types";
import { TestReporter } from "./reporter";
import { AuthTests } from "./auth.test";
import { ReminderTests } from "./reminder.test";
import { WhatsAppTests } from "./whatsapp.test";
import { ContentTests } from "./content.test";
import { LoadTests } from "./load.test";

export class ComprehensiveTestRunner {
  private reporter = new TestReporter();

  /**
   * Run all comprehensive tests
   */
  async runAll() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("    PRIMA COMPREHENSIVE TEST SUITE");
    console.log("    Testing: Auth, Reminders, WhatsApp, Content, Load");
    console.log("═══════════════════════════════════════════════════════\n");

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

    // Optional: Response time analysis
    console.log("\n" + "═".repeat(55));
    await loadTests.analyzeResponseTimes();

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
    Object.values(report.categories).forEach((category: any) => {
      if ("total" in category) {
        report.totalTests += category.total;
        report.passed += category.passed;
        report.failed += category.failed;
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
  private compileCategory(results: any[]): TestCategoryResult {
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
    } catch (error) {
      // Directory might already exist
    }

    // Save reports
    const paths = await this.reporter.saveReports(report, resultsDir);

    return paths;
  }

  /**
   * Print console summary
   */
  private printConsoleSummary(report: TestSuiteReport) {
    const passRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    const status =
      report.failed === 0 ? "✅ SEMUA TES BERHASIL" : "⚠️ ADA TES YANG GAGAL";

    console.log("\n" + "═".repeat(55));
    console.log("  RINGKASAN HASIL PENGUJIAN");
    console.log("═".repeat(55));
    console.log(`\nStatus: ${status}`);
    console.log(`\n📊 Total Tes: ${report.totalTests}`);
    console.log(`✅ Berhasil: ${report.passed} (${passRate}%)`);
    console.log(`❌ Gagal: ${report.failed}`);
    console.log(`⏱️  Durasi: ${(report.duration / 1000).toFixed(2)} detik\n`);

    // Category breakdown
    console.log("📋 Per Kategori:");
    console.log(
      `   🔐 Auth: ${report.categories.auth.passed}/${report.categories.auth.total}`
    );
    console.log(
      `   ⏰ Reminder: ${report.categories.reminder.passed}/${report.categories.reminder.total}`
    );
    console.log(
      `   💬 WhatsApp: ${report.categories.whatsapp.passed}/${report.categories.whatsapp.total}`
    );
    console.log(
      `   📺 Content: ${report.categories.content.passed}/${report.categories.content.total}`
    );

    // Load test summary
    console.log("\n🔥 Load Testing:");
    const load = report.categories.load;
    if (load.concurrent10) {
      console.log(
        `   10 Users: ${(load.concurrent10.metrics.successRate * 100).toFixed(
          1
        )}% success, ${load.concurrent10.metrics.averageResponseTime.toFixed(
          0
        )}ms avg`
      );
    }
    if (load.concurrent25) {
      console.log(
        `   25 Users: ${(load.concurrent25.metrics.successRate * 100).toFixed(
          1
        )}% success, ${load.concurrent25.metrics.averageResponseTime.toFixed(
          0
        )}ms avg`
      );
    }
    if (load.concurrent50) {
      console.log(
        `   50 Users: ${(load.concurrent50.metrics.successRate * 100).toFixed(
          1
        )}% success, ${load.concurrent50.metrics.averageResponseTime.toFixed(
          0
        )}ms avg`
      );
    }
    if (load.stress100) {
      console.log(
        `   100 Users (Stress): ${(
          load.stress100.metrics.successRate * 100
        ).toFixed(
          1
        )}% success, ${load.stress100.metrics.averageResponseTime.toFixed(
          0
        )}ms avg`
      );
    }

    // Recommendations
    const humanReadable = this.reporter.generateHumanReadableSummary(report);
    if (humanReadable.recommendations.length > 0) {
      console.log("\n💡 Rekomendasi:");
      humanReadable.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }

    console.log("\n" + "═".repeat(55));
    console.log("  Laporan lengkap tersimpan di folder test-results/");
    console.log("  Buka file HTML untuk tampilan yang lebih mudah dibaca");
    console.log("═".repeat(55) + "\n");
  }

  /**
   * Run specific test category
   */
  async runCategory(
    category: "auth" | "reminder" | "whatsapp" | "content" | "load"
  ) {
    console.log(`\nRunning ${category.toUpperCase()} tests only...\n`);

    let results;

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
        results = await loadTests.runAll();
        await loadTests.analyzeResponseTimes();
        break;
    }

    return results;
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
