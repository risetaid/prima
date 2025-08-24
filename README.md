# 🏥 PRIMA System

**Palliative Remote Integrated Monitoring and Assistance**

A WhatsApp-based medication reminder system designed for cancer patients in palliative care, built for Indonesian healthcare volunteers.

## 🎯 Overview

PRIMA is a medical-grade automation system that helps healthcare volunteers manage medication compliance for cancer patients through automated WhatsApp reminders. The system features role-based access control, patient photo management, and real-time compliance tracking.

## ✨ Key Features

- 🔐 **Admin Approval System** - Role-based access control with ADMIN/MEMBER permissions
- 📱 **WhatsApp Integration** - Automated medication reminders via Twilio API
- 👨‍⚕️ **Patient Management** - Complete CRUD operations with photo upload support
- ⏰ **Smart Scheduling** - Multi-reminder creation with timezone optimization (WIB/UTC+7)
- 📊 **Compliance Tracking** - Real-time medication adherence monitoring
- 🎨 **Mobile-First Design** - Optimized for healthcare workers on mobile devices
- 🔄 **Cron Automation** - Medical-grade reliability with 2-minute intervals

## 🛠️ Tech Stack

- **Framework**: Next.js 15 + React 19 + TypeScript
- **Authentication**: Clerk (Gmail OAuth) with role-based access
- **Database**: Neon PostgreSQL + Prisma ORM
- **WhatsApp API**: Twilio WhatsApp Business API
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel
- **Package Manager**: Bun

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Bun package manager
- PostgreSQL database (Neon recommended)
- Twilio WhatsApp Business account
- Clerk authentication setup

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd prima-system

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in your environment variables

# Set up the database
bunx prisma migrate dev
bunx prisma generate

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="your-neon-postgresql-url"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Twilio WhatsApp
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Optional: Backup WhatsApp Provider
FONNTE_TOKEN="your-fonnte-token"
```

## 📱 User Roles

### ADMIN
- Complete user management (approve/reject/activate users)
- Access to all patient data across volunteers
- System administration and configuration
- First registered user automatically becomes ADMIN

### MEMBER (Volunteer)
- Patient management for assigned cases
- Medication reminder scheduling
- Compliance tracking and reporting
- Requires ADMIN approval to access system

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/                    # API endpoints
│   │   ├── admin/             # Admin management APIs
│   │   ├── patients/          # Patient management APIs
│   │   ├── cron/              # Automated reminder system
│   │   └── webhooks/          # Clerk user sync
│   ├── dashboard/             # Main application interface
│   │   ├── admin/             # Admin panel
│   │   ├── pasien/            # Patient management
│   │   └── pengingat/         # Reminder system
│   └── (auth pages)
├── components/
│   ├── admin/                 # Admin-specific components
│   └── ui/                    # Reusable UI components
├── lib/
│   ├── auth-utils.ts          # Authentication utilities
│   └── (other utilities)
prisma/
└── schema.prisma              # Database schema
```

## 🔄 Development Commands

```bash
# Development
bun run dev                    # Start development server
bun run build                  # Build for production
bun run lint                   # Run ESLint

# Database
bunx prisma migrate dev        # Run database migrations
bunx prisma generate           # Generate Prisma client
bunx prisma studio             # Open database GUI

# Testing
bun run test                   # Run tests (if configured)
```

## 🚀 Deployment

The application is optimized for Vercel deployment:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

For other platforms, ensure:
- Node.js 18+ runtime
- PostgreSQL database access
- Environment variables configured
- Build command: `bun run build`
- Start command: `bun start`

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

## 🙏 Acknowledgments

- Indonesian healthcare volunteers for their dedication
- Twilio for reliable WhatsApp Business API
- Clerk for seamless authentication
- Vercel for excellent deployment platform

---

*Built with ❤️ for Indonesian healthcare workers*