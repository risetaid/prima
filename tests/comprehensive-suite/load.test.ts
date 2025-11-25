/**
 * Load Testing Suite
 * Tests system performance under various concurrent user loads
 */

import { LoadTestResult, PerformanceMetrics } from "./types";
import { TestUtils } from "./utils";

export class LoadTests {
  private client = TestUtils.createTestClient();

  /**
   * Run all load tests
   */
  async runAll() {
    console.log("\n🔥 Running Load Tests...");

    const results = {
      concurrent10: await this.runConcurrentTest(10, "Concurrent 10 Users"),
      concurrent25: await this.runConcurrentTest(25, "Concurrent 25 Users"),
      concurrent50: await this.runConcurrentTest(50, "Concurrent 50 Users"),
      stress100: await this.runStressTest(100, "Stress Test 100 Users"),
    };

    return results;
  }

  /**
   * Run concurrent user test
   */
  private async runConcurrentTest(
    userCount: number,
    testName: string
  ): Promise<LoadTestResult> {
    console.log(`\n  Running: ${testName}...`);
    const progress = TestUtils.createProgressLogger(
      userCount * 3,
      `  ${testName}`
    );

    const startTime = Date.now();
    const responseTimes: number[] = [];
    const errors: string[] = [];

    // Define test scenarios (mix of endpoints)
    const scenarios = [
      { name: "Health Check", method: "GET", path: "/api/health" },
      { name: "Dashboard Stats", method: "GET", path: "/api/dashboard/stats" },
      { name: "List Patients", method: "GET", path: "/api/patients" },
    ];

    // Simulate concurrent users
    const userPromises = Array(userCount)
      .fill(null)
      .map(async (_, userIndex) => {
        // Each user performs multiple actions
        for (const scenario of scenarios) {
          try {
            const { result, duration } = await TestUtils.measureTime(
              async () => {
                if (scenario.method === "GET") {
                  return await this.client.get(scenario.path);
                } else {
                  return await this.client.post(scenario.path, {});
                }
              }
            );

            responseTimes.push(duration);

            if (!result.ok && result.status !== 401 && result.status !== 403) {
              errors.push(`${scenario.name}: HTTP ${result.status}`);
            }
          } catch (error: any) {
            errors.push(`${scenario.name}: ${error.message}`);
          }

          progress.increment();
          await TestUtils.sleep(Math.random() * 100); // Random delay between requests
        }
      });

    await Promise.all(userPromises);

    const duration = Date.now() - startTime;
    const metrics = TestUtils.calculateMetrics(responseTimes, errors.length);
    const groupedErrors = TestUtils.groupErrors(errors);

    progress.complete();
    this.printLoadTestSummary(testName, metrics);

    return {
      concurrentUsers: userCount,
      duration,
      metrics,
      errors: groupedErrors,
    };
  }

  /**
   * Run stress test (higher load, expect some failures)
   */
  private async runStressTest(
    userCount: number,
    testName: string
  ): Promise<LoadTestResult> {
    console.log(`\n  Running: ${testName}...`);
    console.log(
      `  ⚠️  This test is designed to push limits - some failures are expected\n`
    );

    const progress = TestUtils.createProgressLogger(
      userCount * 5,
      `  ${testName}`
    );

    const startTime = Date.now();
    const responseTimes: number[] = [];
    const errors: string[] = [];

    // More aggressive test scenarios
    const scenarios = [
      { name: "Health Check", method: "GET", path: "/api/health" },
      { name: "Dashboard", method: "GET", path: "/api/dashboard/stats" },
      { name: "Patients", method: "GET", path: "/api/patients" },
      { name: "Reminders", method: "GET", path: "/api/reminders/scheduled" },
      { name: "Content", method: "GET", path: "/api/cms/content" },
    ];

    // Simulate stress load
    const userPromises = Array(userCount)
      .fill(null)
      .map(async (_, userIndex) => {
        for (const scenario of scenarios) {
          try {
            const { result, duration } = await TestUtils.measureTime(
              async () => {
                if (scenario.method === "GET") {
                  return await this.client.get(scenario.path);
                } else {
                  return await this.client.post(scenario.path, {});
                }
              }
            );

            responseTimes.push(duration);

            if (!result.ok && result.status !== 401 && result.status !== 403) {
              errors.push(`${scenario.name}: HTTP ${result.status}`);
            }
          } catch (error: any) {
            errors.push(`${scenario.name}: ${error.message}`);
          }

          progress.increment();
          // Minimal delay for stress test
          await TestUtils.sleep(Math.random() * 50);
        }
      });

    await Promise.all(userPromises);

    const duration = Date.now() - startTime;
    const metrics = TestUtils.calculateMetrics(responseTimes, errors.length);
    const groupedErrors = TestUtils.groupErrors(errors);

    progress.complete();
    this.printLoadTestSummary(testName, metrics);

    return {
      concurrentUsers: userCount,
      duration,
      metrics,
      errors: groupedErrors,
    };
  }

