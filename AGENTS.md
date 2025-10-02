# Agent Guidelines for Prima System

## Commands
- **Build**: `bun run build` (use via proper channels only)
- **Lint**: `bun run lint` (ESLint for code formatting and style)
- **Type Check**: `bunx tsc --noEmit` (strict TypeScript checking)
- **Dev Server**: `bun run dev` (not for agents; use for local testing)
- **Database**: `bun run db:*` (migrations via Drizzle; use cautiously)
- **Tests**: No dedicated test framework configured. Run lint/typecheck post-changes. For single tests, add Vitest/Jest if needed and use `bun test <file>`.

## Code Style Guidelines
- **Imports**: Use absolute paths with `@/` prefix (e.g., `import { fn } from '@/lib/utils'`); avoid relative imports (`../`).
- **Formatting**: Auto-formatted via ESLint/Prettier; 2-space indentation, single quotes for strings.
- **Types**: Strict TypeScript; no `any` types; explicit return types and interfaces for props/state.
- **Naming**: camelCase for variables/functions; PascalCase for components/types; descriptive names (e.g., `fetchPatientData`).
- **Error Handling**: Use custom error classes (e.g., `AppError`); wrap async ops in try/catch; log via `@/lib/logger`.
- **Logging**: `@/lib/logger` only; no `console.*` in production code.
- **API Routes**: Wrap in `@/lib/api-response.ts` and `@/lib/api-utils.ts`; avoid raw Next.js responses.

## Framework & Best Practices
- **Package Manager**: Bun exclusively; no npm/yarn.
- **UI**: Tailwind CSS with `cn()` utility from `@/lib/utils`; use class-variance-authority (cva) for variants.
- **Database**: Drizzle ORM; ensure schema typing in `@/db/schema.ts`.
- **Auth**: Clerk via `@/lib/auth-utils.ts` and `@/lib/auth-context.tsx`.

## System Rules
- **Reminders**: No help options in templates; track compliance only.
- **WhatsApp**: Use *bold* formatting (not **bold**).
- **Patients**: Address by first name; no medical advice—refer to professionals.
- **Emergencies**: Alert volunteers; PRIMA not for emergencies.
- **Quality**: Always run lint and typecheck after edits; fix errors before finishing.

## Additional Notes
- No Cursor (.cursor/rules/) or Copilot (.github/copilot-instructions.md) rules found.
- Follow security: Never log/expose secrets; use rate-limiting for APIs.
