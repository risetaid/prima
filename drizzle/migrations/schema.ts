import { pgTable, index, unique, uuid, text, timestamp, jsonb, integer, foreignKey, boolean, numeric, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const cancerStage = pgEnum("cancer_stage", ['I', 'II', 'III', 'IV'])
export const confirmationStatus = pgEnum("confirmation_status", ['PENDING', 'SENT', 'CONFIRMED', 'MISSED', 'UNKNOWN'])
export const contentCategory = pgEnum("content_category", ['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni'])
export const contentStatus = pgEnum("content_status", ['draft', 'published', 'archived'])
export const frequency = pgEnum("frequency", ['CUSTOM', 'CUSTOM_RECURRENCE'])
export const medicalRecordType = pgEnum("medical_record_type", ['DIAGNOSIS', 'TREATMENT', 'PROGRESS', 'HEALTH_NOTE'])
export const patientCondition = pgEnum("patient_condition", ['GOOD', 'FAIR', 'POOR'])
export const reminderStatus = pgEnum("reminder_status", ['PENDING', 'SENT', 'DELIVERED', 'FAILED'])
export const templateCategory = pgEnum("template_category", ['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'])
export const userRole = pgEnum("user_role", ['DEVELOPER', 'ADMIN', 'RELAWAN'])
export const verificationStatus = pgEnum("verification_status", ['pending_verification', 'verified', 'declined', 'expired', 'unsubscribed'])



export const cmsArticles = pgTable("cms_articles", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: text("title").notNull(),
	slug: text("slug").notNull(),
	content: text("content").notNull(),
	excerpt: text("excerpt"),
	featuredImageUrl: text("featured_image_url"),
	category: contentCategory("category").default('general').notNull(),
	tags: text("tags").array().default([""]).notNull(),
	seoTitle: text("seo_title"),
	seoDescription: text("seo_description"),
	status: contentStatus("status").default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		categoryIdx: index("cms_articles_category_idx").using("btree", table.category.asc().nullsLast()),
		categoryStatusIdx: index("cms_articles_category_status_idx").using("btree", table.category.asc().nullsLast(), table.status.asc().nullsLast()),
		createdByIdx: index("cms_articles_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		deletedAtIdx: index("cms_articles_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		publishedAtIdx: index("cms_articles_published_at_idx").using("btree", table.publishedAt.asc().nullsLast()),
		slugIdx: index("cms_articles_slug_idx").using("btree", table.slug.asc().nullsLast()),
		statusDeletedIdx: index("cms_articles_status_deleted_idx").using("btree", table.status.asc().nullsLast(), table.deletedAt.asc().nullsLast()),
		statusIdx: index("cms_articles_status_idx").using("btree", table.status.asc().nullsLast()),
		statusPublishedIdx: index("cms_articles_status_published_idx").using("btree", table.status.asc().nullsLast(), table.publishedAt.asc().nullsLast()),
		cmsArticlesSlugUnique: unique("cms_articles_slug_unique").on(table.slug),
	}
});

export const cmsVideos = pgTable("cms_videos", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: text("title").notNull(),
	slug: text("slug").notNull(),
	description: text("description"),
	videoUrl: text("video_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	durationMinutes: text("duration_minutes"),
	category: contentCategory("category").default('motivational').notNull(),
	tags: text("tags").array().default([""]).notNull(),
	seoTitle: text("seo_title"),
	seoDescription: text("seo_description"),
	status: contentStatus("status").default('draft').notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		categoryIdx: index("cms_videos_category_idx").using("btree", table.category.asc().nullsLast()),
		categoryStatusIdx: index("cms_videos_category_status_idx").using("btree", table.category.asc().nullsLast(), table.status.asc().nullsLast()),
		createdByIdx: index("cms_videos_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		deletedAtIdx: index("cms_videos_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		publishedAtIdx: index("cms_videos_published_at_idx").using("btree", table.publishedAt.asc().nullsLast()),
		slugIdx: index("cms_videos_slug_idx").using("btree", table.slug.asc().nullsLast()),
		statusDeletedIdx: index("cms_videos_status_deleted_idx").using("btree", table.status.asc().nullsLast(), table.deletedAt.asc().nullsLast()),
		statusIdx: index("cms_videos_status_idx").using("btree", table.status.asc().nullsLast()),
		statusPublishedIdx: index("cms_videos_status_published_idx").using("btree", table.status.asc().nullsLast(), table.publishedAt.asc().nullsLast()),
		cmsVideosSlugUnique: unique("cms_videos_slug_unique").on(table.slug),
	}
});

