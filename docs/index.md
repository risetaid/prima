# PRIMA Documentation Index

## Project Overview

**PRIMA** (Patient Reminder and Information Management Application) is a healthcare platform built with Next.js 15, featuring a layered architecture with AI-powered patient interactions via WhatsApp.

- **Type:** Monolithic Next.js Application
- **Primary Language:** TypeScript 5.x
- **Architecture:** Layered Architecture (API → Services → Data)
- **Repository:** Single cohesive codebase

## Quick Reference

| Category       | Technology                         |
| -------------- | ---------------------------------- |
| Runtime        | pnpm                               |
| Framework      | Next.js 15.4.10                    |
| Database       | PostgreSQL + Drizzle ORM           |
| Authentication | Clerk 6.31.6                       |
| AI             | Anthropic SDK 0.63.0               |
| WhatsApp       | GOWA (go-whatsapp-web-multidevice) |
| Caching        | Redis (ioredis) 5.7.0              |
| Storage        | MinIO (S3-compatible)              |

## Generated Documentation

### Core Documentation

| Document                                          | Description                             |
| ------------------------------------------------- | --------------------------------------- |
| [Project Overview](./project-overview.md)         | High-level project summary and features |
| [Architecture](./architecture.md)                 | System architecture and design patterns |
| [Technology Stack](./technology-stack.md)         | Detailed technology breakdown           |
| [Source Tree Analysis](./source-tree-analysis.md) | Directory structure reference           |

### Technical Documentation

| Document                                        | Description                   |
| ----------------------------------------------- | ----------------------------- |
| [API Contracts](./api-contracts.md)             | API endpoint reference        |
| [Data Models](./data-models.md)                 | Database schema documentation |
| [Component Inventory](./component-inventory.md) | React component catalog       |

### Operational Documentation

| Document                                    | Description                             |
| ------------------------------------------- | --------------------------------------- |
| [Development Guide](./development-guide.md) | Setup, coding guidelines, commands      |
| [Deployment Guide](./deployment-guide.md)   | Deployment strategies and configuration |

## Existing Documentation

| Document                                                      | Description                    |
| ------------------------------------------------------------- | ------------------------------ |
| [README.md](../README.md)                                     | Project setup and quick start  |
| [CLAUDE.md](../CLAUDE.md)                                     | AI assistant guidance          |
| [copilot-instructions.md](../.github/copilot-instructions.md) | Detailed AI agent instructions |

### Architecture Decision Records (ADRs)

| Document                                                               | Description                  |
| ---------------------------------------------------------------------- | ---------------------------- |
| [WhatsApp Retry Logic](./architecture/adr/001-whatsapp-retry-logic.md) | Exponential backoff strategy |
| [Idempotency Strategy](./architecture/adr/002-idempotency-strategy.md) | Atomic duplicate prevention  |

## Getting Started

### For New Developers

1. Read [Project Overview](./project-overview.md) to understand the system
2. Follow [Development Guide](./development-guide.md#installation) for setup
3. Review [Architecture](./architecture.md) for design patterns
4. Check [CLAUDE.md](../CLAUDE.md) for AI coding guidelines

### For AI-Assisted Development

This documentation is optimized for AI assistants:

1. Start with [Architecture](./architecture.md) to understand the layered structure
2. Reference [API Contracts](./api-contracts.md) for endpoint patterns
3. Use [Data Models](./data-models.md) for schema understanding
4. Follow [Development Guide](./development-guide.md) for code conventions

### For DevOps/Operations

1. See [Deployment Guide](./deployment-guide.md) for deployment options
2. Review environment variable requirements
3. Check infrastructure requirements
4. Follow security checklist

## Key Entry Points

### API Layer

- Route handlers in `src/app/api/*/route.ts`
- Validation via `src/lib/api-schemas.ts`
- Error handling via `src/lib/error-handler.ts`

### Service Layer

- Domain services in `src/services/*/`
- Pattern: Static methods with dependency injection
- Examples: `patient.service.ts`, `reminder.service.ts`

### Data Layer

- Schemas in `src/db/*-schema.ts`
- Relations in `src/db/schema.ts`
- Enums in `src/db/enums.ts`

## Documentation Stats

| Metric              | Value |
| ------------------- | ----- |
| Documentation Files | 9     |
| API Endpoints       | 40+   |
| Database Tables     | 13    |
| React Components    | 80+   |
| Service Modules     | 30+   |

## Navigation

```
prima/
├── docs/                    # This documentation
│   ├── index.md            # Master index
│   ├── project-overview.md # Project summary
│   ├── architecture.md     # System design
│   ├── technology-stack.md # Tech breakdown
│   ├── api-contracts.md    # API reference
│   ├── data-models.md      # Database schema
│   ├── component-inventory.md # Components
│   ├── development-guide.md   # Setup & coding
│   ├── deployment-guide.md    # Deployment
│   └── source-tree-analysis.md # Directory structure
├── src/                     # Source code
└── README.md               # Quick start
```

## Next Steps

- **For code changes**: See [Development Guide](./development-guide.md)
- **For API modifications**: Reference [API Contracts](./api-contracts.md)
- **For schema changes**: Follow [Data Models](./data-models.md) patterns
- **For deployment**: See [Deployment Guide](./deployment-guide.md)
- **For AI-assisted work**: Start with [Architecture](./architecture.md)

---

_Documentation generated on 2026-01-13_
_For updates, re-run the document-project workflow_
