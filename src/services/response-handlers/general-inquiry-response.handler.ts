/**
 * General inquiry response handler with enhanced patient data access
 * Handles natural language queries for health notes, reminders, and general information
 */

import {
  StandardResponseHandler,
  ResponseContext,
  StandardResponse,
  createSuccessResponse,
  createErrorResponse,
  createEmergencyResponse,
} from "../response-handler";
import { db, patients } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { llmService } from "../llm/llm.service";
import { getPromptForContext } from "../llm/prompts";
import { ConversationContext } from "../llm/llm.types";
import { PatientContextService } from "../patient/patient-context.service";
import { safetyFilterService } from "../llm/safety-filter";
import { dataAccessValidationService } from "../security/data-access-validation.service";
import { healthNotesQueryService } from "../patient/health-notes-query.service";
import { HealthNoteService } from "../patient/health-note.service";
import { VolunteerNotificationService } from "../notification/volunteer-notification.service";
import { healthEducationService } from "../education/health-education.service";

interface HealthNotesQuery {
  time_range: string;
  keywords: string[];
  limit: number;
}


interface GeneralInquiryResult {
  intent: string;
  response_type: string;
  topic: string;
  data_access_required: boolean;
  patient_data_type?: string;
  health_notes_query?: HealthNotesQuery;
  needs_human_help: boolean;
  follow_up_required: boolean;
  reason: string;
  confidence: number;
}

export class GeneralInquiryResponseHandler extends StandardResponseHandler {
  private patientContextService: PatientContextService;
  private healthNoteService: HealthNoteService;
  private volunteerNotificationService: VolunteerNotificationService;

  constructor() {
    super("general_inquiry", 30); // Lower priority than verification
    this.patientContextService = new PatientContextService();
    this.healthNoteService = new HealthNoteService();
    this.volunteerNotificationService = new VolunteerNotificationService();
  }

