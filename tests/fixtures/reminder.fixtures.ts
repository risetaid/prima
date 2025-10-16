/**
 * Reminder Test Fixtures
 * Provides realistic sample reminder data for testing
 */

export const createMockReminder = (overrides = {}) => ({
  id: "reminder-123-uuid",
  patientId: "patient-123-uuid",
  templateId: "template-123-uuid",
  title: "Minum Obat",
  message: "Jangan lupa minum obat pagi ini jam 08:00",
  status: "SCHEDULED" as const,
  scheduledTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  recurrence: "DAILY",
  recurrenceEndDate: null,
  fonnteMessageId: null,
  createdBy: "volunteer-123-uuid",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createSentReminder = (overrides = {}) =>
  createMockReminder({
    status: "SENT",
    fonnteMessageId: "msg-12345",
    ...overrides,
  });

export const createDeliveredReminder = (overrides = {}) =>
  createMockReminder({
    status: "DELIVERED",
    fonnteMessageId: "msg-12345",
    ...overrides,
  });

export const createFailedReminder = (overrides = {}) =>
  createMockReminder({
    status: "FAILED",
    fonnteMessageId: "msg-12345",
    ...overrides,
  });

export const createCancelledReminder = (overrides = {}) =>
  createMockReminder({
    status: "CANCELLED",
    ...overrides,
  });

export const mockReminders = {
  scheduled: createMockReminder(),
  sent: createSentReminder(),
  delivered: createDeliveredReminder(),
  failed: createFailedReminder(),
  cancelled: createCancelledReminder(),
};

export const mockCreateReminderInput = {
  patientId: "patient-123-uuid",
  templateId: "template-123-uuid",
  title: "Minum Obat",
  message: "Jangan lupa minum obat pagi ini jam 08:00",
  scheduledTime: new Date(Date.now() + 3600000).toISOString(),
  recurrence: "DAILY",
};

export const mockUpdateReminderInput = {
  title: "Minum Obat - Update",
  message: "Updated message",
  scheduledTime: new Date(Date.now() + 7200000).toISOString(),
};