export const llmResponseCache = pgTable("llm_response_cache", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	messageHash: text("message_hash").notNull(),
	patientContextHash: text("patient_context_hash").notNull(),
	response: jsonb("response").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
});

export const volunteerNotifications = pgTable("volunteer_notifications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	message: text("message").notNull(),
	priority: text("priority").notNull(),
	status: text("status").default('pending'),
	assignedVolunteerId: uuid("assigned_volunteer_id"),
	escalationReason: text("escalation_reason").notNull(),
	confidence: integer("confidence"),
	intent: text("intent"),
	patientContext: jsonb("patient_context"),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	response: text("response"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const healthNotes = pgTable("health_notes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	note: text("note").notNull(),
	noteDate: timestamp("note_date", { withTimezone: true, mode: 'string' }).notNull(),
	recordedBy: uuid("recorded_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		deletedAtIdx: index("health_notes_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		patientIdIdx: index("health_notes_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientNoteDateIdx: index("health_notes_patient_note_date_idx").using("btree", table.patientId.asc().nullsLast(), table.noteDate.asc().nullsLast()),
		recordedByIdx: index("health_notes_recorded_by_idx").using("btree", table.recordedBy.asc().nullsLast()),
		healthNotesPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "health_notes_patient_id_patients_id_fk"
		}),
		healthNotesRecordedByUsersIdFk: foreignKey({
			columns: [table.recordedBy],
			foreignColumns: [users.id],
			name: "health_notes_recorded_by_users_id_fk"
		}),
	}
});

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: text("email").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	hospitalName: text("hospital_name"),
	role: userRole("role").default('RELAWAN').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedBy: uuid("approved_by"),
	isApproved: boolean("is_approved").default(false).notNull(),
	clerkId: text("clerk_id").notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		clerkApprovedActiveIdx: index("users_clerk_approved_active_idx").using("btree", table.clerkId.asc().nullsLast(), table.isApproved.asc().nullsLast(), table.isActive.asc().nullsLast()),
		deletedAtIdx: index("users_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		isActiveIdx: index("users_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		isApprovedIdx: index("users_is_approved_idx").using("btree", table.isApproved.asc().nullsLast()),
		lastLoginIdx: index("users_last_login_idx").using("btree", table.lastLoginAt.asc().nullsLast()),
		roleActiveApprovedIdx: index("users_role_active_approved_idx").using("btree", table.role.asc().nullsLast(), table.isActive.asc().nullsLast(), table.isApproved.asc().nullsLast()),
		roleIdx: index("users_role_idx").using("btree", table.role.asc().nullsLast()),
		usersApprovedByUsersIdFk: foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [table.id],
			name: "users_approved_by_users_id_fk"
		}),
		usersEmailUnique: unique("users_email_unique").on(table.email),
		usersClerkIdUnique: unique("users_clerk_id_unique").on(table.clerkId),
	}
});

export const manualConfirmations = pgTable("manual_confirmations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	volunteerId: uuid("volunteer_id").notNull(),
	reminderScheduleId: uuid("reminder_schedule_id"),
	reminderLogId: uuid("reminder_log_id"),
	visitDate: timestamp("visit_date", { withTimezone: true, mode: 'string' }).notNull(),
	visitTime: text("visit_time").notNull(),
	patientCondition: patientCondition("patient_condition").notNull(),
	symptomsReported: text("symptoms_reported").array().default([""]).notNull(),
	notes: text("notes"),
	followUpNeeded: boolean("follow_up_needed").default(false).notNull(),
	followUpNotes: text("follow_up_notes"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		confirmedAtIdx: index("manual_confirmations_confirmed_at_idx").using("btree", table.confirmedAt.asc().nullsLast()),
		confirmedPatientIdx: index("manual_confirmations_confirmed_patient_idx").using("btree", table.confirmedAt.asc().nullsLast(), table.patientId.asc().nullsLast()),
		patientConfirmedAtIdx: index("manual_confirmations_patient_confirmed_at_idx").using("btree", table.patientId.asc().nullsLast(), table.confirmedAt.asc().nullsLast()),
		patientIdIdx: index("manual_confirmations_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientVisitDateIdx: index("manual_confirmations_patient_visit_date_idx").using("btree", table.patientId.asc().nullsLast(), table.visitDate.asc().nullsLast()),
		reminderLogIdIdx: index("manual_confirmations_reminder_log_id_idx").using("btree", table.reminderLogId.asc().nullsLast()),
		reminderScheduleIdIdx: index("manual_confirmations_reminder_schedule_id_idx").using("btree", table.reminderScheduleId.asc().nullsLast()),
		visitDateIdx: index("manual_confirmations_visit_date_idx").using("btree", table.visitDate.asc().nullsLast()),
		volunteerIdIdx: index("manual_confirmations_volunteer_id_idx").using("btree", table.volunteerId.asc().nullsLast()),
		manualConfirmationsPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "manual_confirmations_patient_id_patients_id_fk"
		}),
		manualConfirmationsVolunteerIdUsersIdFk: foreignKey({
			columns: [table.volunteerId],
			foreignColumns: [users.id],
			name: "manual_confirmations_volunteer_id_users_id_fk"
		}),
		manualConfirmationsReminderScheduleIdReminderSchedulesId: foreignKey({
			columns: [table.reminderScheduleId],
			foreignColumns: [reminderSchedules.id],
			name: "manual_confirmations_reminder_schedule_id_reminder_schedules_id"
		}),
		manualConfirmationsReminderLogIdReminderLogsIdFk: foreignKey({
			columns: [table.reminderLogId],
			foreignColumns: [reminderLogs.id],
			name: "manual_confirmations_reminder_log_id_reminder_logs_id_fk"
		}),
	}
});

