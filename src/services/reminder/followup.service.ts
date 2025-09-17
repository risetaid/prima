import { db, reminderLogs, reminderFollowups, patients } from "@/db";
import { sql } from "drizzle-orm";
import { eq, and, isNull, gt, lt, or } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getWIBTime, addMinutesToWIB } from "@/lib/timezone";
import { FollowupQueueService } from "./followup-queue.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { NewReminderFollowup, ReminderFollowup } from "@/db";
import { followupStatusEnum } from "@/db";
import { llmService } from "@/services/llm/llm.service";
import { PatientContextService } from "@/services/patient/patient-context.service";
import { ConversationContext } from "@/services/llm/llm.types";
import { safetyFilterService } from "@/services/llm/safety-filter";
import { MessageProcessorService, ProcessedMessage } from "@/services/message-processor.service";
import { MedicationParser } from "@/lib/medication-parser";
import { PatientContext } from "@/services/patient/patient-context.service";

export class FollowupService {
  private queueService: FollowupQueueService;
  private whatsappService: WhatsAppService;
  private patientContextService: PatientContextService;
  private messageProcessorService: MessageProcessorService;

  constructor() {
    this.queueService = new FollowupQueueService();
    this.whatsappService = new WhatsAppService();
    this.patientContextService = new PatientContextService();
    this.messageProcessorService = new MessageProcessorService();
  }

  /**
   * Schedule a 15-minute followup for a reminder log
   */
  async schedule15MinuteFollowup(
    reminderLogId: string,
    followupType: "REMINDER_CONFIRMATION" | "MEDICATION_COMPLIANCE" | "SYMPTOM_CHECK" | "GENERAL_WELLBEING" = "REMINDER_CONFIRMATION"
  ): Promise<ReminderFollowup> {
    try {
      logger.info("Scheduling 15-minute followup", {
        reminderLogId,
        followupType,
        operation: "schedule_followup"
      });

      // Get the reminder log with patient details
      const reminderLog = await db
        .select({
          id: reminderLogs.id,
          patientId: reminderLogs.patientId,
          phoneNumber: reminderLogs.phoneNumber,
          message: reminderLogs.message,
          patientName: patients.name,
          patientPhone: patients.phoneNumber
        })
        .from(reminderLogs)
        .leftJoin(patients, eq(reminderLogs.patientId, patients.id))
        .where(eq(reminderLogs.id, reminderLogId))
        .limit(1);

      if (!reminderLog[0]) {
        throw new Error(`Reminder log not found: ${reminderLogId}`);
      }

      const scheduledAt = addMinutesToWIB(new Date(), 15);

      // Create personalized followup message
      const followupMessage = await this.generateFollowupMessage(
        followupType,
        reminderLog[0].patientName || "Pasien",
        reminderLog[0].patientId,
        reminderLog[0].message
      );

      // Create followup record
      const followupData: NewReminderFollowup = {
        reminderLogId,
        patientId: reminderLog[0].patientId,
        followupType,
        status: "PENDING",
        scheduledAt,
        message: followupMessage,
        retryCount: 0,
        maxRetries: 3,
      };

      const [createdFollowup] = await db
        .insert(reminderFollowups)
        .values(followupData)
        .returning();

      logger.info("Followup scheduled successfully", {
        followupId: createdFollowup.id,
        reminderLogId,
        scheduledAt: createdFollowup.scheduledAt.toISOString(),
        operation: "schedule_followup"
      });

      // Enqueue the followup job
      await this.queueService.enqueueFollowup(createdFollowup.id, scheduledAt);

      return createdFollowup;
    } catch (error) {
      logger.error("Failed to schedule followup", error instanceof Error ? error : new Error(String(error)), {
        reminderLogId,
        followupType,
        operation: "schedule_followup"
      });
      throw error;
    }
  }

