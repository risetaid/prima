# PRIMA — Patient Reminder and Information Management Application

Modern healthcare platform for patient management, reminders, and educational content, with WhatsApp integration. Built with Next.js (App Router), Bun, Drizzle ORM, and Clerk authentication.

---

## 🚀 Quick Start

### Prerequisites

- **Bun** (required, not npm/yarn)
- **PostgreSQL** (Neon recommended)
- **Clerk** account (auth)
- **Fonnte** account (WhatsApp)

### Local Development

```sh
bun install
bun dev
```

### Database Setup

```sh
bunx drizzle-kit push
```

### Build & Production

```sh
bun build
bun start
```

---

## 🏗️ Project Structure

```
src/app/         # Next.js App Router (pages, API routes)
src/services/    # Business logic
src/lib/         # Reusable helpers, validation (Zod)
db/              # Drizzle ORM schemas
drizzle/         # Migrations (SQL)
scripts/         # DB setup, data, fixers
src/components/  # UI components (Tailwind, Shadcn, Radix)
public/          # Static assets
docs/            # Documentation
```

---

## ⚙️ Key Workflows

- **Install deps:** `bun install`
- **Dev server:** `bun dev`
- **Build:** `bun build` → `bun start`
- **DB push:** `bunx drizzle-kit push`
- **DB studio:** `bunx drizzle-kit studio`
- **Tests:** `bun test`
- **Typecheck:** `bunx tsc --noEmit`
- **Lint:** `bun run lint`

---

## 🔑 Environment Variables

See `.env.local` for all required variables. Key vars:

- `DATABASE_URL` — Postgres connection
- `CLERK_*` — Clerk auth keys
- `FONNTE_*` — WhatsApp integration
- `YOUTUBE_API_KEY` — YouTube Data API

---

## 🧩 Conventions

- **Bun** only (no npm/yarn)
- **Drizzle ORM** for DB (see `db/`, `drizzle/`)
- **Zod** for validation (see `src/lib/api-schemas.ts`)
- **Clerk** for auth (env: `CLERK_*`)
- **Fonnte** for WhatsApp (env: `FONNTE_*`)
- **API routes:** thin controllers in `src/app/api/*`, delegate to `src/services/*`
- **Error handling:** see `src/app/global-error.tsx`, `src/lib/error-handling`

---

## 🧪 Testing

- **Run tests:** `bun test`
- **Vitest** for unit tests (see `tests/`)

---

## �️ Tech Stack

- **Next.js (App Router)**
- **React**
- **TypeScript**
- **Drizzle ORM** (Postgres)
- **Clerk** (auth)
- **Fonnte** (WhatsApp)
- **Tailwind CSS**, **Shadcn/ui**, **Radix UI**
- **Zod** (validation)
- **Vitest** (testing)

---

## � Contributing & PRs

- Add new env vars? Document in PR.
- DB schema change? Add migration in `drizzle/migrations/` and update `db/`.
- Multi-layer feature? Add a short `docs/` note if needed.

Follow [Conventional Commits](https://www.conventionalcommits.org/).

---

## License

Proprietary. Do not copy, distribute, or use without permission.

---

**Status:** Active Development  
**Last Updated:** October 14, 2025