export const reminderSchedules = pgTable("reminder_schedules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	scheduledTime: text("scheduled_time").notNull(),
	frequency: frequency("frequency").default('CUSTOM').notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	customMessage: text("custom_message"),
	isActive: boolean("is_active").default(true).notNull(),
	createdById: uuid("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		activeDeletedStartIdx: index("reminder_schedules_active_deleted_start_idx").using("btree", table.isActive.asc().nullsLast(), table.deletedAt.asc().nullsLast(), table.startDate.asc().nullsLast()),
		createdActiveIdx: index("reminder_schedules_created_active_idx").using("btree", table.createdAt.asc().nullsLast(), table.isActive.asc().nullsLast()),
		deletedAtIdx: index("reminder_schedules_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		endDateIdx: index("reminder_schedules_end_date_idx").using("btree", table.endDate.asc().nullsLast()),
		isActiveIdx: index("reminder_schedules_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		patientActiveIdx: index("reminder_schedules_patient_active_idx").using("btree", table.patientId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientIdIdx: index("reminder_schedules_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		startActiveDeletedIdx: index("reminder_schedules_start_active_deleted_idx").using("btree", table.startDate.asc().nullsLast(), table.isActive.asc().nullsLast(), table.deletedAt.asc().nullsLast()),
		startDateIdx: index("reminder_schedules_start_date_idx").using("btree", table.startDate.asc().nullsLast()),
		todayRemindersIdx: index("reminder_schedules_today_reminders_idx").using("btree", table.startDate.asc().nullsLast(), table.isActive.asc().nullsLast(), table.deletedAt.asc().nullsLast(), table.scheduledTime.asc().nullsLast()),
		reminderSchedulesPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "reminder_schedules_patient_id_patients_id_fk"
		}),
		reminderSchedulesCreatedByIdUsersIdFk: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "reminder_schedules_created_by_id_users_id_fk"
		}),
	}
});