  /**
   * Process pending followups that are due
   */
  async processPendingFollowups(): Promise<void> {
    try {
      logger.info("Processing pending followups", {
        operation: "process_followups"
      });

      const now = getWIBTime();

      // Get followups that are due and pending
      const pendingFollowups = await db
        .select({
          id: reminderFollowups.id,
          reminderLogId: reminderFollowups.reminderLogId,
          patientId: reminderFollowups.patientId,
          followupType: reminderFollowups.followupType,
          message: reminderFollowups.message,
          retryCount: reminderFollowups.retryCount,
          maxRetries: reminderFollowups.maxRetries,
          phoneNumber: reminderLogs.phoneNumber,
          patientName: patients.name
        })
        .from(reminderFollowups)
        .leftJoin(reminderLogs, eq(reminderFollowups.reminderLogId, reminderLogs.id))
        .leftJoin(patients, eq(reminderFollowups.patientId, patients.id))
        .where(
          and(
            eq(reminderFollowups.status, "PENDING"),
            lt(reminderFollowups.scheduledAt, now),
            or(
              isNull(reminderFollowups.sentAt),
              and(
                gt(reminderFollowups.retryCount, 0),
                lt(reminderFollowups.retryCount, reminderFollowups.maxRetries)
              )
            )
          )
        );

      logger.info(`Found ${pendingFollowups.length} pending followups to process`, {
        operation: "process_followups"
      });

      for (const followup of pendingFollowups) {
        try {
          await this.sendFollowup(followup);
        } catch (error) {
          logger.error("Failed to send followup", error instanceof Error ? error : new Error(String(error)), {
            followupId: followup.id,
            operation: "send_followup"
          });
        }
      }
    } catch (error) {
      logger.error("Failed to process pending followups", error instanceof Error ? error : new Error(String(error)), {
        operation: "process_followups"
      });
      throw error;
    }
  }

