/**
 * Template Test Fixtures
 * Provides realistic sample template data for testing
 */

export const createMockTemplate = (overrides = {}) => ({
  id: "template-123-uuid",
  name: "Medication Reminder",
  content: "Assalamu alaikum {{patientName}}! Jadwal minum obat Anda: {{medicationTime}}",
  category: "MEDICATION" as const,
  isActive: true,
  createdBy: "admin-123-uuid",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createInactiveTemplate = (overrides = {}) =>
  createMockTemplate({
    isActive: false,
    ...overrides,
  });

export const mockTemplates = {
  medication: createMockTemplate({
    name: "Medication Reminder",
    category: "MEDICATION",
  }),
  appointment: createMockTemplate({
    name: "Appointment Reminder",
    category: "APPOINTMENT",
  }),
  verification: createMockTemplate({
    name: "Verification Request",
    category: "VERIFICATION",
  }),
  inactive: createInactiveTemplate(),
};

export const mockCreateTemplateInput = {
  name: "New Template",
  content: "Hello {{patientName}}, this is your reminder",
  category: "MEDICATION",
};

export const mockUpdateTemplateInput = {
  name: "Updated Template",
  content: "Updated content with {{variable}}",
};
