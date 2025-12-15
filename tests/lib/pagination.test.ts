// tests/lib/pagination.test.ts
import { describe, it, expect } from 'vitest';

describe('Pagination Bounds', () => {
  function validatePagination(page: number, limit: number) {
    const safePage = Math.min(Math.max(page, 1), 10000);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return { page: safePage, limit: safeLimit };
  }

  it('should enforce maximum page limit', () => {
    const result = validatePagination(99999, 50);
    expect(result.page).toBe(10000);
  });

  it('should enforce minimum page limit', () => {
    const result = validatePagination(-5, 50);
    expect(result.page).toBe(1);
  });

  it('should enforce maximum items per page', () => {
    const result = validatePagination(1, 500);
    expect(result.limit).toBe(100);
  });

  it('should enforce minimum items per page', () => {
    const result = validatePagination(1, 0);
    expect(result.limit).toBe(1);
  });

  it('should keep valid values unchanged', () => {
    const result = validatePagination(5, 25);
    expect(result.page).toBe(5);
    expect(result.limit).toBe(25);
  });
});
