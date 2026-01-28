# PRIMA Project Documentation

**Complete documentation for the PRIMA healthcare platform - AI-optimized for brownfield development**

Generated: January 29, 2026  
Version: 1.0.0  
Scan Type: Exhaustive  
Project Type: Full-stack Next.js Web Application (Monolith)

---

## 📋 Quick Reference

| Attribute            | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| **Project Name**     | PRIMA (Patient Reminder and Information Management Application) |
| **Type**             | Monolithic full-stack web application                           |
| **Primary Language** | TypeScript                                                      |
| **Framework**        | Next.js 15 (App Router)                                         |
| **Architecture**     | Layered (Presentation → API → Service → Data)                   |
| **Database**         | PostgreSQL (Neon) with Drizzle ORM                              |
| **Authentication**   | Clerk                                                           |
| **WhatsApp**         | GOWA (go-whatsapp-web-multidevice)                              |
| **AI**               | Anthropic Claude                                                |
| **Caching**          | Redis + Next.js                                                 |
| **Storage**          | MinIO (S3-compatible)                                           |

### Key Metrics

- **46 API endpoints** across 15 categories
- **94 React components** organized by domain
- **12 database tables** with optimized indexes
- **23 service modules** implementing business logic
- **~150 active patients**, **~450 reminders**, **10-15 volunteers**
- **20-30 WhatsApp messages/day**

---

## 📚 Core Documentation

### Architecture & Design

- **[Architecture Overview](./architecture.md)** — Comprehensive system architecture, patterns, and integrations
- **[Source Tree Analysis](./source-tree-analysis.md)** — Annotated directory structure with entry points

### Development

- **[Development Guide](./development-guide.md)** — Complete setup, workflows, and troubleshooting
- **[Component Inventory](./component-inventory.md)** — All 94 React components cataloged

### API & Data

- **[API Contracts](./api-contracts.md)** — All 46 endpoints with request/response schemas
- **[Data Models](./data-models.md)** — Complete database schema with relationships

---

## 🎯 Quick Start for AI Agents

**When planning a new feature:**

1. Review [architecture.md](./architecture.md) for system context
2. Check [api-contracts.md](./api-contracts.md) for existing endpoints
3. Review [data-models.md](./data-models.md) for database schema
4. Reference [component-inventory.md](./component-inventory.md) for reusable UI components

**When implementing:**

1. Follow patterns in [development-guide.md](./development-guide.md)
2. Use [source-tree-analysis.md](./source-tree-analysis.md) to locate files
3. Add tests following the patterns in `tests/comprehensive-suite/`

---

## 🗂️ Existing Project Documentation

### Architecture Decision Records (ADRs)

- [001 - WhatsApp Retry Logic](./architecture/adr/001-whatsapp-retry-logic.md) — Exponential backoff retry strategy
- [002 - Idempotency Strategy](./architecture/adr/002-idempotency-strategy.md) — Atomic Redis-based duplicate prevention
- [ADR Index](./architecture/adr/README.md) — Full list of architectural decisions

### Planning & Maintenance

- [Cleanup Plan (2025-12-15)](./plans/2025-12-15-cleanup-deprecated-code.md) — Deprecated code removal strategy

### Root Documentation

- [README.md](../README.md) — Project overview, quick start, key commands
- [CLAUDE.md](../CLAUDE.md) — AI agent guidance and project conventions
- [PRIVACY_POLICY](../PRIVACY_POLICY) — Privacy policy and data handling

---

## 🧩 Technology Stack Summary

| Category       | Technology       | Version | Purpose                             |
| -------------- | ---------------- | ------- | ----------------------------------- |
| **Runtime**    | Bun              | Latest  | Fast JavaScript runtime (required)  |
| **Framework**  | Next.js          | 15.4.10 | React framework with App Router     |
| **Language**   | TypeScript       | 5.x     | Type-safe development               |
| **UI Library** | React            | 19.1.1  | Component-based UI                  |
| **Database**   | PostgreSQL       | Latest  | Primary data store (Neon hosted)    |
| **ORM**        | Drizzle          | 0.33.0  | Type-safe database queries          |
| **Auth**       | Clerk            | 6.31.6  | Authentication & user management    |
| **WhatsApp**   | GOWA             | Latest  | WhatsApp multi-device integration   |
| **AI**         | Anthropic Claude | Latest  | Natural language processing         |
| **Caching**    | Redis            | Latest  | Rate limiting, idempotency, caching |
| **Storage**    | MinIO            | 8.0.5   | Object storage (S3-compatible)      |
| **Styling**    | Tailwind CSS     | 4.x     | Utility-first CSS framework         |
| **Components** | Radix UI         | Latest  | Headless UI primitives              |
| **Validation** | Zod              | 4.0.17  | Schema validation                   |
| **Testing**    | Vitest           | 3.2.4   | Unit and integration testing        |

