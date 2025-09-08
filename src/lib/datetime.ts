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