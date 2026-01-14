# Project Overview

## PRIMA - Patient Reminder and Information Management Application

PRIMA is a healthcare platform designed to help volunteers manage patient care through automated WhatsApp reminders, patient tracking, and educational content delivery.

## Purpose

- **Patient Management**: Track patient information, diagnosis details, and assigned volunteers
- **Automated Reminders**: Schedule and send medication, follow-up, and general reminders via WhatsApp
- **Patient Verification**: Automated WhatsApp-based patient verification system
- **Volunteer Coordination**: Track volunteer visits and manual confirmations
- **Educational Content**: CMS for articles and videos to support patient education
- **AI-Powered Conversations**: Claude AI integration for intelligent patient interactions

## Tech Stack Summary

| Category  | Technology                         |
| --------- | ---------------------------------- |
| Runtime   | pnpm                               |
| Framework | Next.js 15.4.10                    |
| Language  | TypeScript 5.x                     |
| Database  | PostgreSQL + Drizzle ORM           |
| Auth      | Clerk 6.31.6                       |
| AI        | Anthropic SDK 0.63.0               |
| WhatsApp  | GOWA (go-whatsapp-web-multidevice) |
| Caching   | Redis (ioredis)                    |
| Storage   | MinIO (S3-compatible)              |
| Styling   | Tailwind CSS 4.x                   |
| Testing   | Vitest 3.2.4                       |

## Architecture Type

**Monolithic Next.js Application** with layered architecture:

- API Layer (Next.js Route Handlers)
- Service Layer (Domain Services)
- Data Layer (Drizzle ORM)

## Repository Structure

```
prima/
├── src/
│   ├── app/           # Next.js pages and API routes
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── db/            # Database schemas
│   ├── lib/           # Utilities
│   └── types/         # TypeScript types
├── tests/             # Unit tests
├── scripts/           # Utility scripts
├── docs/              # Documentation
└── drizzle/           # Database migrations
```

## Key Features

### 1. Patient Management

- Patient CRUD operations
- Cancer stage tracking
- Volunteer assignment
- Verification status tracking

### 2. WhatsApp Reminders

- Scheduled reminders with recurrence
- Instant send capability
- Template-based messaging
- Delivery tracking and confirmation

### 3. AI Conversations

- Intent detection
- Context-aware responses
- Conversation state tracking
- Volunteer escalation

### 4. Content Management

- Article management (CMS)
- Video management
- Category and tag organization
- SEO metadata support

### 5. Volunteer Tracking

- Manual visit confirmations
- Patient condition reporting
- Follow-up management
- Notification system

## Integrations

| Service        | Purpose                            |
| -------------- | ---------------------------------- |
| **Clerk**      | User authentication and management |
| **GOWA**       | WhatsApp messaging (self-hosted)   |
| **Anthropic**  | AI-powered conversations           |
| **Redis**      | Caching and rate limiting          |
| **MinIO**      | Object storage for media           |
| **PostgreSQL** | Primary database                   |

## Documentation

| Document                                        | Description                    |
| ----------------------------------------------- | ------------------------------ |
| [Architecture](./architecture.md)               | System architecture and design |
| [Technology Stack](./technology-stack.md)       | Detailed technology breakdown  |
| [API Contracts](./api-contracts.md)             | API endpoint documentation     |
| [Data Models](./data-models.md)                 | Database schema reference      |
| [Component Inventory](./component-inventory.md) | React component catalog        |
| [Development Guide](./development-guide.md)     | Setup and coding guidelines    |
| [Source Tree](./source-tree-analysis.md)        | Directory structure reference  |

## Quick Links

- **Repository**: [GitHub URL]
- **Documentation**: `/docs/` folder
- **CLAUDE.md**: AI assistant instructions
- **ADRs**: `/docs/architecture/adr/` - Architecture decision records

## Getting Started

See [Development Guide](./development-guide.md) for:

1. Installation steps
2. Environment configuration
3. Development commands
4. Code conventions
5. Testing guidelines
