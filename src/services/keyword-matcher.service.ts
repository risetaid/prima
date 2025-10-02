import { logger } from '@/lib/logger'

/**
 * KeywordMatcherService
 *
 * Provides STRICT EXACT keyword matching for verification and reminder confirmation responses.
 * This service ensures medical-grade accuracy by ONLY accepting EXACT keyword matches.
 *
 * Design Principles:
 * - EXACT keyword matching ONLY (no variations, no normalization)
 * - Single word requirement (MUST be 1 word) to prevent false positives
 * - Case-insensitive but EXACT match required
 * - Logs all matching attempts for debugging
 */
export class KeywordMatcherService {
  // Verification patterns - ONLY EXACT MATCHES
  // HANYA terima: YA atau TIDAK (case-insensitive)
  private readonly VERIFICATION_ACCEPT = [
    'ya',
  ]

  private readonly VERIFICATION_DECLINE = [
    'tidak',
  ]

  // Confirmation patterns - ONLY EXACT MATCHES
  // HANYA terima: SUDAH atau BELUM (case-insensitive)
  private readonly CONFIRMATION_DONE = [
    'sudah',
  ]

  private readonly CONFIRMATION_NOT_YET = [
    'belum',
  ]

  /**
   * Match verification response (YA/TIDAK)
   * STRICT: Only accepts EXACT single word "YA" or "TIDAK" (case-insensitive)
   *
   * Case-insensitive normalization handles all capitalization variations:
   * - Accepts: "YA", "ya", "Ya", "yA", etc → all match as "ya"
   * - Accepts: "TIDAK", "tidak", "TiDaK", etc → all match as "tidak"
   *
   * @param message - User message to match
   * @returns 'accept' | 'decline' | 'invalid'
   */
  matchVerification(message: string): 'accept' | 'decline' | 'invalid' {
    // Normalize: lowercase + trim whitespace (handles all capitalization variants)
    const normalized = message.toLowerCase().trim()

    // STRICT: Must be EXACTLY 1 word
    if (normalized.includes(' ')) {
      logger.debug('Verification match failed: contains multiple words', {
        message,
        normalized,
      })
      return 'invalid'
    }

    // Check for EXACT accept keyword: "ya"
    if (normalized === 'ya') {
      logger.info('Verification match: ACCEPT', {
        message,
        normalized,
        matchedKeyword: 'ya',
      })
      return 'accept'
    }

    // Check for EXACT decline keyword: "tidak"
    if (normalized === 'tidak') {
      logger.info('Verification match: DECLINE', {
        message,
        normalized,
        matchedKeyword: 'tidak',
      })
      return 'decline'
    }

    logger.debug('Verification match failed: not exact YA or TIDAK', {
      message,
      normalized,
    })
    return 'invalid'
  }

  /**
   * Match confirmation response (SUDAH/BELUM)
   * STRICT: Only accepts EXACT single word "SUDAH" or "BELUM" (case-insensitive)
   *
   * Case-insensitive normalization handles all capitalization variations:
   * - Accepts: "SUDAH", "sudah", "SuDaH", "sUdAh", etc → all match as "sudah"
   * - Accepts: "BELUM", "belum", "BeLuM", "bElUm", etc → all match as "belum"
   *
   * @param message - User message to match
   * @returns 'done' | 'not_yet' | 'invalid'
   */
  matchConfirmation(message: string): 'done' | 'not_yet' | 'invalid' {
    // Normalize: lowercase + trim whitespace (handles all capitalization variants)
    const normalized = message.toLowerCase().trim()

    // STRICT: Must be EXACTLY 1 word
    if (normalized.includes(' ')) {
      logger.debug('Confirmation match failed: contains multiple words', {
        message,
        normalized,
      })
      return 'invalid'
    }

    // Check for EXACT done keyword: "sudah"
    if (normalized === 'sudah') {
      logger.info('Confirmation match: DONE', {
        message,
        normalized,
        matchedKeyword: 'sudah',
      })
      return 'done'
    }

    // Check for EXACT not yet keyword: "belum"
    if (normalized === 'belum') {
      logger.info('Confirmation match: NOT_YET', {
        message,
        normalized,
        matchedKeyword: 'belum',
      })
      return 'not_yet'
    }

    logger.debug('Confirmation match failed: not exact SUDAH or BELUM', {
      message,
      normalized,
    })
    return 'invalid'
  }

  /**
   * Check if message is valid length (STRICT: must be exactly 1 word)
   * @param message - Message to check
   * @returns true if message is exactly 1 word
   */
  isValidLength(message: string): boolean {
    const trimmed = message.trim()
    return !trimmed.includes(' ') && trimmed.length > 0
  }

  /**
   * Get all supported verification keywords
   * @returns Object with accept and decline keywords
   */
  getVerificationKeywords(): {
    accept: string[]
    decline: string[]
  } {
    return {
      accept: ['YA'],
      decline: ['TIDAK'],
    }
  }

  /**
   * Get all supported confirmation keywords
   * @returns Object with done and not_yet keywords
   */
  getConfirmationKeywords(): {
    done: string[]
    not_yet: string[]
  } {
    return {
      done: ['SUDAH'],
      not_yet: ['BELUM'],
    }
  }
}
