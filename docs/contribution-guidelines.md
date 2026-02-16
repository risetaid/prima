# Contribution Guidelines (Extracted)

This project does not include a standalone `CONTRIBUTING.md`; guidance is inferred from repository scripts and `README.md`.

## Working Conventions

- Use **Bun** commands for dependency and script execution.
- Keep schema and migration updates aligned (`src/db` + `drizzle/migrations`).
- Run lint and typecheck before commit (`bun run lint`, `bunx tsc --noEmit`).
- Prefer service-layer logic for API handler business workflows.

## Commit and PR Expectations

- Conventional Commits are recommended.
- Document new environment variables in PR descriptions.
- Include migration updates when schema changes are introduced.
