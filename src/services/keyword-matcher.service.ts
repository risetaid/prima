import { logger } from '@/lib/logger'

/**
 * KeywordMatcherService
 *
 * Provides strict keyword matching for verification and reminder confirmation responses.
 * This service ensures medical-grade accuracy by only accepting exact keyword matches.
 *
 * Design Principles:
 * - Strict keyword matching (no fuzzy matching)
 * - Short message requirement (≤3 words) to prevent false positives
 * - No ambiguity - only exact keyword matches accepted
 * - Logs all matching attempts for debugging
 */
export class KeywordMatcherService {
  // Verification patterns (YA/TIDAK)
  private readonly VERIFICATION_ACCEPT = [
    'ya',
    'iya',
    'yaa',
    'yes',
    'y',
    'ok',
    'oke',
    'okay',
    'setuju',
    'boleh',
    'mau',
  ]

  private readonly VERIFICATION_DECLINE = [
    'tidak',
    'tdk',
    'no',
    'n',
    'ga',
    'gak',
    'enggak',
    'engga',
    'tolak',
    'nolak',
    'nggak',
  ]

  // Confirmation patterns (SUDAH/BELUM)
  private readonly CONFIRMATION_DONE = [
    'sudah',
    'udah',
    'done',
    'selesai',
    'yes',
    'ya',
    'iya',
    'ok',
    'oke',
  ]

  private readonly CONFIRMATION_NOT_YET = [
    'belum',
    'not yet',
    'nanti',
    'sebentar',
    'tunggu',
    'lupa',
  ]

  /**
   * Match verification response (YA/TIDAK)
   * @param message - User message to match
   * @returns 'accept' | 'decline' | 'invalid'
   */
  matchVerification(message: string): 'accept' | 'decline' | 'invalid' {
    const normalized = message.toLowerCase().trim()
    const words = normalized.split(/\s+/)

    // Must be short (max 3 words) to be valid
    if (words.length > 3) {
      logger.debug('Verification match failed: message too long', {
        message,
        wordCount: words.length,
      })
      return 'invalid'
    }

    // Check for accept keywords
    if (this.VERIFICATION_ACCEPT.some((kw) => words.includes(kw))) {
      logger.info('Verification match: ACCEPT', {
        message,
        normalized,
        matchedKeyword: this.VERIFICATION_ACCEPT.find((kw) => words.includes(kw)),
      })
      return 'accept'
    }

    // Check for decline keywords
    if (this.VERIFICATION_DECLINE.some((kw) => words.includes(kw))) {
      logger.info('Verification match: DECLINE', {
        message,
        normalized,
        matchedKeyword: this.VERIFICATION_DECLINE.find((kw) => words.includes(kw)),
      })
      return 'decline'
    }

    logger.debug('Verification match failed: no keyword match', {
      message,
      normalized,
      words,
    })
    return 'invalid'
  }

  /**
   * Match confirmation response (SUDAH/BELUM)
   * @param message - User message to match
   * @returns 'done' | 'not_yet' | 'invalid'
   */
  matchConfirmation(message: string): 'done' | 'not_yet' | 'invalid' {
    const normalized = message.toLowerCase().trim()
    const words = normalized.split(/\s+/)

    // Must be short (max 3 words) to be valid
    if (words.length > 3) {
      logger.debug('Confirmation match failed: message too long', {
        message,
        wordCount: words.length,
      })
      return 'invalid'
    }

    // Check for done keywords
    if (this.CONFIRMATION_DONE.some((kw) => words.includes(kw))) {
      logger.info('Confirmation match: DONE', {
        message,
        normalized,
        matchedKeyword: this.CONFIRMATION_DONE.find((kw) => words.includes(kw)),
      })
      return 'done'
    }

    // Check for not yet keywords
    if (this.CONFIRMATION_NOT_YET.some((kw) => words.includes(kw))) {
      logger.info('Confirmation match: NOT_YET', {
        message,
        normalized,
        matchedKeyword: this.CONFIRMATION_NOT_YET.find((kw) => words.includes(kw)),
      })
      return 'not_yet'
    }

    logger.debug('Confirmation match failed: no keyword match', {
      message,
      normalized,
      words,
    })
    return 'invalid'
  }

  /**
   * Check if message is valid length (max 3 words)
   * @param message - Message to check
   * @returns true if message is 3 words or less
   */
  isValidLength(message: string): boolean {
    const wordCount = message.trim().split(/\s+/).length
    return wordCount <= 3
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
      accept: [...this.VERIFICATION_ACCEPT],
      decline: [...this.VERIFICATION_DECLINE],
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
      done: [...this.CONFIRMATION_DONE],
      not_yet: [...this.CONFIRMATION_NOT_YET],
    }
  }
}
