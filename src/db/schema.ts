// Import all schemas

// Re-export all enums
export * from "./enums";

// Re-export all tables
export * from "./core-schema";
export * from "./patient-schema";
export * from "./reminder-schema";
export * from "./cms-schema";
export * from "./llm-prompt-schema";
export * from "./analytics-schema";

// Import LLM cache table
import { volunteerNotifications } from "./patient-schema";

// Import tables for relations (they are already exported above, so we can use them directly)
import { users } from "./core-schema";
import { patients } from "./patient-schema";
import { medicalRecords } from "./patient-schema";

import { healthNotes } from "./patient-schema";
import { patientVariables } from "./patient-schema";
import { conversationStates } from "./patient-schema";
import { conversationMessages } from "./patient-schema";
import { verificationLogs } from "./patient-schema";
import { reminderSchedules } from "./reminder-schema";
import { reminderLogs } from "./reminder-schema";
import { manualConfirmations } from "./reminder-schema";
import { whatsappTemplates } from "./reminder-schema";
import { reminderContentAttachments, reminderFollowups } from "./reminder-schema";

import { cmsArticles } from "./cms-schema";
import { cmsVideos } from "./cms-schema";

// Import LLM prompt tables
import { llmPromptTemplates } from "./llm-prompt-schema";
import { llmPromptTests } from "./llm-prompt-schema";
import { llmPromptTestVariants } from "./llm-prompt-schema";
import { llmPromptTestResults } from "./llm-prompt-schema";
import { llmPromptMetrics } from "./llm-prompt-schema";

// Import analytics tables
import { analyticsEvents } from "./analytics-schema";
import { performanceMetrics } from "./analytics-schema";
import { cohortAnalysis } from "./analytics-schema";
import { auditLogs } from "./analytics-schema";
import { dataAccessLogs } from "./analytics-schema";
import { systemHealthMetrics } from "./analytics-schema";

// ===== RELATIONS =====

import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ one, many }) => ({
  approver: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
    relationName: "UserApprovals",
  }),
  approvedUsers: many(users, {
    relationName: "UserApprovals",
  }),
  patientsManaged: many(patients),
  reminderSchedulesCreated: many(reminderSchedules),
  whatsappTemplatesCreated: many(whatsappTemplates),
   manualConfirmations: many(manualConfirmations),
   medicalRecords: many(medicalRecords),
   healthNotesRecorded: many(healthNotes),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  assignedVolunteer: one(users, {
    fields: [patients.assignedVolunteerId],
    references: [users.id],
  }),
  reminderSchedules: many(reminderSchedules),
  reminderLogs: many(reminderLogs),
   manualConfirmations: many(manualConfirmations),
   medicalRecords: many(medicalRecords),
   healthNotes: many(healthNotes),
  patientVariables: many(patientVariables),
  verificationLogs: many(verificationLogs),
  conversationStates: many(conversationStates),

}));

export const reminderSchedulesRelations = relations(
  reminderSchedules,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [reminderSchedules.patientId],
      references: [patients.id],
    }),
    createdByUser: one(users, {
      fields: [reminderSchedules.createdById],
      references: [users.id],
    }),
    reminderLogs: many(reminderLogs),
    manualConfirmations: many(manualConfirmations),
    contentAttachments: many(reminderContentAttachments),
  })
);

export const conversationStatesRelations = relations(
  conversationStates,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [conversationStates.patientId],
      references: [patients.id],
    }),
    messages: many(conversationMessages),
  })
);

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one }) => ({
    conversationState: one(conversationStates, {
      fields: [conversationMessages.conversationStateId],
      references: [conversationStates.id],
    }),
  })
);

