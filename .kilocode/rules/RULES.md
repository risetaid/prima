# Bun Package Manager & Development Rules

## Package Manager

- **DO NOT USE NPM** under any circumstances
- **ALWAYS USE Bun** as the package manager for this project
- Install dependencies with: `bun install`
- Run scripts with: `bun run <script>`

## Development Server

- **NEVER run `bun run dev`** - this is not allowed
- Development server should be started through proper channels only

## Build Commands

- **DO NOT RUN `bun run build`**
- **DO NOT RUN `bun run db{any following words}`** - no database commands allowed
- **DO NOT RUN 'bun run build' on each subagent**
- Before concluding any code changes or final verdicts, always run:
  - `bunx tsc --noEmit` (TypeScript type checking)
  - `bun run lint` (ESLint checking)
- **run 'bunx tsc --noEmit' and 'bun run lint' after all subagents are done.. while issues still appearing, deploy subagent to fix**
- **For any prohibited commands, pass them to me instead so I can run them myself and provide feedback**

## Import Statements

- **NEVER use relative imports** like `import x from ".." `
- **ALWAYS use absolute imports** with `@/` prefix: `import x from "@/path/to/x"`

## TypeScript Types

- **DO NOT USE `any`** under any circumstances
- **ALWAYS use proper TypeScript types** for all variables, parameters, and return values

## Logging

- **DO NOT USE `console` statements** (console.log, console.error, etc.)
- **ALWAYS use the proper logger** utility instead

## API Responses

- **DO NOT USE raw Next.js APIs** like `NextResponse` or `NextRequest`
- **ALWAYS use our wrapper utilities**:
  - `api-response.ts` for standardized API responses
  - `api-utils.ts` for API utilities and helpers
