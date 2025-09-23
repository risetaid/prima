# PRIMA - Palliative Remote Integrated Monitoring and Assistance 🚀

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-orange?logo=typescript)](https://typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Fast-blue?logo=bun)](https://bun.sh/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-green?logo=postgresql)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)
[![Deployment](https://img.shields.io/badge/Deployed-Railway-brightgreen?logo=railway)](https://railway.app/)

A production-ready WhatsApp-based patient management system for Indonesian healthcare volunteers, providing comprehensive cancer patient care, medication compliance monitoring, and content management capabilities. 💚

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Timezone Handling](#-timezone-handling)
- [WhatsApp Integration](#-whatsapp-integration)
- [Performance Optimizations](#-performance-optimizations)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Cron Jobs](#-cron-jobs)
- [License](#-license)
- [Contributing](#-contributing)
- [Support](#-support)
- [Acknowledgments](#-acknowledgments)

## 🏥 Overview
PRIMA is a full-stack healthcare application designed to support palliative care volunteers in managing cancer patients through automated WhatsApp reminders, compliance tracking, and educational content delivery. The system operates in Indonesian healthcare settings with WIB (UTC+7) timezone support.

## ✨ Key Features

### Patient Management
- **Comprehensive patient profiles** with medical history, cancer staging, and contact information
- **Photo upload capabilities** for patient identification
- **Health notes tracking** for monitoring patient conditions
- **Volunteer assignment system** for care coordination
- **Soft delete architecture** preserving data integrity

### WhatsApp Integration
- **Automated medication reminders** via Fonnte WhatsApp Business API
- **Text-based confirmation system** for simple and reliable patient responses
- **Response-driven workflows** with 15-minute follow-up messages
- **Patient verification system** with retry logic
- **Template-based messaging** for consistent communication
- **Conversation state management** for context-aware interactions

### Reminder System
- **Smart scheduling** with customizable frequencies (daily, weekly, monthly, custom)
- **Content attachments** linking articles and videos to reminders
- **Manual confirmation options** for volunteer intervention
- **Compliance tracking** with detailed statistics
- **Timezone-aware scheduling** (WIB/UTC+7)

### Content Management System (CMS)
- **Article management** with rich text editing (QuillJS)
- **Educational video library** with YouTube/Vimeo integration
- **Category-based organization** (general, nutrition, emotional, exercise, medication, spiritual, palliative care)
- **SEO optimization** with meta tags and slugs
- **Draft/published workflow** with soft delete support

### Admin Features
- **Role-based access control** (SUPERADMIN, ADMIN, RELAWAN)
- **User approval workflow** with Gmail OAuth via Clerk
- **Audit trails** for sensitive operations
- **WhatsApp template management**
- **System monitoring dashboard**

## 🛠 Tech Stack

### Frontend
- **Framework:** [Next.js 15.4.6](https://nextjs.org/) with [React 19](https://reactjs.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components
- **Icons:** [Lucide React](https://lucide.dev/)
- **Forms:** [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Rich Text:** [QuillJS](https://quilljs.com/) editor
- **Notifications:** [Sonner](https://sonner.mskhan.ca/) toast library

### Backend
- **Runtime:** [Bun](https://bun.sh/) (fast JavaScript runtime)
- **API:** Next.js App Router with REST endpoints
- **Database:** [PostgreSQL](https://postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Caching:** [Redis](https://redis.io/) with [ioredis](https://github.com/redis/ioredis)
- **Authentication:** [Clerk](https://clerk.com/) with Gmail OAuth
- **File Storage:** [MinIO](https://min.io/) S3-compatible storage
- **WhatsApp:** [Fonnte Business API](https://fonnte.com/)

### Infrastructure
- **Deployment:** [Railway](https://railway.app/) platform
- **Database:** Railway PostgreSQL
- **Cache:** Railway Redis
- **Storage:** Railway MinIO
- **Monitoring:** Built-in logging and performance tracking

## 📋 Prerequisites
- Node.js 18+ or [Bun](https://bun.sh/) runtime
- PostgreSQL database
- Redis server
- MinIO or S3-compatible storage
- [Fonnte](https://fonnte.com/) WhatsApp Business API account
- [Clerk](https://clerk.com/) authentication account

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/daviyusaku-13/prima.git
   cd prima
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://..."

   # Redis
   REDIS_URL="redis://..."

   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
   CLERK_SECRET_KEY="sk_..."
   CLERK_WEBHOOK_SECRET="whsec_..."

   # WhatsApp (Fonnte)
   FONNTE_TOKEN="your_fonnte_token"

   # File Storage (MinIO)
   MINIO_ROOT_USER="..."
   MINIO_ROOT_PASSWORD="..."
   MINIO_PUBLIC_ENDPOINT="https://..."
   MINIO_PRIVATE_ENDPOINT="http://..."
   MINIO_BUCKET_NAME="..."

   # Rich Text Editor
   NEXT_PUBLIC_TINYMCE_API_KEY="..."

   # Cron Security
   CRON_SECRET="..."

   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Run database migrations**
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

5. **Set up first admin user**
   ```bash
   bun run setup-first-user
   ```

6. **Start development server**
   ```bash
   bun run dev
   ```

## 📖 Development

### Available Scripts
```bash
# Development
bun run dev              # Start dev server with Turbo
bun run build            # Production build
bun run start            # Start production server
bun run lint             # Run ESLint

# Database
bun run db:generate      # Generate Drizzle schema
bun run db:migrate       # Run migrations
bun run db:push          # Push schema changes
bun run db:studio        # Open Drizzle Studio GUI

# Admin Scripts
bun run nuke-recreate-db # Reset database (caution!)
bun run setup-first-user # Create initial admin
bun run start-message-worker # Start WhatsApp message worker
```

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API endpoints
│   │   ├── admin/         # Admin management
│   │   ├── patients/      # Patient CRUD
│   │   ├── cms/           # Content management
│   │   ├── cron/          # Scheduled tasks
│   │   └── webhooks/      # External integrations
│   ├── (dashboard)/       # Protected pages
│   └── content/           # Public content
├── components/            # React components
│   ├── admin/             # Admin components
│   ├── patient/           # Patient management
│   ├── reminder/          # Reminder system
│   └── ui/                # Reusable UI
├── services/              # Business logic
│   ├── patient/           # Patient services
│   ├── reminder/          # Reminder services
│   └── whatsapp/          # WhatsApp integration
├── lib/                   # Utilities
│   ├── auth-utils.ts      # Authentication
│   ├── cache.ts           # Redis caching
│   ├── timezone.ts        # WIB timezone
│   └── validations.ts     # Zod schemas
└── db/                    # Database
    ├── schema.ts          # Drizzle schema
    └── index.ts           # DB connection
```

## 🗄️ Database Schema
The system uses 16 PostgreSQL tables with comprehensive relationships:

### Core Tables
- `users` - System users with roles and approval status
- `patients` - Patient records with medical information
- `reminder_schedules` - Scheduled medication reminders
- `reminder_logs` - Reminder delivery history

### Supporting Tables
- `health_notes` - Patient condition tracking
- `medical_records` - Medical history and treatments
- `patient_variables` - Custom patient data
- `conversation_states` - WhatsApp conversation context
- `conversation_messages` - Conversation message history
- `verification_logs` - Patient verification attempts
- `manual_confirmations` - Volunteer confirmations
- `whatsapp_templates` - Message templates
- `reminder_content_attachments` - Content links

- `cms_articles` - Educational articles
- `cms_videos` - Educational videos

All tables implement soft delete via `deletedAt` timestamp for data preservation.

## 🔒 Security
- **Authentication:** OAuth 2.0 via Clerk with Gmail integration
- **Authorization:** Role-based access control (RBAC)
- **Data Protection:** All sensitive data encrypted in transit and at rest
- **Input Validation:** Zod schemas on all API endpoints
- **Rate Limiting:** Built-in request throttling
- **Audit Logging:** Comprehensive activity tracking
- **Environment Variables:** Secrets never committed to repository

## 🌍 Timezone Handling
The system operates in WIB (Western Indonesia Time, UTC+7):
- All reminder scheduling uses `src/lib/timezone.ts` utilities
- Database stores UTC timestamps
- UI displays WIB time for Indonesian users
- Cron jobs scheduled in WIB timezone

## 🤝 WhatsApp Integration

### Message Types
- **Text messages** for notifications and confirmations
- **Media messages** with images or documents

### Text-Based Confirmation System
The system uses simple text message patterns for patient responses, supporting various Indonesian language responses for medication compliance tracking.

### Response Flow
1. Initial reminder sent at scheduled time
2. Patient responds with simple text message
3. System processes text response and updates status
4. Follow-up message sent after 15 minutes if needed
5. Volunteer notified if assistance required

## 📊 Performance Optimizations
- **Redis Caching:** 3-minute user sessions, 15-minute patient data
- **Database Indexing:** Optimized queries with composite indexes
- **Connection Pooling:** Efficient database connections
- **Code Splitting:** Optimized bundle sizes for faster loading
- **ISR (Incremental Static Regeneration):** 1-hour revalidation for public content
- **Turbopack:** Faster development builds

## 🚢 Deployment

### Production Build
```bash
bun run build
bun run start
```

### Environment Setup
1. Configure all environment variables in production
2. Run database migrations
3. Set up cron jobs for automated reminders
4. Configure webhook endpoints for Clerk and Fonnte
5. Enable Redis for session management

### Railway Deployment
The application is optimized for Railway platform with:
- Automatic deployments from GitHub
- Built-in PostgreSQL, Redis, and MinIO services
- Environment variable management
- Custom domain support

## 📝 API Documentation

### Patient Endpoints
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/[id]` - Get patient details
- `PUT /api/patients/[id]` - Update patient
- `DELETE /api/patients/[id]` - Soft delete patient

### Reminder Endpoints
- `GET /api/patients/[id]/reminders` - Get patient reminders
- `POST /api/patients/[id]/reminders` - Create reminder
- `POST /api/reminders/instant-send-all` - Send immediate reminders
- `PUT /api/reminders/scheduled/[id]` - Update reminder

### CMS Endpoints
- `GET /api/cms/articles` - List articles
- `POST /api/cms/articles` - Create article
- `GET /api/cms/videos` - List videos
- `POST /api/cms/videos` - Create video

### Webhook Endpoints
- `POST /api/webhooks/clerk` - User synchronization
- `POST /api/webhooks/fonnte/incoming` - WhatsApp messages
- `POST /api/webhooks/fonnte/message-status` - Delivery status

## 🤖 Cron Jobs
Automated tasks run via `/api/cron`:
- **Medication Reminders:** Every 30 minutes (WIB timezone)
- **Follow-up Messages:** 15 minutes after initial reminder
- **Compliance Calculation:** Daily at midnight WIB
- **Inactive Patient Check:** Weekly

## 📄 License
This project is proprietary software for healthcare use in Indonesia.

## 👥 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention
Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 🆘 Support
For issues and feature requests, please use the GitHub issue tracker.

## 🙏 Acknowledgments
- Built for Indonesian healthcare volunteers
- Powered by open-source technologies
- Designed with patient care in mind

---
**PRIMA** - Empowering palliative care through technology 💚