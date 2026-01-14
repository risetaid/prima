/**
 * API Versioning Helpers for PRIMA
 *
 * Provides version header helpers for consistent API versioning.
 */

// Current API version
export const API_VERSION = 'v1';

// Version header names (matching Prometheus convention and spec)
export const VERSION_HEADER = 'API-Version';
export const DEPRECATED_HEADER = 'Deprecation';
export const DEPRECATION_SUNSET_HEADER = 'Sunset-Date';

/**
 * Create version-aware response headers
 */
export function createVersionHeaders(options: {
  version?: string;
  deprecated?: boolean;
  sunsetDate?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};

  headers[VERSION_HEADER] = options.version || API_VERSION;

  if (options.deprecated) {
    headers[DEPRECATED_HEADER] = 'true';
    if (options.sunsetDate) {
      headers[DEPRECATED_HEADER] = `true, sunset=${options.sunsetDate}`;
    }
  }

  return headers;
}

/**
 * Parse version from request header
 */
export function getRequestedVersion(request: Request): string | null {
  return request.headers.get(VERSION_HEADER);
}

/**
 * Check if client is using outdated version
 */
export function isOutdatedVersion(request: Request): boolean {
  const requested = getRequestedVersion(request);
  if (!requested) return false;
  return requested !== API_VERSION;
}

/**
 * Create deprecation warning for responses
 */
export function createDeprecationWarning(sunsetDate?: string): string {
  const version = API_VERSION;
  if (sunsetDate) {
    return `API version ${version} will be deprecated on ${sunsetDate}. Please upgrade to ${version}.`;
  }
  return `API version ${version} is deprecated. Please upgrade to ${version}.`;
}
