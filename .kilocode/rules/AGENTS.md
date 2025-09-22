# PRIMA System - Complete Development Guide for AI Coding Agents

## 🏥 Project Overview

**PRIMA (Palliative Remote Integrated Monitoring and Assistance)** is a comprehensive medical-grade WhatsApp-based patient management system designed for Indonesian healthcare volunteers providing cancer patient care and medication compliance monitoring.

### Core Purpose

- **Patient Management**: Complete CRUD operations for cancer patients with photo uploads and verification systems
- **Medication Compliance**: Automated WhatsApp reminders with content-rich educational materials
- **Healthcare Workflow**: Role-based access control for SUPERADMIN, ADMIN, and MEMBER (volunteer) roles
- **Content Management**: Rich text articles and YouTube video integration for patient education
- **Verification System**: WhatsApp-based patient verification with retry logic and audit trails

### Key Features Implemented

- ✅ Role-based authentication (Clerk OAuth + Gmail)
- ✅ Patient verification via WhatsApp with status tracking
- ✅ Automated medication reminders with cron jobs
- ✅ Content-rich reminders (articles + videos attached)
- ✅ Compliance rate calculation and monitoring
- ✅ Manual confirmation system for volunteer visits
- ✅ Health notes and medical records tracking
- ✅ Custom patient variables for personalized care
- ✅ Admin panel with user management and system monitoring
- ✅ Content Management System (CMS) with QuillJS editor
- ✅ Redis caching (3min sessions, 15min patient data)
- ✅ ISR optimization for public content
- ✅ Medical-grade error handling and soft deletes
- ✅ **LLM Integration with Cost Management**:
  - Response caching for common queries
  - Token usage tracking and analytics
  - Cost monitoring and alerts
  - Usage limits and rate limiting
  - Prompt optimization for efficiency

## 🏗️ System Architecture

### Technology Stack

