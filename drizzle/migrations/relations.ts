import { relations } from "drizzle-orm/relations";
import { patients, healthNotes, users, manualConfirmations, reminderSchedules, reminderLogs, medicalRecords, patientVariables, reminderContentAttachments, verificationLogs, whatsappTemplates, conversationStates, conversationMessages } from "./schema";

export const healthNotesRelations = relations(healthNotes, ({one}) => ({
	patient: one(patients, {
		fields: [healthNotes.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [healthNotes.recordedBy],
		references: [users.id]
	}),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
	healthNotes: many(healthNotes),
	manualConfirmations: many(manualConfirmations),
	reminderSchedules: many(reminderSchedules),
	reminderLogs: many(reminderLogs),
	medicalRecords: many(medicalRecords),
	patientVariables: many(patientVariables),
	verificationLogs: many(verificationLogs),
	user: one(users, {
		fields: [patients.assignedVolunteerId],
		references: [users.id]
	}),
	conversationStates: many(conversationStates),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	healthNotes: many(healthNotes),
	user: one(users, {
		fields: [users.approvedBy],
		references: [users.id],
		relationName: "users_approvedBy_users_id"
	}),
	users: many(users, {
		relationName: "users_approvedBy_users_id"
	}),
	manualConfirmations: many(manualConfirmations),
	reminderSchedules: many(reminderSchedules),
	medicalRecords: many(medicalRecords),
	patientVariables: many(patientVariables),
	reminderContentAttachments: many(reminderContentAttachments),
	verificationLogs: many(verificationLogs),
	whatsappTemplates: many(whatsappTemplates),
	patients: many(patients),
}));

export const manualConfirmationsRelations = relations(manualConfirmations, ({one}) => ({
	patient: one(patients, {
		fields: [manualConfirmations.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [manualConfirmations.volunteerId],
		references: [users.id]
	}),
	reminderSchedule: one(reminderSchedules, {
		fields: [manualConfirmations.reminderScheduleId],
		references: [reminderSchedules.id]
	}),
	reminderLog: one(reminderLogs, {
		fields: [manualConfirmations.reminderLogId],
		references: [reminderLogs.id]
	}),
}));

export const reminderSchedulesRelations = relations(reminderSchedules, ({one, many}) => ({
	manualConfirmations: many(manualConfirmations),
	patient: one(patients, {
		fields: [reminderSchedules.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [reminderSchedules.createdById],
		references: [users.id]
	}),
	reminderLogs: many(reminderLogs),
	reminderContentAttachments: many(reminderContentAttachments),
}));

export const reminderLogsRelations = relations(reminderLogs, ({one, many}) => ({
	manualConfirmations: many(manualConfirmations),
	reminderSchedule: one(reminderSchedules, {
		fields: [reminderLogs.reminderScheduleId],
		references: [reminderSchedules.id]
	}),
	patient: one(patients, {
		fields: [reminderLogs.patientId],
		references: [patients.id]
	}),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({one}) => ({
	patient: one(patients, {
		fields: [medicalRecords.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [medicalRecords.recordedBy],
		references: [users.id]
	}),
}));

export const patientVariablesRelations = relations(patientVariables, ({one}) => ({
	patient: one(patients, {
		fields: [patientVariables.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [patientVariables.createdById],
		references: [users.id]
	}),
}));

export const reminderContentAttachmentsRelations = relations(reminderContentAttachments, ({one}) => ({
	reminderSchedule: one(reminderSchedules, {
		fields: [reminderContentAttachments.reminderScheduleId],
		references: [reminderSchedules.id]
	}),
	user: one(users, {
		fields: [reminderContentAttachments.createdBy],
		references: [users.id]
	}),
}));

export const verificationLogsRelations = relations(verificationLogs, ({one}) => ({
	patient: one(patients, {
		fields: [verificationLogs.patientId],
		references: [patients.id]
	}),
	user: one(users, {
		fields: [verificationLogs.processedBy],
		references: [users.id]
	}),
}));

export const whatsappTemplatesRelations = relations(whatsappTemplates, ({one}) => ({
	user: one(users, {
		fields: [whatsappTemplates.createdBy],
		references: [users.id]
	}),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({one}) => ({
	conversationState: one(conversationStates, {
		fields: [conversationMessages.conversationStateId],
		references: [conversationStates.id]
	}),
}));

export const conversationStatesRelations = relations(conversationStates, ({one, many}) => ({
	conversationMessages: many(conversationMessages),
	patient: one(patients, {
		fields: [conversationStates.patientId],
		references: [patients.id]
	}),
}));