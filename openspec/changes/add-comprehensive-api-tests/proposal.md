# Proposal: Add Comprehensive API Unit Tests

## Why

The PRIMA system currently has **zero unit test coverage** for its 34+ API endpoints and critical Fonnte webhook handler. This introduces significant risk:

- **Regressions undetected** during refactoring or dependency updates
- **API contract violations** between frontend and backend unidentified
- **Webhook failures** (WhatsApp integration failures) not caught until production
- **Security gaps** in authentication and validation paths untested
- **Database migrations** may silently break endpoints

Comprehensive unit tests provide:

1. **Confidence** during refactoring and upgrades
2. **Documentation** of API contracts through executable examples
3. **Early detection** of breaking changes
4. **Regression prevention** for critical flows (reminders, patient management, WhatsApp)
5. **CI/CD foundation** for deployment safety gates

## What Changes

### New capabilities:

- **Test infrastructure** (Vitest, test helpers, mocking utilities)
- **API endpoint tests** (34+ endpoints covering CRUD, auth, validation, error paths)
- **Webhook integration tests** (Fonnte incoming handler with idempotency, deduplication)
- **Test documentation** (comprehensive DOCX with strategy, coverage, setup)

### Affected code layers:

- `src/app/api/**/*.ts` - All API routes (34 endpoints)
- `src/app/api/webhooks/fonnte/incoming/route.ts` - Critical webhook handler
- `tests/` - New test directory (comprehensive unit tests)
- `vitest.config.ts` - New test configuration
- `package.json` - New dev dependencies (Vitest, testing utilities)

### Files modified/created:

- `vitest.config.ts` ← NEW
- `tests/` ← NEW (40+ test files, ~2000+ test cases)
- `tests/helpers/` ← NEW (test utilities, mocks, fixtures)
- `package.json` ← Modified (add Vitest, testing dependencies)
- `API_TESTS.docx` ← NEW (comprehensive documentation)

## Impact

### Scope:

- **Breaking changes:** None
- **Dependencies added:** `vitest`, `@testing-library/*`, `nock`, `dotenv` (dev-only)
- **Runtime impact:** None (tests are build-time only)

### Affected capabilities:

- `api-core` - All API endpoints tested
- `webhook-integration` - Fonnte webhook fully tested
- `authentication` - Auth flows tested
- `validation` - Input validation tested
- `database-access` - DB interactions tested with mocks

### Benefits:

1. **Medical-grade reliability** - Critical patient data flows tested
2. **Deployment safety** - CI/CD gate prevents regressions
3. **Team velocity** - Refactoring confidence increases
4. **Onboarding** - New developers understand API contracts via tests
5. **Documentation** - Tests serve as living API documentation

### Risks (mitigated):

- **Maintenance burden:** Tests kept simple, focused, and maintainable
- **Flakiness:** All async operations properly awaited, timeouts set correctly
- **Mock drift:** Integration with real Zod schemas ensures mocks stay in sync

## Timeline

- **Phase 1** (Setup): Vitest config + test infrastructure (30 min)
- **Phase 2** (Core APIs): Patient, user, health endpoints (1 hour)
- **Phase 3** (CMS/Content): Article, video, content endpoints (45 min)
- **Phase 4** (Webhooks): Fonnte + Clerk webhook tests (45 min)
- **Phase 5** (Documentation): DOCX generation (30 min)

**Total estimate:** ~4 hours for complete coverage + documentation

---

## Implementation Notes

- Tests use **Vitest** (Bun-native, faster than Jest)
- Mocking via **MSW/nock** for HTTP, **Drizzle mocks** for DB
- Tests follow **AAA pattern** (Arrange, Act, Assert)
- Real **Zod schemas** used to ensure validation accuracy
- **Fonnte webhook** tests include idempotency and deduplication verification
