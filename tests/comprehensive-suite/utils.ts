/**
 * Test Utilities and Helpers
 * Common functions for test execution and data generation
 */

import { TestResult, PerformanceMetrics } from "./types";

export class TestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Run a test with error handling and optional details
   */
  static async runTest(
    name: string,
    category: string,
    testFn: () => Promise<void>,
    details?: {
      method?: string;
      endpoint?: string;
      [key: string]: unknown;
    }
  ): Promise<TestResult> {
    const start = performance.now();
    try {
      await testFn();
      const duration = performance.now() - start;
      return {
        name,
        category,
        status: "passed",
        duration,
        details,
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        name,
        category,
        status: "failed",
        duration,
        error: error instanceof Error ? error.message : String(error),
        details,
      };
    }
  }

  /**
   * Calculate performance metrics from response times
   */
  static calculateMetrics(
    responseTimes: number[],
    errors: number = 0
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
        failedRequests: errors,
      };
    }

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const total = responseTimes.length;

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / total,
      minResponseTime: sorted[0],
      maxResponseTime: sorted[sorted.length - 1],
      p50: sorted[Math.floor(total * 0.5)],
      p95: sorted[Math.floor(total * 0.95)],
      p99: sorted[Math.floor(total * 0.99)],
      successRate: (total - errors) / total,
      totalRequests: total,
      failedRequests: errors,
    };
  }

  /**
   * Generate random test data
   */
  static generateTestUser(index: number = 0) {
    return {
      email: `testuser${index}@prima-test.com`,
      password: `TestPass123!${index}`,
      name: `Test User ${index}`,
      phone: `6281234567${String(index).padStart(3, "0")}`,
    };
  }

  static generateTestPatient(index: number = 0) {
    return {
      name: `Pasien Test ${index}`,
      phoneNumber: `0812345678${String(index).padStart(2, "0")}`,
      dateOfBirth: new Date(1990, 0, 1 + (index % 28))
        .toISOString()
        .split("T")[0],
      address: `Jl. Test No. ${index}`,
      medicalHistory: "Riwayat medis test",
    };
  }

  static generateTestReminder(patientId: string) {
    return {
      patientId,
      title: "Test Reminder",
      message: "Jangan lupa minum obat",
      scheduleType: "daily" as const,
      time: "08:00",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    };
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await this.sleep(delayMs * Math.pow(2, i));
        }
      }
    }

    throw lastError || new Error("Retry failed");
  }

  /**
   * Sleep for a specified duration
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a progress logger for long-running tests
   */
  static createProgressLogger(total: number, label: string = "Progress") {
    let completed = 0;
    const startTime = Date.now();

    return {
      increment() {
        completed++;
        const percent = Math.floor((completed / total) * 100);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(
          `\r${label}: ${completed}/${total} (${percent}%) - ${elapsed}s`
        );

        if (completed === total) {
          process.stdout.write("\n");
        }
      },
      complete() {
        completed = total;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(
          `\r${label}: ${completed}/${total} (100%) - ${elapsed}s\n`
        );
      },
    };
  }

  /**
   * Batch async operations with concurrency limit
   */
  static async batchAsync<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const promise = fn(items[i], i).then((result) => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Group errors by message
   */
  static groupErrors(
    errors: string[]
  ): Array<{ message: string; count: number }> {
    const grouped = new Map<string, number>();

    errors.forEach((error) => {
      const count = grouped.get(error) || 0;
      grouped.set(error, count + 1);
    });

    return Array.from(grouped.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get base URL from environment or use default
   */
  static getBaseURL(): string {
    return (
      process.env.TEST_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000"
    );
  }

  /**
   * Check if testing against production (non-localhost)
   */
  static isProduction(): boolean {
    const url = this.getBaseURL();
    return !url.includes("localhost") && !url.includes("127.0.0.1");
  }

  /**
   * Get authentication token for testing
   * For production: Uses TEST_AUTH_TOKEN env var
   * For localhost: Uses mock token or creates test session
   */
  static getAuthToken(): string | null {
    // For production testing, require explicit auth token
    if (this.isProduction()) {
      return process.env.TEST_AUTH_TOKEN || null;
    }
    // For localhost, we can test without auth (tests expect 401/403)
    return null;
  }

  /**
   * Create a mock HTTP client for testing
   */
  static createTestClient(baseURL?: string) {
    const url = baseURL || TestUtils.getBaseURL();
    return {
      baseURL: url,
      headers: {} as Record<string, string>,

      setAuth(token: string) {
        // Clerk uses cookie-based auth with __session cookie
        // Also set Authorization header as fallback
        this.headers["Cookie"] = `__session=${token}`;
        this.headers["Authorization"] = `Bearer ${token}`;
      },

      setApiKey(apiKey: string) {
        // Internal API key for service-level access
        this.headers["X-API-Key"] = apiKey;
      },

      async get(path: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseURL}${path}`, {
          method: "GET",
          headers: { ...this.headers, ...options.headers },
          credentials: "include",
          ...options,
        });
        return this.handleResponse(response);
      },

      async post(path: string, body: unknown, options: RequestInit = {}) {
        const response = await fetch(`${this.baseURL}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.headers,
            ...options.headers,
          },
          credentials: "include",
          body: JSON.stringify(body),
          ...options,
        });
        return this.handleResponse(response);
      },

      async put(path: string, body: unknown, options: RequestInit = {}) {
        const response = await fetch(`${this.baseURL}${path}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...this.headers,
            ...options.headers,
          },
          credentials: "include",
          body: JSON.stringify(body),
          ...options,
        });
        return this.handleResponse(response);
      },

      async delete(path: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseURL}${path}`, {
          method: "DELETE",
          headers: { ...this.headers, ...options.headers },
          credentials: "include",
          ...options,
        });
        return this.handleResponse(response);
      },

      async handleResponse(response: Response) {
        const data = await response.json().catch(() => ({}));
        return {
          status: response.status,
          ok: response.ok,
          data,
          headers: response.headers,
        };
      },
    };
  }
}
