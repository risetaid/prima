// Patient Context Service - Comprehensive patient data aggregation with caching
// Provides unified access to patient information, active reminders, and conversation history

import { db } from "@/db";
import {
  reminderSchedules,
  conversationMessages,
  patients,
  healthNotes,
  patientVariables,
} from "@/db";
import { eq, and, gte, desc, isNull, or, inArray, lte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { PatientLookupService } from "./patient-lookup.service";
import { ConversationStateService } from "@/services/conversation-state.service";
import {
  getCachedData,
  setCachedData,
  CACHE_KEYS,
  CACHE_TTL,
  invalidateCache,
} from "@/lib/cache";
import { generatePhoneAlternatives } from "@/lib/phone-utils";

export interface PatientContext {
  patient: {
    id: string;
    name: string;
    phoneNumber: string;
    verificationStatus: string;
    isActive: boolean;
    assignedVolunteerId?: string;
    cancerStage?: string;
    diagnosisDate?: Date;
    doctorName?: string;
    hospitalName?: string;
    birthDate?: Date;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    photoUrl?: string;
    lastReactivatedAt?: Date;
  };
  todaysReminders: Array<{
    id: string;
    scheduledTime: string;
    frequency: string;
    medicationName?: string;
    customMessage?: string;
    isCompleted?: boolean;
    lastCompletedAt?: Date;
  }>;
  activeReminders: Array<{
    id: string;
    scheduledTime: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
    customMessage?: string;
    createdAt: Date;
  }>;
  medicalHistory: {
    diagnosisDate?: Date;
    cancerStage?: string;
    doctorName?: string;
    hospitalName?: string;
    symptoms?: Array<{
      symptom: string;
      severity?: string;
      notedDate: Date;
      notes?: string;
    }>;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      startDate?: Date;
      notes?: string;
    }>;
  };
  recentHealthNotes: Array<{
    id: string;
    note: string;
    noteDate: Date;
    recordedBy: string;
    createdAt: Date;
  }>;
  patientVariables: Array<{
    name: string;
    value: string;
    isActive: boolean;
  }>;
  recentConversationHistory: Array<{
    id: string;
    message: string;
    direction: "inbound" | "outbound";
    messageType: string;
    intent?: string;
    confidence?: number;
    createdAt: Date;
  }>;
  conversationState?: {
    id: string;
    currentContext: string;
    expectedResponseType?: string;
    lastMessage?: string;
    lastMessageAt?: Date;
    messageCount: number;
  };
}

export interface PatientContextResult {
  found: boolean;
  context?: PatientContext;
  error?: string;
  cacheHit?: boolean;
}

/**
 * Patient Context Service
 * Aggregates patient data, active reminders, and conversation history with caching
 */
export class PatientContextService {
  private patientLookupService: PatientLookupService;
  private conversationStateService: ConversationStateService;

  constructor() {
    this.patientLookupService = new PatientLookupService();
    this.conversationStateService = new ConversationStateService();
  }

