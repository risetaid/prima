# AGENTS.md - Development Guide for AI Coding Agents

**PRIMA System** - Palliative Remote Integrated Monitoring and Assistance
A medical-grade WhatsApp-based patient management system for Indonesian healthcare volunteers providing cancer patient care and medication compliance monitoring.

## 📋 Current Project Status

### ✅ Completed Features
- **Authentication System**: Clerk-based auth with role-based access control (SUPERADMIN/ADMIN/MEMBER)
- **Patient Management**: Full CRUD with photo upload, verification system, health notes
- **WhatsApp Integration**: Automated medication reminders via Fonnte API
- **CMS System**: Article and video content management with TinyMCE rich text editor
- **Performance Optimization**: Redis caching, ISR (Incremental Static Regeneration) for content
- **UI/UX**: Modern responsive design with mobile-first approach using shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM, comprehensive indexing for performance

## 🏗️ Current Tech Stack
- **Framework**: Next.js 15 + React 19 + TypeScript 5
- **Authentication**: Clerk with Gmail OAuth and role-based access control
- **Database**: PostgreSQL + Drizzle ORM with comprehensive soft delete patterns
- **Caching**: Redis with ioredis client (3min sessions, 15min patient data)
- **UI**: Tailwind CSS 4 + shadcn/ui + Lucide React icons
- **WhatsApp**: Fonnte WhatsApp Business API
- **File Storage**: Vercel Blob storage
- **Rich Text**: TinyMCE with image upload support
- **Package Manager**: Bun

## 🛠️ Development Commands

```bash
# Core Development
bun run dev                    # Start development server
bun run build                  # Production build (includes schema generation)
bun run lint                   # ESLint check

# Database Management
bun run db:generate            # Generate Drizzle schema
bun run db:migrate             # Run migrations
bun run db:push                # Push schema changes  
bun run db:studio              # Open Drizzle Studio GUI

# Content Management
bun run seed:templates         # Seed WhatsApp message templates
```

## 📂 Key Architecture & File Locations

### Core System Files
- `src/middleware.ts` - Route protection and authentication
- `src/lib/auth-utils.ts` - Authentication utilities (`getAuthUser()`)
- `src/lib/cache.ts` - Redis caching with TTL management
- `src/db/schema.ts` - Database schema with comprehensive foreign keys
- `src/db/index.ts` - Database connection and exports

### API Routes Structure (55+ endpoints)
- `src/app/api/auth/` - Authentication endpoints
- `src/app/api/patients/[id]/` - Individual patient management APIs
- `src/app/api/patients/[id]/reminders/` - Patient reminder management
- `src/app/api/admin/` - Admin panel APIs (users, templates)
- `src/app/api/cms/` - Content management APIs (articles, videos)
- `src/app/api/user/session/` - User session management
- `src/app/api/cron/` - Automated WhatsApp reminder system
- `src/app/api/reminders/scheduled/[id]/` - Scheduled reminder editing
- `src/app/api/debug/` - Development debugging tools (non-production)

### Dashboard Pages (24+ pages)
- `src/app/dashboard/` - Main dashboard interface
- `src/app/dashboard/pasien/` - Patient management pages with detailed views
- `src/app/dashboard/pasien/[id]/` - Individual patient pages (details, health notes, editing)
- `src/app/dashboard/pengingat/` - Reminder management system
- `src/app/dashboard/pengingat/pasien/[id]/` - Patient-specific reminder views (scheduled, completed, needs updates)
- `src/app/dashboard/cms/` - Content management system (articles, videos)
- `src/app/dashboard/admin/` - Admin panel (user management, templates)
- `src/app/content/` - Public content pages (articles/videos)

## 💾 Database Schema & Key Tables

### Core Tables (All with Soft Delete Support)
- `users` - Healthcare volunteers with role-based permissions (SUPERADMIN/ADMIN/MEMBER)
- `patients` - Patient records with verification, health tracking, and soft delete
- `patient_variables` - Custom patient data fields
- `patient_medications` - Patient's prescribed medications with medication references  
- `medications` - Master medication list for standardized drug names
- `medical_records` - Patient medical history and treatment records
- `manual_confirmations` - Patient medication confirmation tracking by volunteers
- `reminder_logs` - WhatsApp reminder delivery status and tracking
- `reminder_schedules` - Scheduled medication reminders
- `health_notes` - Patient health condition tracking
- `verification_logs` - Patient verification activity and status changes
- `whatsapp_templates` - Message templates for automated communications
- `reminder_content_attachments` - Content attachments for reminders (links articles/videos to reminders)
- `cms_articles` & `cms_videos` - Content management system

### Key Database Relationships
- **User Management**: `users.approved_by` → `users.id` (self-reference)
- **Patient Assignment**: `patients.assigned_volunteer_id` → `users.id`
- **Medication Management**: `patient_medications` links `patients` ↔ `medications`
- **Reminder Flow**: `reminder_schedules` → `reminder_logs` → `manual_confirmations`
- **Health Tracking**: `health_notes`, `medical_records` → `patients` & `users`
- **Content Management**: `cms_articles`, `cms_videos`, `whatsapp_templates` → `users`

