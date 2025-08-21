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
  return getWIBTime().toTimeString().slice(0, 5)
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
 */
export const shouldSendReminderNow = (startDate: string, scheduledTime: string): boolean => {
  const nowWIB = getWIBTime()
  const todayWIB = getWIBDateString()
  const currentTimeWIB = getWIBTimeString()
  
  return startDate === todayWIB && currentTimeWIB >= scheduledTime
}