export const reminderLogs = pgTable("reminder_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	reminderScheduleId: uuid("reminder_schedule_id"),
	patientId: uuid("patient_id").notNull(),
	message: text("message").notNull(),
	phoneNumber: text("phone_number").notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: reminderStatus("status").default('PENDING').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	fonnteMessageId: text("fonnte_message_id"),
	confirmationStatus: confirmationStatus("confirmation_status").default('PENDING'),
	confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true, mode: 'string' }),
	confirmationResponseAt: timestamp("confirmation_response_at", { withTimezone: true, mode: 'string' }),
	confirmationMessage: text("confirmation_message"),
	confirmationResponse: text("confirmation_response"),
},
(table) => {
	return {
		confirmationSentAtIdx: index("reminder_logs_confirmation_sent_at_idx").using("btree", table.confirmationSentAt.asc().nullsLast()),
		confirmationStatusIdx: index("reminder_logs_confirmation_status_idx").using("btree", table.confirmationStatus.asc().nullsLast()),
		deliveredPatientIdx: index("reminder_logs_delivered_patient_idx").using("btree", table.status.asc().nullsLast(), table.patientId.asc().nullsLast()),
		patientIdIdx: index("reminder_logs_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientStatusIdx: index("reminder_logs_patient_status_idx").using("btree", table.patientId.asc().nullsLast(), table.status.asc().nullsLast()),
		reminderScheduleIdIdx: index("reminder_logs_reminder_schedule_id_idx").using("btree", table.reminderScheduleId.asc().nullsLast()),
		scheduleStatusSentIdx: index("reminder_logs_schedule_status_sent_idx").using("btree", table.reminderScheduleId.asc().nullsLast(), table.status.asc().nullsLast(), table.sentAt.asc().nullsLast()),
		sentAtIdx: index("reminder_logs_sent_at_idx").using("btree", table.sentAt.asc().nullsLast()),
		sentAtPatientIdx: index("reminder_logs_sent_at_patient_idx").using("btree", table.sentAt.asc().nullsLast(), table.patientId.asc().nullsLast()),
		sentStatusIdx: index("reminder_logs_sent_status_idx").using("btree", table.sentAt.asc().nullsLast(), table.status.asc().nullsLast()),
		statusIdx: index("reminder_logs_status_idx").using("btree", table.status.asc().nullsLast()),
		statusSentAtIdx: index("reminder_logs_status_sent_at_idx").using("btree", table.status.asc().nullsLast(), table.sentAt.asc().nullsLast()),
		reminderLogsReminderScheduleIdReminderSchedulesIdFk: foreignKey({
			columns: [table.reminderScheduleId],
			foreignColumns: [reminderSchedules.id],
			name: "reminder_logs_reminder_schedule_id_reminder_schedules_id_fk"
		}),
		reminderLogsPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "reminder_logs_patient_id_patients_id_fk"
		}),
	}
});

export const medicalRecords = pgTable("medical_records", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	recordType: medicalRecordType("record_type").notNull(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	recordedDate: timestamp("recorded_date", { withTimezone: true, mode: 'string' }).notNull(),
	recordedBy: uuid("recorded_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		patientIdIdx: index("medical_records_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientRecordedDateIdx: index("medical_records_patient_recorded_date_idx").using("btree", table.patientId.asc().nullsLast(), table.recordedDate.asc().nullsLast()),
		recordTypeIdx: index("medical_records_record_type_idx").using("btree", table.recordType.asc().nullsLast()),
		recordedByIdx: index("medical_records_recorded_by_idx").using("btree", table.recordedBy.asc().nullsLast()),
		recordedDateIdx: index("medical_records_recorded_date_idx").using("btree", table.recordedDate.asc().nullsLast()),
		medicalRecordsPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "medical_records_patient_id_patients_id_fk"
		}),
		medicalRecordsRecordedByUsersIdFk: foreignKey({
			columns: [table.recordedBy],
			foreignColumns: [users.id],
			name: "medical_records_recorded_by_users_id_fk"
		}),
	}
});

export const patientVariables = pgTable("patient_variables", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	variableName: text("variable_name").notNull(),
	variableValue: text("variable_value").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdById: uuid("created_by_id").notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		deletedAtIdx: index("patient_variables_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		nameIdx: index("patient_variables_name_idx").using("btree", table.patientId.asc().nullsLast(), table.variableName.asc().nullsLast()),
		patientActiveIdx: index("patient_variables_patient_active_idx").using("btree", table.patientId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientIdx: index("patient_variables_patient_idx").using("btree", table.patientId.asc().nullsLast()),
		patientVariablesPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_variables_patient_id_patients_id_fk"
		}),
		patientVariablesCreatedByIdUsersIdFk: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "patient_variables_created_by_id_users_id_fk"
		}),
	}
});

export const reminderContentAttachments = pgTable("reminder_content_attachments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	reminderScheduleId: uuid("reminder_schedule_id").notNull(),
	contentType: text("content_type").notNull(),
	contentId: uuid("content_id").notNull(),
	contentTitle: text("content_title").notNull(),
	contentUrl: text("content_url").notNull(),
	attachmentOrder: integer("attachment_order").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by").notNull(),
},
(table) => {
	return {
		reminderContentCreatedAtIdx: index("reminder_content_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		reminderContentCreatedByIdx: index("reminder_content_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		reminderContentReminderIdx: index("reminder_content_reminder_idx").using("btree", table.reminderScheduleId.asc().nullsLast()),
		reminderContentTypeIdIdx: index("reminder_content_type_id_idx").using("btree", table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		reminderContentUniqueIdx: index("reminder_content_unique_idx").using("btree", table.reminderScheduleId.asc().nullsLast(), table.contentType.asc().nullsLast(), table.contentId.asc().nullsLast()),
		reminderContentAttachmentsReminderScheduleIdReminderSche: foreignKey({
			columns: [table.reminderScheduleId],
			foreignColumns: [reminderSchedules.id],
			name: "reminder_content_attachments_reminder_schedule_id_reminder_sche"
		}).onDelete("cascade"),
		reminderContentAttachmentsCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "reminder_content_attachments_created_by_users_id_fk"
		}),
	}
});