```
Frontend: Next.js 15 + React 19 + TypeScript 5
Backend: Next.js API Routes (Serverless)
Database: PostgreSQL (Supabase) + Drizzle ORM
Authentication: Clerk with role-based access control
WhatsApp: Fonnte Business API
Caching: Redis (ioredis) with TTL management
UI: Tailwind CSS 4 + shadcn/ui + Lucide icons
Rich Text: QuillJS with image upload
File Storage: Vercel Blob
Deployment: Vercel with optimized serverless config
Package Manager: Bun
```

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── admin/               # Admin management (users, templates)
│   │   ├── patients/            # Patient CRUD with verification
│   │   ├── cms/                 # Content management (articles/videos)
│   │   ├── cron/                # Automated reminder system
│   │   ├── reminders/           # Reminder scheduling and management
│   │   └── webhooks/            # Clerk user sync
│   ├── dashboard/               # Main application interface
│   │   ├── admin/               # Admin panel (user management)
│   │   ├── pasien/              # Patient management system
│   │   ├── pengingat/           # Reminder scheduling interface
│   │   └── cms/                 # Content management interface
│   └── content/                 # Public content pages (ISR optimized)
├── components/                   # Reusable React components
│   ├── admin/                   # Admin-specific components
│   ├── patients/                # Patient management components
│   ├── ui/                      # shadcn/ui components
│   └── providers/               # React context providers
├── lib/                         # Utility libraries
│   ├── auth-utils.ts            # Authentication helpers (getAuthUser)
│   ├── cache.ts                 # Redis caching with TTL
│   ├── timezone.ts              # WIB timezone utilities
│   ├── phone-utils.ts           # Phone number validation
│   └── validations.ts           # Zod schemas
├── db/                          # Database layer
│   ├── schema.ts                # Drizzle ORM schema with relations
│   └── index.ts                 # Database connection
├── services/                    # Business logic layer
│   ├── patient/                 # Patient management services
│   ├── reminder/                # Reminder scheduling services
│   └── whatsapp/                # WhatsApp integration
└── middleware.ts                # Route protection and rate limiting
```

## 🗄️ Database Schema & Relationships

### Core Tables Overview

#### Users (`users`)

- **Purpose**: Healthcare volunteers and administrators
- **Key Fields**: email, firstName, lastName, role (SUPERADMIN/ADMIN/MEMBER), isActive, isApproved
- **Relationships**: Manages patients, creates reminders, records medical notes
- **Indexes**: Role-based, approval status, activity status

#### Patients (`patients`)

- **Purpose**: Cancer patients under care
- **Key Fields**: name, phoneNumber, cancerStage, assignedVolunteerId, verificationStatus
- **Relationships**: Has medications, reminders, health notes, verification logs
- **Indexes**: Volunteer assignment, verification status, phone number

#### Reminder Schedules (`reminder_schedules`)

- **Purpose**: Medication reminder configurations
- **Key Fields**: patientId, medicationName, scheduledTime, frequency, customMessage
- **Relationships**: Generates reminder logs, can have content attachments
- **Indexes**: Patient, active status, date ranges (critical for cron performance)

#### Reminder Logs (`reminder_logs`)

- **Purpose**: WhatsApp message delivery tracking
- **Key Fields**: reminderScheduleId, patientId, sentAt, status, message, fonnteMessageId
- **Relationships**: Links to schedules and patients
- **Indexes**: Status, sent date, patient (for compliance calculations)

#### Content Management (CMS)

- **Articles** (`cms_articles`): Rich text content with categories and SEO
- **Videos** (`cms_videos`): YouTube integration with metadata
- **Attachments** (`reminder_content_attachments`): Links reminders to educational content

### Critical Database Design Patterns

#### Soft Deletes

- All tables include `deletedAt` timestamp
- Queries filter out deleted records by default
- Maintains data integrity and audit trails

#### Comprehensive Indexing

- **Performance Critical**: Reminder queries use composite indexes on (isActive, deletedAt, startDate)
- **Foreign Keys**: All relationships properly constrained
- **Query Optimization**: Indexes on frequently filtered columns (status, dates, IDs)

#### Timezone Handling

- All timestamps stored in UTC with timezone metadata
- WIB (UTC+7) conversions for Indonesian healthcare workflows
- Cron jobs operate in WIB timezone

## 🔧 Key Services & Business Logic

### PatientService

**Location**: `src/services/patient/patient.service.ts`

**Core Responsibilities**:

- Patient CRUD with validation (phone format, volunteer assignment)
- Verification history tracking
- Compliance rate calculation with caching
- Reactivation workflow (resets verification status)

**Key Methods**:

- `listWithCompliance()`: Fetches patients with cached compliance rates
- `getDetail()`: Comprehensive patient data aggregation
- `createPatient()`: Validation and volunteer assignment
- `reactivatePatient()`: Resets patient to pending verification

### ReminderService

**Location**: `src/services/reminder/reminder.service.ts`

**Core Responsibilities**:

- Reminder scheduling with recurrence patterns
- Content attachment validation and management
- WhatsApp message generation with educational content
- Immediate sending for same-day reminders

**Key Methods**:

- `createReminder()`: Handles single dates and recurrence patterns
- `updateReminder()`: Modifies schedules and attachments
- `sendReminder()`: WhatsApp integration with error handling

### WhatsApp Service

**Location**: `src/services/whatsapp/whatsapp.service.ts`

**Core Responsibilities**:

- Fonnte API integration
- Message building with content attachments
- Delivery status tracking

**Key Features**:

- Content-rich messages (articles + videos)
- Phone number validation
- Error handling and retry logic

### LLM Cost Management Services

**Location**: `src/lib/llm-analytics.ts`, `src/lib/usage-limits.ts`, `src/lib/prompt-optimizer.ts`

**Core Responsibilities**:

- **LLM Analytics**: Token usage tracking, cost monitoring, performance metrics
- **Usage Limits**: Rate limiting, quota enforcement, automated alerts
- **Prompt Optimization**: Token reduction, response caching, efficiency improvements

**Key Features**:

- Real-time cost monitoring with configurable alerts
- Automatic usage limit enforcement
- Response caching for common queries (24h TTL)
- Prompt optimization to reduce token consumption
- Comprehensive analytics dashboard for administrators

## ⏰ Cron System (Automated Reminders)

### Architecture

- **Trigger**: Vercel Cron Functions (GET/POST endpoints)
- **Authentication**: Bearer token with `CRON_SECRET`
- **Timezone**: WIB (UTC+7) for Indonesian operations
- **Batch Processing**: Handles large datasets with configurable batch sizes

### Core Logic (`src/app/api/cron/route.ts`)

#### Query Strategy

```sql
-- Find active reminders not delivered today
SELECT * FROM reminder_schedules
WHERE isActive = true
  AND startDate <= endOfDay
  AND NOT EXISTS (
    SELECT 1 FROM reminder_logs
    WHERE reminderScheduleId = reminder_schedules.id
      AND status = 'DELIVERED'
      AND sentAt >= todayStart
  )