## 🔧 Code Style & Development Conventions

### TypeScript Standards
- **Strict Mode**: Enabled with proper typing (avoid `any`)
- **Imports**: Use `@/` alias for src/, import order: external → internal → relative
- **Components**: Server components by default, mark client with "use client"
- **Naming**: kebab-case files, PascalCase components, camelCase variables

### Database Operations
- **ORM**: Use Drizzle ORM for all database interactions
- **Soft Delete Pattern**: Use `deletedAt` timestamps instead of hard deletes
- **Foreign Keys**: Comprehensive referential integrity with proper cascade rules
- **Query Pattern**: Always filter `isNull(table.deletedAt)` in queries
- **Indexing**: Comprehensive indexes on `deletedAt` fields and foreign key columns
- **Transactions**: Use for data consistency in complex operations

### Database Connection Strategy
- **Regular Operations**: Use `DATABASE_URL` (pooled via pgBouncer - port 6543)
- **Migrations**: Use `DIRECT_URL` (direct connection - port 5432)
- **Connection Pooling**: Supabase pgBouncer for efficient serverless connections

### API Route Conventions
- **Export Pattern**: Export named functions (GET, POST, etc), return NextResponse
- **Error Handling**: Try-catch blocks with structured error responses in Indonesian
- **Authentication**: Use `getAuthUser()` for API routes (returns null vs redirects)
- **Authorization**: Check role permissions (SUPERADMIN/ADMIN/MEMBER)
- **Caching**: Implement Redis caching for frequently accessed data

### Caching Strategy
- **User Sessions**: 3-minute TTL for fast authentication checks
- **Patient Data**: 15-minute TTL for data consistency
- **Content Pages**: ISR with 1-hour revalidation
- **Cache Invalidation**: On data mutations and updates

## 🏥 Medical System Specific Patterns

### Patient Management
- **Verification System**: WhatsApp-based patient verification with retry logic
- **Health Tracking**: Timestamped health notes and medical records
- **Compliance Monitoring**: Medication adherence calculation and tracking
- **Photo Management**: Vercel Blob storage with proper access controls

### WhatsApp Integration  
- **WhatsApp API**: Fonnte integration for reliable message delivery
- **Automated Reminders**: Cron-based medication reminders with delivery tracking
- **Template Management**: Configurable message templates with soft delete support
- **Timezone Handling**: WIB/UTC+7 for Indonesian healthcare context

### Security & Compliance
- **Data Protection**: Patient data encrypted in transit and at rest
- **Audit Logging**: Comprehensive logging for all patient interactions
- **Role-Based Access**: Approval workflows for volunteer access
- **Data Retention**: Soft delete ensures compliance audit trails are preserved
- **Input Validation**: Sanitization on all endpoints handling patient data

## 📱 Current Feature Status

### Patient Management ✅
- Patient CRUD operations with photo upload
- WhatsApp verification system with retry logic
- Health notes tracking with bulk operations
- Custom patient variables for personalized care
- Compliance rate calculation and monitoring

### Reminder System ✅  
- Automated WhatsApp reminders via cron jobs with debug endpoints
- WhatsApp API integration with delivery tracking (Fonnte)
- **Content Attachments**: Reminders can include article and video content
- **Edit Functionality**: Full editing support for scheduled reminders including content updates
- Delivery status tracking and retry mechanisms
- Schedule management with timezone handling (WIB/UTC+7)
- Comprehensive reminder views: scheduled, completed, needs updates, all reminders

### Content Management System ✅
- Article creation with TinyMCE rich text editor
- Video management with YouTube integration
- Category-based content organization
- Content status workflow (draft/published/archived)
- ISR optimization for fast public content loading

### Admin Panel ✅
- User approval and role management
- System health monitoring dashboard
- Template management for WhatsApp messages
- Comprehensive user activity tracking

## 🚨 Known Issues & Priority Fixes

### Critical Issues
- **Authentication Race Condition**: ✅ **FIXED** - Added `afterSignInUrl="/dashboard"` to SignIn component
  - **Previous Impact**: Users saw "You're already signed in" message on second attempt
  - **Resolution**: Fixed sign-in redirect loop with proper afterSignInUrl configuration

### Code Quality Debt
- Multiple unused imports and variables across API routes
- Some components using 'any' types instead of proper TypeScript interfaces
- ESLint warnings need cleanup
- Empty interfaces in UI components
- Unescaped entities in JSX components

### Performance Considerations  
- Patient compliance calculations run on-demand (could be cached)
- Large patient lists may need pagination optimization
- WhatsApp API rate limiting needs monitoring

