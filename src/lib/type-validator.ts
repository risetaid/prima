// Type validation utilities to prevent data corruption
export function validateBoolean(value: unknown, fieldName: string, defaultValue: boolean = false): boolean {
  if (value === undefined || value === null) {
    return defaultValue
  }
  
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === '') {
      return false
    }
  }
  
  if (typeof value === 'number') {
    return value !== 0
  }
  
  throw new Error(`Invalid ${fieldName}: expected boolean, got ${typeof value}`)
}

export function validateString(value: unknown, fieldName: string, options: { 
  required?: boolean, 
  minLength?: number, 
  maxLength?: number,
  pattern?: RegExp
} = {}): string | null {
  if (value === undefined || value === null) {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return null
  }
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`)
  }
  
  const trimmed = value.trim()
  
  if (options.required && trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`)
  }
  
  if (options.minLength && trimmed.length < options.minLength) {
    throw new Error(`${fieldName} must be at least ${options.minLength} characters`)
  }
  
  if (options.maxLength && trimmed.length > options.maxLength) {
    throw new Error(`${fieldName} must be at most ${options.maxLength} characters`)
  }
  
  if (options.pattern && !options.pattern.test(trimmed)) {
    throw new Error(`${fieldName} format is invalid`)
  }
  
  return trimmed.length === 0 ? null : trimmed
}

export function validateNumber(value: unknown, fieldName: string, options: {
  required?: boolean,
  min?: number,
  max?: number,
  integer?: boolean
} = {}): number | null {
  if (value === undefined || value === null || value === '') {
    if (options.required) {
      throw new Error(`${fieldName} is required`)
    }
    return null
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`)
  }
  
  if (options.integer && !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be an integer`)
  }
  
  if (options.min !== undefined && num < options.min) {
    throw new Error(`${fieldName} must be at least ${options.min}`)
  }
  
  if (options.max !== undefined && num > options.max) {
    throw new Error(`${fieldName} must be at most ${options.max}`)
  }
  
  return num
}