```

#### Processing Flow

1. **Fetch Candidates**: Active schedules for today/past dates
2. **Time Check**: `shouldSendReminderNow()` compares WIB time
3. **Content Enhancement**: Attach articles/videos to messages
4. **Send & Log**: WhatsApp delivery with comprehensive logging
5. **Batch Management**: Processes in chunks to prevent memory issues

#### Performance Optimizations

- **JSON Aggregation**: Single query fetches content attachments
- **Not Exists**: Efficient duplicate prevention
- **Batch Processing**: Memory-safe for large reminder volumes
- **Error Isolation**: Individual failures don't stop batch processing

## 🔐 Authentication & Authorization

### Clerk Integration

- **OAuth**: Gmail-based authentication
- **Roles**: SUPERADMIN (full access), ADMIN (user management), MEMBER (patient care)
- **Middleware**: Route protection with role-based access control

### User Approval Workflow

- **Registration**: New users start as unapproved MEMBERS
- **Approval**: ADMINs approve volunteers with hospital assignment
- **Activation**: SUPERADMIN can toggle user active status

### Session Management

- **Redis Caching**: 3-minute session TTL
- **Invalidation**: Automatic cleanup on logout/role changes

## 📊 Caching Strategy

### Redis Implementation

```typescript
// Session caching (3 minutes)
const sessionKey = `session:${userId}`;
await setCachedData(sessionKey, sessionData, 180);

