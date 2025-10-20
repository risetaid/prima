# Remove Unit Tests — Proposal

## Summary

Fully remove all unit testing infrastructure from the PRIMA codebase. This includes:

- Removal of the `tests/` directory and all test files
- Removal of Vitest configuration and dependencies
- Removal of test-related npm/bun scripts
- Removal of test setup and configuration files
- Removal of test exclusions from configuration files

## Rationale

The project currently has testing infrastructure (Vitest) that is no longer in use or maintained. Removing it reduces:

- Maintenance burden
- Dependency count
- Development environment complexity
- Build and installation time

## Scope

This is a complete removal with no phased approach—all test infrastructure is removed atomically.

## Related Capabilities

- `testing-infrastructure`: Capability that defines how testing should work (being removed entirely)

## Implementation Order

1. Update `tsconfig.json` to remove tests exclusion
2. Remove test scripts from `package.json`
3. Remove test configuration from `bunfig.toml`
4. Delete the entire `tests/` directory
5. Remove Vitest from `devDependencies` (if still present)

## Validation

- Confirm `tests/` directory does not exist
- Confirm no test-related configuration remains in config files
- Confirm build completes successfully
- Confirm `bun install` works without issues
