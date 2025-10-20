# Remove Unit Tests — Tasks

## Ordered Implementation Tasks

- [x] **1. Update tsconfig.json**

  - **Goal:** Remove tests from exclude array
  - **Acceptance:** tsconfig.json no longer excludes tests directory
  - **Status:** COMPLETED — Tests removed from exclude array
  - **Effort:** 1 min

- [x] **2. Clean package.json**

  - **Goal:** Remove all test-related scripts and ensure no test dependencies remain
  - **Note:** Check for vitest, @vitest, and any test-related packages in devDependencies
  - **Acceptance:** No test scripts in package.json; no test packages in devDependencies
  - **Status:** COMPLETED — No test-related scripts or dependencies present
  - **Effort:** 2 min

- [x] **3. Clean bunfig.toml**

  - **Goal:** Remove [test] section and test-related configuration
  - **Acceptance:** bunfig.toml has no [test] block
  - **Status:** COMPLETED — [test] section removed
  - **Effort:** 1 min

- [x] **4. Delete tests/ directory**

  - **Goal:** Remove entire tests directory tree
  - **Note:** This includes all subdirectories: fixtures/, helpers/, integration/, mocks/, and all .ts files
  - **Acceptance:** `tests/` folder does not exist in workspace
  - **Status:** COMPLETED — tests/ directory deleted
  - **Effort:** 1 min

- [x] **5. Verification**
  - **Goal:** Ensure no test artifacts or references remain
  - **Verification Steps:**
    - ✅ tests/ directory confirmed not to exist
    - ✅ bunfig.toml confirmed clean (no [test] block)
    - ✅ tsconfig.json confirmed clean (tests removed from exclude)
    - ✅ No lingering test infrastructure references
  - **Acceptance:** No test-related configuration, no dangling references
  - **Status:** COMPLETED — All verification checks passed
  - **Effort:** 5 min

## Summary

All tasks have been completed successfully. The PRIMA codebase is now completely free of unit testing infrastructure.
