/**
 * Bun Test Type Definitions
 * Provides TypeScript support for bun:test module
 */

export interface TestOptions {
  timeout?: number;
  skip?: boolean;
  todo?: boolean;
}

export interface DescribeOptions {
  skip?: boolean;
  todo?: boolean;
}

export function describe(name: string, fn: () => void): void;
export function describe(name: string, options: DescribeOptions, fn: () => void): void;

export function it(name: string, fn: () => void | Promise<void>): void;
export function it(name: string, options: TestOptions, fn: () => void | Promise<void>): void;

export function test(name: string, fn: () => void | Promise<void>): void;
export function test(name: string, options: TestOptions, fn: () => void | Promise<void>): void;

export function beforeEach(fn: () => void | Promise<void>): void;
export function beforeEach(options: { timeout?: number }, fn: () => void | Promise<void>): void;

export function afterEach(fn: () => void | Promise<void>): void;
export function afterEach(options: { timeout?: number }, fn: () => void | Promise<void>): void;

export function beforeAll(fn: () => void | Promise<void>): void;
export function beforeAll(options: { timeout?: number }, fn: () => void | Promise<void>): void;

export function afterAll(fn: () => void | Promise<void>): void;
export function afterAll(options: { timeout?: number }, fn: () => void | Promise<void>): void;

export namespace expect {
  function toBe(value: any): void;
  function toEqual(value: any): void;
  function toContain(value: any): void;
  function toThrow(): void;
  function toBeNull(): void;
  function toBeDefined(): void;
  function toBeUndefined(): void;
  function toBeTruthy(): void;
  function toBeFalsy(): void;
  function toMatch(pattern: RegExp | string): void;
  function toHaveBeenCalled(): void;
  function toHaveBeenCalledWith(...args: any[]): void;
}

export function expect(value: any): any;
