// Import all clean schemas

// Re-export all enums
export * from "./enums";

// Re-export all tables
export * from "./core-schema";
export * from "./patient-schema";
export * from "./reminder-schema";
export * from "./cms-schema";
export * from "./llm-schema";
export * from "./message-queue-schema";
export * from "./distributed-locks-schema";
export * from "./rate-limits-schema";

// Import tables for relations
import { users } from "./core-schema";
import { patients, medicalRecords, healthNotes } from "./patient-schema";
import { reminders, manualConfirmations, whatsappTemplates } from "./reminder-schema";
import { cmsArticles, cmsVideos } from "./cms-schema";
import { conversationStates, conversationMessages, volunteerNotifications } from "./llm-schema";

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
  remindersCreated: many(reminders),
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
  reminders: many(reminders),
  manualConfirmations: many(manualConfirmations),
  medicalRecords: many(medicalRecords),
  healthNotes: many(healthNotes),
}));

export const remindersRelations = relations(
  reminders,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [reminders.patientId],
      references: [patients.id],
    }),
    createdByUser: one(users, {
      fields: [reminders.createdById],
      references: [users.id],
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
    reminder: one(reminders, {
      fields: [manualConfirmations.reminderId],
      references: [reminders.id],
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
  // No relations needed for CMS content
}));

export const cmsVideosRelations = relations(cmsVideos, ({}) => ({
  // No relations needed for CMS content
}));

// ===== LLM RELATIONS =====

export const conversationStatesRelations = relations(conversationStates, ({ one, many }) => ({
  patient: one(patients, {
    fields: [conversationStates.patientId],
    references: [patients.id],
  }),
  messages: many(conversationMessages),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversationState: one(conversationStates, {
    fields: [conversationMessages.conversationStateId],
    references: [conversationStates.id],
  }),
}));

export const volunteerNotificationsRelations = relations(volunteerNotifications, ({ one }) => ({
  patient: one(patients, {
    fields: [volunteerNotifications.patientId],
    references: [patients.id],
  }),
}));

// ===== TYPE EXPORTS =====
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;
export type ManualConfirmation = typeof manualConfirmations.$inferSelect;
export type NewManualConfirmation = typeof manualConfirmations.$inferInsert;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;
export type HealthNote = typeof healthNotes.$inferSelect;
export type NewHealthNote = typeof healthNotes.$inferInsert;

// CMS Content Types
export type CmsArticle = typeof cmsArticles.$inferSelect;
export type NewCmsArticle = typeof cmsArticles.$inferInsert;
export type CmsVideo = typeof cmsVideos.$inferSelect;
export type NewCmsVideo = typeof cmsVideos.$inferInsert;

// LLM Types
export type ConversationState = typeof conversationStates.$inferSelect;
export type NewConversationState = typeof conversationStates.$inferInsert;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;
export type VolunteerNotification = typeof volunteerNotifications.$inferSelect;
export type NewVolunteerNotification = typeof volunteerNotifications.$inferInsert;