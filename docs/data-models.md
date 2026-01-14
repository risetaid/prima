# Data Models

## Overview

PRIMA uses Drizzle ORM with PostgreSQL. All schemas are located in `src/db/` and organized by domain.

## Schema Organization

```
src/db/
├── schema.ts          # Main export with relations
├── core-schema.ts     # Users, patients, medical records
├── reminder-schema.ts # Reminders, confirmations, templates
├── content-schema.ts  # CMS articles, videos
└── enums.ts           # Database enums
```

## Core Tables

### users

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| email | text | Unique email address |
| firstName | text | User's first name |
| lastName | text | User's last name |
| hospitalName | text | Associated hospital |
| role | user_role | User role (ADMIN, RELAWAN, etc.) |
| isActive | boolean | Account active status |
| clerkId | text | Clerk authentication ID |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update |
| lastLoginAt | timestamp | Last login time |
| approvedAt | timestamp | Approval timestamp |
| approvedBy | uuid | Approver user ID |
| isApproved | boolean | Approval status |
| deletedAt | timestamp | Soft delete timestamp |

**Relations:**
- One-to-many: patients (managed patients)
- One-to-many: reminders (created reminders)
- One-to-many: whatsappTemplates (created templates)
- One-to-many: manualConfirmations (volunteer confirmations)
- Self-referential: approvedUsers (users approved by this user)

### patients

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Patient name |
| phoneNumber | text | WhatsApp phone number |
| address | text | Patient address |
| birthDate | timestamp | Date of birth |
| diagnosisDate | timestamp | Cancer diagnosis date |
| cancerStage | cancer_stage | Cancer stage (0-IV) |
| assignedVolunteerId | uuid | Assigned volunteer |
| doctorName | text | Treating doctor |
| hospitalName | text | Hospital name |
| emergencyContactName | text | Emergency contact name |
| emergencyContactPhone | text | Emergency contact phone |
| notes | text | Additional notes |
| isActive | boolean | Active status |
| photoUrl | text | Patient photo URL |
| verificationStatus | verification_status | VERIFIED, PENDING, FAILED, EXPIRED |
| verificationSentAt | timestamp | Verification sent time |
| verificationResponseAt | timestamp | Verification response time |
| verificationMessage | text | Verification message |
| verificationAttempts | text | Number of attempts |
| verificationExpiresAt | timestamp | Verification expiry |
| lastReactivatedAt | timestamp | Last reactivation |
| unsubscribedAt | timestamp | Unsubscribe timestamp |
| unsubscribeReason | text | Unsubscribe reason |
| unsubscribeMethod | text | manual, llm_analysis, keyword_detection, api |
| deletedAt | timestamp | Soft delete |

**Relations:**
- One-to-many: reminders
- One-to-many: manualConfirmations
- One-to-many: medicalRecords
- One-to-one: conversationStates
- One-to-many: volunteerNotifications

### medicalRecords

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patientId | uuid | Foreign key to patients |
| recordType | medical_record_type | Type of record |
| title | text | Record title |
| description | text | Record description |
| recordedDate | timestamp | Date of record |
| recordedBy | uuid | Recording user |
| createdAt | timestamp | Creation timestamp |

**Relations:**
- Belongs-to: patients
- Belongs-to: users (recordedBy)

## Reminder Tables

### reminders

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patientId | uuid | Foreign key to patients |
| reminderType | reminder_type | GENERAL, MEDICATION, FOLLOWUP, etc. |
| scheduledTime | text | Time of day (HH:mm format) |
| message | text | Message content |
| startDate | timestamp | Start date |
| endDate | timestamp | End date (optional) |
| isActive | boolean | Active status |
| createdById | uuid | Creating user |
| sentAt | timestamp | Sent timestamp |
| status | reminder_status | PENDING, SENT, FAILED, CONFIRMED |
| wahaMessageId | text | WhatsApp message ID |
| fonnteLegacyMessageId | text | Legacy provider ID |
| confirmationStatus | confirmation_status | PENDING, CONFIRMED, EXPIRED |
| confirmationSentAt | timestamp | Confirmation sent |
| confirmationResponseAt | timestamp | Confirmation response |
| confirmationResponse | text | Patient response |
| title | text | Reminder title |
| description | text | Description |
| priority | text | low, medium, high, urgent |
| recurrencePattern | jsonb | Recurrence rules |
| metadata | jsonb | Additional metadata |

**Relations:**
- Belongs-to: patients
- Belongs-to: users (createdBy)
- One-to-many: manualConfirmations

### manualConfirmations

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patientId | uuid | Foreign key to patients |
| volunteerId | uuid | Foreign key to users |
| reminderId | uuid | Optional reminder reference |
| reminderType | reminder_type | Type of reminder |
| confirmationType | text | VISIT, PHONE_CALL, MESSAGE, GENERAL |
| visitDate | timestamp | Visit date |
| visitTime | text | Visit time |
| patientCondition | patient_condition | STABLE, IMPROVING, etc. |
| symptomsReported | text[] | Array of symptoms |
| medicationsTaken | text[] | Array of medications |
| notes | text | Additional notes |
| followUpNeeded | boolean | Follow-up required |
| followUpNotes | text | Follow-up details |
| confirmedAt | timestamp | Confirmation timestamp |

**Relations:**
- Belongs-to: patients
- Belongs-to: users (volunteer)
- Belongs-to: reminders (optional)

