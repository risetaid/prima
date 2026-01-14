/**
 * API Versioning Tests
 *
 * Tests for API versioning headers and helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  API_VERSION,
  VERSION_HEADER,
  DEPRECATED_HEADER,
  createVersionHeaders,
  getRequestedVersion,
  isOutdatedVersion,
  createDeprecationWarning,
} from '@/lib/api-versioning';

describe('API Versioning', () => {
  describe('Constants', () => {
    it('should export current API version', () => {
      expect(API_VERSION).toBe('v1');
    });

    it('should export version header name', () => {
      expect(VERSION_HEADER).toBe('API-Version');
    });

    it('should export deprecation header name', () => {
      expect(DEPRECATED_HEADER).toBe('Deprecation');
    });
  });

  describe('createVersionHeaders', () => {
    it('should create headers with default version', () => {
      const headers = createVersionHeaders({});

      expect(headers[VERSION_HEADER]).toBe('v1');
      expect(headers[DEPRECATED_HEADER]).toBeUndefined();
    });

    it('should include custom version when provided', () => {
      const headers = createVersionHeaders({ version: 'v2' });

      expect(headers[VERSION_HEADER]).toBe('v2');
    });

    it('should include deprecation header when deprecated', () => {
      const headers = createVersionHeaders({ deprecated: true });

      expect(headers[DEPRECATED_HEADER]).toBe('true');
    });

    it('should include sunset date in deprecation header', () => {
      const sunsetDate = '2028-01-01T00:00:00Z';
      const headers = createVersionHeaders({
        deprecated: true,
        sunsetDate,
      });

      expect(headers[DEPRECATED_HEADER]).toContain('true');
      expect(headers[DEPRECATED_HEADER]).toContain('sunset=');
    });
  });

  describe('getRequestedVersion', () => {
    it('should extract version from request header', () => {
      const request = new Request('http://test.com', {
        headers: {
          'API-Version': 'v1',
        },
      });

      const version = getRequestedVersion(request);

      expect(version).toBe('v1');
    });

    it('should return null when no version header', () => {
      const request = new Request('http://test.com');

      const version = getRequestedVersion(request);

      expect(version).toBeNull();
    });
  });

  describe('isOutdatedVersion', () => {
    it('should return false for current version', () => {
      const request = new Request('http://test.com', {
        headers: {
          'API-Version': 'v1',
        },
      });

      const outdated = isOutdatedVersion(request);

      expect(outdated).toBe(false);
    });

    it('should return true for outdated version', () => {
      const request = new Request('http://test.com', {
        headers: {
          'API-Version': 'v0',
        },
      });

      const outdated = isOutdatedVersion(request);

      expect(outdated).toBe(true);
    });

    it('should return false when no version requested', () => {
      const request = new Request('http://test.com');

      const outdated = isOutdatedVersion(request);

      expect(outdated).toBe(false);
    });
  });

  describe('createDeprecationWarning', () => {
    it('should create warning with sunset date', () => {
      const warning = createDeprecationWarning('2028-01-01');

      expect(warning).toContain('v1');
      expect(warning).toContain('2028-01-01');
    });

    it('should create warning without sunset date', () => {
      const warning = createDeprecationWarning();

      expect(warning).toContain('v1');
      expect(warning).toContain('deprecated');
    });
  });
});
