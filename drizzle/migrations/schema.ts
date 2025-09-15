import { pgTable, index, uuid, text, boolean, timestamp, unique, pgEnum } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const cancerStage = pgEnum("cancer_stage", ['I', 'II', 'III', 'IV'])
export const contentCategory = pgEnum("content_category", ['general', 'nutrisi', 'olahraga', 'motivational', 'medical', 'faq', 'testimoni'])
export const contentStatus = pgEnum("content_status", ['draft', 'published', 'archived'])
export const frequency = pgEnum("frequency", ['CUSTOM', 'CUSTOM_RECURRENCE'])
export const medicalRecordType = pgEnum("medical_record_type", ['DIAGNOSIS', 'TREATMENT', 'PROGRESS', 'HEALTH_NOTE'])
export const patientCondition = pgEnum("patient_condition", ['GOOD', 'FAIR', 'POOR'])
export const reminderStatus = pgEnum("reminder_status", ['PENDING', 'SENT', 'DELIVERED', 'FAILED'])
export const templateCategory = pgEnum("template_category", ['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'])
export const userRole = pgEnum("user_role", ['ADMIN', 'MEMBER', 'SUPERADMIN'])
export const verificationStatus = pgEnum("verification_status", ['pending_verification', 'verified', 'declined', 'expired'])