export const verificationLogs = pgTable("verification_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	action: text("action").notNull(),
	messageSent: text("message_sent"),
	patientResponse: text("patient_response"),
	verificationResult: verificationStatus("verification_result"),
	processedBy: uuid("processed_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		actionIdx: index("verification_logs_action_idx").using("btree", table.action.asc().nullsLast()),
		createdAtIdx: index("verification_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		patientIdx: index("verification_logs_patient_idx").using("btree", table.patientId.asc().nullsLast()),
		verificationLogsPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "verification_logs_patient_id_patients_id_fk"
		}),
		verificationLogsProcessedByUsersIdFk: foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "verification_logs_processed_by_users_id_fk"
		}),
	}
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	templateName: text("template_name").notNull(),
	templateText: text("template_text").notNull(),
	variables: text("variables").array().default([""]).notNull(),
	category: templateCategory("category").default('REMINDER').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		categoryActiveIdx: index("whatsapp_templates_category_active_idx").using("btree", table.category.asc().nullsLast(), table.isActive.asc().nullsLast()),
		categoryIdx: index("whatsapp_templates_category_idx").using("btree", table.category.asc().nullsLast()),
		createdByIdx: index("whatsapp_templates_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		deletedAtIdx: index("whatsapp_templates_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		isActiveIdx: index("whatsapp_templates_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		whatsappTemplatesCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "whatsapp_templates_created_by_users_id_fk"
		}),
		whatsappTemplatesTemplateNameUnique: unique("whatsapp_templates_template_name_unique").on(table.templateName),
	}
});

export const conversationMessages = pgTable("conversation_messages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	conversationStateId: uuid("conversation_state_id").notNull(),
	message: text("message").notNull(),
	direction: text("direction").notNull(),
	messageType: text("message_type").notNull(),
	intent: text("intent"),
	confidence: integer("confidence"),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	llmResponseId: text("llm_response_id"),
	llmModel: text("llm_model"),
	llmTokensUsed: integer("llm_tokens_used"),
	llmCost: numeric("llm_cost", { precision: 10, scale:  6 }),
	llmResponseTimeMs: integer("llm_response_time_ms"),
},
(table) => {
	return {
		conversationDirectionIdx: index("conversation_messages_conversation_direction_idx").using("btree", table.conversationStateId.asc().nullsLast(), table.direction.asc().nullsLast()),
		conversationStateIdIdx: index("conversation_messages_conversation_state_id_idx").using("btree", table.conversationStateId.asc().nullsLast()),
		createdAtIdx: index("conversation_messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		directionIdx: index("conversation_messages_direction_idx").using("btree", table.direction.asc().nullsLast()),
		messageTypeIdx: index("conversation_messages_message_type_idx").using("btree", table.messageType.asc().nullsLast()),
		typeCreatedIdx: index("conversation_messages_type_created_idx").using("btree", table.messageType.asc().nullsLast(), table.createdAt.asc().nullsLast()),
		idxConversationMessagesLlmCost: index("idx_conversation_messages_llm_cost").using("btree", table.llmCost.asc().nullsLast()),
		idxConversationMessagesLlmModel: index("idx_conversation_messages_llm_model").using("btree", table.llmModel.asc().nullsLast()),
		idxConversationMessagesLlmStats: index("idx_conversation_messages_llm_stats").using("btree", table.llmModel.asc().nullsLast(), table.llmTokensUsed.asc().nullsLast(), table.llmCost.asc().nullsLast()),
		idxConversationMessagesLlmTokens: index("idx_conversation_messages_llm_tokens").using("btree", table.llmTokensUsed.asc().nullsLast()),
		conversationMessagesConversationStateIdConversationStates: foreignKey({
			columns: [table.conversationStateId],
			foreignColumns: [conversationStates.id],
			name: "conversation_messages_conversation_state_id_conversation_states"
		}).onDelete("cascade"),
	}
});

