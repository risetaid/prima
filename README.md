# PRIMA - Patient Reminder and Information Management Application

A comprehensive medical patient management system designed to streamline healthcare coordination through automated reminders, educational content management, and WhatsApp integration.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)

## 🌟 Features

### Patient Management

- Comprehensive patient records with medical history
- Indonesian phone number validation and formatting
- WhatsApp verification system
- Patient activity tracking and compliance monitoring

### Automated Reminders

- Schedule one-time or recurring WhatsApp reminders
- Support for daily, weekly, and monthly recurrence
- Link educational content to reminders
- Real-time delivery status tracking
- Confirmation tracking system

### Content Management System

- Create and manage health education articles
- YouTube video integration with auto-fetching
- Rich text editing with Quill editor
- Category and tag organization
- Draft/publish workflow

### WhatsApp Integration

- Two-way communication with patients
- Webhook support for incoming messages
- Context-aware conversation handling
- Keyword-based auto-responses
- Message delivery and read receipts

### Admin Features

- User management with role-based access control
- Message template management
- System analytics and reporting
- Developer contact forms
- Verification analytics

## 🚀 Quick Start

### Prerequisites

- **Bun** v1.0+ (required)
- **PostgreSQL** database (Neon recommended)
- **Clerk** account for authentication
- **Fonnte** account for WhatsApp integration

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/prima.git
   cd prima
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables (see [Configuration](#configuration))

4. **Set up the database**

   ```bash
   bunx drizzle-kit push
   ```

5. **Run the development server**

   ```bash
   bun run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Fonnte (WhatsApp API)
FONNTE_API_KEY="your-api-key"
FONNTE_DEVICE="your-device-id"
FONNTE_WEBHOOK_TOKEN="your-webhook-token"

# YouTube Data API
YOUTUBE_API_KEY="your-api-key"

# Application
NEXT_PUBLIC_VERCEL_URL="your-domain.com"
NODE_ENV="development"
```

## 🏗️ Project Structure

```
prima/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (shell)/     # Authenticated pages
│   │   ├── api/         # API routes
│   │   └── content/     # Public content pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and helpers
│   ├── services/        # Business logic layer
│   ├── db/              # Database schema and config
│   └── middleware.ts    # Next.js middleware
├── tests/               # Test files
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── public/              # Static assets
```

## 📚 Documentation

- **[Developer Onboarding](./docs/DEVELOPER_ONBOARDING.md)** - Get started as a new developer
- **[API Usage Guide](./docs/api/API_USAGE_GUIDE.md)** - Complete API documentation
- **[OpenAPI Specification](./docs/api/openapi.yaml)** - API schema definition
- **[Testing Guide](./TESTING_SETUP.md)** - How to write and run tests
- **[API Analysis](./API_ANALYSIS_PLAN.md)** - Detailed system analysis

## 🧪 Testing

### Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Run in watch mode
bun test --watch

# Run specific test file
bun test tests/lib/api-client.test.ts
```

### Test Coverage

Current test coverage:

- **API Client**: 67% statement coverage, 68% branch coverage
- **Error Handler**: 69% statement coverage, 81% branch coverage
- **API Schemas**: 99% statement coverage, 75% branch coverage

## 🛠️ Tech Stack

### Core

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript

### Database

- **Neon PostgreSQL** - Serverless PostgreSQL
- **Drizzle ORM** - Type-safe database toolkit

### Authentication

- **Clerk** - Complete auth solution

### UI

- **Tailwind CSS** - Utility-first CSS
- **Shadcn/ui** - React component library
- **Radix UI** - Headless UI primitives

### Validation & Testing

- **Zod** - Schema validation
- **Vitest** - Unit testing framework

## 📊 Key Metrics

- **59 passing tests** across 3 test suites
- **70+ validation schemas** for API endpoints
- **25+ API endpoints** with comprehensive error handling
- **Type-safe** throughout with TypeScript strict mode

## 🔐 Security

- Role-based access control (ADMIN, RELAWAN)
- Webhook signature verification
- Rate limiting on sensitive endpoints
- Input validation with Zod schemas
- SQL injection protection via Drizzle ORM
- XSS protection built into Next.js

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy!

### Manual Deployment

```bash
# Build the application
bun run build

# Start production server
bun start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `chore:` Build/tooling changes

## 📝 Scripts

```bash
# Development
bun dev                  # Start dev server
bun build                # Build for production
bun start                # Start production server

# Testing
bun test                 # Run tests
bun run test:run         # Run tests once
bun run test:coverage    # Run with coverage

# Database
bunx drizzle-kit push    # Push schema to database
bunx drizzle-kit studio  # Open Drizzle Studio

# Linting & Type Checking
bun run lint             # Run ESLint
bunx tsc --noEmit        # Type check
```

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 👥 Team

Developed and maintained by the PRIMA development team.

## 📞 Support

For questions or issues:

1. Check the [documentation](./docs/)
2. Review [API Analysis Plan](./API_ANALYSIS_PLAN.md)
3. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: October 8, 2025  
**Status**: ✅ Active Development
