# Data Models (main)

Scan mode: quick (schema/migration file inventory).

## Primary Schema Files

- `src/db/schema.ts` - aggregated database schema exports.
- `src/db/core-schema.ts` - core domain entities.
- `src/db/reminder-schema.ts` - reminder-specific entities.
- `src/db/content-schema.ts` - content/CMS entities.
- `src/db/enums.ts` - shared enum definitions.
- `src/db/index.ts` - DB entry/export module.

## Migration Sources

- SQL migrations in `drizzle/migrations`.
- Rollback and feature migrations in `src/db/migrations`.
- Drizzle metadata snapshots in `drizzle/migrations/meta`.

## Database Platform and Tooling

- Dialect: PostgreSQL (`drizzle.config.ts`).
- ORM/migration stack: `drizzle-orm` + `drizzle-kit`.
- Schema source configured at `./src/db/schema.ts`.

## Data Architecture Notes

- The project uses migration-first schema evolution.
- Domain separation exists between core, reminder, and content schemas.
- DB automation scripts exist for generation, migration, and index optimization.