export const patients = pgTable("patients", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	phoneNumber: text("phone_number").notNull(),
	address: text("address"),
	birthDate: timestamp("birth_date", { withTimezone: true, mode: 'string' }),
	diagnosisDate: timestamp("diagnosis_date", { withTimezone: true, mode: 'string' }),
	cancerStage: cancerStage("cancer_stage"),
	assignedVolunteerId: uuid("assigned_volunteer_id"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactPhone: text("emergency_contact_phone"),
	notes: text("notes"),
	isActive: boolean("is_active").default(true).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	photoUrl: text("photo_url"),
	verificationStatus: verificationStatus("verification_status").default('pending_verification').notNull(),
	verificationSentAt: timestamp("verification_sent_at", { withTimezone: true, mode: 'string' }),
	verificationResponseAt: timestamp("verification_response_at", { withTimezone: true, mode: 'string' }),
	verificationMessage: text("verification_message"),
	verificationAttempts: text("verification_attempts").default('0'),
	verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true, mode: 'string' }),
	lastReactivatedAt: timestamp("last_reactivated_at", { withTimezone: true, mode: 'string' }),
	doctorName: text("doctor_name"),
	hospitalName: text("hospital_name"),
},
(table) => {
	return {
		assignedDeletedActiveIdx: index("patients_assigned_deleted_active_idx").using("btree", table.assignedVolunteerId.asc().nullsLast(), table.deletedAt.asc().nullsLast(), table.isActive.asc().nullsLast()),
		assignedVolunteerActiveIdx: index("patients_assigned_volunteer_active_idx").using("btree", table.assignedVolunteerId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		assignedVolunteerIdx: index("patients_assigned_volunteer_idx").using("btree", table.assignedVolunteerId.asc().nullsLast()),
		createdAtIdx: index("patients_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		deletedActiveIdx: index("patients_deleted_active_idx").using("btree", table.deletedAt.asc().nullsLast(), table.isActive.asc().nullsLast()),
		deletedActiveNameIdx: index("patients_deleted_active_name_idx").using("btree", table.deletedAt.asc().nullsLast(), table.isActive.asc().nullsLast(), table.name.asc().nullsLast()),
		deletedAtIdx: index("patients_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		isActiveIdx: index("patients_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		phoneNumberIdx: index("patients_phone_number_idx").using("btree", table.phoneNumber.asc().nullsLast()),
		verificationStatusActiveIdx: index("patients_verification_status_active_idx").using("btree", table.verificationStatus.asc().nullsLast(), table.isActive.asc().nullsLast()),
		verificationStatusIdx: index("patients_verification_status_idx").using("btree", table.verificationStatus.asc().nullsLast()),
		patientsAssignedVolunteerIdUsersIdFk: foreignKey({
			columns: [table.assignedVolunteerId],
			foreignColumns: [users.id],
			name: "patients_assigned_volunteer_id_users_id_fk"
		}),
	}
});

export const conversationStates = pgTable("conversation_states", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	phoneNumber: text("phone_number").notNull(),
	currentContext: text("current_context").notNull(),
	expectedResponseType: text("expected_response_type"),
	relatedEntityId: uuid("related_entity_id"),
	relatedEntityType: text("related_entity_type"),
	stateData: jsonb("state_data"),
	lastMessage: text("last_message"),
	lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: 'string' }),
	messageCount: integer("message_count").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		contextActiveIdx: index("conversation_states_context_active_idx").using("btree", table.currentContext.asc().nullsLast(), table.isActive.asc().nullsLast()),
		currentContextIdx: index("conversation_states_current_context_idx").using("btree", table.currentContext.asc().nullsLast()),
		deletedAtIdx: index("conversation_states_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast()),
		expiresAtIdx: index("conversation_states_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
		isActiveIdx: index("conversation_states_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		patientActiveIdx: index("conversation_states_patient_active_idx").using("btree", table.patientId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientContextActiveIdx: index("conversation_states_patient_context_active_idx").using("btree", table.patientId.asc().nullsLast(), table.currentContext.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientIdIdx: index("conversation_states_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		phoneNumberIdx: index("conversation_states_phone_number_idx").using("btree", table.phoneNumber.asc().nullsLast()),
		conversationStatesPatientIdPatientsIdFk: foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "conversation_states_patient_id_patients_id_fk"
		}),
	}
});