# Technology Stack

## Core Stack (main part)

| Category | Technology | Version | Justification |
| --- | --- | --- | --- |
| Runtime | Bun | via `bun.lock` | Primary package/runtime toolchain in scripts and docs |
| Framework | Next.js | `^15.4.10` | App Router web + API platform |
| UI | React | `19.1.1` | Core rendering library |
| Language | TypeScript | `^5` | Strict typed app and services |
| Styling | Tailwind CSS | `^4` | Utility-first styling |
| UI Primitives | Radix UI | mixed `^1.x/2.x` | Reusable accessible components |
| Forms | react-hook-form | `^7.62.0` | Form state and validation wiring |
| Validation | Zod | `^4.0.17` | Runtime schema validation |
| Auth | Clerk | `^6.31.6` | Auth and session handling |
| ORM | Drizzle ORM | `^0.33.0` | SQL schema + typed queries |
| Database | PostgreSQL | via `postgres` `^3.4.4` | Primary relational store |
| Queue/Cache | Redis | via `ioredis` `^5.7.0` | Background/reliability helpers |
| Storage | MinIO SDK | `^8.0.5` | Object storage integration |
| Testing | Vitest + Testing Library | `^3.2.4`, `^16.3.0` | Unit/integration and UI test support |
| Linting | ESLint + Next config | `^9`, `15.4.6` | Static checks and framework rules |

## Build and Tooling Signals

- `next.config.ts` enables standalone output and PWA wrapper.
- `drizzle.config.ts` points schema at `src/db/schema.ts` and SQL out folder `drizzle/migrations`.
- Scripts indicate DB automation (`db:generate`, `db:migrate`, `db:push`) and worker process (`start-message-worker`).