### Future Enhancements
- Push notifications for web app (PWA ready)
- Mobile app development (React Native planned)  
- Advanced analytics dashboard for healthcare insights
- Integration with Indonesian healthcare systems (SATUSEHAT)
- **Data Recovery Interface**: UI for recovering soft-deleted records

## 🌍 Deployment Configuration

### Environment Variables Required
```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# WhatsApp API
FONNTE_TOKEN="..."

# Caching
REDIS_URL="redis://..."
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# File Storage
BLOB_READ_WRITE_TOKEN="..."

# Content Management
NEXT_PUBLIC_TINYMCE_API_KEY="..."

# Automation
CRON_SECRET="..."
```

### Production Deployment
- **Platform**: Vercel (recommended) or any Node.js 18+ host
- **Database**: Supabase PostgreSQL with connection pooling (pgBouncer)
  - **Pooled Connection**: Port 6543 for regular app operations
  - **Direct Connection**: Port 5432 for migrations and schema changes
- **Redis**: Upstash Redis (production) or local Redis (development)
- **Build Command**: `bun run build` (includes automatic schema generation)
- **Start Command**: `bun start`
- **Connection Limits**: Optimized for serverless with efficient pooling

## 🎯 Development Best Practices

### Before Making Changes
1. **Read Schema**: Check `src/db/schema.ts` for table relationships
2. **Check Auth**: Verify role permissions for new features  
3. **Test Soft Delete**: Ensure all queries filter `deletedAt` properly
4. **Cache Strategy**: Plan Redis caching for new data access patterns

### When Adding Features
1. **Foreign Keys**: Add proper relationships with cascade rules
2. **Soft Delete**: Include `deletedAt` timestamp for new entities
3. **Indexing**: Add indexes for new query patterns including `deletedAt`
4. **Error Handling**: Return user-friendly messages in Indonesian
5. **Authentication**: Use `getAuthUser()` and check permissions

### Testing & Validation
- **No Test Framework**: Verify functionality manually via UI and API
- **Use Drizzle Studio**: For database inspection and debugging
- **Check Console**: Monitor for TypeScript and ESLint errors
- **Validate Soft Delete**: Ensure deleted records are properly filtered

## 🔐 Security & Compliance

### Data Protection
- Patient data encrypted in transit and at rest
- Role-based access control with approval workflows
- **Comprehensive Soft Delete Pattern**: All major entities support soft delete with `deletedAt` timestamps
- **Referential Integrity**: Full foreign key relationships prevent orphaned data
- Input validation and sanitization on all endpoints
- **Data Retention Compliance**: Soft delete ensures audit trails are preserved

### Medical Compliance Features
- Comprehensive audit logging for all patient interactions
- Medication reminder delivery confirmation tracking
- Health status monitoring with timestamped records
- Emergency contact management for patient safety

## 💡 Development Best Practices

### Code Style
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules  
- Component composition over inheritance
- Server components by default, client components when needed

### Error Handling
- Comprehensive error logging with context
- User-friendly error messages in Indonesian
- Graceful degradation for API failures
- Retry mechanisms for critical operations

## 🎯 Recent Major Updates (January 2025)

### ✅ Database Schema Enhancements  
- **Foreign Key Relationships**: Implemented comprehensive referential integrity across all tables
- **Soft Delete Pattern**: Added `deletedAt` timestamps to all major entities (users, patients, reminders, health_notes, etc.)
- **Connection Pooling**: Migrated to Supabase with optimized pgBouncer configuration
- **Performance Indexes**: Added indexes on `deletedAt` fields and foreign key columns

### ✅ Code Quality Improvements
- Fixed critical TypeScript compilation errors
- Resolved circular dependency issues in schema definitions
- Updated API routes to use soft delete instead of hard delete
- Improved error handling and type safety across the application

### ✅ Authentication System Enhancement
- **FIXED**: Authentication race condition in sign-in flow
- Added proper `afterSignInUrl="/dashboard"` configuration to SignIn component
- Eliminated "You're already signed in" redirect loop issue

### ✅ Codebase Cleanup (January 2025)
- **First Cleanup**: Removed 7 debug/test files and 4 empty directories
- **Recent Major Cleanup**: Removed 12 unused files including TSX components and library utilities
  - Removed unused UI components (cancer-ribbon-background, client-only, file-upload, etc.)
  - Cleaned up unused authentication utilities (admin-auth.ts, api-auth.ts)
  - Removed unused library files (lazy-utils.tsx, storage.ts, empty-module.js)
  - Eliminated unused dashboard components (dashboard-cards.tsx, navigation-card.tsx)
- Fixed broken references and cleaned unused imports throughout codebase
- Maintained zero functionality impact while significantly improving maintainability
- **Current State**: Clean, optimized codebase with 55+ API routes and 45+ components

---

*Built with ❤️ for Indonesian healthcare workers*
*Last Updated: January 2025 - Complete Development Guide with Recent Fixes*