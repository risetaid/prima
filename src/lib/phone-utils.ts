/**
 * Centralized Phone Number Utilities for PRIMA Medical System
 *
 * This module centralizes all phone number handling logic to ensure
 * consistency across the application, especially for Indonesian phone numbers.
 */

import { formatWhatsAppNumber } from "./fonnte";

/**
 * Phone number format information
 */
export interface PhoneFormatInfo {
  original: string;
  formatted: string;
  isValid: boolean;
  alternatives: string[];
}

/**
 * Format a phone number and get alternative formats for matching
 */
export function formatPhoneWithAlternatives(
  phoneNumber: string
): PhoneFormatInfo {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return {
      original: phoneNumber,
      formatted: phoneNumber,
      isValid: false,
      alternatives: [],
    };
  }

  try {
    const formatted = formatWhatsAppNumber(phoneNumber);
    const alternatives = generatePhoneAlternatives(phoneNumber);

    return {
      original: phoneNumber,
      formatted,
      isValid: true,
      alternatives,
    };
  } catch (error) {
    return {
      original: phoneNumber,
      formatted: phoneNumber,
      isValid: false,
      alternatives: [],
    };
  }
}

/**
 * Generate alternative phone number formats for database matching
 * This handles Indonesian phone number variations (62xxxxxxxxx vs 0xxxxxxxxx)
 */
export function generatePhoneAlternatives(phoneNumber: string): string[] {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return [];
  }

  const cleaned = phoneNumber.replace(/\D/g, "");
  const alternatives: string[] = [];

  // If phone starts with 62, also try with 0
  if (cleaned.startsWith("62") && cleaned.length >= 11) {
    alternatives.push("0" + cleaned.slice(2));
  }
  // If phone starts with 0, also try with 62
  else if (cleaned.startsWith("0") && cleaned.length >= 10) {
    alternatives.push("62" + cleaned.slice(1));
  }

  return alternatives.filter((alt) => alt !== phoneNumber);
}

/**
 * Validate Indonesian phone number format
 */
export function isValidIndonesianPhone(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return false;
  }

  try {
    formatWhatsAppNumber(phoneNumber);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize phone number for consistent storage
 * This ensures all phone numbers are stored in the same format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return phoneNumber;
  }

  try {
    return formatWhatsAppNumber(phoneNumber);
  } catch {
    return phoneNumber;
  }
}

/**
 * Create database WHERE clause for phone number matching
 * This handles both the original format and alternatives
 */
export function createPhoneMatchClause(phoneNumber: string) {
  const alternatives = generatePhoneAlternatives(phoneNumber);

  if (alternatives.length === 0) {
    return { phoneNumber };
  }

  return {
    phoneNumber,
    alternatives,
  };
}

/**
 * Get phone number display format (user-friendly)
 */
export function getDisplayPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    return phoneNumber;
  }

  try {
    const formatted = formatWhatsAppNumber(phoneNumber);
    // Convert to more readable format: +62 812-3456-7890
    if (formatted.startsWith("62")) {
      const withoutCountry = formatted.slice(2);
      if (withoutCountry.length >= 6) {
        return `+62 ${withoutCountry.slice(0, 3)}-${withoutCountry.slice(
          3,
          6
        )}-${withoutCountry.slice(6)}`;
      }
    }
    return formatted;
  } catch {
    return phoneNumber;
  }
}

/**
 * Validate phone number with detailed error message
 */
export function validatePhoneWithMessage(phoneNumber: string): {
  isValid: boolean;
  message: string;
  formatted?: string;
} {
  if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return {
      isValid: false,
      message: "Nomor telepon tidak boleh kosong",
    };
  }

  const cleaned = phoneNumber.replace(/\D/g, "");

  if (cleaned.length < 8) {
    return {
      isValid: false,
      message: "Nomor telepon terlalu pendek (minimal 8 digit)",
    };
  }

  if (cleaned.length > 14) {
    return {
      isValid: false,
      message: "Nomor telepon terlalu panjang (maksimal 14 digit)",
    };
  }

  try {
    const formatted = formatWhatsAppNumber(phoneNumber);
    return {
      isValid: true,
      message: "Nomor telepon valid",
      formatted,
    };
  } catch (error) {
    return {
      isValid: false,
      message: `Format nomor WhatsApp tidak valid: ${
        error instanceof Error ? error.message : "Format tidak didukung"
      }`,
    };
  }
}

/**
 * Check if two phone numbers match (handles different formats)
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  if (!phone1 || !phone2) return false;

  try {
    const formatted1 = formatWhatsAppNumber(phone1);
    const formatted2 = formatWhatsAppNumber(phone2);
    return formatted1 === formatted2;
  } catch {
    return phone1 === phone2;
  }
}

