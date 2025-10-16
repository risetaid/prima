/**
 * Service Mock Factories
 * Creates mock service implementations for testing
 */

import { createMockPatient } from "../../fixtures/patient.fixtures";

/**
 * Mock PatientService
 */
export class MockPatientService {
  patients: Record<string, unknown> = {};

  async listWithCompliance(filters: any = {}) {
    return {
      patients: Object.values(this.patients),
      total: Object.keys(this.patients).length,
      page: filters.page || 1,
      limit: filters.limit || 50,
    };
  }

  async getById(id: string) {
    return this.patients[id] || null;
  }

  async create(data: any) {
    const patient = {
      id: `patient-${Date.now()}`,
      ...createMockPatient(data),
    };
    this.patients[patient.id] = patient;
    return patient;
  }

  async update(id: string, data: any) {
    if (!this.patients[id]) return null;
    const updated = { ...this.patients[id], ...data, updatedAt: new Date().toISOString() };
    this.patients[id] = updated;
    return updated;
  }

  async delete(id: string) {
    if (!this.patients[id]) return false;
    delete this.patients[id];
    return true;
  }
}

/**
 * Mock ReminderService
 */
export class MockReminderService {
  reminders: Record<string, unknown> = {};

  async create(data: any) {
    const reminder = {
      id: `reminder-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.reminders[reminder.id] = reminder;
    return reminder;
  }

  async getById(id: string) {
    return this.reminders[id] || null;
  }

  async list(filters: any = {}) {
    return Object.values(this.reminders);
  }

  async update(id: string, data: any) {
    if (!this.reminders[id]) return null;
    const updated = { ...this.reminders[id], ...data, updatedAt: new Date().toISOString() };
    this.reminders[id] = updated;
    return updated;
  }

  async cancel(id: string) {
    if (!this.reminders[id]) return null;
    const updated = { ...this.reminders[id], status: "CANCELLED", updatedAt: new Date().toISOString() };
    this.reminders[id] = updated;
    return updated;
  }
}

/**
 * Mock VerificationService
 */
export class MockVerificationService {
  verifications: Record<string, unknown> = {};

  async processResponse(message: string, patientId: string) {
    return {
      action: "verified",
      message: "Patient verified successfully",
      patientId,
    };
  }

  async sendVerificationMessage(patientId: string) {
    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      patientId,
    };
  }
}

/**
 * Mock SimpleConfirmationService
 */
export class MockSimpleConfirmationService {
  async processReminderResponse(phoneNumber: string, message: string) {
    return {
      action: "confirmed",
      message: "Reminder confirmed",
      phoneNumber,
    };
  }
}

/**
 * Mock Cache Service
 */
export class MockCacheService {
  cache: Record<string, unknown> = {};
  ttls: Record<string, number> = {};

  async get(key: string) {
    return this.cache[key] || null;
  }

  async set(key: string, value: unknown, ttl?: number) {
    this.cache[key] = value;
    if (ttl) this.ttls[key] = ttl;
    return true;
  }

  async del(key: string) {
    delete this.cache[key];
    delete this.ttls[key];
    return true;
  }

  async clear() {
    this.cache = {};
    this.ttls = {};
    return true;
  }

  async has(key: string) {
    return key in this.cache;
  }
}

/**
 * Reset all mock service state
 */
export function resetAllMocks() {
  // This would be called before each test
}
