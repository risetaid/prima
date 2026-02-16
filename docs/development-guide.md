# Development Guide

## Prerequisites

- Bun
- PostgreSQL
- Required environment variables in `.env`/deployment env

## Install

```bash
bun install
```

## Run Locally

```bash
bun dev
```

## Build and Start

```bash
bun build
bun start
```

## Quality Checks

```bash
bun run lint
bunx tsc --noEmit
```

## Testing

```bash
bun run test:comprehensive
```

## Database Lifecycle

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## Notes

- API handlers should remain thin and delegate to services.
- Keep schema and migrations synchronized for database changes.