// Patient data (15 minutes)
const patientKey = `patient:${patientId}`;
await setCachedData(patientKey, patientData, 900);
```

### Cache Invalidation Patterns

- **Patient Operations**: Clear patient-specific caches on updates
- **Reminder Changes**: Invalidate compliance calculations
- **Content Updates**: ISR revalidation for public content

## 🚀 API Structure

### RESTful Endpoints

- **Patients**: `/api/patients` (CRUD + verification + compliance)
- **Reminders**: `/api/reminders` (scheduling + management)
- **CMS**: `/api/cms` (articles + videos + templates)
- **Admin**: `/api/admin` (users + system management + LLM analytics)
- **Cron**: `/api/cron` (automated reminder processing)
- **LLM Analytics**: `/api/admin/llm-analytics` (cost monitoring and usage stats)

### Key API Patterns

- **Soft Deletes**: All delete operations use `deletedAt` timestamps
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Structured error responses with appropriate HTTP codes
- **Caching**: Strategic caching with TTL management
- **Cost Management**: LLM usage tracking and limit enforcement

### Admin Panel Features

**Location**: `src/components/admin/`, `src/app/dashboard/admin/`

**Core Features**:

- **User Management**: Approve/reject volunteers, role assignment, activity monitoring
- **System Monitoring**: Performance metrics, error tracking, cache management
- **LLM Analytics Dashboard**: Cost monitoring, usage limits, optimization recommendations
- **Content Moderation**: CMS article/video approval workflow

**LLM Analytics Dashboard** (`src/components/admin/llm-analytics-dashboard.tsx`):

- Real-time cost monitoring with alerts
- Token usage by model and intent
- Daily usage trends and cost projections
- Usage limit status and recommendations
- Performance metrics (response times, error rates)

## 🧪 Testing & Quality Assurance

### Test Coverage

- **Unit Tests**: Service layer business logic
- **Integration Tests**: API endpoint validation
- **Auth Tests**: Race condition prevention in authentication

### Key Test Files

- `src/__tests__/auth-race-conditions.test.ts`
- `src/__tests__/compliance-service.test.ts`
- `src/__tests__/rate-limiter.test.ts`

## 🚀 Deployment & Production

### Vercel Configuration

- **Build Command**: `bun run build` (includes schema generation)
- **Environment Variables**: Comprehensive env management
- **Serverless Functions**: Optimized for API routes
- **ISR**: 1-hour revalidation for content pages

### Database Configuration

- **Production**: Supabase PostgreSQL with pgBouncer
- **Connection Pooling**: Separate pooled/direct connections
- **Migrations**: Drizzle ORM with proper versioning

### Monitoring & Logging

- **Structured Logging**: Winston-based logging with context
- **Error Tracking**: Comprehensive error boundaries
- **Performance Monitoring**: Built-in performance utilities

## 🔧 Development Guidelines

### Code Quality Standards

- **TypeScript**: Strict typing throughout the application
- **ESLint**: Next.js configuration with custom rules
- **Prettier**: Consistent code formatting
- **Soft Deletes**: All data operations preserve audit trails

### Database Best Practices

- **Foreign Keys**: All relationships properly constrained
- **Indexing**: Performance-critical queries optimized
- **Migrations**: Version-controlled schema changes
- **Soft Deletes**: Maintain data integrity

### API Design Principles

- **RESTful**: Consistent HTTP methods and status codes
- **Validation**: Request/response validation with Zod
- **Caching**: Strategic caching with appropriate TTL
- **Error Handling**: Structured error responses

### Security Considerations

- **Authentication**: Role-based access control
- **Input Validation**: Comprehensive validation layers
- **Rate Limiting**: API protection (currently disabled for development)
- **Environment Variables**: Secure credential management

## 📈 Performance Optimizations

### Database Performance

- **Composite Indexes**: Optimized for complex queries
- **Query Batching**: Efficient bulk operations
- **Connection Pooling**: Supabase pgBouncer integration

### Application Performance

- **Redis Caching**: Multi-level caching strategy
- **ISR**: Static regeneration for content pages
- **Code Splitting**: Optimized bundle sizes
- **Lazy Loading**: Component-level code splitting

### WhatsApp Integration

- **Batch Processing**: Memory-efficient reminder sending
- **Retry Logic**: Robust error handling and recovery
- **Rate Limiting**: API protection and fair usage

## 🎯 Future Enhancements

### Planned Features

- **Advanced Analytics**: Comprehensive reporting dashboards
- **Mobile App**: React Native companion application
- **Multi-language Support**: Bahasa Indonesia + English
- **Advanced Recurrence**: Complex medication schedules
- **Integration APIs**: Hospital system integrations

### Scalability Considerations

- **Microservices**: Potential service decomposition
- **CDN Optimization**: Global content delivery
- **Database Sharding**: Horizontal scaling preparation
- **Queue Systems**: Background job processing

---

## 🤖 AI Agent Development Notes

### Understanding the System

- **Domain Knowledge**: Healthcare workflows, medication compliance, Indonesian timezone handling
- **Critical Paths**: Patient verification → Reminder scheduling → WhatsApp delivery → Compliance tracking
- **Data Integrity**: Soft deletes, audit trails, and referential integrity are paramount
- **Performance**: Cron jobs and compliance calculations require optimization

### Key Integration Points

- **WhatsApp API**: Fonnte integration with message building and status tracking
- **Timezone Handling**: WIB conversions for all user-facing time displays
- **Caching Strategy**: Redis TTL management for different data types
- **Role Permissions**: SUPERADMIN → ADMIN → MEMBER hierarchy enforcement

### Development Workflow

1. **Schema Changes**: Update Drizzle schema → Generate migrations → Test thoroughly
2. **API Development**: Validate inputs → Implement business logic → Add caching → Test endpoints
3. **Cron Testing**: Use POST endpoint for manual testing → Monitor logs → Verify delivery
4. **Content Integration**: Validate CMS content → Test attachment system → Verify WhatsApp formatting

### Critical Testing Scenarios

- **Patient Verification**: WhatsApp response handling and status transitions
- **Reminder Scheduling**: Recurrence patterns and immediate sending logic
- **Compliance Calculation**: Accurate rate computation with proper caching
- **Content Attachments**: Article/video linking and message enhancement

This comprehensive guide provides AI agents with the complete context needed to understand, maintain, and extend the PRIMA healthcare management system effectively.
