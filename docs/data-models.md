# PRIMA Data Models

Complete database schema documentation for the PRIMA healthcare platform. Built with PostgreSQL and Drizzle ORM.

## Table of Contents

- [Overview](#overview)
- [Core Schema](#core-schema)
  - [users](#users)
  - [patients](#patients)
  - [medicalRecords](#medicalrecords)
- [Reminder Schema](#reminder-schema)
  - [reminders](#reminders)
  - [reminderLogs](#reminderlogs)
  - [manualConfirmations](#manualconfirmations)
  - [whatsappTemplates](#whatsapptemplates)
  - [conversationStates](#conversationstates)
  - [conversationMessages](#conversationmessages)
  - [volunteerNotifications](#volunteernotifications)
- [Content Schema](#content-schema)
  - [cmsArticles](#cmsarticles)
  - [cmsVideos](#cmsvideos)
  - [rateLimits](#ratelimits)
- [Enums](#enums)
- [Relations](#relations)
- [Indexes](#indexes)

---

## Overview

The PRIMA database is organized into three main schema domains:

1. **Core Schema** (`core-schema.ts`) - User and patient management
2. **Reminder Schema** (`reminder-schema.ts`) - Reminder system and WhatsApp interactions
3. **Content Schema** (`content-schema.ts`) - CMS for educational content

All tables use UUID primary keys and include soft delete support via `deletedAt` timestamps.

---

## Core Schema

### users

User accounts for volunteers, admins, and developers.

**Table Name:** `users`

| Column       | Type      | Constraints                 | Description                           |
| ------------ | --------- | --------------------------- | ------------------------------------- |
| id           | uuid      | PRIMARY KEY                 | Auto-generated UUID                   |
| email        | text      | NOT NULL, UNIQUE            | User email address                    |
| firstName    | text      |                             | First name                            |
| lastName     | text      |                             | Last name                             |
| hospitalName | text      |                             | Hospital affiliation                  |
| role         | user_role | NOT NULL, DEFAULT 'RELAWAN' | User role (ADMIN, RELAWAN, DEVELOPER) |
| isActive     | boolean   | NOT NULL, DEFAULT true      | Account active status                 |
| createdAt    | timestamp | NOT NULL, DEFAULT now()     | Account creation timestamp            |
| updatedAt    | timestamp | NOT NULL, DEFAULT now()     | Last update timestamp                 |
| lastLoginAt  | timestamp |                             | Last login timestamp                  |
| approvedAt   | timestamp |                             | Approval timestamp                    |
| approvedBy   | uuid      | FOREIGN KEY (users.id)      | User who approved this account        |
| isApproved   | boolean   | NOT NULL, DEFAULT false     | Approval status                       |
| clerkId      | text      | NOT NULL, UNIQUE            | Clerk authentication ID               |
| deletedAt    | timestamp |                             | Soft delete timestamp                 |

**Indexes:**

- Unique constraint on `email` (auto-indexed)
- Unique constraint on `clerkId` (auto-indexed)
- Self-referencing foreign key on `approvedBy`

**Business Rules:**

- New users default to `RELAWAN` role and `isApproved=false`
- Only ADMIN/DEVELOPER can approve users
- `clerkId` syncs with Clerk authentication system
- Soft deletion preserves data integrity

---

### patients

Patient records for cancer treatment tracking.

**Table Name:** `patients`

| Column                  | Type                | Constraints                 | Description                                  |
| ----------------------- | ------------------- | --------------------------- | -------------------------------------------- |
| id                      | uuid                | PRIMARY KEY                 | Auto-generated UUID                          |
| name                    | text                | NOT NULL                    | Patient full name                            |
| phoneNumber             | text                | NOT NULL                    | Normalized phone (62xxx format)              |
| address                 | text                |                             | Patient address                              |
| birthDate               | timestamp           |                             | Date of birth                                |
| diagnosisDate           | timestamp           |                             | Cancer diagnosis date                        |
| cancerStage             | cancer_stage        |                             | Stage I, II, III, or IV                      |
| assignedVolunteerId     | uuid                | FOREIGN KEY (users.id)      | Assigned volunteer                           |
| doctorName              | text                |                             | Primary doctor name                          |
| hospitalName            | text                |                             | Treatment hospital                           |
| emergencyContactName    | text                |                             | Emergency contact name                       |
| emergencyContactPhone   | text                |                             | Emergency contact phone                      |
| notes                   | text                |                             | Additional notes                             |
| isActive                | boolean             | NOT NULL, DEFAULT true      | Active status                                |
| deletedAt               | timestamp           |                             | Soft delete timestamp                        |
| createdAt               | timestamp           | NOT NULL, DEFAULT now()     | Record creation                              |
| updatedAt               | timestamp           | NOT NULL, DEFAULT now()     | Last update                                  |
| photoUrl                | text                |                             | Patient photo URL (MinIO)                    |
| **Verification Fields** |                     |                             |                                              |
| verificationStatus      | verification_status | NOT NULL, DEFAULT 'PENDING' | Verification status                          |
| verificationSentAt      | timestamp           |                             | When verification was sent                   |
| verificationResponseAt  | timestamp           |                             | When patient responded                       |
| verificationMessage     | text                |                             | Custom verification message                  |
| verificationAttempts    | text                | DEFAULT '0'                 | Number of attempts                           |
| verificationExpiresAt   | timestamp           |                             | Verification expiry                          |
| lastReactivatedAt       | timestamp           |                             | Last reactivation date                       |
| **Unsubscribe Fields**  |                     |                             |                                              |
| unsubscribedAt          | timestamp           |                             | Unsubscribe timestamp                        |
| unsubscribeReason       | text                |                             | Reason for unsubscribe                       |
| unsubscribeMethod       | text                |                             | manual, llm_analysis, keyword_detection, api |

**Indexes:**

- Phone numbers are normalized on input (0xxx → 62xxx)
- Composite indexes removed per Phase 3 optimization (table has <500 rows)

**Business Rules:**

- Phone numbers must match Indonesian format (62xxx)
- Verification expires after configurable time period (default: 72 hours)
- Unsubscribe methods tracked for compliance
- Only assigned volunteer or ADMIN can modify

---

### medicalRecords

Medical history and treatment records.

**Table Name:** `medical_records`

| Column       | Type                | Constraints                         | Description                                 |
| ------------ | ------------------- | ----------------------------------- | ------------------------------------------- |
| id           | uuid                | PRIMARY KEY                         | Auto-generated UUID                         |
| patientId    | uuid                | NOT NULL, FOREIGN KEY (patients.id) | Associated patient                          |
| recordType   | medical_record_type | NOT NULL                            | DIAGNOSIS, TREATMENT, PROGRESS, HEALTH_NOTE |
| title        | text                | NOT NULL                            | Record title                                |
| description  | text                | NOT NULL                            | Detailed description                        |
| recordedDate | timestamp           | NOT NULL                            | Date of record                              |
| recordedBy   | uuid                | NOT NULL, FOREIGN KEY (users.id)    | User who created record                     |
| createdAt    | timestamp           | NOT NULL, DEFAULT now()             | Creation timestamp                          |

**Indexes:**

- None (table currently empty, add when >1000 rows)

**Business Rules:**

- Immutable records (no updates allowed)
- Must be recorded by authenticated user
- Linked to patient record lifecycle

---

## Reminder Schema

### reminders

Scheduled medication and appointment reminders.

**Table Name:** `reminders`

| Column                    | Type                | Constraints                                         | Description                           |
| ------------------------- | ------------------- | --------------------------------------------------- | ------------------------------------- |
| id                        | uuid                | PRIMARY KEY                                         | Auto-generated UUID                   |
| patientId                 | uuid                | NOT NULL, FOREIGN KEY (patients.id), CASCADE DELETE | Associated patient                    |
| reminderType              | reminder_type       | NOT NULL, DEFAULT 'GENERAL'                         | MEDICATION, APPOINTMENT, GENERAL      |
| scheduledTime             | text                | NOT NULL                                            | Time of day (HH:MM format)            |
| message                   | text                | NOT NULL                                            | Reminder message content              |
| startDate                 | timestamp           | NOT NULL                                            | Reminder start date                   |
| endDate                   | timestamp           |                                                     | Reminder end date (null = indefinite) |
| isActive                  | boolean             | NOT NULL, DEFAULT true                              | Active status                         |
| createdById               | uuid                | NOT NULL, FOREIGN KEY (users.id)                    | Creator user ID                       |
| createdAt                 | timestamp           | NOT NULL, DEFAULT now()                             | Creation timestamp                    |
| updatedAt                 | timestamp           | NOT NULL, DEFAULT now()                             | Last update                           |
| deletedAt                 | timestamp           |                                                     | Soft delete timestamp                 |
| **Delivery Tracking**     |                     |                                                     |                                       |
| sentAt                    | timestamp           |                                                     | When message was sent                 |
| status                    | reminder_status     | NOT NULL, DEFAULT 'PENDING'                         | PENDING, SENT, DELIVERED, FAILED      |
| wahaMessageId             | text                |                                                     | GOWA message ID (legacy name)         |
| fonnteLegacyMessageId     | text                |                                                     | Old provider message ID               |
| **Confirmation Tracking** |                     |                                                     |                                       |
| confirmationStatus        | confirmation_status | DEFAULT 'PENDING'                                   | PENDING, CONFIRMED, MISSED            |
| confirmationSentAt        | timestamp           |                                                     | Follow-up sent timestamp              |
| confirmationResponseAt    | timestamp           |                                                     | Patient response timestamp            |
| confirmationResponse      | text                |                                                     | Patient response text                 |
| **Enhanced Fields**       |                     |                                                     |                                       |
| title                     | text                |                                                     | Reminder title (for UI)               |
| description               | text                |                                                     | Extended description                  |
| priority                  | text                | DEFAULT 'medium'                                    | low, medium, high, urgent             |
| recurrencePattern         | jsonb               |                                                     | Custom recurrence rules               |
| metadata                  | jsonb               |                                                     | Additional metadata                   |

**Indexes:**

- `reminders_patient_active_idx` (patientId, isActive)
- `reminders_patient_status_idx` (patientId, status)
- `reminders_today_idx` (startDate, isActive, scheduledTime)
- `reminders_patient_type_idx` (patientId, reminderType)

**Business Rules:**

- Cascade delete when patient is deleted
- `scheduledTime` uses 24-hour format (HH:MM)
- Recurrence patterns stored as JSONB for flexibility
- Status transitions: PENDING → SENT → DELIVERED
- Confirmation flow triggered after delivery

---

### reminderLogs

Audit log for reminder lifecycle events.

**Table Name:** `reminder_logs`

| Column     | Type      | Constraints                                          | Description                                               |
| ---------- | --------- | ---------------------------------------------------- | --------------------------------------------------------- |
| id         | uuid      | PRIMARY KEY                                          | Auto-generated UUID                                       |
| reminderId | uuid      | NOT NULL, FOREIGN KEY (reminders.id), CASCADE DELETE | Associated reminder                                       |
| patientId  | uuid      | NOT NULL, FOREIGN KEY (patients.id), CASCADE DELETE  | Associated patient                                        |
| action     | text      | NOT NULL                                             | SENT, DELIVERED, FAILED, CONFIRMED, MISSED, FOLLOWUP_SENT |
| actionType | text      |                                                      | INITIAL, FOLLOWUP, MANUAL, AUTOMATIC                      |
| message    | text      |                                                      | Message content                                           |
| response   | text      |                                                      | Patient response                                          |
| timestamp  | timestamp | NOT NULL, DEFAULT now()                              | Event timestamp                                           |
| metadata   | jsonb     |                                                      | Additional event data                                     |
| createdAt  | timestamp | NOT NULL, DEFAULT now()                              | Log creation                                              |

**Indexes:**

- `reminder_logs_reminder_action_idx` (reminderId, action)
- `reminder_logs_patient_timestamp_idx` (patientId, timestamp)

**Business Rules:**

- Immutable audit trail
- Supports analytics and compliance reporting
- Table currently empty (0 rows)

---

### manualConfirmations

Manual confirmation records for in-person/phone follow-ups.

**Table Name:** `manual_confirmations`

| Column           | Type              | Constraints                         | Description                         |
| ---------------- | ----------------- | ----------------------------------- | ----------------------------------- |
| id               | uuid              | PRIMARY KEY                         | Auto-generated UUID                 |
| patientId        | uuid              | NOT NULL, FOREIGN KEY (patients.id) | Associated patient                  |
| volunteerId      | uuid              | NOT NULL, FOREIGN KEY (users.id)    | Volunteer who confirmed             |
| reminderId       | uuid              | FOREIGN KEY (reminders.id)          | Related reminder (optional)         |
| reminderType     | reminder_type     |                                     | Reminder type                       |
| confirmationType | text              | NOT NULL, DEFAULT 'GENERAL'         | VISIT, PHONE_CALL, MESSAGE, GENERAL |
| visitDate        | timestamp         |                                     | Visit date (if applicable)          |
| visitTime        | text              |                                     | Visit time (HH:MM)                  |
| patientCondition | patient_condition |                                     | GOOD, FAIR, POOR                    |
| symptomsReported | text[]            | DEFAULT []                          | Array of symptoms                   |
| medicationsTaken | text[]            | DEFAULT []                          | Array of medications                |
| notes            | text              |                                     | Additional notes                    |
| followUpNeeded   | boolean           | NOT NULL, DEFAULT false             | Needs follow-up flag                |
| followUpNotes    | text              |                                     | Follow-up instructions              |
| confirmedAt      | timestamp         | NOT NULL, DEFAULT now()             | Confirmation timestamp              |
| createdAt        | timestamp         | NOT NULL, DEFAULT now()             | Record creation                     |

**Indexes:**

- `manual_confirmations_patient_volunteer_idx` (patientId, volunteerId)
- `manual_confirmations_reminder_id_idx` (reminderId) - Added to optimize ComplianceService batch queries

**Business Rules:**

- Can be linked to reminder or standalone
- Tracks offline interactions (visits, phone calls)
- Arrays for symptoms/medications support multiple entries

---

### whatsappTemplates

Reusable WhatsApp message templates.

**Table Name:** `whatsapp_templates`

| Column       | Type              | Constraints                      | Description                                    |
| ------------ | ----------------- | -------------------------------- | ---------------------------------------------- |
| id           | uuid              | PRIMARY KEY                      | Auto-generated UUID                            |
| templateName | text              | NOT NULL, UNIQUE                 | Template identifier                            |
| templateText | text              | NOT NULL                         | Template content with variables                |
| variables    | text[]            | NOT NULL, DEFAULT []             | Variable placeholders                          |
| category     | template_category | NOT NULL, DEFAULT 'REMINDER'     | REMINDER, APPOINTMENT, EDUCATIONAL, MEDICATION |
| isActive     | boolean           | NOT NULL, DEFAULT true           | Active status                                  |
| createdBy    | uuid              | NOT NULL, FOREIGN KEY (users.id) | Creator user ID                                |
| createdAt    | timestamp         | NOT NULL, DEFAULT now()          | Creation timestamp                             |
| updatedAt    | timestamp         | NOT NULL, DEFAULT now()          | Last update                                    |
| deletedAt    | timestamp         |                                  | Soft delete timestamp                          |

**Indexes:**

- Unique constraint on `templateName` (auto-indexed)
- No additional indexes (table empty, add when >1000 rows)

**Business Rules:**

- Variables use `{variableName}` syntax
- Template text supports Indonesian language
- Categories help organize template library

**Example Template:**

```
Hi {patientName}, ini pengingat untuk {medication} pukul {time}.
Jaga kesehatan! 💊
```

---

### conversationStates

Track multi-turn WhatsApp conversations with patients.

**Table Name:** `conversation_states`

| Column                  | Type      | Constraints                         | Description                     |
| ----------------------- | --------- | ----------------------------------- | ------------------------------- |
| id                      | uuid      | PRIMARY KEY                         | Auto-generated UUID             |
| patientId               | uuid      | NOT NULL, FOREIGN KEY (patients.id) | Associated patient              |
| phoneNumber             | text      | NOT NULL                            | Patient phone number            |
| currentContext          | text      | NOT NULL                            | Current conversation context    |
| expectedResponseType    | text      |                                     | Expected response type          |
| relatedEntityId         | uuid      |                                     | Related entity (reminder, etc.) |
| relatedEntityType       | text      |                                     | Entity type identifier          |
| stateData               | jsonb     |                                     | Additional state data           |
| lastMessage             | text      |                                     | Last message content            |
| lastMessageAt           | timestamp |                                     | Last message timestamp          |
| messageCount            | integer   | NOT NULL, DEFAULT 0                 | Message count in conversation   |
| isActive                | boolean   | NOT NULL, DEFAULT true              | Active conversation flag        |
| attemptCount            | integer   | NOT NULL, DEFAULT 0                 | Number of attempts              |
| contextSetAt            | timestamp |                                     | When context was set            |
| lastClarificationSentAt | timestamp |                                     | Last clarification message      |
| expiresAt               | timestamp | NOT NULL                            | Conversation expiry             |
| createdAt               | timestamp | NOT NULL, DEFAULT now()             | Creation timestamp              |
| updatedAt               | timestamp | NOT NULL, DEFAULT now()             | Last update                     |
| deletedAt               | timestamp |                                     | Soft delete timestamp           |

**Indexes:**

- `conversation_states_patient_active_expires_idx` (patientId, isActive, expiresAt)
- `conversation_states_cleanup_idx` (expiresAt, isActive) - Partial index for cleanup cron job (only indexes active, non-deleted conversations)

**Business Rules:**

- Conversations expire after inactivity (default: 24 hours)
- State machine for multi-turn dialogs
- Cleaned up via cron job (`/api/cron/cleanup-conversations`)

---

### conversationMessages

Individual messages in a conversation.

**Table Name:** `conversation_messages`

| Column              | Type      | Constraints                                   | Description                    |
| ------------------- | --------- | --------------------------------------------- | ------------------------------ |
| id                  | uuid      | PRIMARY KEY                                   | Auto-generated UUID            |
| conversationStateId | uuid      | NOT NULL, FOREIGN KEY (conversationStates.id) | Parent conversation            |
| message             | text      | NOT NULL                                      | Message content                |
| direction           | text      | NOT NULL                                      | inbound, outbound              |
| messageType         | text      | NOT NULL                                      | text, image, document, etc.    |
| intent              | text      |                                               | Detected intent (AI)           |
| confidence          | integer   |                                               | Confidence score (0-100)       |
| processedAt         | timestamp |                                               | Processing timestamp           |
| **AI Metadata**     |           |                                               |                                |
| llmResponseId       | text      |                                               | Claude response ID             |
| llmModel            | text      |                                               | Model used (claude-3-5-sonnet) |
| llmTokensUsed       | integer   |                                               | Tokens consumed                |
| llmResponseTimeMs   | integer   |                                               | Response time (ms)             |
| llmCost             | text      |                                               | Cost in USD (as string)        |
| createdAt           | timestamp | NOT NULL, DEFAULT now()                       | Message timestamp              |

**Indexes:**

- `conversation_messages_state_created_idx` (conversationStateId, createdAt)

**Business Rules:**

- Immutable message history
- AI metadata tracks Claude API usage for billing
- Intent detection powers automated responses

---

### volunteerNotifications

Escalated notifications requiring volunteer attention.

**Table Name:** `volunteer_notifications`

| Column              | Type      | Constraints                         | Description                     |
| ------------------- | --------- | ----------------------------------- | ------------------------------- |
| id                  | uuid      | PRIMARY KEY                         | Auto-generated UUID             |
| patientId           | uuid      | NOT NULL, FOREIGN KEY (patients.id) | Associated patient              |
| message             | text      | NOT NULL                            | Notification message            |
| priority            | text      | NOT NULL                            | low, medium, high, urgent       |
| status              | text      | NOT NULL, DEFAULT 'pending'         | pending, acknowledged, resolved |
| assignedVolunteerId | uuid      | FOREIGN KEY (users.id)              | Assigned volunteer              |
| escalationReason    | text      | NOT NULL                            | Why escalated                   |
| confidence          | integer   |                                     | AI confidence score             |
| intent              | text      |                                     | Detected intent                 |
| patientContext      | jsonb     |                                     | Patient context data            |
| respondedAt         | timestamp |                                     | Response timestamp              |
| response            | text      |                                     | Volunteer response              |
| createdAt           | timestamp | NOT NULL, DEFAULT now()             | Creation timestamp              |
| updatedAt           | timestamp | NOT NULL, DEFAULT now()             | Last update                     |

**Indexes:**

- `volunteer_notifications_patient_id_idx` (patientId)

**Business Rules:**

- Created when AI detects need for human intervention
- Routes to assigned volunteer or on-call volunteer
- Priority affects notification urgency

---

## Content Schema

### cmsArticles

Educational articles for patients.

**Table Name:** `cms_articles`

| Column           | Type             | Constraints                 | Description                |
| ---------------- | ---------------- | --------------------------- | -------------------------- |
| id               | uuid             | PRIMARY KEY                 | Auto-generated UUID        |
| title            | text             | NOT NULL                    | Article title              |
| slug             | text             | NOT NULL, UNIQUE            | URL-friendly slug          |
| content          | text             | NOT NULL                    | HTML content               |
| excerpt          | text             |                             | Short description          |
| featuredImageUrl | text             |                             | Featured image URL         |
| category         | content_category | NOT NULL, DEFAULT 'GENERAL' | Content category           |
| tags             | text[]           | NOT NULL, DEFAULT []        | Searchable tags            |
| seoTitle         | text             |                             | SEO meta title             |
| seoDescription   | text             |                             | SEO meta description       |
| status           | content_status   | NOT NULL, DEFAULT 'DRAFT'   | DRAFT, PUBLISHED, ARCHIVED |
| publishedAt      | timestamp        |                             | Publish timestamp          |
| createdBy        | text             | NOT NULL                    | Clerk user ID              |
| createdAt        | timestamp        | NOT NULL, DEFAULT now()     | Creation timestamp         |
| updatedAt        | timestamp        | NOT NULL, DEFAULT now()     | Last update                |
| deletedAt        | timestamp        |                             | Soft delete timestamp      |

**Indexes:**

- `cms_articles_tags_gin_idx` - GIN index for tags array searches (e.g., `tags @> ARRAY['nutrition']`)
- `cms_articles_fts_idx` - Full-text search on title, excerpt, and content (Indonesian language support
- No additional indexes (table empty, add when >1000 rows)

**Categories:**

- GENERAL - General health information
- NUTRITION - Nutritional guidance
- EXERCISE - Exercise and physical activity
- MOTIVATIONAL - Inspirational content
- MEDICAL - Medical information
- FAQ - Frequently asked questions

**Business Rules:**

- Content uses Quill editor (rich HTML)
- Slugs auto-generated from titles
- Only PUBLISHED articles visible to patients
- SEO fields optimize search visibility

---

### cmsVideos

Educational videos (YouTube/Vimeo).

**Table Name:** `cms_videos`

| Column          | Type             | Constraints                      | Description                |
| --------------- | ---------------- | -------------------------------- | -------------------------- |
| id              | uuid             | PRIMARY KEY                      | Auto-generated UUID        |
| title           | text             | NOT NULL                         | Video title                |
| slug            | text             | NOT NULL, UNIQUE                 | URL-friendly slug          |
| description     | text             |                                  | Video description          |
| videoUrl        | text             | NOT NULL                         | Embed URL (YouTube/Vimeo)  |
| thumbnailUrl    | text             |                                  | Thumbnail image URL        |
| durationMinutes | text             |                                  | Duration (e.g., "5:30")    |
| category        | content_category | NOT NULL, DEFAULT 'MOTIVATIONAL' | Content category           |
| tags            | text[]           | NOT NULL, DEFAULT []             | Searchable tags            |
| seoTitle        | text             |                                  | SEO meta title             |
| seoDescription  | text             |                                  | SEO meta description       |
| status          | content_status   | NOT NULL, DEFAULT 'DRAFT'        | DRAFT, PUBLISHED, ARCHIVED |
| publishedAt     | timestamp        |                                  | Publish timestamp          |
| createdBy       | text             | NOT NULL                         | Clerk user ID              |
| createdAt       | timestamp        | NOT NULL, DEFAULT now()          | Creation timestamp         |
| updatedAt       | timestamp        | NOT NULL, DEFAULT now()          | Last update                |
| deletedAt       | timestamp        |                                  | Soft delete timestamp      |

**Indexes:**

- `cms_videos_tags_gin_idx` - GIN index for tags array searches (e.g., `tags @> ARRAY['exercise']`)
- `cms_videos_fts_idx` - Full-text search on title and description (Indonesian language supportindexed)
- No additional indexes (table empty)

**Business Rules:**

- API auto-converts YouTube/Vimeo URLs to embed format
- Thumbnails auto-extracted from YouTube URLs
- Duration stored as text for display flexibility

---

**DEPRECATED:** This table has been removed in migration `0016_schema_optimizations.sql`. Redis handles all rate limiting. The table was unused and has been dropped to clean up the schema.lback

- Main rate limiting uses Redis
- Table currently empty (0 rows)

---

## Enums

All PostgreSQL enums defined in `enums.ts`:

### user_role

- `ADMIN` - System administrator
- `RELAWAN` - Volunteer
- `DEVELOPER` - Developer (full access)

### cancer_stage

- `I`, `II`, `III`, `IV` - Cancer staging

### verification_status

- `PENDING` - Awaiting verification
- `VERIFIED` - Confirmed via WhatsApp/manual
- `DECLINED` - Patient declined
- `EXPIRED` - Verification expired

### medical_record_type

- `DIAGNOSIS` - Initial diagnosis
- `TREATMENT` - Treatment record
- `PROGRESS` - Progress note
- `HEALTH_NOTE` - General health note

### reminder_status

- `PENDING` - Not yet sent
- `SENT` - Message sent to GOWA
- `DELIVERED` - Confirmed delivered
- `FAILED` - Delivery failed

### confirmation_status

- `PENDING` - Awaiting confirmation
- `CONFIRMED` - Patient confirmed
- `MISSED` - Patient missed reminder

### reminder_type

- `MEDICATION` - Medication reminder
- `APPOINTMENT` - Appointment reminder
- `GENERAL` - General reminder

### patient_condition

- `GOOD` - Good condition
- `FAIR` - Fair condition
- `POOR` - Poor condition

### template_category

- `REMINDER` - Reminder templates
- `APPOINTMENT` - Appointment templates
- `EDUCATIONAL` - Educational content
- `MEDICATION` - Medication instructions

### content_category

- `GENERAL` - General content
- `NUTRITION` - Nutrition-related
- `EXERCISE` - Exercise-related
- `MOTIVATIONAL` - Motivational content
- `MEDICAL` - Medical information
- `FAQ` - Frequently asked questions

### content_status

- `DRAFT` - Draft content
- `PUBLISHED` - Published content
- `ARCHIVED` - Archived content

---

## Relations

Defined in `schema.ts` using Drizzle ORM relations:

### User Relations

- `approver` (one-to-one) - User who approved this user
- `approvedUsers` (one-to-many) - Users approved by this user
- `patientsManaged` (one-to-many) - Assigned patients
- `remindersCreated` (one-to-many) - Created reminders
- `whatsappTemplatesCreated` (one-to-many) - Created templates
- `manualConfirmations` (one-to-many) - Manual confirmations
- `medicalRecords` (one-to-many) - Medical records created

### Patient Relations

- `assignedVolunteer` (many-to-one) - Assigned volunteer user
- `reminders` (one-to-many) - Patient reminders
- `manualConfirmations` (one-to-many) - Manual confirmations
- `medicalRecords` (one-to-many) - Medical records

### Reminder Relations

- `patient` (many-to-one) - Associated patient
- `createdByUser` (many-to-one) - Creator user
- `manualConfirmations` (one-to-many) - Manual confirmations

### Conversation Relations

- `conversationState.patient` (many-to-one) - Associated patient
- `conversationState.messages` (one-to-many) - Conversation messages
- `conversationMessage.conversationState` (many-to-one) - Parent conversation

---

## Indexes

### Performance Optimizations (Phase 3)

Based on database profiling with ~150 patients and ~450 reminders:

**Active Composite Indexes:**

1. `reminders_patient_active_idx` - Most common query pattern
2. `reminders_patient_status_idx` - Status filtering
3. `reminders_today_idx` - Cron job optimization
4. `reminders_patient_type_idx` - Type-based queries
5. `reminder_logs_reminder_action_idx` - Audit queries
6. `reminder_logs_patient_timestamp_idx` - Timeline queries
7. `manual_confirmations_patient_volunteer_idx` - Volunteer lookup
8. `manual_confirmations_reminder_id_idx` - Reminder lookups (fixes N+1 in ComplianceService)
9. `conversation_states_patient_active_expires_idx` - Active conversations
10. `conversation_states_cleanup_idx` - Partial index for cleanup cron (active only)
11. `conversation_messages_state_created_idx` - Message history
12. `cms_articles_tags_gin_idx` - GIN index for article tags array searches
13. `cms_videos_tags_gin_idx` - GIN index for video tags array searches
14. `cms_articles_fts_idx` - Full-text search on articles (Indonesian)
15. `cms_videos_fts_idx` - Full-text search on videos (Indonesian)
    ) - indexes deferred

- `rateLimits` table dropped entirely (Redis handles rate limiting
  **Removed Indexes:**

- 32 redundant single-column indexes removed
- Low-cardinality fields (isActive, status) covered by composites
- Foreign key columns covered by composite indexes
- Tables with <1000 rows (medicalRecords, whatsappTemplates, cmsArticles, cmsVideos)

**Index Health Monitoring:**

```bash
bun run db:monitor-indexes  # Monthly maintenance check
```

---

## Data Integrity

### Soft Deletes

All major tables support soft deletion via `deletedAt` timestamp:

- Preserves historical data
- Maintains referential integrity
- Allows data recovery

### Cascade Behavior

- `reminders.patientId` - CASCADE DELETE (reminders deleted with patient)
- `reminderLogs` - CASCADE DELETE (logs deleted with reminder)
- Other foreign keys - RESTRICT (prevent deletion if referenced)

### Phone Number Normalization

```typescript
// Input: 0812-3456-7890
// Stored: 628123456789
// Format: 62 + Indonesian phone number (9-12 digits)
```

### Timestamp Conventions

- `createdAt` - Record creation (immutable)
- `updatedAt` - Last modification (auto-updated)
- `deletedAt` - Soft delete marker
- `sentAt`, `publishedAt`, etc. - Business event timestamps

---

4 (Advanced Optimizations)  
**Last Updated:** January 29, 2026  
**Total Tables:** 11 (removed rateLimits)  
**Total Enums:** 10  
**ORM:** Drizzle ORM v0.33.0  
**Database:** PostgreSQL (Neon)

**Phase 4 Optimizations:**

- Added `manual_confirmations_reminder_id_idx` to fix N+1 queries in ComplianceService
- Added partial index `conversation_states_cleanup_idx` for faster cleanup operations
- Added GIN indexes on CMS tags arrays for efficient tag searches
- Added full-text search indexes (Indonesian) on CMS content
- Removed unused `rateLimits` table (Redis handles all rate limiting
  **Database:** PostgreSQL (Neon)