export const patientVariables = pgTable("patient_variables", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	variableName: text("variable_name").notNull(),
	variableValue: text("variable_value").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdById: uuid("created_by_id").notNull(),
},
(table) => {
	return {
		nameIdx: index("patient_variables_name_idx").using("btree", table.patientId.asc().nullsLast(), table.variableName.asc().nullsLast()),
		patientActiveIdx: index("patient_variables_patient_active_idx").using("btree", table.patientId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientIdx: index("patient_variables_patient_idx").using("btree", table.patientId.asc().nullsLast()),
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
	}
});

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
},
(table) => {
	return {
		categoryIdx: index("cms_articles_category_idx").using("btree", table.category.asc().nullsLast()),
		categoryStatusIdx: index("cms_articles_category_status_idx").using("btree", table.category.asc().nullsLast(), table.status.asc().nullsLast()),
		createdByIdx: index("cms_articles_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		publishedAtIdx: index("cms_articles_published_at_idx").using("btree", table.publishedAt.asc().nullsLast()),
		slugIdx: index("cms_articles_slug_idx").using("btree", table.slug.asc().nullsLast()),
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
},
(table) => {
	return {
		categoryIdx: index("cms_videos_category_idx").using("btree", table.category.asc().nullsLast()),
		categoryStatusIdx: index("cms_videos_category_status_idx").using("btree", table.category.asc().nullsLast(), table.status.asc().nullsLast()),
		createdByIdx: index("cms_videos_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		publishedAtIdx: index("cms_videos_published_at_idx").using("btree", table.publishedAt.asc().nullsLast()),
		slugIdx: index("cms_videos_slug_idx").using("btree", table.slug.asc().nullsLast()),
		statusIdx: index("cms_videos_status_idx").using("btree", table.status.asc().nullsLast()),
		statusPublishedIdx: index("cms_videos_status_published_idx").using("btree", table.status.asc().nullsLast(), table.publishedAt.asc().nullsLast()),
		cmsVideosSlugUnique: unique("cms_videos_slug_unique").on(table.slug),
	}
});

export const healthNotes = pgTable("health_notes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	note: text("note").notNull(),
	noteDate: timestamp("note_date", { withTimezone: true, mode: 'string' }).notNull(),
	recordedBy: uuid("recorded_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		patientIdIdx: index("health_notes_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientNoteDateIdx: index("health_notes_patient_note_date_idx").using("btree", table.patientId.asc().nullsLast(), table.noteDate.asc().nullsLast()),
		recordedByIdx: index("health_notes_recorded_by_idx").using("btree", table.recordedBy.asc().nullsLast()),
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
		confirmedPatientIdx: index("manual_confirmations_confirmed_patient_idx").using("btree", table.confirmedAt.asc().nullsLast(), table.patientId.asc().nullsLast()),
		patientIdIdx: index("manual_confirmations_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientVisitDateIdx: index("manual_confirmations_patient_visit_date_idx").using("btree", table.patientId.asc().nullsLast(), table.visitDate.asc().nullsLast()),
		reminderLogIdIdx: index("manual_confirmations_reminder_log_id_idx").using("btree", table.reminderLogId.asc().nullsLast()),
		reminderScheduleIdIdx: index("manual_confirmations_reminder_schedule_id_idx").using("btree", table.reminderScheduleId.asc().nullsLast()),
		visitDateIdx: index("manual_confirmations_visit_date_idx").using("btree", table.visitDate.asc().nullsLast()),
		volunteerIdIdx: index("manual_confirmations_volunteer_id_idx").using("btree", table.volunteerId.asc().nullsLast()),
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
});

export const medications = pgTable("medications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const patientMedications = pgTable("patient_medications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	medicationId: uuid("medication_id").notNull(),
	dosage: text("dosage").notNull(),
	frequency: text("frequency").notNull(),
	instructions: text("instructions"),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
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
},
(table) => {
	return {
		assignedVolunteerActiveIdx: index("patients_assigned_volunteer_active_idx").using("btree", table.assignedVolunteerId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		assignedVolunteerIdx: index("patients_assigned_volunteer_idx").using("btree", table.assignedVolunteerId.asc().nullsLast()),
		createdAtIdx: index("patients_created_at_idx").using("btree", table.createdAt.asc().nullsLast()),
		isActiveIdx: index("patients_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		phoneNumberIdx: index("patients_phone_number_idx").using("btree", table.phoneNumber.asc().nullsLast()),
		verificationStatusActiveIdx: index("patients_verification_status_active_idx").using("btree", table.verificationStatus.asc().nullsLast(), table.isActive.asc().nullsLast()),
		verificationStatusIdx: index("patients_verification_status_idx").using("btree", table.verificationStatus.asc().nullsLast()),
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
},
(table) => {
	return {
		patientIdIdx: index("reminder_logs_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		patientStatusIdx: index("reminder_logs_patient_status_idx").using("btree", table.patientId.asc().nullsLast(), table.status.asc().nullsLast()),
		reminderScheduleIdIdx: index("reminder_logs_reminder_schedule_id_idx").using("btree", table.reminderScheduleId.asc().nullsLast()),
		sentAtIdx: index("reminder_logs_sent_at_idx").using("btree", table.sentAt.asc().nullsLast()),
		sentStatusIdx: index("reminder_logs_sent_status_idx").using("btree", table.sentAt.asc().nullsLast(), table.status.asc().nullsLast()),
		statusIdx: index("reminder_logs_status_idx").using("btree", table.status.asc().nullsLast()),
	}
});

export const reminderSchedules = pgTable("reminder_schedules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	medicationName: text("medication_name").notNull(),
	dosage: text("dosage"),
	doctorName: text("doctor_name"),
	scheduledTime: text("scheduled_time").notNull(),
	frequency: frequency("frequency").default('CUSTOM').notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	customMessage: text("custom_message"),
	isActive: boolean("is_active").default(true).notNull(),
	createdById: uuid("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		createdActiveIdx: index("reminder_schedules_created_active_idx").using("btree", table.createdAt.asc().nullsLast(), table.isActive.asc().nullsLast()),
		endDateIdx: index("reminder_schedules_end_date_idx").using("btree", table.endDate.asc().nullsLast()),
		isActiveIdx: index("reminder_schedules_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		patientActiveIdx: index("reminder_schedules_patient_active_idx").using("btree", table.patientId.asc().nullsLast(), table.isActive.asc().nullsLast()),
		patientIdIdx: index("reminder_schedules_patient_id_idx").using("btree", table.patientId.asc().nullsLast()),
		startDateIdx: index("reminder_schedules_start_date_idx").using("btree", table.startDate.asc().nullsLast()),
	}
});

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: text("email").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	hospitalName: text("hospital_name"),
	role: userRole("role").default('MEMBER').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	approvedBy: uuid("approved_by"),
	isApproved: boolean("is_approved").default(false).notNull(),
	clerkId: text("clerk_id").notNull(),
},
(table) => {
	return {
		clerkApprovedActiveIdx: index("users_clerk_approved_active_idx").using("btree", table.clerkId.asc().nullsLast(), table.isApproved.asc().nullsLast(), table.isActive.asc().nullsLast()),
		isActiveIdx: index("users_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		isApprovedIdx: index("users_is_approved_idx").using("btree", table.isApproved.asc().nullsLast()),
		roleActiveApprovedIdx: index("users_role_active_approved_idx").using("btree", table.role.asc().nullsLast(), table.isActive.asc().nullsLast(), table.isApproved.asc().nullsLast()),
		roleIdx: index("users_role_idx").using("btree", table.role.asc().nullsLast()),
		usersEmailUnique: unique("users_email_unique").on(table.email),
		usersClerkIdUnique: unique("users_clerk_id_unique").on(table.clerkId),
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
},
(table) => {
	return {
		categoryActiveIdx: index("whatsapp_templates_category_active_idx").using("btree", table.category.asc().nullsLast(), table.isActive.asc().nullsLast()),
		categoryIdx: index("whatsapp_templates_category_idx").using("btree", table.category.asc().nullsLast()),
		createdByIdx: index("whatsapp_templates_created_by_idx").using("btree", table.createdBy.asc().nullsLast()),
		isActiveIdx: index("whatsapp_templates_is_active_idx").using("btree", table.isActive.asc().nullsLast()),
		whatsappTemplatesTemplateNameUnique: unique("whatsapp_templates_template_name_unique").on(table.templateName),
	}
});