export const reminderContentAttachmentsRelations = relations(
  reminderContentAttachments,
  ({ one }) => ({
    reminderSchedule: one(reminderSchedules, {
      fields: [reminderContentAttachments.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    createdByUser: one(users, {
      fields: [reminderContentAttachments.createdBy],
      references: [users.id],
    }),
    // Note: Content relations (article/video) are handled separately due to polymorphic nature
  })
);

export const reminderLogsRelations = relations(
  reminderLogs,
  ({ one, many }) => ({
    reminderSchedule: one(reminderSchedules, {
      fields: [reminderLogs.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    patient: one(patients, {
      fields: [reminderLogs.patientId],
      references: [patients.id],
    }),
    manualConfirmations: many(manualConfirmations),
    followups: many(reminderFollowups),
  })
);

export const manualConfirmationsRelations = relations(
  manualConfirmations,
  ({ one }) => ({
    patient: one(patients, {
      fields: [manualConfirmations.patientId],
      references: [patients.id],
    }),
    volunteer: one(users, {
      fields: [manualConfirmations.volunteerId],
      references: [users.id],
    }),
    reminderSchedule: one(reminderSchedules, {
      fields: [manualConfirmations.reminderScheduleId],
      references: [reminderSchedules.id],
    }),
    reminderLog: one(reminderLogs, {
      fields: [manualConfirmations.reminderLogId],
      references: [reminderLogs.id],
    }),
  })
);

export const whatsappTemplatesRelations = relations(
  whatsappTemplates,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [whatsappTemplates.createdBy],
      references: [users.id],
    }),
  })
);

export const healthNotesRelations = relations(healthNotes, ({ one }) => ({
  patient: one(patients, {
    fields: [healthNotes.patientId],
    references: [patients.id],
  }),
  recordedByUser: one(users, {
    fields: [healthNotes.recordedBy],
    references: [users.id],
  }),
}));

export const patientVariablesRelations = relations(
  patientVariables,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientVariables.patientId],
      references: [patients.id],
    }),
    createdByUser: one(users, {
      fields: [patientVariables.createdById],
      references: [users.id],
    }),
  })
);

export const verificationLogsRelations = relations(
  verificationLogs,
  ({ one }) => ({
    patient: one(patients, {
      fields: [verificationLogs.patientId],
      references: [patients.id],
    }),
    processedByUser: one(users, {
      fields: [verificationLogs.processedBy],
      references: [users.id],
    }),
  })
);

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  recordedByUser: one(users, {
    fields: [medicalRecords.recordedBy],
    references: [users.id],
  }),
}));



export const cmsArticlesRelations = relations(cmsArticles, ({}) => ({
  // Note: contentAttachments relation removed as it's handled by reminderContentAttachmentsRelations
}));

export const cmsVideosRelations = relations(cmsVideos, ({}) => ({
  // Note: contentAttachments relation removed as it's handled by reminderContentAttachmentsRelations
}));

export const volunteerNotificationsRelations = relations(
  volunteerNotifications,
  ({ one }) => ({
    patient: one(patients, {
      fields: [volunteerNotifications.patientId],
      references: [patients.id],
    }),
    assignedVolunteer: one(users, {
      fields: [volunteerNotifications.assignedVolunteerId],
      references: [users.id],
    }),
  })
);

export const reminderFollowupsRelations = relations(
  reminderFollowups,
  ({ one }) => ({
    reminderLog: one(reminderLogs, {
      fields: [reminderFollowups.reminderLogId],
      references: [reminderLogs.id],
    }),
    patient: one(patients, {
      fields: [reminderFollowups.patientId],
      references: [patients.id],
    }),
  })
);

// LLM Prompt Template Relations
export const llmPromptTemplatesRelations = relations(
  llmPromptTemplates,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [llmPromptTemplates.createdBy],
      references: [users.id],
    }),
    testVariants: many(llmPromptTestVariants),
    metrics: many(llmPromptMetrics),
  })
);

export const llmPromptTestsRelations = relations(
  llmPromptTests,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [llmPromptTests.createdBy],
      references: [users.id],
    }),
    variants: many(llmPromptTestVariants),
    results: many(llmPromptTestResults),
  })
);

export const llmPromptTestVariantsRelations = relations(
  llmPromptTestVariants,
  ({ one, many }) => ({
    test: one(llmPromptTests, {
      fields: [llmPromptTestVariants.testId],
      references: [llmPromptTests.id],
    }),
    promptTemplate: one(llmPromptTemplates, {
      fields: [llmPromptTestVariants.promptTemplateId],
      references: [llmPromptTemplates.id],
    }),
    results: many(llmPromptTestResults),
  })
);