See [architecture.md](./architecture.md#technology-stack) for complete details and justifications.

---

## 🏗️ Project Structure

```
prima/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # 46 API endpoints (thin controllers)
│   │   ├── (pages)/        # UI pages and layouts
│   │   └── globals.css     # Global styles
│   ├── components/         # 94 React components
│   │   ├── ui/            # 28 base UI components
│   │   ├── admin/         # 10 admin components
│   │   ├── patient/       # 16 patient components
│   │   └── ...            # Domain-specific components
│   ├── services/          # 23 business logic modules
│   │   ├── patient/       # Patient management
│   │   ├── reminder/      # Reminder scheduling
│   │   ├── whatsapp/      # WhatsApp integration
│   │   └── ai/            # AI conversation handling
│   ├── db/                # Database schemas
│   │   ├── schema.ts      # Main schema export
│   │   ├── core-schema.ts # Users, patients, records
│   │   ├── reminder-schema.ts # Reminders, confirmations
│   │   └── content-schema.ts  # CMS articles, videos
│   ├── lib/               # Utilities and helpers
│   │   ├── api-schemas.ts # Zod validation schemas
│   │   ├── error-handler.ts # Error formatting
│   │   ├── gowa.ts        # WhatsApp client
│   │   └── ...            # Various utilities
│   └── middleware.ts      # Clerk auth middleware
├── drizzle/
│   └── migrations/        # SQL migrations
├── scripts/               # Database setup & utilities
├── tests/                 # Test suites
│   └── comprehensive-suite/ # 65+ integration tests
├── docs/                  # 📍 You are here
└── public/               # Static assets
```

See [source-tree-analysis.md](./source-tree-analysis.md) for detailed explanations.

---

## 🚀 Getting Started

### For New Developers

1. Read [development-guide.md](./development-guide.md) for complete setup
2. Review [architecture.md](./architecture.md) to understand the system
3. Explore [api-contracts.md](./api-contracts.md) and [data-models.md](./data-models.md)

### For AI Agents (Brownfield PRD)

When creating a PRD for a new feature in this brownfield project:

1. **Reference this index** as the primary knowledge source
2. **Architecture**: Use [architecture.md](./architecture.md) for patterns and constraints
3. **API Design**: Check [api-contracts.md](./api-contracts.md) for existing endpoints to reuse/extend
4. **Data Model**: Review [data-models.md](./data-models.md) for schema and relationships
5. **Components**: Browse [component-inventory.md](./component-inventory.md) for reusable UI elements
6. **Code Location**: Use [source-tree-analysis.md](./source-tree-analysis.md) to find files

### For Feature Planning

**UI-only features**: Reference [component-inventory.md](./component-inventory.md) + [architecture.md](./architecture.md#presentation-layer)  
**API-only features**: Reference [api-contracts.md](./api-contracts.md) + [data-models.md](./data-models.md)  
**Full-stack features**: Review all documentation with focus on [architecture.md](./architecture.md)

---

## 📊 Key System Capabilities

### Patient Management

- Create, update, delete patients
- Volunteer assignment and access control
- Medical history tracking
- Verification workflows (via WhatsApp)
- Compliance monitoring

### Reminder System

- Flexible scheduling (daily, weekly, custom times)
- Multiple reminder types (OBAT, KONTROL, GENERAL)
- WhatsApp message delivery
- Confirmation tracking (automated + manual)
- AI-powered conversational responses
- Follow-up reminders for missed confirmations

### WhatsApp Integration

- Two-way messaging via GOWA
- Template-based messages with variable substitution
- Idempotent message delivery (atomic Redis locks)
- Rate limiting (10 msg/min per patient)
- Conversation state management
- Webhook processing with retry logic

### Educational Content (CMS)

- Articles and videos management
- Category organization (Health, Motivation, Lifestyle)
- SEO optimization
- Draft/Published workflow
- Soft delete support

### Admin Features

- User approval workflow
- Template management
- Analytics dashboard
- Verification metrics
- System health monitoring

---

## 🔒 Security & Performance

### Authentication

- Clerk-based authentication with role-based access control
- Roles: ADMIN, DEVELOPER, RELAWAN (Volunteer)
- Route protection via middleware
- Internal API key support for cron jobs

### Performance Optimizations

- **Phase 3 Database Optimization**: Removed 32 redundant indexes
- **9 composite indexes** for high-performance queries
- **Multi-layer caching**: Redis + Next.js + React Query
- **Rate limiting**: 10 msg/min WhatsApp, 100 req/min API
- **Idempotency**: Atomic Redis-based duplicate prevention

### Data Integrity

- PostgreSQL foreign keys with cascade rules
- Soft deletes for audit trails
- Optimistic locking for concurrent updates
- Transaction support for multi-step operations

---

## 🧪 Testing

### Test Coverage

- **65+ test cases** across 5 categories
- Auth & Security tests
- Reminder system tests
- WhatsApp integration tests
- Content management tests
- Load testing (10, 25, 50, 100 concurrent users)

### Running Tests

```bash
# Full comprehensive suite (~8 minutes)
bun run test:comprehensive

# Category-specific tests
bun run test:auth
bun run test:reminder
bun run test:whatsapp
bun run test:content
bun run test:load
```

See [development-guide.md#testing](./development-guide.md#testing) for details.

---

## 📈 Monitoring & Observability

### Health Checks

- `/api/health` — Basic health check
- `/api/health/ready` — Comprehensive readiness check (DB, Redis, Clerk, GOWA, MinIO)

### Logging

- Structured logging via `src/lib/logger.ts`
- Request/response logging in API routes
- Error tracking and alerting

### Performance Monitoring

- Response time tracking
- Cache hit/miss rates
- Database query performance
- WhatsApp delivery metrics

---

## 🔧 Common Development Tasks

### Create a New API Endpoint

1. Add route handler in `src/app/api/[domain]/route.ts`
2. Add Zod schema in `src/lib/api-schemas.ts`
3. Create service method in `src/services/[domain]/[domain].service.ts`
4. Add repository method if needed
5. Add tests in `tests/comprehensive-suite/`

### Create a New Database Table

1. Define schema in `src/db/[domain]-schema.ts`
2. Run `bunx drizzle-kit generate` to create migration
3. Review SQL in `drizzle/migrations/`
4. Run `bunx drizzle-kit push` to apply
5. Add types and relations

### Create a New Component

1. Create file in `src/components/[domain]/[ComponentName].tsx`
2. Use TypeScript for props interface
3. Follow naming convention: PascalCase for files and components
4. Use Tailwind + Radix UI patterns
5. Add to [component-inventory.md](./component-inventory.md)

See [development-guide.md](./development-guide.md#common-development-tasks) for detailed instructions.

---

## 📞 Support & Resources

### Documentation

- **This index** — Primary entry point for AI-assisted development
- **README.md** — Quick start and commands
- **CLAUDE.md** — AI agent conventions and guidance

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Clerk Documentation](https://clerk.com/docs)
- [GOWA GitHub](https://github.com/aldinokemal/go-whatsapp-web-multidevice)

---

## 📝 Documentation Metadata

**Generated by**: BMad Document-Project Workflow  
**Scan Level**: Exhaustive (complete source file analysis)  
**Scan Duration**: ~5 minutes  
**Files Scanned**: 200+ source files  
**Documentation Size**: 168+ KB across 6 comprehensive documents  
**Completeness**: 100% (no placeholders or TODOs)

**Last Updated**: January 29, 2026  
**Next Review**: When significant architectural changes occur

---

**🎯 Ready for AI-Assisted Development!**

This documentation is optimized for brownfield PRD creation and AI-assisted feature development. All documents contain concrete, production-ready information extracted from the actual codebase.
