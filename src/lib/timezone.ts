// Timezone utilities for Indonesia (WIB = UTC+7)

/**
 * Get current date/time in WIB (UTC+7)
 */
export const getWIBTime = (): Date => {
  return new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
}

/**
 * Get WIB date string in YYYY-MM-DD format
 */
export const getWIBDateString = (): string => {
  return getWIBTime().toISOString().split('T')[0]
}

/**
 * Get WIB time string in HH:MM format
 */
export const getWIBTimeString = (): string => {
  const wibTime = getWIBTime()
  const hours = String(wibTime.getUTCHours()).padStart(2, '0')
  const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Get start of today in WIB timezone as UTC Date object
 * This is for database queries that expect UTC but we want WIB logic
 */
export const getWIBTodayStart = (): Date => {
  const todayWIB = getWIBDateString()
  // Create UTC date but offset by -7 hours to represent WIB start-of-day
  return new Date(todayWIB + 'T00:00:00.000+07:00')
}

/**
 * Convert date string and time string to WIB Date object
 * @param dateStr YYYY-MM-DD format
 * @param timeStr HH:MM format
 */
export const createWIBDateTime = (dateStr: string, timeStr: string): Date => {
  // Create UTC date from WIB input, then adjust
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  // Create date in WIB timezone (subtract 7 hours to store as UTC)
  const utcDate = new Date(year, month - 1, day, hours - 7, minutes)
  return utcDate
}

/**
 * Check if reminder should be sent now based on WIB timezone
 * Only send within a 10-minute window after the scheduled time
 */
export const shouldSendReminderNow = (startDate: string, scheduledTime: string): boolean => {
  // const nowWIB = getWIBTime() // Available for future use
  const todayWIB = getWIBDateString()
  const currentTimeWIB = getWIBTimeString()
  
  // Only send if it's the scheduled date
  if (startDate !== todayWIB) {
    return false
  }
  
  // Compare times properly - convert to minutes for accurate comparison
  const [currentHour, currentMinute] = currentTimeWIB.split(':').map(Number)
  const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number)
  
  const currentTotalMinutes = currentHour * 60 + currentMinute
  const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
  
  // Only send if current time is within 10 minutes AFTER scheduled time
  // (matches FastCron interval of 3 minutes with buffer)
  const timeDifferenceMinutes = currentTotalMinutes - scheduledTotalMinutes
  
  // Send if: 0 <= timeDifference <= 10 (within 10 minutes after scheduled time)
  // Using 3-minute FastCron interval with generous window to avoid timing conflicts
  return timeDifferenceMinutes >= 0 && timeDifferenceMinutes <= 10
}

/**
 * Convert UTC Date to WIB datetime string for display
 * @param utcDate UTC Date object from database
 * @returns WIB datetime in ISO format
 */
export const convertUTCToWIBString = (utcDate: Date): string => {
  // Add 7 hours to UTC to get WIB
  const wibDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000)
  return wibDate.toISOString()
}