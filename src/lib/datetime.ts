// Consolidated DateTime utilities for PRIMA system
// Essential WIB (UTC+7) timezone functions only

import { logger } from "@/lib/logger";

export const TIMEZONE_WIB = "Asia/Jakarta";

// ===== CORE WIB FUNCTIONS =====

/**
 * Get current date/time in WIB timezone (UTC+7)
 */
export const getWIBTime = (): Date => {
  return new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
};

/**
 * Check if reminder should send now (exact minute match in WIB)
 */
export const shouldSendReminderNow = (scheduleDate: string, reminderTime: string): boolean => {
  const now = getWIBTime();
  const currentDateWIB = now.toISOString().split("T")[0];
  const currentTimeWIB = now.toTimeString().slice(0, 5); // HH:MM format
  
  return currentDateWIB === scheduleDate && currentTimeWIB === reminderTime;
};

/**
 * Format date to WIB string
 */
export const formatDateWIB = (date: Date): string => {
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibDate.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date and time to WIB string
 */
export const formatDateTimeWIB = (date: Date): string => {
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibDate.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Create WIB date range from date string
 */
export const createWIBDateRange = (date: string): {start: Date, end: Date} => {
  // Create start of day in WIB (UTC)
  const start = new Date(date + 'T00:00:00.000+07:00');
  // Create end of day in WIB (UTC)
  const end = new Date(date + 'T23:59:59.999+07:00');
  
  return { start, end };
};

/**
 * Validate 24-hour time format (HH:MM)
 */
export const isValidWIBTime = (time: string): boolean => {
  if (!time) return false;
  
  // Check format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

// ===== ADDITIONAL ESSENTIAL FUNCTIONS =====

/**
 * Get current date in YYYY-MM-DD format (WIB timezone)
 */
export const getCurrentDateWIB = (): string => {
  const wibNow = getWIBTime();
  const year = wibNow.getUTCFullYear();
  const month = String(wibNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current time in HH:MM format (WIB timezone)
 */
export const getCurrentTimeWIB = (): string => {
  const wibNow = getWIBTime();
  const hours = String(wibNow.getUTCHours()).padStart(2, '0');
  const minutes = String(wibNow.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};



/**
 * Format time only to WIB string
 */
export const formatTimeWIB = (date: Date): string => {
  const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Convert Indonesian date format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
 */
export const indonesianToISO = (indonesianDate: string): string => {
  if (!indonesianDate) return '';

  const parts = indonesianDate.split('/');
  if (parts.length !== 3) return '';

  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];

  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime())) return '';

  return `${year}-${month}-${day}`;
};

/**
 * Convert ISO date format (yyyy-mm-dd) to Indonesian format (dd/mm/yyyy)
 */
export const isoToIndonesian = (isoDate: string): string => {
  if (!isoDate) return '';

  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Ensure 24-hour format for time strings
 */
export const ensure24HourFormat = (timeString: string): string => {
  if (!timeString) return getCurrentTimeWIB();

  // If already in 24-hour format, return as is
  if (isValidWIBTime(timeString)) {
    return timeString;
  }

  // Try to parse as 12-hour format
  const twelveHourRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/;
  const match = timeString.match(twelveHourRegex);

  if (match) {
    const [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);

    if (period && period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutesStr}`;
  }

  logger.warn(`Invalid time format: ${timeString}, using current time`, {
    timeString,
  });
  return getCurrentTimeWIB();
};

// ===== LEGACY COMPATIBILITY =====

/**
 * Format date input value (YYYY-MM-DD) for HTML input fields
 */
export const formatDateInputWIB = (dateString?: string | Date): string => {
  if (!dateString) return getCurrentDateWIB();

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toISOString().split("T")[0];
};

/**
 * Validate Indonesian date format (dd/mm/yyyy)
 */
export const isValidIndonesianDate = (dateString: string): boolean => {
  if (!dateString) return false;

  const parts = dateString.split("/");
  if (parts.length !== 3) return false;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Basic validation
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 1900 ||
    year > 2100
  ) {
    return false;
  }

  // Check if date is valid
  const date = new Date(year, month - 1, day);
  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
};

/**
 * Check if selected time is valid for selected dates
 */
export const isTimeValidForSelectedDates = (
  selectedDates: string[],
  selectedTime: string
): { isValid: boolean; errorMessage?: string } => {
  if (!selectedTime || !isValidWIBTime(selectedTime)) {
    return { isValid: false, errorMessage: "Format waktu tidak valid" };
  }

  // If custom recurrence is enabled or no dates selected, any time is valid
  if (selectedDates.length === 0) {
    return { isValid: true };
  }

  // Get today's date in YYYY-MM-DD format (WIB)
  const today = getCurrentDateWIB();

  // Check if today is in selected dates
  const isTodaySelected = selectedDates.includes(today);

  if (!isTodaySelected) {
    // Today is not selected, any time is valid
    return { isValid: true };
  }

  // Today is selected, validate that time is greater than current time
  const currentTime = getCurrentTimeWIB();
  const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
  const [selectedHours, selectedMinutes] = selectedTime.split(":").map(Number);

  // Compare times
  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const selectedTotalMinutes = selectedHours * 60 + selectedMinutes;

  if (selectedTotalMinutes <= currentTotalMinutes) {
    return {
      isValid: false,
      errorMessage: `Untuk pengingat hari ini, jam harus lebih besar dari jam saat ini (${currentTime})`,
    };
  }

  return { isValid: true };
};

/**
 * Initialize 24-hour format enforcement globally
 */
export const initialize24HourFormat = () => {
  if (typeof document === "undefined") return;

  // Enforce format on initial load
  const enforce24HourFormat = () => {
    const timeInputs = document.querySelectorAll('input[type="time"]');
    timeInputs.forEach((input) => {
      const htmlInput = input as HTMLInputElement;
      if (htmlInput.value && !isValidWIBTime(htmlInput.value)) {
        htmlInput.value = ensure24HourFormat(htmlInput.value);
      }
    });
  };

  enforce24HourFormat();

  // Use MutationObserver to handle dynamically added time inputs
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (
            element.tagName === "INPUT" &&
            element.getAttribute("type") === "time"
          ) {
            shouldCheck = true;
          } else if (element.querySelectorAll) {
            const timeInputs = element.querySelectorAll('input[type="time"]');
            if (timeInputs.length > 0) {
              shouldCheck = true;
            }
          }
        }
      });
    });

    if (shouldCheck) {
      setTimeout(enforce24HourFormat, 10);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

// Backward compatibility exports
export const toWIB = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
};

export const nowWIB = getWIBTime;