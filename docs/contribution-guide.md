# Contribution Guide

## Tooling Expectations

- Use Bun for install/build/test/lint operations.
- Keep TypeScript strict mode compliance.

## Before Submitting Changes

```bash
bun run lint
bunx tsc --noEmit
```

Run relevant tests for affected areas.

## Data and Schema Changes

- Update schema modules in `src/db`.
- Add/update SQL migrations in `drizzle/migrations`.
- Keep migration history consistent with code changes.

## Commit Guidance

- Conventional Commit style is recommended.
- Document new environment variables and operational impacts in PR notes.
