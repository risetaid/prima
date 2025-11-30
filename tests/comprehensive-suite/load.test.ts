/**
 * Load Testing Suite
 * Tests system performance under various concurrent user loads
 *
 * Authentication modes (in priority order):
 * 1. TEST_API_KEY - Use CLERK_SECRET_KEY for admin-level access (recommended)
 * 2. TEST_AUTH_TOKEN - Clerk session token (expires in ~60 seconds)
 * 3. Unauthenticated - Tests security (protected endpoints should reject)
 *
 * Easiest setup for authenticated load testing:
 *   $env:TEST_API_KEY = "sk_test_xxx..." # Your CLERK_SECRET_KEY
 *   bun run test:comprehensive --url https://prima-production.up.railway.app
 */

import { LoadTestResult, PerformanceMetrics } from "./types";
import { TestUtils } from "./utils";

// Server metrics captured from /api/health endpoint
interface ServerMetrics {
  cpu: {
    percent: number;
    cores: number;
  };
  memory: {
    usedMB: number;
    totalMB: number;
    percent: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
  uptime: number;
  timestamp: string;
}

export class LoadTests {
  private client = TestUtils.createTestClient();
  private authToken: string | null = null;
  private apiKey: string | null = null;
  private isAuthenticated = false;
  private authMethod: "none" | "session" | "api-key" = "none";

  constructor() {
    // Check for API key first (preferred for load testing)
    this.apiKey = process.env.TEST_API_KEY || null;
    this.authToken = process.env.TEST_AUTH_TOKEN || null;

    if (this.apiKey) {
      this.isAuthenticated = true;
      this.authMethod = "api-key";
      this.client.setApiKey(this.apiKey);
    } else if (this.authToken) {
      this.isAuthenticated = true;
      this.authMethod = "session";
      this.client.setAuth(this.authToken);
    }
  }

