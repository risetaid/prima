/**
 * Centralized medication utilities for PRIMA Medical System
 *
 * This module centralizes medication-related logic to eliminate duplication
 * across services and API routes.
 */

/**
 * Common medication keywords and names for extraction
 */
const MEDICATION_KEYWORDS = [
  // Common medications
  "candesartan",
  "paracetamol",
  "amoxicillin",
  "metformin",
  "ibuprofen",
  "aspirin",
  "omeprazole",
  "simvastatin",
  "atorvastatin",
  "amlodipine",
  "lisinopril",
  "hydrochlorothiazide",
  "furosemide",
  "spironolactone",
  // Indonesian terms
  "obat",
  "tablet",
  "kapsul",
  "sirup",
  "vitamin",
  "suplemen",
  // Specific patterns
  "mg",
  "ml",
  "gram",
] as const;

/**
 * Extract medication name from a reminder message
 *
 * This function implements intelligent medication name extraction with
 * fallback strategies for Indonesian healthcare context.
 *
 * @param message - The reminder message text
 * @param currentName - Optional current medication name for fallback
 * @returns Extracted medication name or fallback
 */
export function extractMedicationName(
  message: string,
  currentName?: string
): string {
  if (!message || typeof message !== "string") {
    return currentName || "Obat";
  }

  const cleanMessage = message.trim().toLowerCase();
  if (!cleanMessage.length) {
    return currentName || "Obat";
  }

  const words = cleanMessage.split(/\s+/);

  // Strategy 1: Prefer explicit medication names first
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, "");
    if (cleanWord.length < 3) continue;
    if (MEDICATION_KEYWORDS.some((keyword) => cleanWord.includes(keyword))) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    }
  }

  // Strategy 2: If the message contains the word 'obat', take the next word as the medication name
  const obatIndex = words.findIndex((w) => w.includes("obat"));
  if (obatIndex !== -1 && obatIndex + 1 < words.length) {
    const nextWord = words[obatIndex + 1].replace(/[^\w]/g, "");
    if (nextWord.length >= 3) {
      return nextWord.charAt(0).toUpperCase() + nextWord.slice(1);
    }
  }

  // Strategy 3: Fallback: if the message mentions 'minum', try the word after it
  const minumIndex = words.findIndex((w) => w.includes("minum"));
  if (minumIndex !== -1 && minumIndex + 1 < words.length) {
    const nextWord = words[minumIndex + 1].replace(/[^\w]/g, "");
    if (nextWord.length >= 3) {
      return nextWord.charAt(0).toUpperCase() + nextWord.slice(1);
    }
  }

  // Strategy 4: Return current name or default
  return currentName || "Obat";
}

/**
 * Validate if a string contains medication-related keywords
 *
 * @param text - Text to check for medication keywords
 * @returns True if medication keywords are found
 */
export function containsMedicationKeywords(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  const cleanText = text.toLowerCase();
  return MEDICATION_KEYWORDS.some((keyword) => cleanText.includes(keyword));
}

/**
 * Get medication keywords for external use (e.g., for testing or configuration)
 *
 * @returns Array of medication keywords
 */
export function getMedicationKeywords(): readonly string[] {
  return MEDICATION_KEYWORDS;
}