  /**
   * Send a followup message
   */
  private async sendFollowup(followup: {
    id: string;
    phoneNumber: string | null;
    message: string;
  }): Promise<void> {
    try {
      logger.info("Sending followup message", {
        followupId: followup.id,
        phoneNumber: followup.phoneNumber,
        operation: "send_followup"
      });

      // Send WhatsApp message
      if (!followup.phoneNumber) {
        throw new Error(`Phone number is required for followup ${followup.id}`);
      }
      const sendResult = await this.whatsappService.send(followup.phoneNumber, followup.message);

      if (sendResult.success) {
        // Update followup status to SENT
        await db
          .update(reminderFollowups)
          .set({
            status: "SENT",
            sentAt: getWIBTime(),
            queueJobId: sendResult.messageId,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followup.id));

        logger.info("Followup sent successfully", {
          followupId: followup.id,
          messageId: sendResult.messageId,
          operation: "send_followup"
        });
      } else {
        // Handle failed send
        await this.handleFollowupFailure(followup.id, sendResult.error || "Unknown error");
      }
    } catch (error) {
      logger.error("Failed to send followup message", error instanceof Error ? error : new Error(String(error)), {
        followupId: followup.id,
        operation: "send_followup"
      });
      await this.handleFollowupFailure(followup.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle followup send failure
   */
  private async handleFollowupFailure(followupId: string, error: string): Promise<void> {
    try {
      const followup = await db
        .select({
          retryCount: reminderFollowups.retryCount,
          maxRetries: reminderFollowups.maxRetries
        })
        .from(reminderFollowups)
        .where(eq(reminderFollowups.id, followupId))
        .limit(1);

      if (!followup[0]) {
        logger.error("Followup not found for failure handling", undefined, {
          followupId,
          operation: "handle_followup_failure"
        });
        return;
      }

      const newRetryCount = followup[0].retryCount + 1;

      if (newRetryCount >= followup[0].maxRetries) {
        // Mark as FAILED
        await db
          .update(reminderFollowups)
          .set({
            status: "FAILED",
            retryCount: newRetryCount,
            error: error,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followupId));

        logger.warn("Followup failed after max retries", {
          followupId,
          retryCount: newRetryCount,
          maxRetries: followup[0].maxRetries,
          error: String(error),
          operation: "handle_followup_failure"
        });
      } else {
        // Schedule retry
        const retryDelay = Math.pow(2, newRetryCount) * 5; // Exponential backoff: 5, 10, 20 minutes
        const nextScheduledAt = addMinutesToWIB(new Date(), retryDelay);

        await db
          .update(reminderFollowups)
          .set({
            retryCount: newRetryCount,
            scheduledAt: nextScheduledAt,
            error: error,
            updatedAt: getWIBTime()
          })
          .where(eq(reminderFollowups.id, followupId));

        // Re-enqueue for retry
        await this.queueService.enqueueFollowup(followupId, nextScheduledAt);

        logger.info("Followup retry scheduled", {
          followupId,
          retryCount: newRetryCount,
          nextScheduledAt: nextScheduledAt.toISOString(),
          error,
          operation: "handle_followup_failure"
        });
      }
    } catch (error) {
      logger.error("Failed to handle followup failure", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "handle_followup_failure"
      });
    }
  }

  /**
   * Generate personalized followup message using LLM based on type and patient context
   */
  private async generateFollowupMessage(
    followupType: string,
    patientName: string,
    patientId: string,
    reminderMessage?: string
  ): Promise<string> {
    try {
      // Get patient context for personalization
      const patientContext = await this.patientContextService.getPatientContext(
        patientId
      );

      // Build conversation context for LLM
      const llmContext: ConversationContext = {
        patientId,
        phoneNumber: patientContext.found ? patientContext.context?.patient.phoneNumber || "" : "",
        previousMessages: patientContext.found && patientContext.context ?
          patientContext.context.recentConversationHistory?.map(msg => ({
            role: msg.direction === "inbound" ? "user" : "assistant",
            content: msg.message
          })) || [] : [],
        patientInfo: patientContext.found && patientContext.context ? {
          name: patientContext.context.patient.name,
          verificationStatus: patientContext.context.patient.verificationStatus,
          activeReminders: patientContext.context.activeReminders?.map(r => {
            // Parse structured medication data for LLM context
            const medicationDetails = MedicationParser.parseFromReminder(
              r.customMessage,
              r.customMessage
            );
            return {
              medicationName: medicationDetails.name,
              medicationDetails,
              scheduledTime: r.scheduledTime
            };
          }) || []
        } : undefined
      };

      // Build context-specific prompt
      const additionalContext = await this.buildFollowupContext(followupType, patientName, patientId, reminderMessage);

      // Generate personalized response using LLM
      const llmResponse = await llmService.generatePatientResponse(
        `followup_${followupType.toLowerCase()}`,
        llmContext,
        additionalContext
      );

      return llmResponse.content;
    } catch (error) {
      logger.warn("LLM followup message generation failed, using fallback", {
        followupType,
        patientId,
        operation: "generate_followup_message",
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to static messages
      return this.getFallbackFollowupMessage(followupType, patientName);
    }
  }

  /**
   * Build comprehensive context-aware information for followup message generation
   */
  private async buildFollowupContext(
    followupType: string,
    patientName: string,
    patientId: string,
    reminderMessage?: string
  ): Promise<string> {
    let context = `Followup Type: ${followupType}\nPatient Name: ${patientName}\n`;

    if (reminderMessage) {
      context += `Original Reminder: ${reminderMessage}\n`;
    }

    // Get comprehensive patient context
    const patientContext = await this.patientContextService.getPatientContext(patientId);

    if (patientContext.found && patientContext.context) {
      const patient = patientContext.context.patient;
      const recentNotes = patientContext.context.recentHealthNotes?.slice(0, 3) || [];
      const activeReminders = patientContext.context.activeReminders || [];
      const conversationHistory = patientContext.context.recentConversationHistory?.slice(0, 5) || [];
      const medicalHistory = patientContext.context.medicalHistory || {};
      const patientVariables = patientContext.context.patientVariables || [];

      context += `Comprehensive Patient Context:\n`;

      // Basic patient info
      context += `- Cancer Stage: ${patient.cancerStage || 'Unknown'}\n`;
      context += `- Diagnosis Date: ${patient.diagnosisDate ? new Date(patient.diagnosisDate).toLocaleDateString('id-ID') : 'Unknown'}\n`;
      context += `- Age: ${patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 'Unknown'}\n`;
      context += `- Hospital: ${patient.hospitalName || 'Unknown'}\n`;
      context += `- Doctor: ${patient.doctorName || 'Unknown'}\n`;

      // Active medications and reminders
      context += `- Active Reminders: ${activeReminders.length}\n`;
      if (activeReminders.length > 0) {
        context += `- Reminder Times: ${activeReminders.map(r => r.scheduledTime).join(', ')}\n`;
      }

      // Recent health notes
      if (recentNotes.length > 0) {
        context += `- Recent Health Notes: ${recentNotes.map((n) => `${n.note.substring(0, 30)}... (${new Date(n.noteDate).toLocaleDateString('id-ID')})`).join('; ')}\n`;
      }

      // Medical history context
      if (medicalHistory.medications && medicalHistory.medications.length > 0) {
        context += `- Current Medications: ${medicalHistory.medications?.slice(0, 3).map((m) => m.name).join(', ') || ''}\n`;
      }

      if (medicalHistory.symptoms && medicalHistory.symptoms.length > 0) {
        context += `- Recent Symptoms: ${medicalHistory.symptoms?.slice(0, 2).map((s) => s.symptom).join(', ') || ''}\n`;
      }

      // Patient variables (custom fields)
      if (patientVariables.length > 0) {
        context += `- Patient Preferences: ${patientVariables.slice(0, 3).map((v) => `${v.name}: ${v.value}`).join(', ')}\n`;
      }

      // Conversation context
      if (conversationHistory.length > 0) {
        const recentResponses = conversationHistory
          .filter(msg => msg.direction === 'inbound' && msg.intent)
          .slice(0, 3);

        if (recentResponses.length > 0) {
          context += `- Recent Response Patterns: ${recentResponses.map(msg => msg.intent).join(', ')}\n`;
        }

        const lastResponse = conversationHistory[conversationHistory.length - 1];
        if (lastResponse) {
          const timeSinceResponse = Date.now() - new Date(lastResponse.createdAt).getTime();
          const hoursSinceResponse = Math.floor(timeSinceResponse / (1000 * 60 * 60));
          context += `- Last Contact: ${hoursSinceResponse} hours ago\n`;
        }
      }

      // Add intelligent followup-specific context based on patient history
      context += await this.buildIntelligentFollowupContext(followupType, patientContext.context);
    }

    context += `\nResponse Guidelines:\n`;
    context += `- Always respond in Indonesian (Bahasa Indonesia)\n`;
    context += `- Be personal and use patient's name\n`;
    context += `- Include appropriate response options (YA/TIDAK, SUDAH/BELUM, etc.)\n`;
    context += `- Keep message concise but caring\n`;
    context += `- Include PRIMA branding signature\n`;
    context += `- Consider patient's medical history and current condition\n`;

    return context;
  }

  /**
   * Build intelligent followup context based on patient history and followup type
   */
  private async buildIntelligentFollowupContext(
    followupType: string,
    patientContext: PatientContext
  ): Promise<string> {
    let context = '';
    const patient = patientContext.patient;
    const recentNotes = patientContext.recentHealthNotes || [];
    const medicalHistory = patientContext.medicalHistory || {};

    // Analyze recent notes for concerns
    const hasRecentConcerns = recentNotes.some((note: { note: string }) =>
      note.note.toLowerCase().includes('sakit') ||
      note.note.toLowerCase().includes('nyeri') ||
      note.note.toLowerCase().includes('demam') ||
      note.note.toLowerCase().includes('mual') ||
      note.note.toLowerCase().includes('lemah')
    );

    const hasPositiveResponses = recentNotes.some((note: { note: string }) =>
      note.note.toLowerCase().includes('baik') ||
      note.note.toLowerCase().includes('sehat') ||
      note.note.toLowerCase().includes('membaik')
    );

    // Build context based on followup type and patient history
    switch (followupType) {
      case 'REMINDER_CONFIRMATION':
        context += `- Goal: Confirm medication compliance with gentle reminder\n`;

        if (hasRecentConcerns) {
          context += `- Special Consideration: Patient has recently reported health concerns\n`;
          context += `- Tone: Extra gentle and supportive\n`;
        } else if (hasPositiveResponses) {
          context += `- Special Consideration: Patient has been responding well\n`;
          context += `- Tone: Encouraging and positive\n`;
        } else {
          context += `- Tone: Supportive and encouraging\n`;
        }
        break;

      case 'MEDICATION_COMPLIANCE':
        context += `- Goal: Check for side effects and medication experience\n`;

        if (medicalHistory.symptoms && medicalHistory.symptoms.length > 0) {
          context += `- Special Consideration: Patient has ongoing symptoms to monitor\n`;
          context += `- Tone: Attentive and concerned for side effects\n`;
        } else {
          context += `- Tone: Caring and preventative\n`;
        }

        // Check for cancer stage-specific considerations
        if (patient.cancerStage && ['3', '4', 'advanced'].some(stage =>
          patient.cancerStage!.toLowerCase().includes(stage))) {
          context += `- Special Consideration: Advanced cancer stage - monitor closely\n`;
        }
        break;

      case 'SYMPTOM_CHECK':
        context += `- Goal: Monitor current symptoms and health status\n`;

        if (hasRecentConcerns) {
          context += `- Special Consideration: Follow up on previously mentioned concerns\n`;
          context += `- Tone: Professional and thorough\n`;
        } else {
          context += `- Tone: Routine check-in with attention to detail\n`;
        }

        // Age-appropriate communication
        if (patient.birthDate) {
          const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
          if (age > 65) {
            context += `- Special Consideration: Elderly patient - watch for multiple symptoms\n`;
          }
        }
        break;

      case 'GENERAL_WELLBEING':
        context += `- Goal: General check-in and emotional support\n`;

        if (hasRecentConcerns) {
          context += `- Special Consideration: Provide emotional support and reassurance\n`;
          context += `- Tone: Extra warm and supportive\n`;
        } else if (hasPositiveResponses) {
          context += `- Special Consideration: Reinforce positive health behaviors\n`;
          context += `- Tone: Positive and encouraging\n`;
        } else {
          context += `- Tone: Warm and supportive\n`;
        }
        break;
    }

    // Add time-based context
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      context += `- Time Context: Morning interaction - be energetic\n`;
    } else if (currentHour < 17) {
      context += `- Time Context: Afternoon interaction - be balanced\n`;
    } else {
      context += `- Time Context: Evening interaction - be gentle and calming\n`;
    }

    return context;
  }

  /**
   * Get fallback followup message when LLM fails
   */
  private getFallbackFollowupMessage(followupType: string, patientName: string): string {
    const messages = {
      REMINDER_CONFIRMATION: `Halo ${patientName}, kami ingin memastikan apakah Anda sudah mengonsumsi obat sesuai jadwal? Mohon balas "YA" jika sudah atau "TIDAK" jika belum.`,
      MEDICATION_COMPLIANCE: `Halo ${patientName}, bagaimana kondisi Anda setelah mengonsumsi obat? Apakah ada efek samping yang dirasakan?`,
      SYMPTOM_CHECK: `Halo ${patientName}, kami ingin mengetahui kondisi kesehatan Anda saat ini. Apakah ada gejala yang perlu diperhatikan?`,
      GENERAL_WELLBEING: `Halo ${patientName}, kami harap Anda dalam keadaan baik. Ada yang bisa kami bantu hari ini?`
    };

    return messages[followupType as keyof typeof messages] || messages.GENERAL_WELLBEING;
  }

  /**
   * Process patient response to followup with emergency detection
   */
  async processFollowupResponse(
    patientId: string,
    phoneNumber: string,
    message: string,
    followupId: string
  ): Promise<{
    processed: boolean;
    emergencyDetected: boolean;
    response: string;
    escalated: boolean;
  }> {
    try {
      logger.info("Processing followup response", {
        patientId,
        followupId,
        messageLength: message.length,
        operation: "process_followup_response"
      });

      // Get patient context for emergency detection
      const patientContext = await this.patientContextService.getPatientContext(patientId);

      // Build conversation context for analysis
      const conversationContext: ConversationContext = {
        patientId,
        phoneNumber,
        previousMessages: patientContext.found && patientContext.context ?
          patientContext.context.recentConversationHistory?.map(msg => ({
            role: msg.direction === "inbound" ? "user" : "assistant",
            content: msg.message
          })) || [] : [],
        patientInfo: patientContext.found && patientContext.context ? {
          name: patientContext.context.patient.name,
          verificationStatus: patientContext.context.patient.verificationStatus,
          activeReminders: patientContext.context.activeReminders?.map(r => {
            // Parse structured medication data for LLM context
            const medicationDetails = MedicationParser.parseFromReminder(
              r.customMessage,
              r.customMessage
            );
            return {
              medicationName: medicationDetails.name,
              medicationDetails,
              scheduledTime: r.scheduledTime
            };
          }) || []
        } : undefined
      };

      // Perform emergency detection using safety filter
      const { emergencyResult, safetyResult } = await safetyFilterService.analyzePatientMessage(
        message,
        conversationContext
      );

      // Process the message through unified processor if no emergency detected
      let processedResponse: { content: string; actions: string[] } | ProcessedMessage;
      const escalated = safetyResult.escalationRequired;

      if (emergencyResult.isEmergency) {
        logger.warn("Emergency detected in followup response", {
          patientId,
          followupId,
          emergencyConfidence: emergencyResult.confidence,
          emergencyIndicators: emergencyResult.indicators,
          operation: "process_followup_response"
        });

        // Emergency is already handled by safety filter (volunteer notification sent)
        processedResponse = {
          content: "⚠️ *Darurat Terdeteksi*\n\nTim kami telah menerima pesan darurat Anda dan segera menghubungi Anda. Jika ini adalah keadaan darurat medis, segera hubungi layanan darurat terdekat atau hubungi nomor darurat.",
          actions: ["emergency_handled"],
          intent: { primary: "emergency", sentiment: "neutral", confidence: 1.0 },
          confidence: 1.0,
          entities: [],
          response: { message: "", actions: [], type: "auto_reply", priority: "urgent" },
          context: { patientId: "", phoneNumber: "", message: "", timestamp: new Date(), patientName: "", verificationStatus: "" }
        };
      } else {
        // Use message processor for normal responses
        processedResponse = await this.messageProcessorService.processMessage({
          message,
          patientId,
          phoneNumber,
          timestamp: new Date(),
          patientName: conversationContext.patientInfo?.name || "Pasien",
          verificationStatus: conversationContext.patientInfo?.verificationStatus || "verified"
        });
      }

      // Update followup status based on response
      await this.updateFollowupStatus(followupId, message, emergencyResult.isEmergency);

      return {
        processed: true,
        emergencyDetected: emergencyResult.isEmergency,
        response: 'content' in processedResponse ? processedResponse.content : processedResponse.response.message || "",
        escalated
      };
    } catch (error) {
      logger.error("Failed to process followup response", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        followupId,
        operation: "process_followup_response"
      });

      // Fallback response
      return {
        processed: false,
        emergencyDetected: false,
        response: "Terima kasih atas respons Anda. Tim kami akan segera memproses pesan Anda.",
        escalated: false
      };
    }
  }

  /**
   * Update followup status based on patient response
   */
  private async updateFollowupStatus(
    followupId: string,
    patientResponse: string,
    isEmergency: boolean
  ): Promise<void> {
    try {
      const updateData: {
        response: string;
        responseAt: Date;
        updatedAt: Date;
        status?: typeof followupStatusEnum.enumValues[number];
      } = {
        response: patientResponse,
        responseAt: getWIBTime(),
        updatedAt: getWIBTime()
      };

      if (isEmergency) {
        updateData.status = "ESCALATED";
      } else {
        // Analyze response to determine followup completion
        const responseLower = patientResponse.toLowerCase();
        if (responseLower.includes("sudah") || responseLower.includes("ya") || responseLower.includes("selesai")) {
          updateData.status = "COMPLETED";
        } else if (responseLower.includes("belum") || responseLower.includes("tidak")) {
          updateData.status = "NEEDS_ATTENTION";
        } else {
          updateData.status = "RESPONDED";
        }
      }

      await db
        .update(reminderFollowups)
        .set(updateData)
        .where(eq(reminderFollowups.id, followupId));

      logger.info("Followup status updated", {
        followupId,
        status: updateData.status,
        isEmergency,
        operation: "update_followup_status"
      });
    } catch (error) {
      logger.error("Failed to update followup status", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "update_followup_status"
      });
    }
  }

  /**
   * Get followup statistics
   */
  async getFollowupStats(patientId?: string): Promise<Record<string, number>> {
    try {
      const baseQuery = db
        .select({
          status: reminderFollowups.status,
          count: sql<number>`count(*)::int`
        })
        .from(reminderFollowups)
        .groupBy(reminderFollowups.status);

      if (patientId) {
        baseQuery.where(eq(reminderFollowups.patientId, patientId));
      }

      const stats = await baseQuery;

      return stats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat.count;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      logger.error("Failed to get followup stats", error instanceof Error ? error : new Error(String(error)), {
        patientId,
        operation: "get_followup_stats"
      });
      throw error;
    }
  }

  /**
   * Cancel a pending followup
   */
  async cancelFollowup(followupId: string): Promise<void> {
    try {
      await db
        .update(reminderFollowups)
        .set({
          status: "CANCELLED",
          updatedAt: getWIBTime()
        })
        .where(
          and(
            eq(reminderFollowups.id, followupId),
            eq(reminderFollowups.status, "PENDING")
          )
        );

      // Remove from queue
      await this.queueService.dequeueFollowup(followupId);

      logger.info("Followup cancelled", {
        followupId,
        operation: "cancel_followup"
      });
    } catch (error) {
      logger.error("Failed to cancel followup", error instanceof Error ? error : new Error(String(error)), {
        followupId,
        operation: "cancel_followup"
      });
      throw error;
    }
  }
}