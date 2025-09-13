# 🏥 PRIMA System

**Palliative Remote Integrated Monitoring and Assistance**

A comprehensive medical-grade WhatsApp-based patient management system for Indonesian healthcare volunteers providing cancer patient care and medication compliance monitoring.

## 🎯 Project Status - **Production Ready** ✅

PRIMA is a fully functional healthcare management platform with advanced features including patient verification, health tracking, content management, and automated medication reminders. The system is optimized for Indonesian healthcare workflows with medical-grade reliability.

## ✨ Current Features (All Implemented)

### 🔐 **Authentication & Access Control**

- Role-based permissions (SUPERADMIN/ADMIN/MEMBER)
- Clerk-based OAuth with Gmail integration
- Volunteer approval workflows
- Session management with Redis caching

### 👨‍⚕️ **Patient Management System**

- Complete patient CRUD with photo upload (Minio)
- WhatsApp-based verification system with retry logic
- Health notes tracking with bulk operations
- Custom patient variables for personalized care
- Compliance rate calculation and monitoring
- Medical records management with audit trails

### 📱 **WhatsApp Integration & Reminders**

- WhatsApp Business API integration via Fonnte
- Automated medication reminders via cron jobs with debug monitoring
- **Content-Rich Reminders**: Include educational articles and videos with medication reminders
- **Full Edit Capabilities**: Complete editing support for scheduled reminders including content updates
- Template-based message management
- Delivery status tracking and retry mechanisms
- Timezone optimization (WIB/UTC+7)
- Comprehensive reminder dashboard with multiple views (scheduled, completed, needs updates)

### 📚 **Content Management System**

- Article creation with TinyMCE rich text editor
- Video management with YouTube integration
- Category-based content organization
- Content workflow (draft/published/archived)
- ISR optimization for fast public content loading

### 🛠️ **Admin Panel**

- User approval and role management
- System health monitoring dashboard
- Template management for communications
- Comprehensive activity tracking
- Database management tools

### ⚡ **Performance & Reliability**

- Redis caching (3min sessions, 15min patient data)
- ISR with 1-hour revalidation for content
- Comprehensive database indexing
- Soft delete patterns for data integrity
- Medical-grade error handling

## 🛠️ Tech Stack (Current)

- **Framework**: Next.js 15 + React 19 + TypeScript 5
- **Authentication**: Clerk with Gmail OAuth and role-based access control
- **Database**: PostgreSQL (Railway) + Drizzle ORM with comprehensive soft delete patterns
- **Caching**: Redis with ioredis client (3min sessions, 15min patient data)
- **UI**: Tailwind CSS 4 + shadcn/ui + Lucide React icons
- **WhatsApp**: Fonnte WhatsApp Business API
- **File Storage**: Minio for patient photos and content
- **Rich Text**: TinyMCE with image upload support
- **Deployment**: Railway with GitHub integration
- **Package Manager**: Bun

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Bun package manager
- PostgreSQL database (Railway)
- Redis instance (Railway)
- Minio Bucket and Minio Console
- Fonnte WhatsApp Business API account
- Clerk authentication setup
- TinyMCE API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd prima

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in your environment variables

# Set up the database
bun run db:generate        # Generate Drizzle schema
bun run db:migrate         # Run migrations
bun run db:push            # Push schema changes

# Seed initial data
bun run seed:templates     # Seed WhatsApp message templates

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Environment Variables

Create a `.env.local` file with the required environment variables. See `.env.example` for the complete list of required variables:

- **Database**: Railway PostgreSQL connection string
- **Authentication**: Clerk OAuth configuration
- **WhatsApp API**: Fonnte API token for messaging
- **Caching**: Railway Redis configuration
- **File Storage**: Minio for patient photos and content
- **Content Management**: TinyMCE API key for rich text editing
- **Automation**: Cron secret for automated reminder system

> **Note**: Never commit actual environment variables to version control. Use `.env.local` for development and configure environment variables in your deployment platform.

## 📱 User Roles & Permissions

### SUPERADMIN

- Complete system administration
- User role management and permissions
- System configuration and settings
- Access to all data and system functions

### ADMIN

- User management (approve/reject/activate volunteers)
- Access to all patient data across the system
- Content management system administration
- Template management for communications
- System monitoring and reporting

### MEMBER (Healthcare Volunteer)

