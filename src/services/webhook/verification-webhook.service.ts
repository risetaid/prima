/**
 * Verification Webhook Service - Handles patient verification responses from WhatsApp
 *
 * This service centralizes all logic for processing patient verification responses
 * received via WhatsApp webhooks, making the webhook handler much cleaner and testable.
 */

import { db, patients, verificationLogs, reminderSchedules } from "@/db";
import { eq, and, or, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendWhatsAppMessage } from "@/lib/fonnte";
import { invalidateAfterPatientOperation } from "@/lib/cache-invalidation";
import { generatePhoneAlternatives } from "@/lib/phone-utils";

export interface WebhookPayload {
  device: string;
  sender: string;
  message: string;
  name?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  patientId?: string;
  result?: string;
  status?: number;
}

export class VerificationWebhookService {
  /**
   * Process a verification webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<VerificationResult> {
    try {
      // Validate webhook payload
      const validation = this.validateWebhookPayload(payload);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error!,
          status: 400,
        };
      }

      // Find patient by phone number
      const patient = await this.findPatientByPhone(payload.sender);
      if (!patient) {
        return {
          success: false,
          message: "No patient found or patient not eligible for this action",
          status: 200,
        };
      }

      // Process the verification response
      const result = await this.processVerificationResponse(
        patient,
        payload.message
      );

      return {
        success: true,
        message: `Verification ${result} processed`,
        patientId: patient.id,
        result,
        status: 200,
      };
    } catch (error) {
      logger.error(
        "Verification webhook processing error",
        error instanceof Error ? error : new Error(String(error)),
        {
          api: true,
          webhooks: true,
          verification: true,
          operation: "webhook_processing",
          sender: payload.sender,
        }
      );

      return {
        success: false,
        message: "Internal server error",
        status: 500,
      };
    }
  }

  /**
   * Validate webhook payload structure
   */
  private validateWebhookPayload(payload: WebhookPayload): {
    valid: boolean;
    error?: string;
  } {
    if (!payload.sender || !payload.message) {
      logger.warn("Missing required fields in verification webhook", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "validate_webhook_fields",
        hasSender: !!payload.sender,
        hasMessage: !!payload.message,
      });
      return { valid: false, error: "Missing sender or message" };
    }

