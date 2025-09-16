// Import all schemas

// Re-export all enums
export * from "./enums";

// Re-export all tables
export * from "./core-schema";
export * from "./patient-schema";
export * from "./reminder-schema";
export * from "./cms-schema";

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
import { reminderContentAttachments } from "./reminder-schema";

import { cmsArticles } from "./cms-schema";
import { cmsVideos } from "./cms-schema";

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

