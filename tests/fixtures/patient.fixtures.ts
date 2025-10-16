/**
 * Patient Test Fixtures
 * Provides realistic sample patient data for testing
 */

export const createMockPatient = (overrides = {}) => ({
  id: "patient-123-uuid",
  phoneNumber: "62812345678",
  name: "Budi Santoso",
  age: 45,
  gender: "LAKI_LAKI" as const,
  maritalStatus: "KAWIN" as const,
  verificationStatus: "VERIFIED" as const,
  clerkUserId: null,
  assignedVolunteerId: "volunteer-123-uuid",
  clinicName: "Klinik Kesehatan Maju",
  verifiedAt: new Date().toISOString(),
  isActive: true,
  deletedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createPendingPatient = (overrides = {}) =>
  createMockPatient({
    verificationStatus: "PENDING",
    verifiedAt: null,
    ...overrides,
  });

export const createUnverifiedPatient = (overrides = {}) =>
  createMockPatient({
    verificationStatus: "UNVERIFIED",
    verifiedAt: null,
    ...overrides,
  });

export const createInactivePatient = (overrides = {}) =>
  createMockPatient({
    isActive: false,
    ...overrides,
  });

export const createDeletedPatient = (overrides = {}) =>
  createMockPatient({
    isActive: false,
    deletedAt: new Date().toISOString(),
    ...overrides,
  });

export const mockPatients = {
  verified: createMockPatient(),
  pending: createPendingPatient(),
  unverified: createUnverifiedPatient(),
  inactive: createInactivePatient(),
  deleted: createDeletedPatient(),
};

export const mockCreatePatientInput = {
  phoneNumber: "62812345678",
  name: "Budi Santoso",
  age: 45,
  gender: "LAKI_LAKI",
  maritalStatus: "KAWIN",
  clinicName: "Klinik Kesehatan Maju",
};

export const mockUpdatePatientInput = {
  name: "Budi Updated",
  age: 46,
  clinicName: "Klinik Baru",
};
