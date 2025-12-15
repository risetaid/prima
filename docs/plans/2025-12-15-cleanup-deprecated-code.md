# Cleanup Deprecated Code Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove deprecated WhatsApp providers (WAHA, Fonnte), dead code (performance-monitor), and consolidate duplicate functionality to reduce codebase by ~2,000+ lines.

**Architecture:** Delete deprecated provider files and their webhook routes. Update tests to use GOWA. Remove unused utility files. No functional changes to the active GOWA provider.

**Tech Stack:** TypeScript, Next.js, Drizzle ORM, Bun

---

## Phase 1: Remove Dead Code (Completely Unused)

### Task 1: Delete performance-monitor.ts

**Files:**
- Delete: `src/lib/performance-monitor.ts`

**Step 1: Verify no imports exist**

Run: `bun run grep -r "performance-monitor" src/`
Expected: No matches (already verified - file is completely unused)

**Step 2: Delete the file**

```bash
rm src/lib/performance-monitor.ts
```

**Step 3: Run type check to verify no breakage**

Run: `bunx tsc --noEmit`
Expected: PASS (no errors related to performance-monitor)

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused performance-monitor.ts (287 lines)"
```

---

## Phase 2: Remove Deprecated WAHA Provider

### Task 2: Delete WAHA library file

**Files:**
- Delete: `src/lib/waha.ts`

**Step 1: Verify only test imports exist**

The only imports are in `tests/comprehensive-suite/whatsapp.test.ts` (lines 164, 503).
These tests need to be updated to use GOWA instead.

**Step 2: Delete the WAHA library file**

```bash
rm src/lib/waha.ts
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated waha.ts library (248 lines)"
```

---

### Task 3: Delete WAHA webhook route

**Files:**
- Delete: `src/app/api/webhooks/waha/route.ts`
- Delete: `src/app/api/webhooks/waha/` (directory)

**Step 1: Delete the webhook route**

```bash
rm -rf src/app/api/webhooks/waha
```

**Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated WAHA webhook route (402 lines)"
```

---

## Phase 3: Remove Deprecated Fonnte Provider

### Task 4: Delete Fonnte library file

**Files:**
- Delete: `src/lib/fonnte.ts`

**Step 1: Verify no active imports**

Run: `bun run grep -r "from.*fonnte" src/`
Expected: No matches in src/ (only webhook route uses it internally)

**Step 2: Delete the Fonnte library file**

```bash
rm src/lib/fonnte.ts
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated fonnte.ts library (239 lines)"
```

---

### Task 5: Delete Fonnte webhook route

**Files:**
- Delete: `src/app/api/webhooks/fonnte/incoming/route.ts`
- Delete: `src/app/api/webhooks/fonnte/` (directory)

**Step 1: Delete the webhook route**

```bash
rm -rf src/app/api/webhooks/fonnte
```

**Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated Fonnte webhook route (320 lines)"
```

---

## Phase 4: Update Tests

### Task 6: Update whatsapp.test.ts to use GOWA

**Files:**
- Modify: `tests/comprehensive-suite/whatsapp.test.ts:164`
- Modify: `tests/comprehensive-suite/whatsapp.test.ts:503`

**Step 1: Update imports from waha to gowa**

Change line 164:
```typescript
// Before
const { formatWhatsAppNumber } = await import("@/lib/waha");

// After
const { formatWhatsAppNumber } = await import("@/lib/gowa");
```

Change line 503:
```typescript
// Before
const { formatWhatsAppNumber } = await import("@/lib/waha");

// After
const { formatWhatsAppNumber } = await import("@/lib/gowa");
```

**Step 2: Run tests to verify**

Run: `bun test tests/comprehensive-suite/whatsapp.test.ts`
Expected: PASS (formatWhatsAppNumber has identical implementation in GOWA)

**Step 3: Commit**

```bash
git add -A
git commit -m "test: update whatsapp tests to use GOWA instead of deprecated WAHA"
```

---

## Phase 5: Clean Up Environment Variables (Documentation)

### Task 7: Update CLAUDE.md to remove deprecated env vars

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Remove deprecated environment variables section**

Remove these lines from the Environment Variables section:
```markdown
**Legacy (deprecated):**
- `WAHA_API_KEY`, `WAHA_ENDPOINT`, `WAHA_SESSION` - Old WAHA provider (no longer used)
```

**Step 2: Commit**

```bash
git add -A
git commit -m "docs: remove deprecated WAHA env vars from CLAUDE.md"
```

---

## Phase 6: Final Verification

### Task 8: Run full type check and lint

**Step 1: Run type check**

Run: `bunx tsc --noEmit`
Expected: PASS

**Step 2: Run lint**

Run: `bun run lint`
Expected: PASS (or only pre-existing warnings)

**Step 3: Run precommit**

Run: `bun run precommit`
Expected: PASS

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: cleanup after removing deprecated WhatsApp providers"
```

---

## Summary of Removed Code

| File | Lines | Status |
|------|-------|--------|
| `src/lib/performance-monitor.ts` | 287 | Dead code (unused) |
| `src/lib/waha.ts` | 248 | Deprecated provider |
| `src/app/api/webhooks/waha/route.ts` | 402 | Deprecated webhook |
| `src/lib/fonnte.ts` | 239 | Deprecated provider |
| `src/app/api/webhooks/fonnte/incoming/route.ts` | 320 | Deprecated webhook |
| **TOTAL** | **~1,496** | Removed |

## What Remains (Active Code)

- `src/lib/gowa.ts` - Active WhatsApp provider (680 lines)
- `src/app/api/webhooks/gowa/route.ts` - Active webhook handler

## Future Considerations (Not in Scope)

These items were identified but are NOT part of this cleanup:
1. Renaming `wahaMessageId` column to `externalMessageId` (requires migration)
2. Removing over-engineered utilities (circuit-breaker, recovery, atomic-storage) - need usage analysis
3. Breaking down monolithic files (1000+ line files) - separate refactoring task
