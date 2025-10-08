# PRIMA Developer Onboarding Guide

Welcome to the PRIMA (Patient Reminder and Information Management Application) development team! This guide will help you get up and running with the codebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Development Workflow](#development-workflow)
6. [Key Concepts](#key-concepts)
7. [Common Tasks](#common-tasks)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Resources](#resources)

---

## Project Overview

PRIMA is a medical patient management system designed to help healthcare providers coordinate patient care through:
- **Patient Management**: Track patient information, medical history, and contact details
- **Automated Reminders**: Schedule and send WhatsApp reminders for medications, appointments, and follow-ups
- **Educational Content**: Manage and distribute health education articles and videos
- **WhatsApp Integration**: Two-way communication with patients via WhatsApp (powered by Fonnte)
- **User Management**: Role-based access control for admins, healthcare providers, and volunteers

---

## Technology Stack

### Core Framework
- **Next.js 15** (App Router): React framework with server-side rendering
- **React 19**: UI library
- **TypeScript**: Type-safe JavaScript

### Database & ORM
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Drizzle ORM**: Type-safe database toolkit

### Authentication & Authorization
- **Clerk**: Complete authentication solution with role-based access control

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/ui**: High-quality React components
- **Radix UI**: Headless UI primitives

### Data Validation
- **Zod**: TypeScript-first schema validation

### Testing
- **Vitest**: Fast unit testing framework
- **@testing-library/react**: React component testing utilities

### External Services
- **Fonnte**: WhatsApp Business API integration
- **Vercel**: Hosting and deployment
- **YouTube Data API**: Fetch video information

### Development Tools
- **Bun**: Fast JavaScript runtime and package manager
- **ESLint**: Code linting
- **Prettier**: Code formatting (via Biome)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:
- **Bun** v1.0+: https://bun.sh
- **Node.js** 18+: (for tooling compatibility)
- **Git**: Version control
- **VSCode** (recommended): With extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma (for syntax highlighting)

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/prima.git
   cd prima
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://..."
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   CLERK_WEBHOOK_SECRET="whsec_..."
   
   # Fonnte (WhatsApp)
   FONNTE_API_KEY="your-api-key"
   FONNTE_DEVICE="your-device-id"
   
   # YouTube
   YOUTUBE_API_KEY="your-api-key"
   
   # Vercel (Production)
   NEXT_PUBLIC_VERCEL_URL="prima.example.com"
   ```

4. **Set Up Database**
   ```bash
   # Push database schema
   bunx drizzle-kit push
   
   # Seed initial data (optional)
   bun run scripts/setup-first-user.ts
   ```

5. **Run Development Server**
   ```bash
   bun dev
   ```
   
   Open http://localhost:3000 in your browser.

### Verify Setup

Run the test suite to ensure everything is working:
```bash
bun test
```

---

## Project Structure

```
prima/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── (shell)/           # Authenticated layout
│   │   │   ├── pasien/        # Patient management pages
│   │   │   ├── pengingat/     # Reminder management pages
│   │   │   ├── cms/           # Content management pages
│   │   │   └── admin/         # Admin pages
│   │   ├── api/               # API routes
│   │   │   ├── patients/      # Patient endpoints
│   │   │   ├── webhooks/      # Webhook handlers
│   │   │   └── cms/           # CMS endpoints
│   │   └── content/           # Public content pages
│   │
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── patient/          # Patient-specific components
│   │   ├── reminder/         # Reminder components
│   │   └── cms/              # CMS components
│   │
│   ├── lib/                   # Utility functions
│   │   ├── api-client.ts     # API client utility
│   │   ├── api-schemas.ts    # Zod validation schemas
│   │   ├── error-handler.ts  # Error handling utilities
│   │   ├── logger.ts         # Logging utility
│   │   └── datetime.ts       # Date/time utilities
│   │
│   ├── services/              # Business logic
│   │   ├── patient/          # Patient service layer
│   │   ├── reminder/         # Reminder service layer
│   │   └── whatsapp/         # WhatsApp integration
│   │
│   ├── db/                    # Database configuration
│   │   ├── schema.ts         # Drizzle schema definitions
│   │   └── index.ts          # Database connection
│   │
│   └── middleware.ts          # Next.js middleware
│
├── tests/                     # Test files
│   ├── lib/                  # Unit tests for utilities
│   └── setup.ts              # Test configuration
│
├── docs/                      # Documentation
│   ├── api/                  # API documentation
│   └── DEVELOPER_ONBOARDING.md
│
├── scripts/                   # Utility scripts
│   ├── setup-first-user.ts   # Create initial user
│   └── apply-indexes.ts      # Database migrations
│
├── public/                    # Static assets
│
├── .env.local                 # Local environment variables (not committed)
├── drizzle.config.ts         # Drizzle ORM configuration
├── vitest.config.ts          # Test configuration
├── next.config.mjs           # Next.js configuration
└── package.json              # Project dependencies
```

---

## Development Workflow

### Daily Workflow

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   bun install  # Install any new dependencies
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Run Tests**
   ```bash
   bun test
   bunx tsc --noEmit  # Type checking
   bun run lint       # Linting
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Follow conventional commit format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Test additions/changes
   - `refactor:` Code refactoring
   - `chore:` Build/tooling changes

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a Pull Request on GitHub.

### Code Review Process

- All code must be reviewed before merging
- Address reviewer feedback promptly
- Ensure all CI checks pass
- Keep PRs focused and reasonably sized

---

## Key Concepts

### 1. API Handler Pattern

All API endpoints use a consistent handler pattern:

```typescript
import { createApiHandler } from '@/lib/error-handler';
import { schemas } from '@/lib/api-schemas';

export const POST = createApiHandler({
  auth: 'required',        // Authentication requirement
  body: schemas.createPatient,  // Request validation schema
}, async (body, context) => {
  // context.user - Authenticated user
  // context.params - URL parameters
  // body - Validated request body
  
  const result = await createPatient(body, context.user.id);
  return result;  // Automatically wrapped in standard response
});
```

### 2. Standard API Response

All API responses follow this format:

```typescript
{
  success: boolean,
  data?: T,
  error?: string,
  code?: string,
  message?: string,
  timestamp: string,
  requestId: string
}
```

### 3. Type-Safe Database Queries

Using Drizzle ORM for type-safe queries:

```typescript
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Type-safe query
const patient = await db
  .select()
  .from(patients)
  .where(eq(patients.id, patientId))
  .limit(1);
```

### 4. Validation with Zod

Shared validation schemas in `src/lib/api-schemas.ts`:

```typescript
import { z } from 'zod';

const createPatientSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().regex(/^62[0-9]{9,13}$/),
  dateOfBirth: z.string().date().optional(),
});

// Use for validation
const result = createPatientSchema.safeParse(data);
```

### 5. Service Layer Pattern

Business logic lives in the service layer:

```typescript
// src/services/patient/patient.service.ts
export class PatientService {
  async createPatient(data: CreatePatientInput): Promise<Patient> {
    // Validation
    // Business logic
    // Database operations
    // Return result
  }
}
```

### 6. Error Handling

Use `AppError` for consistent error handling:

```typescript
import { AppError } from '@/lib/error-handler';

if (!patient) {
  throw new AppError('Patient not found', 404, 'NOT_FOUND');
}
```

---

## Common Tasks

### Task 1: Add a New API Endpoint

1. **Define Validation Schema** (`src/lib/api-schemas.ts`)
   ```typescript
   export const createResourceSchema = z.object({
     field: z.string(),
   });
   ```

2. **Create API Route** (`src/app/api/resources/route.ts`)
   ```typescript
   export const POST = createApiHandler({
     auth: 'required',
     body: schemas.createResource,
   }, async (body, context) => {
     // Implementation
   });
   ```

3. **Add Tests** (`tests/api/resources.test.ts`)
   ```typescript
   describe('Resource API', () => {
     it('should create resource', async () => {
       // Test implementation
     });
   });
   ```

### Task 2: Add a New Database Table

1. **Define Schema** (`src/db/schema.ts`)
   ```typescript
   export const myTable = pgTable('my_table', {
     id: uuid('id').primaryKey().defaultRandom(),
     name: text('name').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Push to Database**
   ```bash
   bunx drizzle-kit push
   ```

3. **Add Type Definitions**
   ```typescript
   export type MyTable = typeof myTable.$inferSelect;
   export type InsertMyTable = typeof myTable.$inferInsert;
   ```

### Task 3: Add a New React Component

1. **Create Component** (`src/components/feature/MyComponent.tsx`)
   ```typescript
   'use client';
   
   interface MyComponentProps {
     // Props
   }
   
   export function MyComponent({ ...props }: MyComponentProps) {
     return <div>Component content</div>;
   }
   ```

2. **Add Tests** (if complex logic)
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { MyComponent } from './MyComponent';
   
   describe('MyComponent', () => {
     it('should render', () => {
       render(<MyComponent />);
       expect(screen.getByText('content')).toBeInTheDocument();
     });
   });
   ```

### Task 4: Add a New Utility Function

1. **Create Function** (`src/lib/my-util.ts`)
   ```typescript
   /**
    * Description of what the function does
    * @param input - Description of parameter
    * @returns Description of return value
    */
   export function myUtilFunction(input: string): string {
     // Implementation
     return result;
   }
   ```

2. **Add Tests** (`tests/lib/my-util.test.ts`)
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { myUtilFunction } from '@/lib/my-util';
   
   describe('myUtilFunction', () => {
     it('should work correctly', () => {
       expect(myUtilFunction('test')).toBe('expected');
     });
   });
   ```

---

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun run test:coverage

# Run specific test file
bun test tests/lib/api-client.test.ts

# Run tests matching pattern
bun test -t "should create patient"
```

### Writing Tests

Follow the testing patterns in existing test files:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should handle success case', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle error case', async () => {
    // Test error scenarios
  });
});
```

### Test Coverage Goals

- **Unit Tests**: Aim for 80%+ coverage on utilities and services
- **Integration Tests**: Cover critical API endpoints
- **Type Tests**: Ensure TypeScript types are correct

---

## Deployment

### Development Environment

Automatic deployment on every push to `dev` branch via Vercel.

### Production Environment

1. **Create PR to `main` branch**
2. **Get code review approval**
3. **Merge to `main`**
4. **Vercel automatically deploys**

### Environment Variables

Ensure all required environment variables are set in:
- Vercel dashboard for production
- `.env.local` for local development

---

## Resources

### Documentation
- [API Usage Guide](./api/API_USAGE_GUIDE.md)
- [OpenAPI Specification](./api/openapi.yaml)
- [Testing Guide](../TESTING_SETUP.md)
- [API Analysis Plan](../API_ANALYSIS_PLAN.md)

### External Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Clerk Docs](https://clerk.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Docs](https://zod.dev)
- [Vitest Docs](https://vitest.dev)

### Code Style Guides
- Follow existing patterns in the codebase
- Use TypeScript strict mode
- Prefer functional components over class components
- Use async/await over promises
- Keep components small and focused
- Extract reusable logic into custom hooks

### Getting Help
1. **Check existing documentation** in the `docs/` folder
2. **Review similar code** in the codebase
3. **Check test files** for usage examples
4. **Ask the team** in your communication channel
5. **Create an issue** for bugs or unclear documentation

---

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Check `DATABASE_URL` in `.env.local`
- Ensure Neon database is running
- Run `bunx drizzle-kit push` to sync schema

**Clerk Authentication Errors**
- Verify `CLERK_SECRET_KEY` is set
- Check Clerk dashboard for API key validity
- Clear browser cookies and try again

**Build Errors**
- Run `bun install` to ensure dependencies are up to date
- Delete `.next` folder and rebuild: `rm -rf .next && bun dev`
- Check TypeScript errors: `bunx tsc --noEmit`

**Test Failures**
- Run tests individually to isolate issues
- Check if mocks are properly configured
- Ensure test environment variables are set

---

## Next Steps

Now that you're set up:

1. ✅ Familiarize yourself with the codebase structure
2. ✅ Read through key files in `src/lib/` and `src/services/`
3. ✅ Run the application locally and explore features
4. ✅ Pick up your first issue from the backlog
5. ✅ Ask questions early and often!

Welcome to the team! 🎉

---

**Last Updated**: October 8, 2025  
**Version**: 1.0.0
