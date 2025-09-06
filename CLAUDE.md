# 🏥 PRIMA System - Development Guide

**Palliative Remote Integrated Monitoring and Assistance**

A medical-grade WhatsApp-based patient management system for Indonesian healthcare volunteers providing cancer patient care and medication compliance monitoring.

## 📋 Current Project Status

### ✅ Completed Features
- **Authentication System**: Clerk-based auth with role-based access control (SUPERADMIN/ADMIN/MEMBER)
- **Patient Management**: Full CRUD with photo upload, verification system, health notes
- **WhatsApp Integration**: Automated medication reminders via Twilio/Fonnte APIs
- **CMS System**: Article and video content management with TinyMCE rich text editor
- **Performance Optimization**: Redis caching, ISR (Incremental Static Regeneration) for content
- **UI/UX**: Modern responsive design with mobile-first approach using shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM, comprehensive indexing for performance

### 🔧 Tech Stack (Current)
- **Framework**: Next.js 15 + React 19 + TypeScript 5
- **Authentication**: Clerk with Gmail OAuth
- **Database**: PostgreSQL + Drizzle ORM (migrated from Prisma)
- **Caching**: Redis with ioredis client
- **UI**: Tailwind CSS 4 + shadcn/ui + Lucide React icons
- **WhatsApp**: Twilio WhatsApp Business API + Fonnte backup
- **File Upload**: Vercel Blob storage
- **Rich Text**: TinyMCE with image upload support
- **Package Manager**: Bun

## 🏗️ Architecture Overview

### Database Schema Key Tables
- `users` - Healthcare volunteers with role-based permissions
- `patients` - Patient records with verification and health tracking
- `patient_variables` - Custom patient data fields
- `manual_confirmations` - Patient medication confirmation tracking
- `reminder_logs` - WhatsApp reminder delivery status
- `reminder_schedules` - Scheduled medication reminders
- `cms_articles` & `cms_videos` - Content management system
- `health_notes` - Patient health condition tracking

### Performance Optimizations Implemented
- **Redis Caching**: 3-minute TTL for user sessions, 15-minute for patient data
- **ISR**: 1-hour revalidation for content pages
- **Database Indexing**: Comprehensive indexes on frequently queried columns
- **Query Optimization**: Drizzle ORM with optimized joins and filtering

### Authentication Flow
- Clerk handles OAuth and JWT tokens
- Custom `getAuthUser()` for API routes (returns null vs throwing redirects)
- Middleware protection for dashboard and API routes
- Role-based access control with approval system

## 🛠️ Development Commands

```bash
# Development
bun run dev                    # Start development server
bun run build                  # Production build
bun run lint                   # ESLint check

# Database
bun run db:generate            # Generate Drizzle schema
bun run db:migrate             # Run migrations  
bun run db:push                # Push schema changes
bun run db:studio              # Open Drizzle Studio

# Content Management
bun run seed:templates         # Seed message templates
```

## 📂 Key File Locations

### Core System Files
- `src/middleware.ts` - Route protection and authentication
- `src/lib/auth-utils.ts` - Authentication utilities and user management
- `src/lib/cache.ts` - Redis caching with TTL management
- `src/db/schema.ts` - Database schema with Drizzle ORM
- `src/db/index.ts` - Database connection and exports

### API Routes Structure
- `src/app/api/auth/` - Authentication endpoints
- `src/app/api/patients/` - Patient management APIs
- `src/app/api/admin/` - Admin panel APIs  
- `src/app/api/cms/` - Content management APIs
- `src/app/api/user/session/` - User session management
- `src/app/api/cron/` - Automated reminder system

### Dashboard Pages
- `src/app/dashboard/` - Main dashboard interface
- `src/app/dashboard/pasien/` - Patient management pages
- `src/app/dashboard/pengingat/` - Reminder management
- `src/app/dashboard/cms/` - Content management system
- `src/app/content/` - Public content pages (articles/videos)

## 🔐 Security & Compliance

### Data Protection
- Patient data encrypted in transit and at rest
- Role-based access control with approval workflows
- Soft delete pattern for data retention compliance
- Input validation and sanitization on all endpoints

### Medical Compliance Features
- Comprehensive audit logging for all patient interactions
- Medication reminder delivery confirmation tracking
- Health status monitoring with timestamped records
- Emergency contact management for patient safety

## 🚀 Deployment Configuration

### Environment Variables Required
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication  
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# WhatsApp APIs
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="whatsapp:+..."
FONNTE_TOKEN="..." # Backup provider

# Caching
REDIS_URL="redis://..." # For production
REDIS_HOST="localhost" # For development
REDIS_PORT="6379"
REDIS_PASSWORD=""

# File Storage
BLOB_READ_WRITE_TOKEN="..." # Vercel Blob

# TinyMCE
NEXT_PUBLIC_TINYMCE_API_KEY="..."
```

### Production Deployment
- **Platform**: Vercel (recommended) or any Node.js 18+ host
- **Database**: Neon PostgreSQL (production) or local PostgreSQL (development)
- **Redis**: Upstash Redis (production) or local Redis (development)
- **Build Command**: `bun run build`
- **Start Command**: `bun start`

## 📱 Current Feature Status

### Patient Management ✅
- Patient CRUD operations with photo upload
- WhatsApp verification system with retry logic
- Health notes tracking with bulk operations
- Custom patient variables for personalized care
- Compliance rate calculation and monitoring

### Reminder System ✅  
- Automated WhatsApp reminders via cron jobs
- Multi-provider support (Twilio + Fonnte fallback)
- Delivery status tracking and retry mechanisms
- Schedule management with timezone handling (WIB/UTC+7)

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

## 🔄 Known Issues & Technical Debt

### Performance Considerations
- Patient compliance calculations run on-demand (could be cached)
- Large patient lists may need pagination optimization
- WhatsApp API rate limiting needs monitoring

### Future Enhancements
- Push notifications for web app (PWA ready)
- Mobile app development (React Native planned)
- Advanced analytics dashboard for healthcare insights
- Integration with Indonesian healthcare systems (SATUSEHAT)

## 💡 Development Best Practices

### Code Style
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules  
- Component composition over inheritance
- Server components by default, client components when needed

### Database Operations
- Use Drizzle ORM for all database interactions
- Implement proper indexing for query performance
- Use transactions for data consistency
- Soft delete pattern for audit compliance

### Caching Strategy
- User sessions: 3-minute TTL for fast authentication
- Patient data: 15-minute TTL for data consistency
- Content pages: ISR with 1-hour revalidation
- Cache invalidation on data mutations

### Error Handling
- Comprehensive error logging with context
- User-friendly error messages in Indonesian
- Graceful degradation for API failures
- Retry mechanisms for critical operations

---

*Built with ❤️ for Indonesian healthcare workers*

*Last Updated: January 2025*