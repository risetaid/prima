// DateTime utilities with UTC+7 timezone support for Indonesian users

export const TIMEZONE_WIB = 'Asia/Jakarta'

/**
 * Format date to Indonesian locale with WIB timezone
 */
export const formatDateWIB = (dateString?: string | Date) => {
  if (!dateString) return ''

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleDateString('id-ID', {
    timeZone: TIMEZONE_WIB,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format datetime to Indonesian locale with WIB timezone
 */
export const formatDateTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return ''

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleString('id-ID', {
    timeZone: TIMEZONE_WIB,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Format time only to Indonesian locale with WIB timezone
 */
export const formatTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return ''

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  return date.toLocaleTimeString('id-ID', {
    timeZone: TIMEZONE_WIB,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Get current date/time in WIB timezone (UTC+7)
 */
export const nowWIB = () => {
  const now = new Date()
  // Add 7 hours to UTC to get WIB
  return new Date(now.getTime() + (7 * 60 * 60 * 1000))
}

/**
 * Convert any date to WIB timezone
 */
export const toWIB = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Add 7 hours to UTC to get WIB
  return new Date(dateObj.getTime() + (7 * 60 * 60 * 1000))
}

/**
 * Format relative time (e.g., "2 jam yang lalu") in WIB
 */
export const formatRelativeTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return ''

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = nowWIB()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Baru saja'
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`

  return formatDateWIB(date)
}

/**
 * Get current date in YYYY-MM-DD format (WIB timezone)
 */
export const getCurrentDateWIB = () => {
  const wibNow = nowWIB()
  const year = wibNow.getUTCFullYear()
  const month = String(wibNow.getUTCMonth() + 1).padStart(2, '0')
  const day = String(wibNow.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current time in HH:MM format (WIB timezone)
 */
export const getCurrentTimeWIB = () => {
  const wibNow = nowWIB()
  const hours = String(wibNow.getUTCHours()).padStart(2, '0')
  const minutes = String(wibNow.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Format date input value (YYYY-MM-DD) for HTML input fields
 */
export const formatDateInputWIB = (dateString?: string | Date) => {
  if (!dateString) return getCurrentDateWIB()

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toISOString().split('T')[0]
}

/**
 * Format time input value (HH:MM) for HTML input fields
 */
export const formatTimeInputWIB = (dateString?: string | Date) => {
  if (!dateString) return getCurrentTimeWIB()

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toTimeString().slice(0, 5)
}

/**
 * Convert Indonesian date format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
 */
export const indonesianToISO = (indonesianDate: string): string => {
  if (!indonesianDate) return ''

  // Handle both dd/mm/yyyy and dd/mm formats
  const parts = indonesianDate.split('/')
  if (parts.length !== 3 && parts.length !== 2) return ''

  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  const year = parts.length === 3 ? parts[2] : new Date().getFullYear().toString()

  // Validate date
  const date = new Date(`${year}-${month}-${day}`)
  if (isNaN(date.getTime())) return ''

  return `${year}-${month}-${day}`
}

/**
 * Convert ISO date format (yyyy-mm-dd) to Indonesian format (dd/mm/yyyy)
 */
export const isoToIndonesian = (isoDate: string): string => {
  if (!isoDate) return ''

  const date = new Date(isoDate + 'T00:00:00')
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Validate Indonesian date format (dd/mm/yyyy)
 */
export const isValidIndonesianDate = (dateString: string): boolean => {
  if (!dateString) return false

  const parts = dateString.split('/')
  if (parts.length !== 3) return false

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  // Basic validation
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return false
  }

  // Check if date is valid
  const date = new Date(year, month - 1, day)
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year
}