- Patient management for assigned cases
- Medication reminder scheduling and management
- Health notes tracking and medical records
- Compliance monitoring and reporting
- Content access and patient communication
- Requires ADMIN approval to access system

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/                    # API endpoints
│   │   ├── admin/             # Admin management APIs
│   │   ├── patients/          # Patient management APIs
│   │   ├── cms/               # Content management APIs
│   │   ├── cron/              # Automated reminder system
│   │   ├── user/session/      # User session management
│   │   └── webhooks/          # Clerk user sync
│   ├── dashboard/             # Main application interface
│   │   ├── admin/             # Admin panel with user management
│   │   ├── pasien/            # Patient management system
│   │   ├── pengingat/         # Reminder scheduling system
│   │   └── cms/               # Content management system
│   ├── content/               # Public content pages (articles/videos)
│   └── (auth pages)
├── components/
│   ├── admin/                 # Admin-specific components
│   ├── patients/              # Patient management components
│   └── ui/                    # Reusable shadcn/ui components
├── lib/
│   ├── auth-utils.ts          # Authentication utilities (getAuthUser)
│   ├── cache.ts               # Redis caching with TTL management
│   └── (other utilities)
├── db/
│   ├── schema.ts              # Drizzle ORM schema with foreign keys
│   └── index.ts               # Database connection and exports
└── middleware.ts              # Route protection and authentication
```

## 🔄 Development Commands

```bash
# Core Development
bun run dev                    # Start development server
bun run build                  # Production build (includes schema generation)
bun run lint                   # ESLint check

# Database Management (Drizzle ORM)
bun run db:generate            # Generate Drizzle schema
bun run db:migrate             # Run migrations
bun run db:push                # Push schema changes
bun run db:studio              # Open Drizzle Studio GUI

# Content Management
bun run seed:templates         # Seed WhatsApp message templates

# Production
bun start                      # Start production server
```

## 🚀 Deployment

### Recommended: Railway Deployment

The application is optimized for Railway with GitHub integration:

1. Connect GitHub repository to Railway
2. Configure Railway PostgreSQL and Redis services
3. Set up Minio Bucket for file storage
4. Configure environment variables in Railway dashboard
5. Automatic deployments on git push

### Database Configuration

- **Production**: Railway PostgreSQL
  - **Connection**: Direct PostgreSQL connection (`DATABASE_URL`)
- **Caching**: Railway Redis
  - **Connection**: Redis URL with authentication (`REDIS_URL`)
- **File Storage**: Minio Bucket with Minio Console

### Build Configuration

- **Build Command**: `bun run build` (includes schema generation)
- **Start Command**: `bun start`
- **Node.js**: 18+ runtime required
- **Environment**: All variables from Railway environment must be configured

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Primary Developer** - Initial work and system architecture
- **Healthcare Partner** - Medical consultation and requirements

## 🎯 Recent Major Updates (January 2025)

### ✅ **Production-Ready Milestone Achieved**

- **Database Schema**: Comprehensive foreign key relationships and soft delete patterns
- **Database Cleanup**: Removed 8 unused legacy tables, maintaining 15 optimized tables
- **Code Quality**: Removed 12 unused files, cleaned codebase with 55+ API routes and 45+ components
- **Authentication Fix**: Resolved sign-in race condition with proper redirect configuration
- **Reminder Enhancement**: Added content attachment support and full editing capabilities
- **Performance Optimization**: Redis caching, connection pooling, and ISR implementation
- **Feature Complete**: All core healthcare management features fully implemented and optimized

### 🚀 **System Highlights**

- **Medical-Grade Reliability**: Comprehensive audit trails and data integrity
- **Scalable Architecture**: Optimized for Indonesian healthcare volunteer networks
- **Enhanced WhatsApp Integration**: Content-rich reminders with educational materials
- **Mobile-First Design**: Optimized for healthcare workers using mobile devices
- **Clean Codebase**: Maintained, optimized, and production-ready with comprehensive documentation

## 🙏 Acknowledgments

- Indonesian healthcare volunteers for their dedication and feedback
- Fonnte for reliable WhatsApp Business API service
- Clerk for seamless authentication and user management
- Railway for comprehensive full-stack deployment platform
- Minio for S3-compatible object storage
- shadcn/ui for beautiful, accessible React components

## 📚 Documentation

- **`AGENTS.md`** - Complete development guide for AI coding agents
- **`README.md`** - This project overview and setup guide
- **Database Schema** - Available in `src/db/schema.ts` with comprehensive relationships

---

_Built with ❤️ for Indonesian healthcare workers_
_Last Updated: January 2025 - Production Ready Release_
