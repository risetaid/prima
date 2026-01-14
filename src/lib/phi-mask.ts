/**
 * PHI (Protected Health Information) Masking Utility
 *
 * CRITICAL: This utility ensures HIPAA compliance by preventing PHI from
 * appearing in logs, audit trails, and other non-authorized outputs.
 *
 * Fields that must NEVER be logged:
 * - name, patientName, emergencyContactName
 * - phoneNumber, phone, emergencyContactPhone
 * - address, fullAddress, email
 * - dateOfBirth, diagnosis, notes
 * - medicalRecordNumber, insuranceId, ssn
 * - ipAddress, deviceId, sessionId
 */

// Fields that contain PHI and must be masked
const PHI_FIELDS = new Set([
  'name',
  'patientName',
  'patient_name',
  'emergencyContactName',
  'emergency_contact_name',
  'phoneNumber',
  'phone',
  'phone_number',
  'emergencyContactPhone',
  'emergency_contact_phone',
  'address',
  'fullAddress',
  'full_address',
  'email',
  'dateOfBirth',
  'date_of_birth',
  'dob',
  'diagnosis',
  'notes',
  'medicalRecordNumber',
  'medical_record_number',
  'mrn',
  'insuranceId',
  'insurance_id',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
  'ipAddress',
  'ip_address',
  'deviceId',
  'device_id',
  'sessionId',
  'session_id',
]);

/**
 * Validates if a string is a valid UUID (version 4)
 */
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Checks if a value is a primitive that doesn't need processing
 */
function isPrimitive(
  value: unknown
): value is string | number | boolean | null | undefined {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Recursively sanitizes an object, masking all PHI fields.
 *
 * Handles nested objects, arrays, and deeply nested properties.
 * Preserves UUIDs for patientId and similar reference fields.
 *
 * @param data - The data to sanitize
 * @param seen - WeakSet to prevent circular reference issues
 * @returns Sanitized data with PHI fields masked
 */
export function sanitizeForAudit<T extends Record<string, unknown>>(
  data: T,
  seen = new WeakSet()
): T {
  // Handle primitives - no processing needed
  if (isPrimitive(data)) {
    return data;
  }

  // Handle null/undefined after primitive check
  if (data === null || data === undefined) {
    return data;
  }

  // Prevent circular reference issues
  if (seen.has(data)) {
    return data;
  }
  seen.add(data);

  // Handle arrays - sanitize each element
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForAudit(item, seen)) as unknown as T;
  }

  // Create a shallow copy to avoid mutating original
  const sanitized = { ...data } as Record<string, unknown>;

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];

    // Skip null/undefined values
    if (value === null || value === undefined) {
      continue;
    }

    // Check if this key is a PHI field
    if (PHI_FIELDS.has(key)) {
      // Special handling: allow UUIDs for patientId but redact names
      const isPatientIdValue =
        key === 'patientId' || key === 'patient_id' || key === 'patientID';
      if (
        isPatientIdValue &&
        typeof value === 'string' &&
        isValidUUID(value)
      ) {
        // Keep UUIDs but mask any non-UUID values
        continue;
      }
      // Mask all PHI values
      sanitized[key] = '[PHI-REDACTED]';
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForAudit(
        value as Record<string, unknown>,
        seen
      );
    }
  }

  return sanitized as T;
}

/**
 * Masks patient identifiers while preserving UUIDs for audit reference.
 * Use this when you need to log patient data but must hide PII.
 */
export function maskPatientObject<T extends Record<string, unknown>>(
  patient: T
): T {
  const masked = { ...patient } as Record<string, unknown>;

  for (const key of Object.keys(masked)) {
    const value = masked[key];

    // Keep UUID id field for reference
    if ((key === 'id' || key === 'Id' || key === 'ID') && isValidUUID(String(value))) {
      continue;
    }

    // Mask everything else that looks like PHI
    if (PHI_FIELDS.has(key)) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'string' && isValidUUID(value)) {
      // Keep UUIDs for other ID fields too
      continue;
    }
  }

  return masked as T;
}

/**
 * Safely extracts patient reference for audit logs (UUID only, no identifiers).
 * This is the ONLY safe way to reference patients in audit logs.
 */
export function extractPatientReference(patient: {
  id: string;
}): { patientId: string } {
  return { patientId: patient.id }; // Only UUID, never identifiers
}

/**
 * Creates a sanitized context object for logging.
 * Use this to safely log context that might contain patient data.
 */
export function sanitizeContext<
  T extends Record<string, unknown>
>(context: T): T {
  return sanitizeForAudit(context);
}

/**
 * Checks if a given key contains PHI patterns (for validation purposes)
 */
export function isPHIField(key: string): boolean {
  return PHI_FIELDS.has(key.toLowerCase());
}

/**
 * List of all PHI field names (for documentation/validation)
 */
export const PHI_FIELD_NAMES = Array.from(PHI_FIELDS);
