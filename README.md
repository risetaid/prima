# PRIMA — Patient Reminder and Information Management Application

Modern healthcare platform for patient management, reminders, and educational content, with WhatsApp integration. Built with Next.js (App Router), Bun, Drizzle ORM, and Clerk authentication.

---

## 🚀 Quick Start

### Prerequisites

- **Bun** (required, not npm/yarn)
- **PostgreSQL** (Neon recommended)
- **Clerk** account (auth)
- **WAHA** account (WhatsApp HTTP API)

### Local Development

```sh
pnpm install
pnpm dev
```

### Database Setup

```sh
pnpx drizzle-kit push
```

### Build & Production

```sh
pnpm build
pnpm start
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

- **Install deps:** `pnpm install`
- **Dev server:** `pnpm dev`
- **Build:** `pnpm build` → `pnpm start`
- **DB push:** `pnpx drizzle-kit push`
- **DB studio:** `pnpx drizzle-kit studio`
- **Tests:** `pnpm test`
- **Typecheck:** `pnpx tsc --noEmit`
- **Lint:** `pnpm run lint`

---

## 🔑 Environment Variables

See `.env.local` for all required variables. Key vars:

- `DATABASE_URL` — Postgres connection
- `CLERK_*` — Clerk auth keys
- `WAHA_API_KEY` — WhatsApp HTTP API key
- `WAHA_ENDPOINT` — WAHA API endpoint
- `WAHA_SESSION` — WAHA session name (default: default)
- `YOUTUBE_API_KEY` — YouTube Data API

---

## 🧩 Conventions

- **Bun** only (no npm/yarn)
- **Drizzle ORM** for DB (see `db/`, `drizzle/`)
- **Zod** for validation (see `src/lib/api-schemas.ts`)
- **Clerk** for auth (env: `CLERK_*`)
- **WAHA** for WhatsApp (env: `WAHA_*`)
- **API routes:** thin controllers in `src/app/api/*`, delegate to `src/services/*`
- **Error handling:** see `src/app/global-error.tsx`, `src/lib/error-handling`

---

## 🧪 Testing

### Unit Tests

- **Run tests:** `pnpm test`
- **Vitest** for unit tests (see `tests/`)

### Comprehensive System Testing

**NEW!** Complete testing suite with beautiful, user-friendly reports:

```bash
# Run all comprehensive tests (~8 minutes)
pnpm run test:comprehensive

# Run specific categories
pnpm run test:auth         # Authentication & Security
pnpm run test:reminder     # Reminder System
pnpm run test:whatsapp     # WhatsApp Integration
pnpm run test:content      # Video & Berita (Articles)
pnpm run test:load         # Load Testing (10, 25, 50, 100 users)
```

**Features:**

- 65+ test cases covering Auth, Reminders, WhatsApp, Content, Load Testing
- Beautiful HTML reports (Indonesian language for non-technical users)
- Performance metrics (response times, P50/P95/P99 percentiles)
- Concurrent user testing (10, 25, 50, 100 users)
- Actionable recommendations

**Documentation:**

- Quick Start: [`tests/comprehensive-suite/QUICKSTART.md`](tests/comprehensive-suite/QUICKSTART.md)
- User Guide (Indonesian): [`docs/PANDUAN_PENGUJIAN.md`](docs/PANDUAN_PENGUJIAN.md)
- Technical Docs: [`tests/comprehensive-suite/README.md`](tests/comprehensive-suite/README.md)

---

## �️ Tech Stack

- **Next.js (App Router)**
- **React**
- **TypeScript**
- **Drizzle ORM** (Postgres)
- **Clerk** (auth)
- **WAHA** (WhatsApp HTTP API)
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
