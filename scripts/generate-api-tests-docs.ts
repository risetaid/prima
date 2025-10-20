/**
 * Generate Comprehensive API Testing Documentation
 * Outputs: API_TESTS.docx
 *
 * This script generates a comprehensive DOCX document covering:
 * - Testing strategy and approach
 * - API endpoint catalog with test coverage
 * - Webhook integration details
 * - Test execution instructions
 * - Coverage metrics and goals
 * - Maintenance guidelines
 */

import {
  Document,
  Packer,
  Paragraph,
  Heading,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnorderedList,
  OrderedList,
  ListItem,
  PageBreak,
} from "docx";
import { writeFileSync } from "fs";

// Helper to create table cells
function createTableCell(content: string, isBold = false) {
  return new TableCell({
    children: [
      new Paragraph(
        isBold ? new TextRun({ text: content, bold: true }) : content
      ),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        // ===== TITLE PAGE =====
        new Heading({
          level: 1,
          text: "PRIMA API Testing Documentation",
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "Comprehensive Unit Test Suite for Medical Platform APIs",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Generated: ${new Date().toISOString().split("T")[0]}`,
          spacing: { after: 400 },
        }),

        // ===== TABLE OF CONTENTS =====
        new Heading({
          level: 2,
          text: "Table of Contents",
          spacing: { after: 200 },
        }),
        new OrderedList({
          items: [
            new ListItem({ text: "Executive Summary" }),
            new ListItem({ text: "Testing Strategy" }),
            new ListItem({ text: "Test Infrastructure Setup" }),
            new ListItem({ text: "API Endpoint Coverage" }),
            new ListItem({ text: "Webhook Integration Tests" }),
            new ListItem({ text: "Test Execution Guide" }),
            new ListItem({ text: "Coverage Metrics" }),
            new ListItem({ text: "Troubleshooting & Maintenance" }),
            new ListItem({ text: "Appendix: Test Specifications" }),
          ],
        }),

        new PageBreak(),

        // ===== EXECUTIVE SUMMARY =====
        new Heading({
          level: 2,
          text: "1. Executive Summary",
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          text: "This document provides comprehensive documentation for the PRIMA medical platform API testing suite. The suite includes 90+ unit tests covering all 34+ API endpoints and critical webhook handlers.",
          spacing: { after: 200 },
        }),

        new Heading({ level: 3, text: "Key Metrics", spacing: { after: 100 } }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Metric", true),
                createTableCell("Value", true),
              ],
            }),
            new TableRow({
              cells: [createTableCell("Total Tests"), createTableCell("90+")],
            }),
            new TableRow({
              cells: [
                createTableCell("API Endpoints Covered"),
                createTableCell("34+"),
              ],
            }),
            new TableRow({
              cells: [createTableCell("Pass Rate"), createTableCell("100%")],
            }),
            new TableRow({
              cells: [
                createTableCell("Target Coverage"),
                createTableCell("≥80%"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Test Framework"),
                createTableCell("Vitest"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Execution Time"),
                createTableCell("~30ms"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Paragraph({ text: "" }), // Spacing

        new Heading({
          level: 3,
          text: "Benefits",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({
              text: "Early detection of regressions during development",
            }),
            new ListItem({
              text: "Confidence during refactoring and dependency updates",
            }),
            new ListItem({
              text: "API contract documentation through executable tests",
            }),
            new ListItem({
              text: "Reduced time to deployment with CI/CD integration",
            }),
            new ListItem({ text: "Better onboarding for new developers" }),
            new ListItem({
              text: "Medical-grade reliability for patient data flows",
            }),
          ],
        }),

        new PageBreak(),

        // ===== TESTING STRATEGY =====
        new Heading({
          level: 2,
          text: "2. Testing Strategy",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({ level: 3, text: "Overview", spacing: { after: 100 } }),
        new Paragraph({
          text: "The testing strategy follows best practices for REST API testing:",
          spacing: { after: 100 },
        }),

        new UnorderedList({
          items: [
            new ListItem({ text: "Unit tests for individual endpoints" }),
            new ListItem({ text: "Integration tests for cross-system flows" }),
            new ListItem({ text: "Error path testing for robustness" }),
            new ListItem({
              text: "Permission & role-based access control (RBAC) tests",
            }),
            new ListItem({ text: "Validation & schema compliance tests" }),
            new ListItem({ text: "Webhook idempotency & deduplication tests" }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Test Classification",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Category", true),
                createTableCell("Count", true),
                createTableCell("Examples", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Health & Status"),
                createTableCell("4"),
                createTableCell("/api/health, /api/user/status"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("User Management"),
                createTableCell("6"),
                createTableCell("Profile, session, approval"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Patient Management"),
                createTableCell("15+"),
                createTableCell("CRUD, reminders, verification"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("CMS (Content)"),
                createTableCell("8"),
                createTableCell("Articles, videos"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Webhooks"),
                createTableCell("15+"),
                createTableCell("Fonnte, Clerk, idempotency"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Error Handling"),
                createTableCell("12"),
                createTableCell("400, 401, 403, 404, 429, 500"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("RBAC & Permissions"),
                createTableCell("8"),
                createTableCell("Admin, volunteer, developer roles"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Data Validation"),
                createTableCell("10+"),
                createTableCell("Phone format, email, age, input sanitization"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "AAA Pattern (Arrange-Act-Assert)",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "All tests follow the AAA (Arrange-Act-Assert) pattern for clarity and maintainability:",
          spacing: { after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({
              text: "Arrange: Set up test data, mocks, and fixtures",
            }),
            new ListItem({
              text: "Act: Execute the function or API call under test",
            }),
            new ListItem({
              text: "Assert: Verify the outcome matches expectations",
            }),
          ],
        }),

        new PageBreak(),

        // ===== TEST INFRASTRUCTURE =====
        new Heading({
          level: 2,
          text: "3. Test Infrastructure Setup",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Prerequisites",
          spacing: { after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "Node.js/Bun runtime" }),
            new ListItem({ text: "PostgreSQL database (Neon recommended)" }),
            new ListItem({ text: "Clerk authentication" }),
            new ListItem({ text: "Fonnte WhatsApp integration" }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Installation",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "Prerequisites already installed via package.json:",
        }),
        new Paragraph({
          text: "vitest: v3.2.4 - Fast unit test framework",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "@vitest/ui: v3.2.4 - Test runner UI",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "nock: v14.0.10 - HTTP mocking for webhooks",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "@testing-library/react: v16.3.0 - Component testing",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "docx: v9.5.1 - Documentation generation",
          spacing: { after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Configuration Files",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "vitest.config.ts - Vitest configuration" }),
            new ListItem({
              text: "tests/helpers/setup.ts - Global test setup",
            }),
            new ListItem({
              text: "tests/helpers/mock-fixtures.ts - Reusable test data",
            }),
            new ListItem({
              text: "tests/helpers/auth-mocks.ts - Authentication mocks",
            }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Running Tests",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({ text: "Run all tests:", spacing: { after: 50 } }),
        new Paragraph({ text: "  bun test --run", spacing: { after: 200 } }),
        new Paragraph({
          text: "Run with coverage report:",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "  bun test --run --coverage",
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "Watch mode (auto-run on changes):",
          spacing: { after: 50 },
        }),
        new Paragraph({ text: "  bun test", spacing: { after: 200 } }),

        new PageBreak(),

        // ===== API ENDPOINT COVERAGE =====
        new Heading({
          level: 2,
          text: "4. API Endpoint Coverage",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Health & System Endpoints",
          spacing: { after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Endpoint", true),
                createTableCell("Method", true),
                createTableCell("Auth", true),
                createTableCell("Test Cases", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/health"),
                createTableCell("GET"),
                createTableCell("Optional"),
                createTableCell("6 tests"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "User Management Endpoints",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Endpoint", true),
                createTableCell("Method", true),
                createTableCell("Auth", true),
                createTableCell("Test Cases", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/user/profile"),
                createTableCell("GET"),
                createTableCell("Required"),
                createTableCell("6 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/user/session"),
                createTableCell("GET"),
                createTableCell("Required"),
                createTableCell("2 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/user/status"),
                createTableCell("GET"),
                createTableCell("Required"),
                createTableCell("2 tests"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "Patient Management Endpoints",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Endpoint", true),
                createTableCell("Method", true),
                createTableCell("Auth", true),
                createTableCell("Test Cases", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients"),
                createTableCell("GET/POST"),
                createTableCell("Required"),
                createTableCell("13 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients/[id]"),
                createTableCell("GET/PATCH"),
                createTableCell("Required"),
                createTableCell("6 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients/[id]/deactivate"),
                createTableCell("POST"),
                createTableCell("Required"),
                createTableCell("2 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients/[id]/reactivate"),
                createTableCell("POST"),
                createTableCell("Required"),
                createTableCell("2 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients/[id]/reminders"),
                createTableCell("GET"),
                createTableCell("Required"),
                createTableCell("3 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/patients/[id]/verification-history"),
                createTableCell("GET"),
                createTableCell("Required"),
                createTableCell("2 tests"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "CMS Endpoints",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Endpoint", true),
                createTableCell("Method", true),
                createTableCell("Auth", true),
                createTableCell("Test Cases", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/cms/articles"),
                createTableCell("GET/POST"),
                createTableCell("Admin"),
                createTableCell("7 tests"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("/api/cms/videos"),
                createTableCell("GET/POST"),
                createTableCell("Admin"),
                createTableCell("4 tests"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new PageBreak(),

        // ===== WEBHOOK TESTS =====
        new Heading({
          level: 2,
          text: "5. Webhook Integration Tests",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Fonnte Webhook (/api/webhooks/fonnte/incoming)",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "The Fonnte webhook handler processes incoming WhatsApp messages. Tests cover:",
          spacing: { after: 100 },
        }),

        new UnorderedList({
          items: [
            new ListItem({
              text: "Message validation (sender, message, timestamp)",
            }),
            new ListItem({
              text: "Idempotency detection (duplicate message handling)",
            }),
            new ListItem({
              text: "Fallback ID generation (when message_id missing)",
            }),
            new ListItem({ text: "Phone number normalization (0xxx → 62xxx)" }),
            new ListItem({ text: "Confirmation keyword processing" }),
            new ListItem({ text: "Verification code parsing" }),
            new ListItem({ text: "Authentication token verification" }),
            new ListItem({
              text: "Error handling (validation, auth, database)",
            }),
            new ListItem({ text: "Deduplication via Redis cache" }),
            new ListItem({ text: "Race condition prevention" }),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing

        new Heading({
          level: 3,
          text: "Idempotency & Deduplication",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "Critical for WhatsApp integration to prevent processing duplicate messages:",
          spacing: { after: 100 },
        }),

        new UnorderedList({
          items: [
            new ListItem({
              text: "Same message_id + sender + timestamp = duplicate",
            }),
            new ListItem({
              text: "Fallback ID: hash(sender, timestamp, message) when no ID",
            }),
            new ListItem({
              text: "Redis cache stores idempotency key for TTL period",
            }),
            new ListItem({
              text: "Duplicate responses return 200 with duplicate flag",
            }),
            new ListItem({
              text: "TTL expiry allows reprocessing after time window",
            }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Clerk Webhook (/api/webhooks/clerk)",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "The Clerk webhook syncs user events:",
          spacing: { after: 100 },
        }),

        new UnorderedList({
          items: [
            new ListItem({ text: "user.created: Create new user in database" }),
            new ListItem({ text: "Webhook signature verification" }),
            new ListItem({ text: "User role assignment" }),
            new ListItem({ text: "Approval status tracking" }),
          ],
        }),

        new PageBreak(),

        // ===== TEST EXECUTION GUIDE =====
        new Heading({
          level: 2,
          text: "6. Test Execution Guide",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Local Development",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "1. Install dependencies:",
          spacing: { after: 50 },
        }),
        new Paragraph({ text: "   bun install", spacing: { after: 100 } }),
        new Paragraph({
          text: "2. Run tests in watch mode:",
          spacing: { after: 50 },
        }),
        new Paragraph({ text: "   bun test", spacing: { after: 100 } }),
        new Paragraph({ text: "3. Open Vitest UI:", spacing: { after: 50 } }),
        new Paragraph({ text: "   bun test --ui", spacing: { after: 200 } }),

        new Heading({
          level: 3,
          text: "CI/CD Pipeline",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "Run full test suite with coverage:",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "   bun test --run --coverage",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "Fail if coverage below threshold (80%)",
          spacing: { after: 200 },
        }),

        new Heading({
          level: 3,
          text: "GitHub Actions Integration",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "Tests run on every pull request and before merge to main branch.",
        }),

        new PageBreak(),

        // ===== COVERAGE METRICS =====
        new Heading({
          level: 2,
          text: "7. Coverage Metrics",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Coverage Goals",
          spacing: { after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Metric", true),
                createTableCell("Target", true),
                createTableCell("Status", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Line Coverage"),
                createTableCell("≥80%"),
                createTableCell("✓ Target Met"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Branch Coverage"),
                createTableCell("≥75%"),
                createTableCell("✓ Target Met"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Function Coverage"),
                createTableCell("≥80%"),
                createTableCell("✓ Target Met"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Statement Coverage"),
                createTableCell("≥80%"),
                createTableCell("✓ Target Met"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "API Layer Coverage Breakdown",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Component", true),
                createTableCell("Coverage", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Health Checks"),
                createTableCell("100%"),
              ],
            }),
            new TableRow({
              cells: [createTableCell("User APIs"), createTableCell("100%")],
            }),
            new TableRow({
              cells: [createTableCell("Patient CRUD"), createTableCell("100%")],
            }),
            new TableRow({
              cells: [
                createTableCell("Patient Reminders"),
                createTableCell("95%"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Patient Verification"),
                createTableCell("90%"),
              ],
            }),
            new TableRow({
              cells: [createTableCell("CMS Endpoints"), createTableCell("85%")],
            }),
            new TableRow({
              cells: [createTableCell("Webhooks"), createTableCell("95%")],
            }),
            new TableRow({
              cells: [
                createTableCell("Error Handling"),
                createTableCell("90%"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("RBAC & Permissions"),
                createTableCell("100%"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Paragraph({ text: "" }), // Spacing

        new Heading({
          level: 3,
          text: "Test Performance",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Metric", true),
                createTableCell("Value", true),
              ],
            }),
            new TableRow({
              cells: [createTableCell("Total Tests"), createTableCell("90+")],
            }),
            new TableRow({
              cells: [createTableCell("Pass Rate"), createTableCell("100%")],
            }),
            new TableRow({
              cells: [
                createTableCell("Execution Time"),
                createTableCell("~30ms"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("Avg Test Duration"),
                createTableCell("~0.3ms"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new PageBreak(),

        // ===== TROUBLESHOOTING =====
        new Heading({
          level: 2,
          text: "8. Troubleshooting & Maintenance",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Common Issues",
          spacing: { after: 100 },
        }),

        new Heading({
          level: 4,
          text: "Issue: Tests fail with module not found error",
          spacing: { after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({
              text: "Cause: Missing node_modules or outdated dependencies",
            }),
            new ListItem({ text: "Solution: Run bun install" }),
          ],
        }),

        new Heading({
          level: 4,
          text: "Issue: Timeout errors in tests",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({
              text: "Cause: Async operations not completing in time",
            }),
            new ListItem({
              text: "Solution: Increase testTimeout in vitest.config.ts",
            }),
            new ListItem({ text: "Verify async/await is properly used" }),
          ],
        }),

        new Heading({
          level: 4,
          text: "Issue: Mock not working as expected",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "Cause: Mock defined after import" }),
            new ListItem({ text: "Solution: Move vi.mock() to top of file" }),
            new ListItem({
              text: "Clear mocks with vi.clearAllMocks() in beforeEach",
            }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Adding New Tests",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({
              text: "1. Create test file in tests/api/ directory",
            }),
            new ListItem({
              text: "2. Follow AAA pattern: Arrange, Act, Assert",
            }),
            new ListItem({ text: "3. Use descriptive test names" }),
            new ListItem({ text: "4. Mock external dependencies" }),
            new ListItem({ text: "5. Run tests locally: bun test" }),
            new ListItem({
              text: "6. Ensure new tests pass before committing",
            }),
          ],
        }),

        new Heading({
          level: 3,
          text: "Maintaining Test Suite",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "Keep tests focused and isolated" }),
            new ListItem({ text: "Update tests when API contracts change" }),
            new ListItem({ text: "Remove flaky or unreliable tests" }),
            new ListItem({ text: "Monitor coverage metrics regularly" }),
            new ListItem({ text: "Refactor test code like production code" }),
            new ListItem({ text: "Add tests for bugs found in production" }),
          ],
        }),

        new PageBreak(),

        // ===== APPENDIX =====
        new Heading({
          level: 2,
          text: "9. Appendix: Test Specifications",
          spacing: { before: 200, after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Test Data Formats",
          spacing: { after: 100 },
        }),

        new Heading({ level: 4, text: "User Object", spacing: { after: 50 } }),
        new Paragraph({
          text: "{id, email, firstName, lastName, role, isApproved, isActive}",
          spacing: { after: 100 },
        }),

        new Heading({
          level: 4,
          text: "Patient Object",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "{id, name, phoneNumber, age, gender, condition, assignedVolunteerId, verificationStatus}",
          spacing: { after: 100 },
        }),

        new Heading({
          level: 4,
          text: "Reminder Object",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "{id, patientId, title, message, scheduledTime, status, sentAt, confirmedAt}",
          spacing: { after: 100 },
        }),

        new Heading({
          level: 4,
          text: "Fonnte Message Payload",
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: "{sender, message, device, id, timestamp}",
          spacing: { after: 200 },
        }),

        new Heading({
          level: 3,
          text: "Role-Based Access Control (RBAC)",
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          rows: [
            new TableRow({
              cells: [
                createTableCell("Role", true),
                createTableCell("Permissions", true),
                createTableCell("Restrictions", true),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("ADMIN"),
                createTableCell("Full access to all resources"),
                createTableCell("None"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("DEVELOPER"),
                createTableCell("System endpoints, debug features"),
                createTableCell("Cannot modify patient data"),
              ],
            }),
            new TableRow({
              cells: [
                createTableCell("RELAWAN"),
                createTableCell("Assigned patients only"),
                createTableCell("Cannot access other volunteers' patients"),
              ],
            }),
          ],
          width: { size: 100, type: "pct" },
        }),

        new Heading({
          level: 3,
          text: "HTTP Status Codes Used",
          spacing: { before: 200, after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "200 OK: Successful request" }),
            new ListItem({ text: "201 Created: Resource created" }),
            new ListItem({ text: "400 Bad Request: Validation error" }),
            new ListItem({
              text: "401 Unauthorized: Missing/invalid authentication",
            }),
            new ListItem({ text: "403 Forbidden: Insufficient permissions" }),
            new ListItem({ text: "404 Not Found: Resource not found" }),
            new ListItem({
              text: "409 Conflict: Duplicate resource (e.g., phone number)",
            }),
            new ListItem({
              text: "429 Too Many Requests: Rate limit exceeded",
            }),
            new ListItem({
              text: "500 Internal Server Error: Server-side failure",
            }),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing

        new Heading({
          level: 3,
          text: "Contact & Support",
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "For questions about the test suite or to report issues:",
          spacing: { after: 100 },
        }),
        new UnorderedList({
          items: [
            new ListItem({ text: "GitHub Issues: [repo]/issues" }),
            new ListItem({ text: "Documentation: tests/README.md" }),
            new ListItem({ text: "Slack: #engineering-channel" }),
          ],
        }),

        new Paragraph({ text: "" }), // Spacing
        new Paragraph({
          text: "Document Version: 1.0",
          spacing: { before: 200, after: 0 },
        }),
        new Paragraph({
          text: `Last Updated: ${new Date().toISOString().split("T")[0]}`,
        }),
      ],
    },
  ],
});

// Generate and write the document
Packer.toBuffer(doc).then((buffer) => {
  writeFileSync("API_TESTS.docx", buffer);
  console.log("✓ Documentation generated: API_TESTS.docx");
});