  async handle(context: ResponseContext): Promise<StandardResponse> {
    const startTime = Date.now();

    try {
      logger.info("Processing general inquiry with enhanced data access", {
        patientId: context.patientId,
        phoneNumber: context.phoneNumber,
        verificationStatus: context.verificationStatus,
        messageLength: context.message.length,
        operation: "enhanced_general_inquiry",
      });

      // Check if patient is verified
      if (context.verificationStatus !== "VERIFIED") {
        return createErrorResponse(
          "Patient is not verified",
          "Patient must be verified to process general inquiries",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "general_inquiry_handler",
            action: "not_verified",
          }
        );
      }

      // Get patient details
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, context.patientId))
        .limit(1);

      if (!patient.length) {
        return createErrorResponse(
          "Patient not found",
          "Patient ID does not exist",
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "general_inquiry_handler",
            action: "patient_not_found",
          }
        );
      }

      const patientData = patient[0];

      // Perform safety filtering first
      const safetyResult = await safetyFilterService.analyzePatientMessage(
        context.message,
        {
          patientId: context.patientId,
          phoneNumber: context.phoneNumber,
          conversationId:
            (context.additionalData?.conversationId as string) ||
            "general_inquiry",
          previousMessages: [],
        }
      );

      // Handle emergency detection from safety filter
      if (safetyResult.emergencyResult.isEmergency) {
        logger.warn("Emergency detected in general inquiry", {
          patientId: context.patientId,
          emergencyDetected: safetyResult.emergencyResult.isEmergency,
          operation: "emergency_detection",
        });

        return createEmergencyResponse(
          "Emergency detected in inquiry - volunteer notified",
          context.patientId,
          undefined,
          {
            patientId: context.patientId,
            processingTimeMs: Date.now() - startTime,
            source: "general_inquiry_handler",
            action: "emergency_detected",
            emergencyDetected: true,
            escalated: true,
            analysisResult: safetyResult.emergencyResult.indicators,
          }
        );
      }

      // Build enhanced conversation context for LLM analysis
      const llmContext = await this.buildEnhancedGeneralInquiryContext(
        context.patientId,
        context.phoneNumber,
        context.message
      );

      // Analyze patient inquiry using LLM
      const analysisResult = await this.analyzeGeneralInquiryWithLLM(
        llmContext,
        context.message
      );

      // Handle different types of inquiries
      const response = await this.handleInquiryType(
        context,
        llmContext,
        analysisResult,
        patientData.name
      );

      logger.info("Enhanced general inquiry processed", {
        patientId: context.patientId,
        responseResult: analysisResult.response_type,
        topic: analysisResult.topic,
        dataAccessRequired: analysisResult.data_access_required,
        patientDataType: analysisResult.patient_data_type,
        needsHumanHelp: analysisResult.needs_human_help,
        confidence: analysisResult.confidence,
        processingTimeMs: Date.now() - startTime,
        operation: "enhanced_general_inquiry_completed",
      });

      return {
        ...response,
        metadata: {
          timestamp: new Date().toISOString(),
          ...(response.metadata || {}),
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "general_inquiry_handler",
          action: "inquiry_processed",
          responseResult: analysisResult.response_type,
          dataAccessRequired: analysisResult.data_access_required,
        },
      };
    } catch (error) {
      logger.error(
        "Failed to process enhanced general inquiry",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: context.patientId,
          operation: "enhanced_general_inquiry",
        }
      );

      return createErrorResponse(
        "Failed to process general inquiry",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          processingTimeMs: Date.now() - startTime,
          source: "general_inquiry_handler",
          action: "processing_error",
        }
      );
    }
  }

  /**
   * Build enhanced conversation context for general inquiry
   */
  private async buildEnhancedGeneralInquiryContext(
    patientId: string,
    phoneNumber: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    message: string
  ): Promise<ConversationContext> {
    try {
      const patientContext = await this.patientContextService.getPatientContext(
        patientId
      );

      return {
        patientId,
        phoneNumber,
        previousMessages:
          patientContext.found && patientContext.context
            ? patientContext.context.recentConversationHistory?.map((msg) => ({
                role: msg.direction === "inbound" ? "user" : "assistant",
                content: msg.message,
              })) || []
            : [],
        patientInfo:
          patientContext.found && patientContext.context
            ? {
                name: patientContext.context.patient.name,
                verificationStatus:
                  patientContext.context.patient.verificationStatus,
                activeReminders:
                  patientContext.context.activeReminders?.map((r) => ({
                    reminderName: r.customMessage || "pengingat",
                    scheduledTime: r.scheduledTime,
                  })) || [],
              }
            : undefined,
        conversationId: `general_inquiry_${Date.now()}`,
      };
    } catch (error) {
      logger.warn(
        "Failed to build enhanced general inquiry context, using basic context",
        {
          patientId,
          error: error instanceof Error ? error.message : String(error),
          operation: "build_general_inquiry_context",
        }
      );

      return {
        patientId,
        phoneNumber,
        previousMessages: [],
        patientInfo: undefined,
        conversationId: `general_inquiry_${Date.now()}`,
      };
    }
  }

  /**
   * Analyze general inquiry using LLM
   */
  private async analyzeGeneralInquiryWithLLM(
    context: ConversationContext,
    patientMessage: string
  ): Promise<GeneralInquiryResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const prompt = getPromptForContext("general", context);
      const llmResponse = await llmService.generatePatientResponse(
        "general",
        context,
        patientMessage
      );

      // Parse LLM response
      const analysis = JSON.parse(llmResponse.content) as GeneralInquiryResult;

      // Validate and sanitize response
      return {
        intent: analysis.intent || "general_inquiry",
        response_type: analysis.response_type || "informasi",
        topic: analysis.topic || "umum",
        data_access_required: Boolean(analysis.data_access_required),
        patient_data_type: analysis.patient_data_type,
        health_notes_query: analysis.health_notes_query,
        needs_human_help: Boolean(analysis.needs_human_help),
        follow_up_required: Boolean(analysis.follow_up_required),
        reason: analysis.reason || "General inquiry analysis",
        confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
      };
    } catch (error) {
      logger.warn("LLM analysis failed for general inquiry, using fallback", {
        patientId: context.patientId,
        error: error instanceof Error ? error.message : String(error),
        operation: "llm_analysis_fallback",
      });

      // Fallback analysis based on simple keyword matching
      return this.performFallbackAnalysis(patientMessage);
    }
  }

  /**
   * Handle different types of inquiries based on analysis
   */
  private async handleInquiryType(
    context: ResponseContext,
    llmContext: ConversationContext,
    analysis: GeneralInquiryResult,
    patientName: string
  ): Promise<StandardResponse> {
    // Handle escalation if needed
    if (analysis.needs_human_help) {
      await this.escalateToVolunteer(
        context.patientId,
        context.message,
        analysis,
        patientName
      );
    }

    // Validate data access before handling any data requests
    if (analysis.data_access_required && analysis.patient_data_type) {
      const validationResult =
        await dataAccessValidationService.validateDataAccess(
          {
            patientId: context.patientId,
            requestedDataType: analysis.patient_data_type as
              | "health_notes"
              | "reminder"
              | "general",
            requestContext: "patient_initiated",
            conversationId: llmContext.conversationId,
          },
          llmContext
        );

      if (!validationResult.isAuthorized) {
        logger.warn("Data access request denied", {
          patientId: context.patientId,
          requestedDataType: analysis.patient_data_type,
          riskLevel: validationResult.riskLevel,
          violations: validationResult.violations,
          operation: "data_access_denied",
        });

        // Return appropriate error response based on risk level
        if (
          validationResult.riskLevel === "critical" ||
          validationResult.riskLevel === "high"
        ) {
          return createErrorResponse(
            "Access denied",
            "Your request cannot be processed at this time. Please contact support.",
            {
              patientId: context.patientId,
              action: "data_access_denied_high_risk",
              analysisResult: validationResult,
              escalated: validationResult.requiresEscalation,
            }
          );
        } else if (validationResult.requiresConsent) {
          return createErrorResponse(
            "Consent required",
            "This type of information requires additional consent. Please contact your healthcare provider.",
            {
              patientId: context.patientId,
              action: "data_access_consent_required",
              dataAccessRequired: true,
            }
          );
        } else {
          return createErrorResponse(
            "Access restricted",
            "You don't have permission to access this information. Please verify your account or contact support.",
            {
              patientId: context.patientId,
              action: "data_access_denied",
            }
          );
        }
      }

      // Log successful access validation
      logger.info("Data access validated", {
        patientId: context.patientId,
        requestedDataType: analysis.patient_data_type,
        riskLevel: validationResult.riskLevel,
        operation: "data_access_granted",
      });
    }

    // Handle health notes queries
    if (
      analysis.patient_data_type === "health_notes" &&
      analysis.health_notes_query
    ) {
      return await this.handleHealthNotesQuery(
        context,
        llmContext,
        analysis,
        patientName
      );
    }

    
    // Handle reminder queries
    if (analysis.patient_data_type === "reminder") {
      return await this.handleReminderQuery(
        context,
        llmContext,
        analysis,
        patientName
      );
    }

    // Generate general response
    return await this.generateGeneralResponse(
      llmContext,
      analysis,
      patientName
    );
  }

  /**
   * Handle health notes queries
   */
  private async handleHealthNotesQuery(
    context: ResponseContext,
    llmContext: ConversationContext,
    analysis: GeneralInquiryResult,
    patientName: string
  ): Promise<StandardResponse> {
    try {
      // Parse natural language query
      const healthNotesQuery =
        healthNotesQueryService.parseNaturalLanguageQuery(context.message);

      // Execute query
      const queryResult = await healthNotesQueryService.queryHealthNotes(
        context.patientId,
        healthNotesQuery
      );

      // Format notes for LLM response
      const formattedNotes = healthNotesQueryService.formatNotesForLLM(
        queryResult.notes
      );

      // Generate natural response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _intentResult = {
        intent: "health_notes_inquiry",
        confidence: analysis.confidence,
        entities: {
          queryType: analysis.health_notes_query?.time_range || "semuanya",
          notesFound: queryResult.notes.length,
          keywords: analysis.health_notes_query?.keywords || [],
        },
      };

      const additionalContext = `Health Notes Query Results:
${formattedNotes}

Query Summary: ${queryResult.querySummary}
Time Range: ${queryResult.timeRange}
Keywords: ${queryResult.keywords.join(", ")}

Original Query: ${context.message}`;

      // Response generation prompt removed - using simplified system
      // LLM context will be used directly for response generation
      const llmResponse = await llmService.generatePatientResponse(
        "response",
        llmContext,
        additionalContext
      );

      return createSuccessResponse(
        "Health notes inquiry processed successfully",
        {
          patientName,
          queryResult: {
            notesFound: queryResult.notes.length,
            totalCount: queryResult.totalCount,
            timeRange: queryResult.timeRange,
            keywords: queryResult.keywords,
          },
          generatedResponse: llmResponse.content,
          dataAccessed: true,
          processed: true,
        },
        {
          patientId: context.patientId,
          dataAccessRequired: true,
          patientDataType: "health_notes",
          notesFound: queryResult.notes.length,
        }
      );
    } catch (error) {
      logger.error(
        "Failed to handle health notes query",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: context.patientId,
          operation: "health_notes_query_failed",
        }
      );

      return createErrorResponse(
        "Failed to retrieve health notes",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          action: "health_notes_query_failed",
        }
      );
    }
  }

  
  /**
   * Handle reminder queries
   */
  private async handleReminderQuery(
    context: ResponseContext,
    llmContext: ConversationContext,
    analysis: GeneralInquiryResult,
    patientName: string
  ): Promise<StandardResponse> {
    try {
      // Get patient context for reminders
      const patientContext = await this.patientContextService.getPatientContext(
        context.patientId
      );

      if (!patientContext.found || !patientContext.context) {
        return createErrorResponse(
          "Patient context not found",
          "Could not retrieve patient reminder information",
          {
            patientId: context.patientId,
            action: "patient_context_not_found",
          }
        );
      }

      const reminders = patientContext.context.todaysReminders || [];
      const activeReminders = patientContext.context.activeReminders || [];

      // Format reminder information
      const reminderInfo = this.formatRemindersForLLM(
        reminders,
        activeReminders
      );

      // Generate natural response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _intentResult = {
        intent: "reminder_inquiry",
        confidence: analysis.confidence,
        entities: {
          todayReminders: reminders.length,
          activeReminders: activeReminders.length,
        },
      };

      const additionalContext = `Reminder Information:
${reminderInfo}

Today's Reminders: ${reminders.length}
Active Reminders: ${activeReminders.length}

Original Query: ${context.message}`;

      // Response generation prompt removed - using simplified system
      // LLM context will be used directly for response generation
      const llmResponse = await llmService.generatePatientResponse(
        "response",
        llmContext,
        additionalContext
      );

      return createSuccessResponse(
        "Reminder inquiry processed successfully",
        {
          patientName,
          reminderInfo: {
            todayReminders: reminders.length,
            activeReminders: activeReminders.length,
            todaysSchedule: reminders.map((r) => ({
              time: r.scheduledTime,
              reminder: (r as { message?: string; reminderName?: string }).message || r.reminderName || "Pengingat",
            })),
          },
          generatedResponse: llmResponse.content,
          dataAccessed: true,
          processed: true,
        },
        {
          patientId: context.patientId,
          dataAccessRequired: true,
          patientDataType: "reminder",
          remindersFound: reminders.length,
        }
      );
    } catch (error) {
      logger.error(
        "Failed to handle reminder query",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: context.patientId,
          operation: "reminder_query_failed",
        }
      );

      return createErrorResponse(
        "Failed to retrieve reminder information",
        error instanceof Error ? error.message : String(error),
        {
          patientId: context.patientId,
          action: "reminder_query_failed",
        }
      );
    }
  }

  
  /**
   * Generate general response for non-data queries
   */
  private async generateGeneralResponse(
    llmContext: ConversationContext,
    analysis: GeneralInquiryResult,
    patientName: string
  ): Promise<StandardResponse> {
    try {
      const contextualEducation: unknown[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _intentResult = {
        intent: "general_inquiry",
        confidence: analysis.confidence,
        entities: {
          responseResult: analysis.response_type,
          topic: analysis.topic,
        },
      };

      const additionalContext = `General Inquiry Context:
Response Type: ${analysis.response_type}
Topic: ${analysis.topic}
Reason: ${analysis.reason}
Data Access Required: ${analysis.data_access_required}

Original Message: ${
        llmContext.previousMessages[llmContext.previousMessages.length - 1]
          ?.content || ""
      }`;

      // Response generation prompt removed - using simplified system
      // LLM context will be used directly for response generation
      const llmResponse = await llmService.generatePatientResponse(
        "response",
        llmContext,
        additionalContext
      );

      // Add health education content if appropriate
      let enhancedResponse = llmResponse.content;
      let educationContent = "";

      try {
        // Get contextual education content based on the conversation
        const contextualEducation =
          await healthEducationService.getContextualEducation(
            llmContext.patientId,
            llmContext
          );

        if (contextualEducation.length > 0 && Math.random() > 0.7) {
          // 30% chance to add education
          const selectedContent = contextualEducation[0]; // Use most relevant
          educationContent =
            "\n\n💡 **Tips Kesehatan Hari Ini:**\n" +
            healthEducationService.formatContentForDelivery(
              selectedContent,
              "whatsapp"
            );

          // Track education delivery
          await healthEducationService.trackEducationSession({
            patientId: llmContext.patientId,
            contentId: selectedContent.id,
            sessionType: "reactive_education",
            engagementScore: 0, // Will be updated based on patient response
          });

          enhancedResponse += educationContent;
        }
      } catch (error) {
        logger.warn("Failed to add education content", {
          patientId: llmContext.patientId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return createSuccessResponse(
        enhancedResponse,
        {
          patientName,
          responseResult: analysis.response_type,
          generatedResponse: llmResponse.content,
          educationContentAdded: educationContent.length > 0,
          educationTopics:
            contextualEducation.length > 0
              ? (contextualEducation as { category: string }[]).map(
                  (c: { category: string }) => c.category
                )
              : [],
          dataAccessed: analysis.data_access_required,
          processed: true,
        },
        {
          patientId: llmContext.patientId,
          dataAccessRequired: analysis.data_access_required,
          responseResult: analysis.response_type,
        }
      );
    } catch (error) {
      logger.error(
        "Failed to generate general response",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId: llmContext.patientId,
          operation: "general_response_generation_failed",
        }
      );

      return createErrorResponse(
        "Failed to generate response",
        error instanceof Error ? error.message : String(error),
        {
          patientId: llmContext.patientId,
          action: "general_response_failed",
        }
      );
    }
  }

  /**
   * Format reminders for LLM consumption
   */
  private formatRemindersForLLM(
    todaysReminders: { scheduledTime: string; reminderName?: string }[],
    activeReminders: { scheduledTime: string; reminderName?: string }[]
  ): string {
    if (todaysReminders.length === 0 && activeReminders.length === 0) {
      return "Tidak ada pengingat terjadwal.";
    }

    let result = "";

    if (todaysReminders.length > 0) {
      result += "Pengingat Hari Ini:\n";
      todaysReminders.forEach((reminder, index) => {
        result += `${index + 1}. ${reminder.scheduledTime} - ${
          (reminder as { message?: string }).message || "Pengingat"
        }\n`;
      });
    }

    if (activeReminders.length > 0) {
      if (result) result += "\n";
      result += "Pengingat Aktif:\n";
      activeReminders.forEach((reminder, index) => {
        result += `${index + 1}. ${reminder.scheduledTime} - ${
          (reminder as { message?: string }).message || "Pengingat"
        }\n`;
      });
    }

    return result;
  }

  /**
   * Escalate to volunteer if needed
   */
  private async escalateToVolunteer(
    patientId: string,
    message: string,
    analysis: GeneralInquiryResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    patientName: string
  ): Promise<void> {
    try {
      await this.volunteerNotificationService.createNotification({
        patientId,
        message,
        reason: "general_inquiry_escalation",
        intent: analysis.intent,
        patientContext: {
          inquiryType: analysis.response_type,
          topic: analysis.topic,
          reason: analysis.reason,
          confidence: analysis.confidence,
        },
      });

      logger.info("General inquiry escalated to volunteer", {
        patientId,
        responseResult: analysis.response_type,
        topic: analysis.topic,
        operation: "general_inquiry_escalation",
      });
    } catch (error) {
      logger.error(
        "Failed to escalate general inquiry to volunteer",
        error instanceof Error ? error : new Error(String(error)),
        {
          patientId,
          operation: "escalation_failed",
        }
      );
    }
  }

  /**
   * Fallback analysis when LLM fails
   */
  private performFallbackAnalysis(message: string): GeneralInquiryResult {
    const normalizedMessage = message.toLowerCase();

    // Simple keyword-based analysis
    const healthNotesKeywords = [
      "catatan",
      "kesehatan",
      "riwayat",
      "record",
      "note",
    ];
    const reminderKeywords = [
      "pengingat",
      "reminder",
      "jadwal",
    ];
    const emergencyKeywords = [
      "darurat",
      "emergency",
      "tolong",
      "bantuan",
      "sakitt",
    ];

    const isHealthNotesQuery = healthNotesKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    const isReminderQuery = reminderKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );
    const isEmergency = emergencyKeywords.some((keyword) =>
      normalizedMessage.includes(keyword)
    );

    return {
      intent: "general_inquiry",
      response_type: isEmergency
        ? "eskalasi"
        : isHealthNotesQuery
        ? "data_pasien"
        : isReminderQuery
        ? "data_pasien"
        : "informasi",
      topic: isHealthNotesQuery
        ? "catatan_kesehatan"
        : isReminderQuery
        ? "pengingat"
        : "umum",
      data_access_required: isHealthNotesQuery || isReminderQuery,
      patient_data_type: isHealthNotesQuery
        ? "health_notes"
        : isReminderQuery
        ? "reminder"
        : undefined,
      needs_human_help: isEmergency,
      follow_up_required: false,
      reason: "Fallback analysis due to LLM failure",
      confidence: 0.6,
    };
  }
}
