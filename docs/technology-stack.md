# Technology Stack

## Overview

PRIMA is built with a modern, production-ready technology stack optimized for healthcare application requirements including data security, reliability, and scalability.

## Core Technologies

| Category             | Technology      | Version | Purpose                                |
| -------------------- | --------------- | ------- | -------------------------------------- |
| **Runtime**          | pnpm            | 1.x     | JavaScript runtime and package manager |
| **Framework**        | Next.js         | 15.4.10 | React framework with App Router        |
| **Language**         | TypeScript      | 5.x     | Type-safe JavaScript                   |
| **React**            | React           | 19.1.1  | UI library                             |
| **Styling**          | Tailwind CSS    | 4.x     | Utility-first CSS framework            |
| **UI Components**    | Radix UI        | Various | Accessible component primitives        |
| **State Management** | React Hook Form | 7.62.0  | Form state management                  |
| **Validation**       | Zod             | 4.0.17  | Schema validation                      |

## Backend & Data Layer

| Category            | Technology      | Version | Purpose                             |
| ------------------- | --------------- | ------- | ----------------------------------- |
| **ORM**             | Drizzle ORM     | 0.33.0  | Type-safe SQL ORM                   |
| **Database**        | PostgreSQL      | Latest  | Relational database                 |
| **Database Client** | postgres.js     | 3.4.4   | PostgreSQL connection driver        |
| **Caching**         | Redis (ioredis) | 5.7.0   | In-memory caching and rate limiting |
| **Object Storage**  | MinIO           | 8.0.5   | S3-compatible object storage        |

## Authentication & Security

| Category                 | Technology | Version | Purpose                            |
| ------------------------ | ---------- | ------- | ---------------------------------- |
| **Authentication**       | Clerk      | 6.31.6  | User authentication and management |
| **Webhook Verification** | svix       | 1.71.0  | Webhook signature verification     |
| **Validation**           | Zod        | 4.0.17  | Runtime type validation            |

## AI & Integrations

| Category        | Technology    | Version | Purpose                                            |
| --------------- | ------------- | ------- | -------------------------------------------------- |
| **AI Provider** | Anthropic SDK | 0.63.0  | Claude AI integration                              |
| **WhatsApp**    | GOWA          | Latest  | go-whatsapp-web-multidevice for WhatsApp messaging |

## Build & Development

| Category            | Technology             | Version | Purpose                    |
| ------------------- | ---------------------- | ------- | -------------------------- |
| **Testing**         | Vitest                 | 3.2.4   | Unit testing framework     |
| **Testing Utils**   | @testing-library/react | 16.3.0  | React testing utilities    |
| **Package Manager** | pnpm                   | 1.x     | Fast package manager       |
| **Type Checking**   | TypeScript             | 5.x     | Compile-time type checking |
| **Linting**         | ESLint                 | 9       | Code linting               |

## UI & UX

| Category             | Technology          | Version | Purpose                       |
| -------------------- | ------------------- | ------- | ----------------------------- |
| **Icons**            | Lucide React        | 0.539.0 | Icon library                  |
| **Notifications**    | Sonner              | 2.0.7   | Toast notifications           |
| **Rich Text Editor** | Quill               | 2.0.3   | Rich text editing             |
| **PDF Generation**   | @react-pdf/renderer | 4.3.1   | React PDF document generation |
| **Animations**       | tw-animate-css      | 1.3.6   | Tailwind animation utilities  |
| **Class Utilities**  | CVA                 | 0.7.1   | Class variance authority      |

## Infrastructure & DevOps

| Category            | Technology              | Purpose                           |
| ------------------- | ----------------------- | --------------------------------- |
| **PWA**             | next-pwa                | Progressive Web App support       |
| **CI/CD**           | GitHub Actions          | Continuous integration/deployment |
| **Bundle Analysis** | webpack-bundle-analyzer | Bundle size analysis              |

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...

# WhatsApp (GOWA)
GOWA_ENDPOINT=...
GOWA_BASIC_AUTH_USER=...
GOWA_BASIC_AUTH_PASSWORD=...
GOWA_WEBHOOK_SECRET=...

# AI
ANTHROPIC_API_KEY=...

# Redis
REDIS_URL=...

# Storage
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_PUBLIC_ENDPOINT=...

# Security
INTERNAL_API_KEY=...
```

### Optional Feature Flags

```bash
# WhatsApp retry logic with exponential backoff
FEATURE_FLAG_PERF_WHATSAPP_RETRY=true

# Atomic idempotency checking
FEATURE_FLAG_SECURITY_ATOMIC_IDEMPOTENCY=true
```

## Technology Decision Highlights

1. **pnpm over npm/yarn**: Significantly faster package installation and execution
2. **Drizzle ORM**: Lightweight, type-safe ORM with minimal abstraction over SQL
3. **Clerk**: Managed authentication reducing security burden
4. **GOWA**: Self-hosted WhatsApp solution for data sovereignty
5. **Redis**: Caching and rate limiting in one solution
6. **MinIO**: S3-compatible storage for data portability
