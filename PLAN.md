# Plan: Remove Tests and Unused Libraries

This document describes a precise, safe, and verifiable plan to remove all tests and testing libraries from this repository, along with a lightweight audit for unused libraries. Follow steps in order and validate after each phase.

## Scope
- Remove all test files and test-only helpers.
- Remove Jest config, setup, and test devDependencies.
- Update TypeScript config and documentation to reflect the removal.
- Remove CI test steps/jobs if present.
- Audit and remove truly unused libraries (conservative approach).

## Preconditions
- Ensure you are on a clean working tree: `git status` must show no local changes you want to keep uncommitted.
- You have permission to push a branch and open a PR.

---

## 1) Align Scope and Risks
- Confirm the team agrees to remove the entire test suite and all Jest-related tooling.
- Acknowledge risk: you lose automated regressions checks; rely on build, type checks, manual QA.

## 2) Create Branch and Backup
- Create a working branch:
  - `git checkout -b chore/remove-tests-and-unused-libs`
- Optional: backup test artifacts and configs (for easy rollback/reference):
  - `tar -czf backup-tests-$(date +%F).tar.gz src/__tests__ src/services/reminder/reminder.test.ts jest.config.js jest.setup.js 2>/dev/null || true`

## 3) Inventory Tests and Fixtures
- Known test files in this repo:
  - `src/__tests__/rate-limiter.test.ts`
  - `src/__tests__/auth-race-conditions.test.ts`
  - `src/__tests__/compliance-service.test.ts`
  - `src/services/reminder/reminder.test.ts`
- Sanity scan for more:
  - `rg -n "__tests__|\.test\.(t|j)sx?$|\.spec\.(t|j)sx?$" -g '!node_modules'`
  - `rg -n "__mocks__|jest\.mock\(|@testing-library" -g '!node_modules'`

## 4) Delete Test Files and Folders
- Remove the files identified above:
  - `git rm -f src/__tests__/rate-limiter.test.ts`
  - `git rm -f src/__tests__/auth-race-conditions.test.ts`
  - `git rm -f src/__tests__/compliance-service.test.ts`
  - `git rm -f src/services/reminder/reminder.test.ts`
- If additional tests/fixtures are found in step 3, remove them too.

## 5) Remove Jest Config and Setup
- Delete Jest setup and config files:
  - `git rm -f jest.config.js`
  - `git rm -f jest.setup.js`
- Optional: if `/coverage` is only used by Jest, remove from `.gitignore` (harmless to keep):
  - Open `.gitignore` and remove the `/coverage` line if desired.

## 6) Drop Jest Types from TypeScript
- Edit `tsconfig.json` and update `compilerOptions.types` to remove Jest entries.
- From:
  - `"types": ["node", "jest", "@types/jest"]`
- To:
  - `"types": ["node"]`

## 7) Prune Test DevDependencies
- Remove test-only devDependencies:
  - `bun remove -D @testing-library/jest-dom @testing-library/react @testing-library/user-event @types/jest jest-environment-jsdom`
- Install to refresh lockfile:
  - `bun install`

## 8) Remove Test Scripts and Docs
- Update documentation to remove test instructions and references:
  - `README.md`: remove sections/lines mentioning `bunx jest`, coverage, or watching tests.
  - `AGENTS.md`: remove “Tests” commands and “Testing Guidelines” that reference Jest.
  - `CLAUDE.md`: remove test-related commands and steps.
- If any package scripts refer to tests, remove them (none present at the moment).

## 9) Delete CI Test Workflows/Steps (If Present)
- Check for GitHub Actions or other CI configs:
  - Inspect `.github/workflows/*` for jobs invoking `jest` or test commands.
  - Remove entire test jobs or just steps that run tests.
- If tests were required checks, update branch protection rules accordingly.

## 10) Search for "jest" and Test Remnants
- Ensure nothing lingering remains:
  - `rg -n "\b(jest|testing-library|describe|it|expect)\b" -g '!node_modules'`
  - `rg -n "jest\.config|jest\.setup|__tests__|\.test\.|\.spec\." -g '!node_modules'`

## 11) Audit Imports for Unused Runtime Libraries
- Quick static import audit (informational):
  - `rg -no --hidden "^\s*import\s+.*?from\s+['\"]([^\./][^'\"]*)['\"]|^\s*require\(['\"]([^\./][^'\"]*)['\"]\)" src | sed -E "s/.*from ['\"]([^'\"]+)['\"]/\1/; s/.*require\(['\"]([^'\"]+)['\"]\)/\1/" | cut -d'/' -f1 | sort -u`
- Optional automated audit (verify results manually; Next.js can resolve dynamically):
  - `npx depcheck`
  - or `npx knip`
- Only remove a dependency if confidently unused in app/runtime code.

## 12) Remove Truly Unused Dependencies (Conservative)
- For each confirmed-unused package:
  - `bun remove <package>`
- Reinstall to normalize lockfile:
  - `bun install`

## 13) Build and Lint
- Ensure the app still builds and types are sound:
  - `bun run build`
  - `bun run lint`

## 14) Run Dev and Manual Smoke
- Start dev server and manually check critical flows:
  - `bun run dev`
- Suggested manual checks:
  - Authentication-protected routes (Clerk integration).
  - Dashboard and patient pages.
  - Reminder pages and actions.
  - Upload endpoint used by TinyMCE.

## 15) Commit Changes
- Make small, focused commits:
  - `git add -A`
  - `git commit -m "chore(tests): remove Jest config, setup, and all test files"`
  - `git commit -m "chore(deps): remove test libraries and types"` (if separate)
  - `git commit -m "chore(tsconfig): drop Jest types"`
  - `git commit -m "docs: remove test commands and references"`
  - `git commit -m "ci: remove test jobs and steps"` (if applicable)

## 16) Open PR with Notes
- Open a PR titled: "chore: remove tests and unused testing libraries".
- Include:
  - Summary of what was removed and why.
  - Risks and validation performed (build, lint, smoke checks).
  - Any CI changes and branch protection updates needed.

---

## Validation Checklist
- [ ] All test files removed; no `__tests__`, `.test.`, `.spec.` matches remain.
- [ ] `jest.config.js` and `jest.setup.js` removed.
- [ ] `tsconfig.json` no longer references Jest types.
- [ ] Test devDependencies removed; `bun install` succeeds.
- [ ] Docs no longer reference `bunx jest` or coverage.
- [ ] CI has no steps running tests (if applicable).
- [ ] `bun run build` and `bun run lint` both pass.
- [ ] Key routes load and basic actions work in dev.

## Rollback Plan
- Checkout previous commit or branch to restore tests and tooling: `git checkout main && git revert -m 1 <merge_commit_sha>` or `git revert <range>` as appropriate.
- Alternatively, restore from the backup tarball created in step 2.