  /**
   * Get comprehensive patient context by phone number
   * Includes patient info, active reminders, and recent conversation history
   */
  async getPatientContext(phoneNumber: string): Promise<PatientContextResult> {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.patient(phoneNumber);
      const cachedContext = await getCachedData<PatientContext>(cacheKey);

      if (cachedContext) {
        logger.info("Patient context cache hit", { phoneNumber });
        return {
          found: true,
          context: cachedContext,
          cacheHit: true,
        };
      }

      // Find patient by phone number
      const patientLookup = await this.patientLookupService.findPatientByPhone(
        phoneNumber
      );

      if (!patientLookup.found || !patientLookup.patient) {
        logger.info("Patient not found for context lookup", { phoneNumber });
        return {
          found: false,
        };
      }

      const patientId = patientLookup.patient.id;

      // Get comprehensive patient data
      const fullPatientData = await this.getFullPatientData(patientId);

      // Get today's reminders
      const todaysReminders = await this.getTodaysReminders(patientId);

      // Get active reminders
      const activeReminders = await this.getActiveReminders(patientId);

      // Get medical history
      const medicalHistory = await this.getMedicalHistory(patientId);

      // Get recent health notes
      const recentHealthNotes = await this.getRecentHealthNotes(patientId);

      // Get patient variables
      const patientVariables = await this.getPatientVariables(patientId);

      // Get recent conversation history
      const recentHistory = await this.getRecentConversationHistory(patientId);

      // Get current conversation state
      const conversationState = await this.getCurrentConversationState(
        phoneNumber
      );

      const context: PatientContext = {
        patient: fullPatientData,
        todaysReminders,
        activeReminders,
        medicalHistory,
        recentHealthNotes,
        patientVariables,
        recentConversationHistory: recentHistory,
        conversationState,
      };

      // Cache the context for future requests
      await setCachedData(cacheKey, context, CACHE_TTL.PATIENT);

      logger.info("Patient context retrieved and cached", {
        patientId,
        phoneNumber,
        activeRemindersCount: activeReminders.length,
        conversationHistoryCount: recentHistory.length,
      });

      return {
        found: true,
        context,
        cacheHit: false,
      };
    } catch (error) {
      logger.error("Failed to get patient context", error as Error, {
        phoneNumber,
      });
      return {
        found: false,
        error: "Database lookup failed",
      };
    }
  }

  /**
   * Get full patient data including all fields
   */
  private async getFullPatientData(patientId: string) {
    try {
      const patientData = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (patientData.length === 0) {
        throw new Error("Patient not found");
      }

      const patient = patientData[0];
      return {
        id: patient.id,
        name: patient.name,
        phoneNumber: patient.phoneNumber,
        verificationStatus: patient.verificationStatus,
        isActive: patient.isActive,
        assignedVolunteerId: patient.assignedVolunteerId || undefined,
        cancerStage: patient.cancerStage || undefined,
        diagnosisDate: patient.diagnosisDate || undefined,
        doctorName: patient.doctorName || undefined,
        hospitalName: patient.hospitalName || undefined,
        birthDate: patient.birthDate || undefined,
        address: patient.address || undefined,
        emergencyContactName: patient.emergencyContactName || undefined,
        emergencyContactPhone: patient.emergencyContactPhone || undefined,
        notes: patient.notes || undefined,
        photoUrl: patient.photoUrl || undefined,
        lastReactivatedAt: patient.lastReactivatedAt || undefined,
      };
    } catch (error) {
      logger.error("Failed to get full patient data", error as Error, {
        patientId,
      });
      throw error;
    }
  }

  /**
   * Get today's reminders for a patient
   */
  private async getTodaysReminders(patientId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reminders = await db
        .select({
          id: reminderSchedules.id,
          scheduledTime: reminderSchedules.scheduledTime,
          frequency: reminderSchedules.frequency,
          customMessage: reminderSchedules.customMessage,
          createdAt: reminderSchedules.createdAt,
        })
        .from(reminderSchedules)
        .where(
          and(
            eq(reminderSchedules.patientId, patientId),
            eq(reminderSchedules.isActive, true),
            isNull(reminderSchedules.deletedAt),
            gte(reminderSchedules.startDate, today),
            lte(reminderSchedules.startDate, tomorrow)
          )
        )
        .orderBy(reminderSchedules.scheduledTime)
        .limit(10);

      return reminders.map((reminder) => ({
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        frequency: reminder.frequency,
        medicationName: reminder.customMessage || "obat",
        customMessage: reminder.customMessage || undefined,
        isCompleted: false, // TODO: Check from reminder_logs
        lastCompletedAt: undefined, // TODO: Get from reminder_logs
      }));
    } catch (error) {
      logger.error("Failed to get today's reminders", error as Error, {
        patientId,
      });
      return [];
    }
  }

  /**
   * Get medical history for a patient
   */
  private async getMedicalHistory(patientId: string) {
    try {
      // Get patient basic medical info
      const patientData = await db
        .select({
          diagnosisDate: patients.diagnosisDate,
          cancerStage: patients.cancerStage,
          doctorName: patients.doctorName,
          hospitalName: patients.hospitalName,
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      // Get symptoms from health notes (look for symptom keywords)
      const symptomNotes = await db
        .select({
          note: healthNotes.note,
          noteDate: healthNotes.noteDate,
        })
        .from(healthNotes)
        .where(
          and(
            eq(healthNotes.patientId, patientId),
            isNull(healthNotes.deletedAt)
          )
        )
        .orderBy(desc(healthNotes.noteDate))
        .limit(20);

      // Extract symptoms from notes (simple keyword matching)
      const symptoms = [];
      const symptomKeywords = [
        "nyeri",
        "sakit",
        "mual",
        "muntah",
        "demam",
        "sesak",
        "kelelahan",
        "pusing",
        "alergi",
      ];

      for (const note of symptomNotes) {
        for (const keyword of symptomKeywords) {
          if (note.note.toLowerCase().includes(keyword)) {
            symptoms.push({
              symptom: keyword,
              severity: "unknown", // Could be enhanced with ML
              notedDate: note.noteDate,
              notes: note.note,
            });
            break; // Only add each symptom once per note
          }
        }
      }

      // Get medications from patient variables or medical records
      const medicationVars = await db
        .select({
          variableName: patientVariables.variableName,
          variableValue: patientVariables.variableValue,
        })
        .from(patientVariables)
        .where(
          and(
            eq(patientVariables.patientId, patientId),
            eq(patientVariables.isActive, true),
            isNull(patientVariables.deletedAt)
          )
        );

      const medications = medicationVars
        .filter(
          (v) =>
            v.variableName.toLowerCase().includes("obat") ||
            v.variableName.toLowerCase().includes("med")
        )
        .map((v) => ({
          name: v.variableValue,
          dosage: undefined, // Could be parsed from value
          frequency: undefined, // Could be parsed from value
          startDate: undefined,
          notes: v.variableName,
        }));

      const patient = patientData[0] || {};

      return {
        diagnosisDate: patient.diagnosisDate || undefined,
        cancerStage: patient.cancerStage || undefined,
        doctorName: patient.doctorName || undefined,
        hospitalName: patient.hospitalName || undefined,
        symptoms: symptoms.slice(0, 10), // Limit to 10 most recent
        medications: medications.slice(0, 5), // Limit to 5 medications
      };
    } catch (error) {
      logger.error("Failed to get medical history", error as Error, {
        patientId,
      });
      return {
        diagnosisDate: undefined,
        cancerStage: undefined,
        doctorName: undefined,
        hospitalName: undefined,
        symptoms: [],
        medications: [],
      };
    }
  }

  /**
   * Get recent health notes for a patient
   */
  private async getRecentHealthNotes(patientId: string) {
    try {
      const notes = await db
        .select({
          id: healthNotes.id,
          note: healthNotes.note,
          noteDate: healthNotes.noteDate,
          recordedBy: healthNotes.recordedBy,
          createdAt: healthNotes.createdAt,
        })
        .from(healthNotes)
        .where(
          and(
            eq(healthNotes.patientId, patientId),
            isNull(healthNotes.deletedAt)
          )
        )
        .orderBy(desc(healthNotes.noteDate))
        .limit(5);

      return notes.map((note) => ({
        id: note.id,
        note: note.note,
        noteDate: note.noteDate,
        recordedBy: note.recordedBy,
        createdAt: note.createdAt,
      }));
    } catch (error) {
      logger.error("Failed to get recent health notes", error as Error, {
        patientId,
      });
      return [];
    }
  }

  /**
   * Get patient variables for a patient
   */
  private async getPatientVariables(patientId: string) {
    try {
      const variables = await db
        .select({
          variableName: patientVariables.variableName,
          variableValue: patientVariables.variableValue,
          isActive: patientVariables.isActive,
        })
        .from(patientVariables)
        .where(
          and(
            eq(patientVariables.patientId, patientId),
            eq(patientVariables.isActive, true),
            isNull(patientVariables.deletedAt)
          )
        )
        .orderBy(desc(patientVariables.createdAt))
        .limit(10);

      return variables.map((v) => ({
        name: v.variableName,
        value: v.variableValue,
        isActive: v.isActive,
      }));
    } catch (error) {
      logger.error("Failed to get patient variables", error as Error, {
        patientId,
      });
      return [];
    }
  }

  /**
   * Get active reminders for a patient
   */
  private async getActiveReminders(patientId: string) {
    try {
      const now = new Date();

      const reminders = await db
        .select({
          id: reminderSchedules.id,
          scheduledTime: reminderSchedules.scheduledTime,
          frequency: reminderSchedules.frequency,
          startDate: reminderSchedules.startDate,
          endDate: reminderSchedules.endDate,
          customMessage: reminderSchedules.customMessage,
          createdAt: reminderSchedules.createdAt,
        })
        .from(reminderSchedules)
        .where(
          and(
            eq(reminderSchedules.patientId, patientId),
            eq(reminderSchedules.isActive, true),
            isNull(reminderSchedules.deletedAt),
            gte(reminderSchedules.startDate, now), // Only future or current reminders
            // endDate is null OR endDate >= now
            or(
              isNull(reminderSchedules.endDate),
              gte(reminderSchedules.endDate, now)
            )
          )
        )
        .orderBy(desc(reminderSchedules.createdAt))
        .limit(10); // Limit to prevent excessive data

      // Map to handle null values properly
      return reminders.map((reminder) => ({
        id: reminder.id,
        scheduledTime: reminder.scheduledTime,
        frequency: reminder.frequency,
        startDate: reminder.startDate,
        endDate: reminder.endDate || undefined,
        customMessage: reminder.customMessage || undefined,
        createdAt: reminder.createdAt,
      }));
    } catch (error) {
      logger.error("Failed to get active reminders", error as Error, {
        patientId,
      });
      return [];
    }
  }

  /**
   * Get recent conversation history for a patient
   */
  private async getRecentConversationHistory(patientId: string) {
    try {
      // Import conversationStates here to avoid naming conflict
      const { conversationStates } = await import("@/db");

      // Get conversation states for this patient
      const patientConversationStates = await db
        .select({ id: conversationStates.id })
        .from(conversationStates)
        .where(eq(conversationStates.patientId, patientId))
        .orderBy(desc(conversationStates.updatedAt))
        .limit(5); // Get last 5 conversation states

      if (patientConversationStates.length === 0) {
        return [];
      }

      const stateIds = patientConversationStates.map(
        (state: { id: string }) => state.id
      );

      // Get recent messages from these conversation states
      const messages = await db
        .select({
          id: conversationMessages.id,
          message: conversationMessages.message,
          direction: conversationMessages.direction,
          messageType: conversationMessages.messageType,
          createdAt: conversationMessages.createdAt,
        })
        .from(conversationMessages)
        .where(inArray(conversationMessages.conversationStateId, stateIds))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(20); // Get last 20 messages

      // Map to ensure proper types
      return messages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        direction: msg.direction as "inbound" | "outbound",
        messageType: msg.messageType,
        createdAt: msg.createdAt,
      }));
    } catch (error) {
      logger.error("Failed to get conversation history", error as Error, {
        patientId,
      });
      return [];
    }
  }

  /**
   * Get current conversation state for a phone number
   */
  private async getCurrentConversationState(phoneNumber: string) {
    try {
      const state = await this.conversationStateService.findByPhoneNumber(
        phoneNumber
      );

      if (!state) {
        return undefined;
      }

      return {
        id: state.id,
        currentContext: state.currentContext,
        expectedResponseType: state.expectedResponseType,
        lastMessage: state.lastMessage,
        lastMessageAt: state.lastMessageAt,
        messageCount: state.messageCount,
      };
    } catch (error) {
      logger.error("Failed to get conversation state", error as Error, {
        phoneNumber,
      });
      return undefined;
    }
  }

  /**
   * Invalidate patient context cache
   * Call this when patient data, reminders, or conversations are updated
   */
  async invalidatePatientContext(phoneNumber: string): Promise<void> {
    try {
      const cacheKey = CACHE_KEYS.patient(phoneNumber);
      await invalidateCache(cacheKey);

      logger.info("Patient context cache invalidated", { phoneNumber });
    } catch (error) {
      logger.error(
        "Failed to invalidate patient context cache",
        error as Error,
        { phoneNumber }
      );
    }
  }

  /**
   * Get patient context with fallback phone number variations
   * Useful when exact phone number match fails
   */
  async getPatientContextWithFallback(
    phoneNumber: string
  ): Promise<PatientContextResult> {
    // Try exact match first
    const exactResult = await this.getPatientContext(phoneNumber);
    if (exactResult.found) {
      return exactResult;
    }

    // Try alternative phone number formats
    const alternatives = generatePhoneAlternatives(phoneNumber);

    for (const altPhone of alternatives) {
      const altResult = await this.getPatientContext(altPhone);
      if (altResult.found) {
        logger.info("Patient context found with alternative phone format", {
          originalPhone: phoneNumber,
          matchedPhone: altPhone,
        });
        return altResult;
      }
    }

    return {
      found: false,
    };
  }

  /**
   * Refresh patient context cache
   * Forces a fresh lookup and updates the cache
   */
  async refreshPatientContext(
    phoneNumber: string
  ): Promise<PatientContextResult> {
    // Invalidate existing cache
    await this.invalidatePatientContext(phoneNumber);

    // Get fresh context
    return await this.getPatientContext(phoneNumber);
  }
}
