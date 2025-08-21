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
 * Get current date/time in WIB timezone
 */
export const nowWIB = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE_WIB }))
}

/**
 * Convert any date to WIB timezone
 */
export const toWIB = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Date(dateObj.toLocaleString('en-US', { timeZone: TIMEZONE_WIB }))
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
 * Format date input value (YYYY-MM-DD) for HTML input fields
 * This ensures the date appears correctly in Indonesian timezone
 */
export const formatDateInputWIB = (dateString?: string | Date) => {
  if (!dateString) return ''
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const wibDate = toWIB(date)
  
  return wibDate.toISOString().split('T')[0]
}