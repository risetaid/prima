/**
 * Comprehensive Test Suite Types
 * Defines interfaces for test results, metrics, and reporting
 */

export interface TestResult {
  name: string;
  category: string;
  status: "passed" | "failed" | "skipped";
  duration: number; // in milliseconds
  error?: string;
  details?: {
    method?: string;
    endpoint?: string;
    statusCode?: number;
    responseTime?: number;
    requestBody?: unknown;
    responseBody?: unknown;
    description?: string;
    [key: string]: unknown;
  };
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number; // median
  p95: number;
  p99: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
}

// Server metrics captured from /api/health endpoint
export interface ServerMetrics {
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

export interface LoadTestResult {
  concurrentUsers: number;
  duration: number;
  metrics: PerformanceMetrics;
  errors: Array<{ message: string; count: number }>;
  endpoints?: Array<{
    name: string;
    method: string;
    path: string;
    type: "public" | "protected";
  }>;
  serverMetrics?: {
    before: ServerMetrics | null;
    after: ServerMetrics | null;
  };
}

export interface TestSuiteReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  categories: {
    auth: TestCategoryResult;
    reminder: TestCategoryResult;
    whatsapp: TestCategoryResult;
    content: TestCategoryResult;
    load: LoadTestSummary;
  };
}

export interface TestCategoryResult {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestResult[];
}

export interface LoadTestSummary {
  concurrent10: LoadTestResult | null;
  concurrent25: LoadTestResult | null;
  concurrent50: LoadTestResult | null;
  stress100: LoadTestResult | null;
}

export interface HumanReadableReport {
  summary: string;
  details: string;
  recommendations: string[];
}
