// Date validation utilities to prevent data corruption
export function isValidDate(dateString: any): boolean {
  if (!dateString) return false
  if (typeof dateString !== 'string') return false
  
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString.substring(0, 10))
}

export function validateAndParseDate(dateString: any, fieldName: string = 'date'): Date | null {
  if (!dateString) return null
  
  if (!isValidDate(dateString)) {
    throw new Error(`Invalid ${fieldName}: ${dateString}. Must be a valid ISO date string (YYYY-MM-DD).`)
  }
  
  return new Date(dateString)
}

export function isReasonableDate(date: Date, fieldName: string = 'date'): boolean {
  const now = new Date()
  const minDate = new Date('1900-01-01') // Reasonable minimum date
  const maxDate = new Date(now.getFullYear() + 10, 11, 31) // 10 years in future max
  
  if (date < minDate || date > maxDate) {
    throw new Error(`${fieldName} is outside reasonable range (1900 to ${maxDate.getFullYear()})`)
  }
  
  return true
}

export function validateBirthDate(dateString: any): Date | null {
  if (!dateString) return null
  
  const date = validateAndParseDate(dateString, 'birth date')
  if (!date) return null
  
  const now = new Date()
  const age = now.getFullYear() - date.getFullYear()
  
  if (age < 0 || age > 150) {
    throw new Error('Birth date results in unrealistic age (0-150 years)')
  }
  
  return date
}

export function validateFutureDate(dateString: any, fieldName: string = 'date'): Date {
  const date = validateAndParseDate(dateString, fieldName)
  if (!date) throw new Error(`${fieldName} is required`)
  
  const now = new Date()
  if (date <= now) {
    throw new Error(`${fieldName} must be in the future`)
  }
  
  return date
}