// DateTime utilities with UTC+7 timezone support for Indonesian users
// Enhanced with explicit 24-hour format enforcement

export const TIMEZONE_WIB = "Asia/Jakarta";

// Indonesian locale configuration for consistent 24-hour formatting
export const INDONESIAN_LOCALE = "id-ID";
export const TIME_FORMAT_OPTIONS = {
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
} as const;

/**
 * Format date to Indonesian locale with WIB timezone
 */
export const formatDateWIB = (dateString?: string | Date) => {
  if (!dateString) return "";

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  return date.toLocaleDateString("id-ID", {
    timeZone: TIMEZONE_WIB,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Format datetime to Indonesian locale with WIB timezone
 */
export const formatDateTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return "";

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  return date.toLocaleString("id-ID", {
    timeZone: TIMEZONE_WIB,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Format time only to Indonesian locale with WIB timezone
 */
export const formatTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return "";

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  return date.toLocaleTimeString("id-ID", {
    timeZone: TIMEZONE_WIB,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Get current date/time in WIB timezone (UTC+7)
 */
export const nowWIB = () => {
  const now = new Date();
  // Add 7 hours to UTC to get WIB
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
};

/**
 * Convert any date to WIB timezone
 */
export const toWIB = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  // Add 7 hours to UTC to get WIB
  return new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
};

/**
 * Format relative time (e.g., "2 jam yang lalu") in WIB
 */
export const formatRelativeTimeWIB = (dateString?: string | Date) => {
  if (!dateString) return "";

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  const now = nowWIB();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;

  return formatDateWIB(date);
};

/**
 * Get current date in YYYY-MM-DD format (WIB timezone)
 */
export const getCurrentDateWIB = () => {
  const wibNow = nowWIB();
  const year = wibNow.getUTCFullYear();
  const month = String(wibNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wibNow.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Get current time in HH:MM format (WIB timezone)
 */
export const getCurrentTimeWIB = () => {
  const wibNow = nowWIB();
  const hours = String(wibNow.getUTCHours()).padStart(2, "0");
  const minutes = String(wibNow.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * Format date input value (YYYY-MM-DD) for HTML input fields
 */
export const formatDateInputWIB = (dateString?: string | Date) => {
  if (!dateString) return getCurrentDateWIB();

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toISOString().split("T")[0];
};

/**
 * Format time input value (HH:MM) for HTML input fields
 */
export const formatTimeInputWIB = (dateString?: string | Date) => {
  if (!dateString) return getCurrentTimeWIB();

  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toTimeString().slice(0, 5);
};

/**
 * Convert Indonesian date format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
 */
export const indonesianToISO = (indonesianDate: string): string => {
  if (!indonesianDate) return "";

  // Handle both dd/mm/yyyy and dd/mm formats
  const parts = indonesianDate.split("/");
  if (parts.length !== 3 && parts.length !== 2) return "";

  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year =
    parts.length === 3 ? parts[2] : new Date().getFullYear().toString();

  // Validate date
  const date = new Date(`${year}-${month}-${day}`);
  if (isNaN(date.getTime())) return "";

  return `${year}-${month}-${day}`;
};

/**
 * Convert ISO date format (yyyy-mm-dd) to Indonesian format (dd/mm/yyyy)
 */
export const isoToIndonesian = (isoDate: string): string => {
  if (!isoDate) return "";

  const date = new Date(isoDate + "T00:00:00");
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
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
 * Validate 24-hour time format (HH:MM)
 */
export const isValid24HourTime = (timeString: string): boolean => {
  if (!timeString) return false;

  // Check format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) return false;

  const [hours, minutes] = timeString.split(":").map(Number);

  // Additional validation
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

/**
 * Convert 12-hour time format to 24-hour format if needed
 * Handles cases where browser might return AM/PM format
 */
export const ensure24HourFormat = (timeString: string): string => {
  if (!timeString) return getCurrentTimeWIB();

  // If already in 24-hour format, return as is
  if (isValid24HourTime(timeString)) {
    return timeString;
  }

  // Try to parse as 12-hour format (e.g., "02:30 PM")
  const twelveHourRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/;
  const match = timeString.match(twelveHourRegex);

  if (match) {
    let [, hoursStr, minutesStr, period] = match;
    let hours = parseInt(hoursStr, 10);

    // Convert to 24-hour format
    if (period && period.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    } else if (period && period.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutesStr}`;
  }

  // If parsing fails, return current time as fallback
  console.warn(`Invalid time format: ${timeString}, using current time`);
  return getCurrentTimeWIB();
};

/**
 * Format time for display with explicit 24-hour format
 */
export const formatTimeForDisplay = (timeString?: string): string => {
  if (!timeString) return getCurrentTimeWIB();

  const validTime = ensure24HourFormat(timeString);
  return validTime;
};

/**
 * Get time input constraints for HTML input validation
 */
export const getTimeInputConstraints = () => ({
  pattern: "[0-9]{2}:[0-9]{2}",
  title: "Format: HH:MM (24 jam)",
  step: 60,
  placeholder: "HH:MM",
});

/**
 * Force 24-hour format on all time inputs in the DOM
 * Call this function on page load or when time inputs are added dynamically
 */
export const enforce24HourFormat = () => {
  if (typeof document === "undefined") return;

  const timeInputs = document.querySelectorAll('input[type="time"]');

  timeInputs.forEach((input) => {
    const htmlInput = input as HTMLInputElement;

    // Add event listener to ensure 24-hour format on change
    const enforceFormat = () => {
      if (htmlInput.value && !isValid24HourTime(htmlInput.value)) {
        htmlInput.value = ensure24HourFormat(htmlInput.value);
      }
    };

    // Remove existing listeners to avoid duplicates
    htmlInput.removeEventListener("change", enforceFormat);
    htmlInput.removeEventListener("input", enforceFormat);

    // Add new listeners
    htmlInput.addEventListener("change", enforceFormat);
    htmlInput.addEventListener("input", enforceFormat);

    // Force initial format if needed
    if (htmlInput.value) {
      enforceFormat();
    }
  });
};

/**
 * Initialize 24-hour format enforcement globally
 * Call this once when the app starts
 */
export const initialize24HourFormat = () => {
  if (typeof document === "undefined") return;

  // Enforce format on initial load
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
      // Small delay to ensure DOM is ready
      setTimeout(enforce24HourFormat, 10);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also enforce on window focus (in case user switches tabs)
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      setTimeout(enforce24HourFormat, 100);
    });
  }
};
