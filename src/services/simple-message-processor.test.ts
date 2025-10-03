// Simple Message Processor Tests
// Run with: bun run src/services/simple-message-processor.test.ts

import { SimpleMessageProcessorService } from "./simple-message-processor.service";

// Simple test utilities
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private results = { passed: 0, failed: 0 };

  add(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("Running SimpleMessageProcessor tests...\n");

    for (const test of this.tests) {
      try {
        await test.fn();
        this.results.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.results.failed++;
        console.log(`❌ ${test.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`\nResults: ${this.results.passed} passed, ${this.results.failed} failed`);
    return this.results.failed === 0;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

// Mock database and cache invalidation - simplified for testing
let mockDbCallLog: string[] = [];
let mockDbUpdateCalls: Array<{ table: string; data: unknown }> = [];
let mockReminderQueries: Array<{ id: string; confirmationStatus: string; sentAt: Date }> = [];

const mockDb = {
  update: async (table: unknown, data: unknown) => {
    mockDbCallLog.push(`update:${table === mockPatients ? 'patients' : 'reminders'}`);
    mockDbUpdateCalls.push({ table: table === mockPatients ? 'patients' : 'reminders', data });
    return {};
  },
  select: () => mockDb,
  from: () => mockDb,
  where: () => mockDb,
  orderBy: () => mockDb,
  limit: async () => mockReminderQueries,
};

const mockReminders = {};
const mockPatients = {};

// Mock the database imports
const mockModules: Record<string, unknown> = {
  "@/db": {
    db: mockDb,
    patients: mockPatients,
    reminders: mockReminders,
  },
  "@/lib/cache-invalidation": {
    invalidateAfterPatientOperation: async () => undefined,
  },
  "drizzle-orm": {
    eq: () => ({}),
    and: () => ({}),
    gte: () => ({}),
  },
};

// Override require for mocking
const originalRequire = require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(require as any) = (id: string) => mockModules[id] || originalRequire(id);

// Test runner instance
const runner = new TestRunner();

// Reset mocks before each test
function resetMocks() {
  mockDbCallLog = [];
  mockDbUpdateCalls = [];
  mockReminderQueries = [
    {
      id: "reminder-1",
      confirmationStatus: "PENDING",
      sentAt: new Date(),
    },
  ];
}

// Test: Verification acceptance
runner.add("Verification acceptance with 'ya'", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-1",
    phoneNumber: "+6281234567890",
    message: "ya",
    timestamp: new Date(),
    verificationStatus: "PENDING",
  });

  assert(result.processed, "Message should be processed");
  assertEqual(result.type, "verification", "Should be verification type");
  assertEqual(result.action, "verified", "Should be verified action");
  assert(result.message.includes("Terima kasih"), "Should contain thank you message");
  assertEqual(mockDbUpdateCalls.length, 1, "Should have one database update");
  assertEqual(mockDbUpdateCalls[0].table, "patients", "Should update patients table");
  assertEqual((mockDbUpdateCalls[0].data as { verificationStatus: string }).verificationStatus, "VERIFIED", "Should set status to VERIFIED");
});

// Test: Verification decline
runner.add("Verification decline with 'tidak'", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-2",
    phoneNumber: "+6281234567890",
    message: "tidak",
    timestamp: new Date(),
    verificationStatus: "PENDING",
  });

  assert(result.processed, "Message should be processed");
  assertEqual(result.type, "verification", "Should be verification type");
  assertEqual(result.action, "declined", "Should be declined action");
  assert(result.message.includes("terima kasih atas responsnya"), "Should contain response message");
  assertEqual((mockDbUpdateCalls[0].data as { verificationStatus: string }).verificationStatus, "DECLINED", "Should set status to DECLINED");
});

// Test: Reminder confirmation
runner.add("Reminder confirmation with 'sudah'", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-3",
    phoneNumber: "+6281234567890",
    message: "sudah",
    timestamp: new Date(),
    verificationStatus: "VERIFIED",
  });

  assert(result.processed, "Message should be processed");
  assertEqual(result.type, "reminder_confirmation", "Should be reminder confirmation type");
  assertEqual(result.action, "confirmed", "Should be confirmed action");
  assert(result.message.includes("Bagus!"), "Should contain positive message");
  assertEqual(mockDbUpdateCalls.length, 1, "Should have one database update");
  assertEqual(mockDbUpdateCalls[0].table, "reminders", "Should update reminders table");
});

// Test: Reminder missed
runner.add("Reminder missed with 'belum'", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-4",
    phoneNumber: "+6281234567890",
    message: "belum",
    timestamp: new Date(),
    verificationStatus: "VERIFIED",
  });

  assert(result.processed, "Message should be processed");
  assertEqual(result.action, "missed", "Should be missed action");
  assert(result.message.includes("Jangan lupa"), "Should contain reminder message");
});

// Test: Unknown message
runner.add("Unknown message handling", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-5",
    phoneNumber: "+6281234567890",
    message: "hello world",
    timestamp: new Date(),
    verificationStatus: "VERIFIED",
  });

  assert(!result.processed, "Message should not be processed");
  assertEqual(result.type, "unknown", "Should be unknown type");
  assertEqual(result.action, "none", "Should have no action");
  assertEqual(mockDbUpdateCalls.length, 0, "Should not update database");
});

// Test: Already verified patient
runner.add("Already verified patient ignores verification", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-6",
    phoneNumber: "+6281234567890",
    message: "ya",
    timestamp: new Date(),
    verificationStatus: "VERIFIED",
  });

  assert(!result.processed, "Message should not be processed for verified patient");
  assertEqual(mockDbUpdateCalls.length, 0, "Should not update database");
});

// Test: Unverified patient ignores reminder
runner.add("Unverified patient ignores reminder confirmation", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-7",
    phoneNumber: "+6281234567890",
    message: "sudah",
    timestamp: new Date(),
    verificationStatus: "PENDING",
  });

  assert(!result.processed, "Message should not be processed for unverified patient");
  assertEqual(mockDbUpdateCalls.length, 0, "Should not update database");
});

// Test: Case insensitive matching
runner.add("Case insensitive keyword matching", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-8",
    phoneNumber: "+6281234567890",
    message: "YA",
    timestamp: new Date(),
    verificationStatus: "PENDING",
  });

  assert(result.processed, "Message should be processed regardless of case");
  assertEqual(result.action, "verified", "Should work with uppercase");
});

// Test: Message normalization
runner.add("Message normalization with punctuation", async () => {
  resetMocks();
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-9",
    phoneNumber: "+6281234567890",
    message: "ya!",
    timestamp: new Date(),
    verificationStatus: "PENDING",
  });

  assert(result.processed, "Message should be processed with punctuation");
  assertEqual(result.action, "verified", "Should handle punctuation");
});

// Test: No pending reminders
runner.add("No pending reminders handling", async () => {
  resetMocks();
  mockReminderQueries = []; // No pending reminders
  const processor = new SimpleMessageProcessorService();

  const result = await processor.processMessage({
    patientId: "test-patient-10",
    phoneNumber: "+6281234567890",
    message: "sudah",
    timestamp: new Date(),
    verificationStatus: "VERIFIED",
  });

  assert(!result.processed, "Should not process when no pending reminders");
  assertEqual(mockDbUpdateCalls.length, 0, "Should not update database");
});

// Run tests if this file is executed directly
if (require.main === module) {
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}