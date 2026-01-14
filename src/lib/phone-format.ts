/**
 * Client-safe phone number formatting utilities
 *
 * This module contains pure functions for phone number formatting that can be
 * safely used in both client and server components. It does NOT import any
 * Node.js-only modules (like ioredis, crypto, etc.).
 *
 * For server-only WhatsApp operations (sending messages, webhooks), use gowa.ts instead.
 */

/**
 * Format phone number for WhatsApp (Indonesia format, no @s.whatsapp.net suffix)
 * The suffix will be added by sendWhatsAppMessage in gowa.ts
 *
 * This is a pure function that can be used in client components.
 */
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw new Error("Invalid phone number: must be a non-empty string");
  }

  // Remove all non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  if (!cleaned || cleaned.length < 8) {
    throw new Error("Invalid phone number: too short after cleaning");
  }

  // Convert Indonesian numbers with validation
  if (cleaned.startsWith("08")) {
    if (cleaned.length < 10 || cleaned.length > 13) {
      throw new Error("Invalid Indonesian phone number length (08 format)");
    }
    cleaned = "628" + cleaned.slice(2); // 08xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith("8") && cleaned.length >= 9) {
    if (cleaned.length < 9 || cleaned.length > 12) {
      throw new Error("Invalid Indonesian phone number length (8 format)");
    }
    cleaned = "62" + cleaned; // 8xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith("62")) {
    if (cleaned.length < 11 || cleaned.length > 14) {
      throw new Error("Invalid Indonesian phone number length (62 format)");
    }
    // Already has country code
  } else {
    // Assume local Indonesian number
    if (cleaned.length < 8 || cleaned.length > 11) {
      throw new Error("Invalid phone number length");
    }
    cleaned = "62" + cleaned; // Add Indonesia code
  }

  // Final validation - Indonesian mobile numbers after 62 should start with 8
  if (!cleaned.startsWith("628")) {
    throw new Error("Invalid Indonesian mobile number format");
  }

  // Return clean number format without @s.whatsapp.net suffix
  return cleaned;
};

/**
 * Convert Markdown formatting to WhatsApp-compatible formatting
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 * Markdown uses: **bold**, *italic*, ~~strikethrough~~, `code`
 *
 * Also handles:
 * - Markdown headers (# ## ###) - remove formatting, keep text
 * - Markdown bullet lists (- or *) - clean numbered or emoji lists
 * - Markdown numbered lists (1. 2. 3.) - keep as-is
 * - Markdown links [text](url) - text: url
 *
 * This is a pure function that can be used in client components.
 */
export const formatForWhatsApp = (text: string): string => {
  let result = text;

  // Convert Markdown bold **text** to WhatsApp bold *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, "*$1*");

  // Convert Markdown strikethrough ~~text~~ to WhatsApp ~text~
  result = result.replace(/~~([^~]+)~~/g, "~$1~");

  // Convert inline code `text` to WhatsApp monospace ```text```
  // But skip if it's already triple backticks
  result = result.replace(/(?<!`)`([^`]+)`(?!`)/g, "```$1```");

  // Remove Markdown headers but keep the text
  // # Heading -> Heading (optionally bold it)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // Convert Markdown bullet lists using - or * at start of line
  // - item -> * item (or just remove the dash)
  result = result.replace(/^[\s]*[-*]\s+/gm, "* ");

  // Convert Markdown links [text](url) -> text: url
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2");

  // Remove horizontal rules (--- or ***)
  result = result.replace(/^[-*_]{3,}$/gm, "");

  // Clean up excessive newlines (more than 2 consecutive)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  result = result.trim();

  return result;
};
