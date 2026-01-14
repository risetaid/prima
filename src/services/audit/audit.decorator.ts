/**
 * Audit Decorator for PRIMA
 *
 * TypeScript decorator for automatic audit logging of patient data access.
 * CRITICAL: All decorated methods automatically log to audit_logs table
 * with PHI excluded from the metadata.
 */

import 'reflect-metadata';
import { auditService, AuditContext } from './audit.service';

/**
 * Metadata key for audit configuration
 */
const AUDIT_METADATA_KEY = Symbol('auditable');

/**
 * Audit decorator options
 */
export interface AuditableOptions {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT';
  resourceType: 'patient' | 'reminder' | 'user' | 'message' | 'content' | 'export';
  /**
   * Function to extract patient ID from arguments or return value
   * If not provided, will try to find 'patientId' in first argument
   */
  getPatientId?: (args: unknown[], result: unknown) => string | undefined;
  /**
   * Function to extract resource ID from arguments or return value
   */
  getResourceId?: (args: unknown[], result: unknown) => string | undefined;
  /**
   * Function to extract metadata from arguments or return value
   * CRITICAL: Metadata will be sanitized to remove PHI
   */
  getMetadata?: (args: unknown[], result: unknown) => Record<string, unknown> | undefined;
}

/**
 * @Auditable() decorator factory
 *
 * Usage:
 * ```typescript
 * @Auditable({
 *   action: 'READ',
 *   resourceType: 'patient',
 *   getPatientId: (args, result) => args[0],
 *   getResourceId: (args, result) => result?.id,
 * })
 * async getPatient(id: string) { ... }
 * ```
 */
export function Auditable(options: AuditableOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // Store audit configuration in metadata (if reflect-metadata is available)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof Reflect !== 'undefined' && typeof (Reflect as any).defineMetadata === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Reflect as any).defineMetadata(AUDIT_METADATA_KEY, options, descriptor.value);
    }

    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();

      // Execute the original method
      const result = await originalMethod.apply(this, args);

      try {
        // Get audit context from the instance (if it has getAuditContext)
        const context = (this as { getAuditContext?: () => AuditContext }).getAuditContext?.();

        // Extract audit information
        const patientId = options.getPatientId
          ? options.getPatientId(args, result)
          : extractPatientId(args, result);

        const resourceId = options.getResourceId
          ? options.getResourceId(args, result)
          : extractResourceId(args, result);

        const metadata = options.getMetadata
          ? options.getMetadata(args, result)
          : { args: sanitizeArgs(args) };

        // Log the audit event (non-blocking, fire-and-forget)
        if (patientId || resourceId) {
          auditService.logAccess({
            action: options.action,
            resourceType: options.resourceType,
            resourceId,
            patientId,
            metadata: {
              ...metadata,
              _audit: {
                method: methodName,
                duration_ms: Date.now() - startTime,
                timestamp: new Date().toISOString(),
              },
            },
            context,
          }).catch((error) => {
            // Silent fail - audit logging should not break the main operation
            console.error('Audit logging failed:', error);
          });
        }
      } catch (auditError) {
        // Audit logging should never break the main operation
        console.error('Audit decorator error:', auditError);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Extract patient ID from method arguments or result
 */
function extractPatientId(args: unknown[], result: unknown): string | undefined {
  // Try to find patientId in first argument
  if (args.length > 0 && args[0] && typeof args[0] === 'object') {
    const firstArg = args[0] as Record<string, unknown>;
    if (firstArg.patientId && typeof firstArg.patientId === 'string') {
      return firstArg.patientId;
    }
    if (firstArg.id && typeof firstArg.id === 'string') {
      return firstArg.id;
    }
  }

  // Try to find in result
  if (result && typeof result === 'object') {
    const resultObj = result as Record<string, unknown>;
    if (resultObj.patientId && typeof resultObj.patientId === 'string') {
      return resultObj.patientId;
    }
    if (resultObj.id && typeof resultObj.id === 'string') {
      return resultObj.id;
    }
  }

  return undefined;
}

/**
 * Extract resource ID from method arguments or result
 */
function extractResourceId(args: unknown[], result: unknown): string | undefined {
  // Try to find id in first argument
  if (args.length > 0 && args[0] && typeof args[0] === 'object') {
    const firstArg = args[0] as Record<string, unknown>;
    if (firstArg.id && typeof firstArg.id === 'string') {
      return firstArg.id;
    }
  }

  // Try to find in result
  if (result && typeof result === 'object') {
    const resultObj = result as Record<string, unknown>;
    if (resultObj.id && typeof resultObj.id === 'string') {
      return resultObj.id;
    }
  }

  return undefined;
}

/**
 * Sanitize arguments to remove PHI before including in audit metadata
 */
function sanitizeArgs(args: unknown[]): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === null || arg === undefined) {
      continue;
    }

    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      sanitized[`arg${i}`] = arg;
    } else if (typeof arg === 'object') {
      // For objects, include a summary (not the full object to avoid PHI)
      const obj = arg as Record<string, unknown>;
      const keys = Object.keys(obj).filter(
        k => !isPhiField(k) && !isSensitiveField(k)
      );
      if (keys.length > 0) {
        sanitized[`arg${i}`] = { keys: keys.join(', ') };
      }
    }
  }

  return sanitized;
}

/**
 * Check if a field is likely PHI
 */
function isPhiField(key: string): boolean {
  const phiPatterns = [
    'name',
    'phone',
    'email',
    'address',
    'diagnosis',
    'notes',
    'emergencyContact',
    'dateOfBirth',
    'ssn',
    'medicalRecord',
  ];

  return phiPatterns.some(pattern =>
    key.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if a field is sensitive (should not be logged)
 */
function isSensitiveField(key: string): boolean {
  const sensitivePatterns = [
    'password',
    'token',
    'secret',
    'key',
  ];

  return sensitivePatterns.some(pattern =>
    key.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Create audit context from request (for use in API routes)
 */
export function createAuditContext(request: Request): AuditContext {
  return {
    requestId: request.headers.get('x-request-id') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               undefined,
  };
}

/**
 * Mixin to add audit context capability to a class
 */
export const AuditableMixin = (superclass: new () => object) => class extends superclass {
  private _auditContext?: AuditContext;

  setAuditContext(context: AuditContext): void {
    this._auditContext = context;
  }

  getAuditContext(): AuditContext | undefined {
    return this._auditContext;
  }
};