  /**
   * Fetch server metrics from /api/health endpoint
   */
  private async fetchServerMetrics(): Promise<ServerMetrics | null> {
    try {
      const response = await this.client.get("/api/health");
      // API returns { success, data: { metrics, ... } }
      const metrics = response.data?.data?.metrics || response.data?.metrics;
      if (response.ok && metrics) {
        return {
          cpu: metrics.cpu,
          memory: metrics.memory,
          uptime: metrics.uptime,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      // Health endpoint might not have metrics yet
    }
    return null;
  }

  /**
   * Print server metrics comparison (before vs after load)
   */
  private printServerMetricsComparison(
    testName: string,
    before: ServerMetrics | null,
    after: ServerMetrics | null
  ) {
    if (!before && !after) {
      console.log(
        `\n  📊 Server Metrics: Not available (health endpoint may not support metrics)`
      );
      return;
    }

    console.log(`\n  📊 Server Metrics for ${testName}:`);

    if (before) {
      console.log(`     Before Load:`);
      console.log(
        `       CPU: ${before.cpu.percent.toFixed(1)}% (${
          before.cpu.cores
        } cores)`
      );
      console.log(
        `       Memory: ${before.memory.usedMB.toFixed(
          0
        )}MB / ${before.memory.totalMB.toFixed(
          0
        )}MB (${before.memory.percent.toFixed(1)}%)`
      );
      console.log(
        `       Heap: ${before.memory.heapUsedMB.toFixed(
          0
        )}MB / ${before.memory.heapTotalMB.toFixed(0)}MB`
      );
    }

    if (after) {
      console.log(`     After Load:`);
      console.log(
        `       CPU: ${after.cpu.percent.toFixed(1)}% (${
          after.cpu.cores
        } cores)`
      );
      console.log(
        `       Memory: ${after.memory.usedMB.toFixed(
          0
        )}MB / ${after.memory.totalMB.toFixed(
          0
        )}MB (${after.memory.percent.toFixed(1)}%)`
      );
      console.log(
        `       Heap: ${after.memory.heapUsedMB.toFixed(
          0
        )}MB / ${after.memory.heapTotalMB.toFixed(0)}MB`
      );
    }

    if (before && after) {
      const cpuDelta = after.cpu.percent - before.cpu.percent;
      const memDelta = after.memory.percent - before.memory.percent;
      const heapDelta = after.memory.heapUsedMB - before.memory.heapUsedMB;

      console.log(`     Delta (After - Before):`);
      console.log(
        `       CPU: ${cpuDelta >= 0 ? "+" : ""}${cpuDelta.toFixed(1)}%`
      );
      console.log(
        `       Memory: ${memDelta >= 0 ? "+" : ""}${memDelta.toFixed(1)}%`
      );
      console.log(
        `       Heap: ${heapDelta >= 0 ? "+" : ""}${heapDelta.toFixed(0)}MB`
      );
    }
  }

  /**
   * Run all load tests
   */
  async runAll() {
    console.log("\n🔥 Running Load Tests...");

    if (this.authMethod === "api-key") {
      console.log("  ✅ Authenticated mode: Using CLERK_SECRET_KEY as API key");
      console.log(
        "     All protected endpoints accessible with admin privileges\n"
      );
    } else if (this.authMethod === "session") {
      console.log(
        "  ⚠️  Authenticated mode: Using TEST_AUTH_TOKEN (Clerk session)"
      );
      console.log("     Warning: Clerk session tokens expire in ~60 seconds!");
      console.log("     Use TEST_API_KEY=<CLERK_SECRET_KEY> instead\n");
    } else {
      console.log(
        "  ℹ️  Unauthenticated mode: Testing security + public endpoints"
      );
      console.log("     For authenticated tests, set:");
      console.log(
        '     $env:TEST_API_KEY="sk_test_xxx..." # CLERK_SECRET_KEY\n'
      );
    }

    // Capture initial server metrics
    console.log("  📊 Fetching initial server metrics...");
    const initialMetrics = await this.fetchServerMetrics();
    if (initialMetrics) {
      console.log(
        `     CPU: ${initialMetrics.cpu.percent.toFixed(
          1
        )}% | Memory: ${initialMetrics.memory.percent.toFixed(1)}%`
      );
    } else {
      console.log("     Server metrics not available");
    }

    const results = {
      concurrent10: await this.runConcurrentTest(10, "Concurrent 10 Users"),
      concurrent25: await this.runConcurrentTest(25, "Concurrent 25 Users"),
      concurrent50: await this.runConcurrentTest(50, "Concurrent 50 Users"),
      stress100: await this.runStressTest(100, "Stress Test 100 Users"),
    };

    // Capture final server metrics
    console.log("\n  📊 Fetching final server metrics...");
    const finalMetrics = await this.fetchServerMetrics();
    if (finalMetrics && initialMetrics) {
      const cpuDelta = finalMetrics.cpu.percent - initialMetrics.cpu.percent;
      const memDelta =
        finalMetrics.memory.percent - initialMetrics.memory.percent;
      console.log(
        `     CPU: ${finalMetrics.cpu.percent.toFixed(1)}% (${
          cpuDelta >= 0 ? "+" : ""
        }${cpuDelta.toFixed(1)}%)`
      );
      console.log(
        `     Memory: ${finalMetrics.memory.percent.toFixed(1)}% (${
          memDelta >= 0 ? "+" : ""
        }${memDelta.toFixed(1)}%)`
      );
    } else if (finalMetrics) {
      console.log(
        `     CPU: ${finalMetrics.cpu.percent.toFixed(
          1
        )}% | Memory: ${finalMetrics.memory.percent.toFixed(1)}%`
      );
    }

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

    // Capture metrics before load
    const metricsBefore = await this.fetchServerMetrics();

    const progress = TestUtils.createProgressLogger(
      userCount * 3,
      `  ${testName}`
    );

    const startTime = Date.now();
    const responseTimes: number[] = [];
    const errors: string[] = [];
    const successfulRequests: string[] = [];

    // Define test scenarios (mix of endpoints)
    const scenarios = [
      { name: "Health Check", method: "GET", path: "/api/health" },
      {
        name: "Dashboard Overview",
        method: "GET",
        path: "/api/dashboard/overview",
      },
      { name: "List Patients", method: "GET", path: "/api/patients" },
    ];

    // Simulate concurrent users - each creates their own client with auth
    const userPromises = Array(userCount)
      .fill(null)
      .map(async (_, userIndex) => {
        // Create client per user (simulates separate sessions)
        const userClient = TestUtils.createTestClient();
        if (this.apiKey) {
          userClient.setApiKey(this.apiKey);
        } else if (this.authToken) {
          userClient.setAuth(this.authToken);
        }

        // Each user performs multiple actions
        for (const scenario of scenarios) {
          try {
            const { result, duration } = await TestUtils.measureTime(
              async () => {
                if (scenario.method === "GET") {
                  return await userClient.get(scenario.path);
                } else {
                  return await userClient.post(scenario.path, {});
                }
              }
            );

            responseTimes.push(duration);

            // Track successful vs failed requests
            if (result.ok) {
              successfulRequests.push(scenario.name);
            } else if (result.status !== 401 && result.status !== 403) {
              // Non-auth errors are real problems
              errors.push(`${scenario.name}: HTTP ${result.status}`);
            } else if (!this.isAuthenticated) {
              // Auth errors without token = expected (security working)
              // Don't count as errors for metrics
            } else {
              // Auth errors WITH token = real problem
              errors.push(
                `${scenario.name}: HTTP ${result.status} (auth failed)`
              );
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

    // Capture metrics after load
    const metricsAfter = await this.fetchServerMetrics();

    // Calculate metrics based on actual success (not auth rejections)
    const totalRequests = userCount * scenarios.length;
    const actualErrors = errors.length;
    const metrics = this.calculateLoadMetrics(
      responseTimes,
      actualErrors,
      totalRequests
    );
    const groupedErrors = TestUtils.groupErrors(errors);

    progress.complete();
    this.printLoadTestSummary(testName, metrics, this.isAuthenticated);
    this.printServerMetricsComparison(testName, metricsBefore, metricsAfter);

    return {
      concurrentUsers: userCount,
      duration,
      metrics,
      errors: groupedErrors,
      endpoints: scenarios.map((s) => ({
        name: s.name,
        method: s.method,
        path: s.path,
        type: s.path === "/api/health" ? "public" : "protected",
      })),
      serverMetrics: {
        before: metricsBefore,
        after: metricsAfter,
      },
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

    // Capture metrics before load
    const metricsBefore = await this.fetchServerMetrics();

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
      { name: "Dashboard", method: "GET", path: "/api/dashboard/overview" },
      { name: "Patients", method: "GET", path: "/api/patients" },
      { name: "Reminders", method: "GET", path: "/api/reminders/scheduled" },
      { name: "Content", method: "GET", path: "/api/cms/content" },
    ];

    // Simulate stress load - each user creates their own client
    const userPromises = Array(userCount)
      .fill(null)
      .map(async (_, userIndex) => {
        const userClient = TestUtils.createTestClient();
        if (this.apiKey) {
          userClient.setApiKey(this.apiKey);
        } else if (this.authToken) {
          userClient.setAuth(this.authToken);
        }

        for (const scenario of scenarios) {
          try {
            const { result, duration } = await TestUtils.measureTime(
              async () => {
                if (scenario.method === "GET") {
                  return await userClient.get(scenario.path);
                } else {
                  return await userClient.post(scenario.path, {});
                }
              }
            );

            responseTimes.push(duration);

            // Track errors properly based on auth state
            if (result.ok) {
              // Success - no action needed
            } else if (result.status !== 401 && result.status !== 403) {
              errors.push(`${scenario.name}: HTTP ${result.status}`);
            } else if (this.isAuthenticated) {
              // Auth errors with token = real problem
              errors.push(
                `${scenario.name}: HTTP ${result.status} (auth failed)`
              );
            }
            // Auth errors without token are expected, don't count as errors
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

    // Capture metrics after load
    const metricsAfter = await this.fetchServerMetrics();

    const totalRequests = userCount * scenarios.length;
    const metrics = this.calculateLoadMetrics(
      responseTimes,
      errors.length,
      totalRequests
    );
    const groupedErrors = TestUtils.groupErrors(errors);

    progress.complete();
    this.printLoadTestSummary(testName, metrics, this.isAuthenticated);
    this.printServerMetricsComparison(testName, metricsBefore, metricsAfter);

    return {
      concurrentUsers: userCount,
      duration,
      metrics,
      errors: groupedErrors,
      endpoints: scenarios.map((s) => ({
        name: s.name,
        method: s.method,
        path: s.path,
        type: s.path === "/api/health" ? "public" : "protected",
      })),
      serverMetrics: {
        before: metricsBefore,
        after: metricsAfter,
      },
    };
  }

  /**
   * Calculate load test metrics
   */
  private calculateLoadMetrics(
    responseTimes: number[],
    errorCount: number,
    totalRequests: number
  ): PerformanceMetrics {
    if (responseTimes.length === 0) {
      return {
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        successRate: 0,
        totalRequests: 0,
        failedRequests: errorCount,
      };
    }

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    // Success rate based on actual errors (not auth rejections)
    const successRate = (totalRequests - errorCount) / totalRequests;

    return {
      averageResponseTime: sum / sorted.length,
      minResponseTime: sorted[0],
      maxResponseTime: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      successRate,
      totalRequests,
      failedRequests: errorCount,
    };
  }

  /**
   * Print summary of load test results
   */
  private printLoadTestSummary(
    testName: string,
    metrics: PerformanceMetrics,
    isAuthenticated: boolean = false
  ) {
    const successRate = (metrics.successRate * 100).toFixed(1);
    const statusIcon =
      metrics.successRate >= 0.95 ? "✅" : isAuthenticated ? "⚠️" : "ℹ️";

    console.log(`\n  ${statusIcon} ${testName} Results:`);
    console.log(
      `     Success Rate: ${successRate}%${
        !isAuthenticated ? " (public endpoints only)" : ""
      }`
    );
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
      { name: "Dashboard Overview", path: "/api/dashboard/overview" },
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