export const llmPromptTestResultsRelations = relations(
  llmPromptTestResults,
  ({ one }) => ({
    test: one(llmPromptTests, {
      fields: [llmPromptTestResults.testId],
      references: [llmPromptTests.id],
    }),
    variant: one(llmPromptTestVariants, {
      fields: [llmPromptTestResults.variantId],
      references: [llmPromptTestVariants.id],
    }),
  })
);

export const llmPromptMetricsRelations = relations(
  llmPromptMetrics,
  ({ one }) => ({
    promptTemplate: one(llmPromptTemplates, {
      fields: [llmPromptMetrics.promptTemplateId],
      references: [llmPromptTemplates.id],
    }),
  })
);

// Analytics Relations
export const analyticsEventsRelations = relations(
  analyticsEvents,
  ({ one }) => ({
    user: one(users, {
      fields: [analyticsEvents.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [analyticsEvents.patientId],
      references: [patients.id],
    }),
  })
);

export const auditLogsRelations = relations(
  auditLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [auditLogs.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [auditLogs.patientId],
      references: [patients.id],
    }),
  })
);

export const dataAccessLogsRelations = relations(
  dataAccessLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [dataAccessLogs.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [dataAccessLogs.patientId],
      references: [patients.id],
    }),
  })
);





// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type ReminderSchedule = typeof reminderSchedules.$inferSelect;
export type NewReminderSchedule = typeof reminderSchedules.$inferInsert;
export type ReminderLog = typeof reminderLogs.$inferSelect;
export type NewReminderLog = typeof reminderLogs.$inferInsert;
export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type NewManualConfirmation = typeof manualConfirmations.$inferInsert;
export type PatientVariable = typeof patientVariables.$inferSelect;
export type NewPatientVariable = typeof patientVariables.$inferInsert;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type NewVerificationLog = typeof verificationLogs.$inferInsert;
export type ReminderContentAttachment =
  typeof reminderContentAttachments.$inferSelect;
export type NewReminderContentAttachment =
  typeof reminderContentAttachments.$inferInsert;

// CMS Content Types
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;

// Volunteer Notification Types
export type VolunteerNotification = typeof volunteerNotifications.$inferSelect;
export type NewVolunteerNotification = typeof volunteerNotifications.$inferInsert;

// Followup Types
export type ReminderFollowup = typeof reminderFollowups.$inferSelect;
export type NewReminderFollowup = typeof reminderFollowups.$inferInsert;

// LLM Prompt Types
export type LlmPromptTemplate = typeof llmPromptTemplates.$inferSelect;
export type NewLlmPromptTemplate = typeof llmPromptTemplates.$inferInsert;
export type LlmPromptTest = typeof llmPromptTests.$inferSelect;
export type NewLlmPromptTest = typeof llmPromptTests.$inferInsert;
export type LlmPromptTestVariant = typeof llmPromptTestVariants.$inferSelect;
export type NewLlmPromptTestVariant = typeof llmPromptTestVariants.$inferInsert;
export type LlmPromptTestResult = typeof llmPromptTestResults.$inferSelect;
export type NewLlmPromptTestResult = typeof llmPromptTestResults.$inferInsert;
export type LlmPromptMetric = typeof llmPromptMetrics.$inferSelect;
export type NewLlmPromptMetric = typeof llmPromptMetrics.$inferInsert;

// Analytics Types
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;
export type CohortAnalysis = typeof cohortAnalysis.$inferSelect;
export type NewCohortAnalysis = typeof cohortAnalysis.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type DataAccessLog = typeof dataAccessLogs.$inferSelect;
export type NewDataAccessLog = typeof dataAccessLogs.$inferInsert;
export type SystemHealthMetric = typeof systemHealthMetrics.$inferSelect;
export type NewSystemHealthMetric = typeof systemHealthMetrics.$inferInsert;