  /**
   * Print load test summary
   */
  private printLoadTestSummary(testName: string, metrics: PerformanceMetrics) {
    const successRate = (metrics.successRate * 100).toFixed(1);
    const statusIcon = metrics.successRate >= 0.95 ? "✅" : "⚠️";

    console.log(`\n  ${statusIcon} ${testName} Results:`);
    console.log(`     Success Rate: ${successRate}%`);
    console.log(
      `     Avg Response: ${metrics.averageResponseTime.toFixed(0)}ms`
    );
    console.log(`     Min Response: ${metrics.minResponseTime.toFixed(0)}ms`);
    console.log(`     Max Response: ${metrics.maxResponseTime.toFixed(0)}ms`);
    console.log(`     P50 (Median): ${metrics.p50.toFixed(0)}ms`);
    console.log(`     P95: ${metrics.p95.toFixed(0)}ms`);
    console.log(`     P99: ${metrics.p99.toFixed(0)}ms`);
    console.log(`     Total Requests: ${metrics.totalRequests}`);
    console.log(`     Failed: ${metrics.failedRequests}`);
  }

  /**
   * Run response time analysis
   */
  async analyzeResponseTimes() {
    console.log("\n📊 Running Response Time Analysis...");

    const endpoints = [
      { name: "Health Check", path: "/api/health" },
      { name: "Dashboard Stats", path: "/api/dashboard/stats" },
      { name: "Patient List", path: "/api/patients" },
      { name: "Reminder List", path: "/api/reminders/scheduled" },
      { name: "Content List", path: "/api/cms/content" },
      { name: "Video List", path: "/api/cms/videos" },
      { name: "Article List", path: "/api/cms/articles" },
    ];

    console.log(
      "\n  Testing individual endpoint performance (10 requests each)...\n"
    );

    const results = [];

    for (const endpoint of endpoints) {
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        try {
          const { duration } = await TestUtils.measureTime(async () => {
            return await this.client.get(endpoint.path);
          });
          times.push(duration);
        } catch (error) {
          // Continue even if request fails
        }
        await TestUtils.sleep(50);
      }

      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        results.push({
          endpoint: endpoint.name,
          avg: avg.toFixed(0),
          min: min.toFixed(0),
          max: max.toFixed(0),
        });

        const status = avg < 500 ? "✅" : avg < 1000 ? "⚠️" : "❌";
        console.log(
          `  ${status} ${endpoint.name.padEnd(20)} Avg: ${avg.toFixed(
            0
          )}ms  Min: ${min.toFixed(0)}ms  Max: ${max.toFixed(0)}ms`
        );
      }
    }

    return results;
  }

  /**
   * Run sustained load test (continuous load over time)
   */
  async runSustainedLoadTest(
    durationSeconds: number = 60,
    usersPerSecond: number = 5
  ) {
    console.log(
      `\n🕐 Running Sustained Load Test (${durationSeconds}s, ${usersPerSecond} req/s)...`
    );

    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    const responseTimes: number[] = [];
    const errors: string[] = [];

    let requestCount = 0;

    while (Date.now() < endTime) {
      const batchPromises = Array(usersPerSecond)
        .fill(null)
        .map(async () => {
          try {
            const { result, duration } = await TestUtils.measureTime(
              async () => {
                return await this.client.get("/api/health");
              }
            );

            responseTimes.push(duration);
            requestCount++;

            if (!result.ok) {
              errors.push(`HTTP ${result.status}`);
            }
          } catch (error: any) {
            errors.push(error.message);
          }
        });

      await Promise.all(batchPromises);
      await TestUtils.sleep(1000); // Wait 1 second before next batch

      // Print progress every 10 seconds
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 10 === 0 && elapsed > 0) {
        const currentSuccessRate =
          ((requestCount - errors.length) / requestCount) * 100;
        console.log(
          `  Progress: ${elapsed}s | Requests: ${requestCount} | Success: ${currentSuccessRate.toFixed(
            1
          )}%`
        );
      }
    }

    const metrics = TestUtils.calculateMetrics(responseTimes, errors.length);
    const groupedErrors = TestUtils.groupErrors(errors);

    console.log("\n  Sustained Load Test Results:");
    console.log(`     Total Duration: ${durationSeconds}s`);
    console.log(`     Total Requests: ${requestCount}`);
    console.log(
      `     Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`
    );
    console.log(
      `     Avg Response: ${metrics.averageResponseTime.toFixed(0)}ms`
    );
    console.log(`     Failed Requests: ${errors.length}`);

    return {
      duration: durationSeconds,
      totalRequests: requestCount,
      metrics,
      errors: groupedErrors,
    };
  }
}