### reminderLogs

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| reminderId | uuid | Foreign key to reminders |
| patientId | uuid | Foreign key to patients |
| action | text | SENT, DELIVERED, FAILED, CONFIRMED, etc. |
| actionType | text | INITIAL, FOLLOWUP, MANUAL, AUTOMATIC |
| message | text | Message content |
| response | text | Patient response |
| timestamp | timestamp | Action timestamp |
| metadata | jsonb | Additional data |

**Relations:**
- Belongs-to: reminders
- Belongs-to: patients

### whatsappTemplates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| templateName | text | Unique template name |
| templateText | text | Template content with {{variables}} |
| variables | text[] | Variable names |
| category | template_category | REMINDER, VERIFICATION, GENERAL |
| isActive | boolean | Active status |
| createdBy | uuid | Creating user |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update |

**Relations:**
- Belongs-to: users (createdBy)

## Conversation Tracking Tables

### conversationStates

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patientId | uuid | Foreign key to patients |
| phoneNumber | text | Patient phone number |
| currentContext | text | Current conversation context |
| expectedResponseType | text | Expected response type |
| relatedEntityId | uuid | Related entity ID |
| relatedEntityType | text | Related entity type |
| stateData | jsonb | Contextual state data |
| lastMessage | text | Last message content |
| lastMessageAt | timestamp | Last message time |
| messageCount | integer | Message count |
| isActive | boolean | Active status |
| attemptCount | integer | Clarification attempts |
| contextSetAt | timestamp | Context set time |
| lastClarificationSentAt | timestamp | Last clarification |
| expiresAt | timestamp | Expiration timestamp |

**Relations:**
- Belongs-to: patients
- One-to-many: conversationMessages

### conversationMessages

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| conversationStateId | uuid | Foreign key to conversationStates |
| message | text | Message content |
| direction | text | INBOUND, OUTBOUND |
| messageType | text | TEXT, IMAGE, FILE, etc. |
| intent | text | Detected intent |
| confidence | integer | Intent confidence score |
| processedAt | timestamp | Processing timestamp |
| llmResponseId | text | LLM response ID |
| llmModel | text | Claude model used |
| llmTokensUsed | integer | Tokens consumed |
| llmResponseTimeMs | integer | Response time |
| llmCost | text | Cost of API call |

**Relations:**
- Belongs-to: conversationStates

### volunteerNotifications

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patientId | uuid | Foreign key to patients |
| message | text | Notification message |
| priority | text | Priority level |
| status | text | pending, acknowledged, resolved |
| assignedVolunteerId | uuid | Assigned volunteer |
| escalationReason | text | Reason for escalation |
| confidence | integer | AI confidence score |
| intent | text | Detected intent |
| patientContext | jsonb | Patient context data |
| respondedAt | timestamp | Response timestamp |
| response | text | Volunteer response |

**Relations:**
- Belongs-to: patients
- Belongs-to: users (assignedVolunteer)

## CMS Tables

### cmsArticles

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Article title |
| slug | text | URL slug (unique) |
| content | text | Article content (HTML) |
| excerpt | text | Short description |
| featuredImageUrl | text | Featured image |
| category | content_category | Article category |
| tags | text[] | Tags array |
| seoTitle | text | SEO title |
| seoDescription | text | SEO description |
| status | content_status | DRAFT, PUBLISHED, ARCHIVED |
| publishedAt | timestamp | Publication date |
| createdBy | text | Clerk user ID |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update |

### cmsVideos

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Video title |
| slug | text | URL slug (unique) |
| description | text | Video description |
| videoUrl | text | YouTube/Vimeo embed URL |
| thumbnailUrl | text | Thumbnail image URL |
| durationMinutes | text | Duration (e.g., "5:30") |
| category | content_category | Video category |
| tags | text[] | Tags array |
| seoTitle | text | SEO title |
| seoDescription | text | SEO description |
| status | content_status | DRAFT, PUBLISHED, ARCHIVED |
| publishedAt | timestamp | Publication date |
| createdBy | text | Clerk user ID |
| createdAt | timestamp | Creation timestamp |
| updatedAt | timestamp | Last update |

## Rate Limiting Table

### rateLimits

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| rateLimitKey | text | Rate limit key |
| createdAt | timestamp | Creation timestamp |

## Database Enums

| Enum | Values |
|------|--------|
| user_role | ADMIN, RELAWAN |
| cancer_stage | STAGE_0, STAGE_I, STAGE_II, STAGE_III, STAGE_IV |
| medical_record_type | DIAGNOSIS, TREATMENT, FOLLOWUP, SYMPTOM, MEDICATION, OTHER |
| verification_status | PENDING, VERIFIED, FAILED, EXPIRED |
| reminder_type | GENERAL, MEDICATION, FOLLOWUP, APPOINTMENT, VERIFICATION |
| reminder_status | PENDING, SENT, DELIVERED, FAILED, CONFIRMED, CANCELLED |
| confirmation_status | PENDING, CONFIRMED, EXPIRED |
| patient_condition | STABLE, IMPROVING, DETERIORATING, CRITICAL, UNKNOWN |
| template_category | REMINDER, VERIFICATION, GENERAL, CONFIRMATION |
| content_category | GENERAL, MOTIVATIONAL, EDUCATIONAL, TIPS, NEWS |
| content_status | DRAFT, PUBLISHED, ARCHIVED |

## Index Strategy

The project follows a strict index management strategy:
- All indexes are defined in schema files only
- Composite indexes cover common query patterns
- Single-column indexes are avoided unless profiling shows need
- Index naming convention: `{table}_{columns}_{type}_idx`
