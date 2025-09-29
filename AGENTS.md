# Agent Guidelines for Prima System

## Commands
- **Build**: `bun run build` (run via proper channels only)
- **Lint**: `bun run lint`
- **Type Check**: `bunx tsc --noEmit`
- **Dev Server**: `bun run dev` (not allowed for agents)
- **Database**: Use `bun run db:*` commands via proper channels only
- **No test framework configured** - run lint/typecheck after changes

## Code Style
- **Imports**: Absolute only with `@/` prefix, never relative (`../`)
- **Types**: Strict TypeScript, no `any` types, explicit return types
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Custom error classes, async/await with try/catch
- **Logging**: Use logger utility, never `console.*` statements
- **API**: Use `api-response.ts` and `api-utils.ts` wrappers, not raw Next.js APIs

## Framework Rules
- **Package Manager**: Bun only, never npm
- **UI**: Tailwind CSS with `cn()` utility, class-variance-authority for variants
- **Database**: Drizzle ORM with proper schema typing
- **Auth**: Clerk integration via `@/lib/auth-*` utilities

## System-Specific Rules
- **Reminder Messages**: Do NOT include help/bantuan options in reminder templates - PRIMA only tracks compliance, not help requests
- **WhatsApp Integration**: Use WhatsApp-compatible formatting (*bold* instead of **bold**)
- **Patient Communication**: Address patients by first name only (e.g., "David" not "Bapak David")
- **Medical Advice**: Never give medical advice, direct to professionals
- **Emergency Handling**: For emergencies, alert volunteers immediately but PRIMA is not emergency service
- **Patient Variables**: Removed patient variables override feature for UI simplification - templates now use default patient data only

## Quality Checks
Always run `bunx tsc --noEmit` and `bun run lint` after changes. Fix all errors before concluding work.