/**
 * Centralized date and time utilities for PRIMA system
 * Handles timezone conversions, formatting, and common date operations
 */

export interface DateRange {
  start: Date
  end: Date
}

export interface TimeSlot {
  hour: number
  minute: number
  label: string
}

/**
 * Indonesian timezone utilities
 */
export class DateUtils {
  private static readonly WIB_OFFSET = 7 * 60 * 60 * 1000 // 7 hours in milliseconds

  /**
   * Convert UTC date to WIB (Western Indonesian Time)
   */
  static toWIB(date: Date): Date {
    return new Date(date.getTime() + this.WIB_OFFSET)
  }

  /**
   * Convert WIB date to UTC
   */
  static fromWIB(date: Date): Date {
    return new Date(date.getTime() - this.WIB_OFFSET)
  }

  /**
   * Format date to WIB string
   */
  static formatDateWIB(date: Date): string {
    const wibDate = this.toWIB(date)
    return wibDate.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Format date and time to WIB string
   */
  static formatDateTimeWIB(date: Date): string {
    const wibDate = this.toWIB(date)
    return wibDate.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Format time only to WIB string
   */
  static formatTimeWIB(date: Date): string {
    const wibDate = this.toWIB(date)
    return wibDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get start of day in WIB
   */
  static getStartOfDayWIB(date: Date = new Date()): Date {
    const wibDate = this.toWIB(date)
    wibDate.setHours(0, 0, 0, 0)
    return this.fromWIB(wibDate)
  }

  /**
   * Get end of day in WIB
   */
  static getEndOfDayWIB(date: Date = new Date()): Date {
    const wibDate = this.toWIB(date)
    wibDate.setHours(23, 59, 59, 999)
    return this.fromWIB(wibDate)
  }

  /**
   * Get date range for the current day in WIB
   */
  static getTodayRangeWIB(): DateRange {
    const now = new Date()
    return {
      start: this.getStartOfDayWIB(now),
      end: this.getEndOfDayWIB(now)
    }
  }

  /**
   * Get date range for the last N days in WIB
   */
  static getLastNDaysRangeWIB(days: number): DateRange {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    return {
      start: this.getStartOfDayWIB(start),
      end: this.getEndOfDayWIB(end)
    }
  }

  /**
   * Check if a date is today in WIB
   */
  static isTodayWIB(date: Date): boolean {
    const today = this.getTodayRangeWIB()
    return date >= today.start && date <= today.end
  }

  /**
   * Get all time slots for medication reminders (every 4 hours)
   */
  static getMedicationTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = []
    for (let hour = 6; hour <= 22; hour += 4) {
      slots.push({
        hour,
        minute: 0,
        label: `${hour.toString().padStart(2, '0')}:00`
      })
    }
    return slots
  }

  /**
   * Parse time string (HH:MM) to Date object
   */
  static parseTimeString(timeString: string): Date | null {
    const match = timeString.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null

    const hour = parseInt(match[1], 10)
    const minute = parseInt(match[2], 10)

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

    const date = new Date()
    date.setHours(hour, minute, 0, 0)
    return date
  }

  /**
   * Format time string for display
   */
  static formatTimeString(hour: number, minute: number = 0): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  /**
   * Calculate age from birth date
   */
  static calculateAge(birthDate: Date): number {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(date: Date, range: DateRange): boolean {
    return date >= range.start && date <= range.end
  }

  /**
   * Get business days between two dates (excluding weekends)
   */
  static getBusinessDaysBetween(startDate: Date, endDate: Date): number {
    let businessDays = 0
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        businessDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return businessDays
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  /**
   * Add hours to a date
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
  }

  /**
   * Get relative time string (e.g., "2 hours ago", "in 3 days")
   */
  static getRelativeTimeString(date: Date): string {
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
    const diffMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60))

    const isPast = diffMs < 0
    const suffix = isPast ? ' yang lalu' : ' lagi'

    if (diffDays > 0) {
      return `${diffDays} hari${suffix}`
    } else if (diffHours > 0) {
      return `${diffHours} jam${suffix}`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} menit${suffix}`
    } else {
      return 'baru saja'
    }
  }

  /**
   * Validate date range
   */
  static isValidDateRange(range: DateRange): boolean {
    return range.start <= range.end
  }

  /**
   * Get ISO date string without time
   */
  static toISODateString(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Parse ISO date string to Date object
   */
  static fromISODateString(dateString: string): Date {
    return new Date(dateString + 'T00:00:00.000Z')
  }
}

/**
 * Legacy exports for backward compatibility
 */
export const formatDateWIB = DateUtils.formatDateWIB.bind(DateUtils)
export const formatDateTimeWIB = DateUtils.formatDateTimeWIB.bind(DateUtils)
export const formatTimeWIB = DateUtils.formatTimeWIB.bind(DateUtils)
export const getStartOfDayWIB = DateUtils.getStartOfDayWIB.bind(DateUtils)
export const getEndOfDayWIB = DateUtils.getEndOfDayWIB.bind(DateUtils)
export const getTodayRangeWIB = DateUtils.getTodayRangeWIB.bind(DateUtils)
export const isTodayWIB = DateUtils.isTodayWIB.bind(DateUtils)