    return { valid: true };
  }

  /**
   * Find patient by phone number with fallback formats
   */
  private async findPatientByPhone(phone: string) {
    // Use centralized phone utility to get alternative formats
    const alternatives = generatePhoneAlternatives(phone);

    const whereClause =
      alternatives.length > 0
        ? or(
            eq(patients.phoneNumber, phone),
            ...alternatives.map((alt) => eq(patients.phoneNumber, alt))
          )
        : eq(patients.phoneNumber, phone);

    const patientResult = await db
      .select()
      .from(patients)
      .where(and(whereClause, eq(patients.isActive, true)))
      .limit(1);

    return patientResult[0] || null;
  }

  /**
   * Check if this is a duplicate response to prevent multiple processing
   */
  private async isDuplicateResponse(
    patient: any,
    message: string
  ): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes window

    const recentLogs = await db
      .select()
      .from(verificationLogs)
      .where(
        and(
          eq(verificationLogs.patientId, patient.id),
          eq(verificationLogs.patientResponse, message),
          eq(verificationLogs.action, "responded"),
          sql`${verificationLogs.createdAt} > ${fiveMinutesAgo}`
        )
      )
      .limit(1);

    return recentLogs.length > 0;
  }

  /**
   * Check if message indicates unsubscribe intent
   */
  private isUnsubscribeIntent(message: string): {
    confidence: number;
    reasoning: string;
  } {
    const response = message.toLowerCase().trim();

    // Check exact stop words first (highest confidence)
    const stopWords = [
      "berhenti",
      "stop",
      "cancel",
      "batal",
      "keluar",
      "hapus",
      "unsubscribe",
      "cabut",
      "stop dulu",
      "berhenti dulu",
    ];

    if (stopWords.includes(response)) {
      return { confidence: 1.0, reasoning: `Exact stop word: "${response}"` };
    }

    // Check stop patterns (high confidence)
    const stopPatterns = [
      /\b(berhenti|stop)\s+(dulu|sementara)/i,
      /\b(jangan|ga|gak)\s+(usik|ganggu)/i,
      /\b(saya\s+)?(?:mau|ingin)\s+(berhenti|stop)/i,
      /\b(tolong\s+)?(?:berhenti|stop)\s+(kirim|pesan)/i,
      /\b(keluar|cabut)\s+(dari\s+)?(?:program|prima)/i,
    ];

    for (const pattern of stopPatterns) {
      if (pattern.test(response)) {
        return {
          confidence: 0.95,
          reasoning: `Stop pattern match: ${pattern}`,
        };
      }
    }

    // Check fuzzy stop indicators (medium confidence)
    const stopIndicators = ["berhenti", "stop", "batal", "keluar"];
    const words = response.split(/\s+/);
    let stopScore = 0;

    for (const word of words) {
      for (const indicator of stopIndicators) {
        if (
          word.includes(indicator) ||
          this.levenshteinDistance(word, indicator) <= 1
        ) {
          stopScore += 1;
        }
      }
    }

    if (stopScore > 0) {
      const confidence = Math.min(stopScore / words.length, 0.7);
      return {
        confidence,
        reasoning: `Fuzzy stop match (score: ${stopScore}/${words.length})`,
      };
    }

    return { confidence: 0, reasoning: "No unsubscribe intent detected" };
  }

  /**
   * Process patient unsubscribe request
   */
  private async processUnsubscribe(
    patient: any,
    message: string
  ): Promise<void> {
    logger.info("Processing patient unsubscribe request", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "process_unsubscribe",
      patientName: patient.name,
      currentStatus: patient.verificationStatus,
      message,
    });

    try {
      // Log the unsubscribe action
      await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: "responded",
        patientResponse: message,
        verificationResult: "unsubscribed",
      });
      logger.info("Unsubscribe log inserted", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "unsubscribe_log_inserted",
        patientName: patient.name,
      });

      // Update patient status to unsubscribed
      await this.updatePatientStatus(patient, "unsubscribed");
      logger.info("Patient status updated for unsubscribe", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "unsubscribe_status_updated",
        patientName: patient.name,
      });

      // Send confirmation message
      await this.sendConfirmationMessage(
        patient,
        "unsubscribed",
        patient.phoneNumber
      );
      logger.info("Unsubscribe confirmation message sent", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "unsubscribe_message_sent",
        patientName: patient.name,
      });
    } catch (error) {
      logger.error(
        "Error in processUnsubscribe",
        error instanceof Error ? error : new Error(String(error)),
        {
          api: true,
          webhooks: true,
          verification: true,
          operation: "process_unsubscribe_error",
          patientName: patient.name,
          message,
        }
      );
      throw error;
    }
  }

  /**
   * Process verification response for a patient
   */
  private async processVerificationResponse(
    patient: any,
    message: string
  ): Promise<string> {
    const response = message.toLowerCase().trim();
    const verificationResult = this.parseVerificationResponse(response);

    logger.info("Processing verification response", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "process_response",
      patientName: patient.name,
      currentStatus: patient.verificationStatus,
      response,
      verificationResult,
    });

    // Check for duplicate responses to prevent multiple processing
    const isDuplicate = await this.isDuplicateResponse(patient, message);
    logger.info("Duplicate check result", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "duplicate_check",
      patientName: patient.name,
      message,
      isDuplicate,
    });
    if (isDuplicate) {
      logger.info("Duplicate response ignored", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "duplicate_ignored",
        patientName: patient.name,
        response: message,
      });
      return "duplicate_ignored";
    }

    // 🔥 CRITICAL: ALWAYS check for unsubscribe intent FIRST (patients can unsubscribe at any time)
    const unsubscribeIntent = this.isUnsubscribeIntent(message);
    logger.info("Unsubscribe intent check", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "unsubscribe_check",
      patientName: patient.name,
      message,
      confidence: unsubscribeIntent.confidence,
      reasoning: unsubscribeIntent.reasoning,
    });
    if (unsubscribeIntent.confidence >= 0.8) {
      logger.info("Unsubscribe detected, processing unsubscribe", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "unsubscribe_detected",
        patientName: patient.name,
        message,
      });
      await this.processUnsubscribe(patient, message);
      return "unsubscribed";
    }

    // Handle special cases for already verified/unsubscribed patients
    if (patient.verificationStatus === "verified") {
      await this.logMessageOnly(patient, message, "verified");
      return "verified";
    }

    if (patient.verificationStatus === "unsubscribed") {
      await this.logMessageOnly(patient, message, "unsubscribed");
      return "unsubscribed";
    }

    // Only process if patient is in pending_verification status
    if (patient.verificationStatus !== "pending_verification") {
      await this.logMessageOnly(patient, message, patient.verificationStatus);
      return patient.verificationStatus;
    }

    // Handle unknown responses
    if (!verificationResult) {
      await this.logUnknownResponse(patient, message, response);
      return "pending_verification";
    }

    // ✅ FIX: Always log valid patient responses BEFORE updating status
    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: "responded",
      patientResponse: message, // This captures "YA", "TIDAK", etc.
      verificationResult: verificationResult as
        | "verified"
        | "declined"
        | "pending_verification"
        | "unsubscribed",
    });

    // Update patient status
    await this.updatePatientStatus(patient, verificationResult);

    // Handle unsubscribe special case
    if (verificationResult === "unsubscribed") {
      await this.deactivatePatientReminders(patient);
    }

    // Send confirmation message
    await this.sendConfirmationMessage(
      patient,
      verificationResult,
      patient.phoneNumber
    );

    return verificationResult;
  }

  /**
   * Parse verification response with comprehensive pattern matching and confidence scoring
   */
  private parseVerificationResponse(message: string): string | null {
    const response = message.toLowerCase().trim();
    const analysis = this.analyzeResponse(response);

    // Return result only if confidence is high enough
    if (analysis.confidence >= 0.8) {
      return analysis.intent;
    }

    // For medium confidence, log for potential review but don't auto-process
    if (analysis.confidence >= 0.6) {
      logger.info("Medium confidence response detected", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "medium_confidence_response",
        response,
        intent: analysis.intent,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
      });
      return null; // Don't auto-process medium confidence
    }

    return null; // Unknown or low confidence response
  }

  /**
   * Comprehensive response analysis with pattern matching and scoring
   */
  private analyzeResponse(response: string): {
    intent: string | null;
    confidence: number;
    reasoning: string;
  } {
    // Exact matches (highest confidence)
    const exactMatches = this.checkExactMatches(response);
    if (exactMatches.intent) {
      return {
        intent: exactMatches.intent,
        confidence: 1.0,
        reasoning: `Exact match: ${exactMatches.reasoning}`,
      };
    }

    // Pattern-based matches (high confidence)
    const patternMatches = this.checkPatternMatches(response);
    if (patternMatches.intent) {
      return {
        intent: patternMatches.intent,
        confidence: patternMatches.confidence,
        reasoning: patternMatches.reasoning,
      };
    }

    // Fuzzy/partial matches (medium confidence)
    const fuzzyMatches = this.checkFuzzyMatches(response);
    if (fuzzyMatches.intent) {
      return {
        intent: fuzzyMatches.intent,
        confidence: fuzzyMatches.confidence,
        reasoning: fuzzyMatches.reasoning,
      };
    }

    return {
      intent: null,
      confidence: 0,
      reasoning: "No recognizable patterns found",
    };
  }

  /**
   * Check for exact word matches
   */
  private checkExactMatches(response: string): {
    intent: string | null;
    reasoning: string;
  } {
    const positiveWords = [
      "ya",
      "iya",
      "yes",
      "ok",
      "oke",
      "setuju",
      "saya setuju",
      "iya setuju",
      "ya setuju",
      "boleh",
      "baik",
      "siap",
      "mau",
      "ingin",
      "terima",
      "ya terima",
      "iya terima",
      "ya mau",
      "iya mau",
      "ya boleh",
      "iya boleh",
    ];

    const negativeWords = [
      "tidak",
      "no",
      "nope",
      "ga",
      "gak",
      "engga",
      "enggak",
      "tolak",
      "menolak",
      "ga mau",
      "gak mau",
      "tidak mau",
      "ga setuju",
      "gak setuju",
      "tidak setuju",
      "nanti",
      "besok",
      "lagi",
      "ga sekarang",
      "gak sekarang",
    ];

    const stopWords = [
      "berhenti",
      "stop",
      "cancel",
      "batal",
      "keluar",
      "hapus",
      "unsubscribe",
      "cabut",
      "keluar",
      "stop dulu",
      "berhenti dulu",
    ];

    if (positiveWords.includes(response)) {
      return { intent: "verified", reasoning: `Positive word: "${response}"` };
    }

    if (negativeWords.includes(response)) {
      return { intent: "declined", reasoning: `Negative word: "${response}"` };
    }

    if (stopWords.includes(response)) {
      return { intent: "unsubscribed", reasoning: `Stop word: "${response}"` };
    }

    return { intent: null, reasoning: "" };
  }

  /**
   * Check for pattern-based matches using regex
   */
  private checkPatternMatches(response: string): {
    intent: string | null;
    confidence: number;
    reasoning: string;
  } {
    // Positive patterns (high confidence)
    const positivePatterns = [
      /\b(ya|iya|yes|yaa|yaaa)\s+(saya\s+)?(?:mau|ingin|boleh|setuju|terima|siap|baik)/i,
      /\b(saya\s+)?(?:mau|ingin|boleh|setuju|terima|siap|baik)\s+(ya|iya|yes)/i,
      /\b(terima\s+kasih|makasih)\s+(ya|iya)/i,
      /\b(baik|oke|ok)\s+lah/i,
      /\b(ya\s+)?dong/i,
      /\b(ya\s+)?saja/i,
      /\b(lanjutkan|teruskan)/i,
    ];

    // Negative patterns (high confidence)
    const negativePatterns = [
      /\b(tidak|ga|gak|engga|enggak)\s+(mau|ingin|boleh|setuju)/i,
      /\b(saya\s+)?(?:tidak|ga|gak)\s+(mau|ingin|boleh)/i,
      /\b(nanti|besok|lagi)\s+(saja|dulu)/i,
      /\b(saya\s+)?(?:sedang|lagi)\s+sakit/i,
      /\b(belum|masih)\s+(sembuh|bisa)/i,
    ];

    // Stop patterns (high confidence)
    const stopPatterns = [
      /\b(berhenti|stop)\s+(dulu|sementara)/i,
      /\b(jangan|ga)\s+(usik|ganggu)/i,
      /\b(saya\s+)?(?:mau|ingin)\s+(berhenti|stop)/i,
    ];

    for (const pattern of positivePatterns) {
      if (pattern.test(response)) {
        return {
          intent: "verified",
          confidence: 0.95,
          reasoning: `Positive pattern match: ${pattern}`,
        };
      }
    }

    for (const pattern of negativePatterns) {
      if (pattern.test(response)) {
        return {
          intent: "declined",
          confidence: 0.95,
          reasoning: `Negative pattern match: ${pattern}`,
        };
      }
    }

    for (const pattern of stopPatterns) {
      if (pattern.test(response)) {
        return {
          intent: "unsubscribed",
          confidence: 0.95,
          reasoning: `Stop pattern match: ${pattern}`,
        };
      }
    }

    return { intent: null, confidence: 0, reasoning: "" };
  }

  /**
   * Check for fuzzy/partial matches (lower confidence)
   */
  private checkFuzzyMatches(response: string): {
    intent: string | null;
    confidence: number;
    reasoning: string;
  } {
    // Simple fuzzy matching for common typos and partial matches
    const positiveIndicators = [
      "ya",
      "iya",
      "yes",
      "ok",
      "setuju",
      "mau",
      "boleh",
      "terima",
      "siap",
    ];
    const negativeIndicators = [
      "tidak",
      "ga",
      "gak",
      "no",
      "tolak",
      "nanti",
      "besok",
    ];
    const stopIndicators = ["berhenti", "stop", "batal", "keluar"];

    let positiveScore = 0;
    let negativeScore = 0;
    let stopScore = 0;

    const words = response.split(/\s+/);

    for (const word of words) {
      // Check for partial matches and typos
      for (const indicator of positiveIndicators) {
        if (
          word.includes(indicator) ||
          this.levenshteinDistance(word, indicator) <= 1
        ) {
          positiveScore += 1;
        }
      }

      for (const indicator of negativeIndicators) {
        if (
          word.includes(indicator) ||
          this.levenshteinDistance(word, indicator) <= 1
        ) {
          negativeScore += 1;
        }
      }

      for (const indicator of stopIndicators) {
        if (
          word.includes(indicator) ||
          this.levenshteinDistance(word, indicator) <= 1
        ) {
          stopScore += 1;
        }
      }
    }

    // Determine intent based on highest score
    const maxScore = Math.max(positiveScore, negativeScore, stopScore);

    if (maxScore >= 1) {
      const totalWords = words.length;
      const confidence = Math.min(maxScore / totalWords, 0.7); // Cap at 0.7 for fuzzy matches

      if (positiveScore === maxScore) {
        return {
          intent: "verified",
          confidence,
          reasoning: `Fuzzy positive match (score: ${positiveScore}/${totalWords})`,
        };
      } else if (negativeScore === maxScore) {
        return {
          intent: "declined",
          confidence,
          reasoning: `Fuzzy negative match (score: ${negativeScore}/${totalWords})`,
        };
      } else if (stopScore === maxScore) {
        return {
          intent: "unsubscribed",
          confidence,
          reasoning: `Fuzzy stop match (score: ${stopScore}/${totalWords})`,
        };
      }
    }

    return { intent: null, confidence: 0, reasoning: "" };
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Log message without changing patient status
   */
  private async logMessageOnly(
    patient: any,
    message: string,
    currentStatus: string
  ) {
    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: "message_received",
      patientResponse: message,
      verificationResult: currentStatus as
        | "verified"
        | "declined"
        | "pending_verification"
        | "unsubscribed",
    });
  }

  /**
   * Log unknown response
   */
  private async logUnknownResponse(
    patient: any,
    message: string,
    response: string
  ) {
    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: "responded",
      patientResponse: message,
      verificationResult: "pending_verification",
    });

    logger.info("Unknown verification response received", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "unknown_response",
      response,
      patientName: patient.name,
    });
  }

  /**
   * Update patient verification status
   */
  private async updatePatientStatus(patient: any, verificationResult: string) {
    const updateData: any = {
      verificationStatus: verificationResult,
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    };

    // Special handling for unsubscribe
    if (verificationResult === "unsubscribed") {
      updateData.verificationStatus = "declined";
      updateData.isActive = false;
      logger.info("Unsubscribe detected, setting status to declined and deactivating", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "unsubscribe_status_change",
        patientName: patient.name,
        originalStatus: patient.verificationStatus,
      });
    }

    logger.info("Updating patient status in database", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "db_update_start",
      patientName: patient.name,
      patientId: patient.id,
      fromStatus: patient.verificationStatus,
      toStatus: updateData.verificationStatus,
      isActive: updateData.isActive,
    });

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patient.id));

    logger.info("Patient status updated successfully", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "db_update_success",
      patientName: patient.name,
      patientId: patient.id,
    });

    // Invalidate cache using systematic approach
    await invalidateAfterPatientOperation(patient.id, "update");

    logger.info("Patient verification status updated", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "status_updated",
      patientName: patient.name,
      fromStatus: patient.verificationStatus,
      toStatus: updateData.verificationStatus,
    });
  }

  /**
   * Deactivate all reminders for unsubscribed patient
   */
  private async deactivatePatientReminders(patient: any) {
    try {
      await db
        .update(reminderSchedules)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(reminderSchedules.patientId, patient.id));
    } catch (error) {
      logger.warn("Failed to deactivate reminders during unsubscribe", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "deactivate_reminders",
        patientId: patient.id,
        patientName: patient.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send confirmation message to patient
   */
  private async sendConfirmationMessage(
    patient: any,
    status: string,
    phoneNumber: string
  ) {
    const message = this.generateConfirmationMessage(patient, status);
    if (!message) return;

    try {
      const fonnte_token = process.env.FONNTE_TOKEN;
      if (!fonnte_token) {
        logger.warn(
          "FONNTE_TOKEN not configured, skipping confirmation message",
          {
            api: true,
            webhooks: true,
            verification: true,
            operation: "send_confirmation",
            phoneNumber,
          }
        );
        return;
      }

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnte_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: phoneNumber,
          message: message,
          countryCode: "62",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        logger.warn("Failed to send confirmation message via Fonnte", {
          api: true,
          webhooks: true,
          verification: true,
          operation: "send_confirmation",
          phoneNumber,
          responseStatus: response.status,
          fonnteResult: result,
        });
      }
    } catch (error) {
      logger.warn("Error sending confirmation message", {
        api: true,
        webhooks: true,
        verification: true,
        operation: "send_confirmation",
        phoneNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate confirmation message based on verification result
   */
  private generateConfirmationMessage(patient: any, status: string): string {
    if (status === "verified") {
      return `Terima kasih ${patient.name}! ✅

Anda akan menerima reminder dari relawan PRIMA.

Untuk berhenti, ketik: BERHENTI`;
    } else if (status === "declined") {
      return `Baik ${patient.name}, terima kasih atas responsnya.

Semoga sehat selalu! 🙏`;
    } else if (status === "unsubscribed") {
      return `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑

Semua pengingat obat telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.

Jika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.

Semoga sehat selalu! 🙏💙`;
    }

    return "";
  }
}
