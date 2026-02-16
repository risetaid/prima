# Development Instructions

## Prerequisites

- Bun runtime/package manager
- PostgreSQL database (Neon/Railway compatible)
- Environment values for Clerk, database, WAHA, and optional services

## Setup

```bash
bun install
```

## Development Run

```bash
bun dev
```

## Build and Start

```bash
bun build
bun start
```

## Database Workflow

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## Testing and Quality

```bash
bun run lint
bunx tsc --noEmit
bun run test:comprehensive
```

## Useful Operational Scripts

- `bun run start-message-worker`
- `bun run setup-first-user`
- `bun run db:optimize-indexes`
- `bun run db:monitor-indexes`
