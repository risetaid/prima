Migration Plan: Dashboard → New Routes

Scope
- Move user-facing routes from `/dashboard/...` to new top‑level paths.
- Preserve subpages and dynamic routes; maintain shared layout shell.
- Update navigation, breadcrumbs, middleware (RBAC), and add redirects.

Route Mapping (Old → New)
- `/dashboard` → `/pasien`
- `/dashboard/pengingat/**` → `/pengingat/**`
- `/dashboard/berita/**` → `/berita/**`
- `/dashboard/video/**` → `/video-edukasi/**`
- `/dashboard/cms/**` → `/cms/**`
- `/dashboard/admin/**` → `/admin/**`
- Any other `/dashboard/<subpath>` → `/pasien/<subpath>` (subject to confirmation; see Decision Points)

Decision Points (confirm before implementation)
- Flattening patients: should existing `/dashboard/pasien` become the new root `/pasien` (i.e., move its `page.tsx` up) or live under `/pasien/pasien`? Recommended: flatten to `/pasien`.
- Dev‑only routes: what is the desired destination for `/dashboard/test-whatsapp`? Proposal: `/pasien/test-whatsapp` or remove if not needed in prod.

Assumptions
- API routes remain under `src/app/api/**` and are not renamed (e.g., `/api/dashboard/overview` can remain; it doesn’t affect user URLs).
- A common shell is provided by `src/app/dashboard/layout.tsx`; we will extract/preserve this shell via a route group so URLs do not include the group name.

Phases

Phase 0 — Preparation
- Create a working branch; ensure `bun install` completes and dev server runs.
- Run `bun run build` to capture a baseline and surface type errors.
- Inventory the current tree under `src/app/dashboard/**` and note special files: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`.

Phase 1 — Inventory and Audit
- List all subroutes present today:
  - `src/app/dashboard/{admin,berita,cms,pasien,pengingat,video,test-whatsapp}`
- Search code for hardcoded `"/dashboard"` usage in:
  - `src/components/**` (navigation, breadcrumbs, buttons, redirects)
  - `src/app/**` (server actions, redirects, static params)
  - `src/middleware.ts` and `src/middleware/**`
- Collect a change list to update these references after moves.

Phase 2 — Layout Strategy
- Extract the shared dashboard shell `src/app/dashboard/layout.tsx` into a route group to keep the shell without changing URLs:
  - Create `src/app/(shell)/layout.tsx` and move the shell there (or re‑export if identical).
  - New routes will live under `src/app/(shell)/{pasien,pengingat,berita,video-edukasi,cms,admin}`.
- Retain section‑specific layouts (e.g., `dashboard/cms/layout.tsx`, `dashboard/pengingat/layout.tsx`) by moving them with their subtree.

Phase 3 — Define Exact File Moves
- Top‑level destinations:
  - `src/app/dashboard/pengingat` → `src/app/pengingat`
  - `src/app/dashboard/berita` → `src/app/berita`
  - `src/app/dashboard/video` → `src/app/video-edukasi`
  - `src/app/dashboard/cms` → `src/app/cms`
  - `src/app/dashboard/admin` → `src/app/admin`
  - Remaining `src/app/dashboard/*` (including `page.tsx`) → `src/app/pasien/*`
- If flattening patients is approved:
  - Move `src/app/dashboard/pasien/page.tsx` to `src/app/pasien/page.tsx` (replace or merge with any placeholder).
  - Move/merge `src/app/dashboard/page.tsx` content if it duplicates patient overview.
- Keep API routes under `src/app/api/**` unchanged; verify no API routes are nested under `src/app/dashboard`.

Phase 4 — Implement Moves and Route Group
- Create `src/app/(shell)/layout.tsx` by moving the shell from `src/app/dashboard/layout.tsx`.
- Place each new top‑level route directory under `(shell)` so the shell wraps them without affecting the URL:
  - `src/app/(shell)/pasien`, `src/app/(shell)/pengingat`, `src/app/(shell)/berita`, `src/app/(shell)/video-edukasi`, `src/app/(shell)/cms`, `src/app/(shell)/admin`.
- Physically move files from Phase 3 to their mapped destinations, preserving any `layout.tsx` present in subtrees.
- Remove the now‑empty `src/app/dashboard` directory after verification.

Phase 5 — Update Links, Imports, and Navigation
- Replace all `href`/`router.push`/`redirect` pointing to `/dashboard...` with the new paths.
- Centralize route strings to avoid drift:
  - Add `src/lib/routes.ts` (e.g., `export const routes = { pasien: '/pasien', pengingat: '/pengingat', berita: '/berita', video: '/video-edukasi', cms: '/cms', admin: '/admin' }`).
  - Refactor components to use these constants where reasonable.
- Update active‑state logic and pathname checks to match new prefixes.
- Key places to touch (from grep):
  - `src/components/ui/desktop-header.tsx`
  - `src/components/ui/mobile-admin-actions.tsx`
  - `src/components/ui/navigation.tsx`, `src/components/ui/mobile-header.tsx`
  - `src/components/ui/back-button.tsx`
  - `src/components/ui/breadcrumb.tsx`
  - `src/components/dashboard/**` (buttons and router pushes)
  - `src/components/cms/**` (links to CMS routes)
  - Any `redirect("/dashboard...")` in server components/actions.

Phase 6 — Breadcrumbs and Labels
- Update breadcrumb base and labels to reflect new IA:
  - Base becomes `/pasien` instead of `/dashboard` for patient pages.
  - Map: `pengingat → Pengingat Obat`, `berita → Berita`, `video-edukasi → Video Edukasi`, `cms → Manajemen Konten`, `admin → Administrasi`.
- Adjust any special breadcrumb generators in `src/components/ui/breadcrumb.tsx`.

Phase 7 — Middleware and RBAC
- Update protected route matcher in `src/middleware.ts`:
  - Replace `'/dashboard(.*)'` with `'^/(pasien|pengingat|berita|video-edukasi|cms|admin)(.*)$'` style entries.
- Remove or invert the legacy redirect currently sending `/pengingat` → `/dashboard/pengingat`.
- Ensure `/admin/**` remains restricted to `ADMIN`/`DEVELOPER`; adjust any role guards that key off pathnames.

Phase 8 — Redirects (preserve old links)
- Add permanent redirects in `next.config.ts`:
  - `/dashboard` → `/pasien` (status 308)
  - `/dashboard/pengingat/:path*` → `/pengingat/:path*`
  - `/dashboard/berita/:path*` → `/berita/:path*`
  - `/dashboard/video/:path*` → `/video-edukasi/:path*`
  - `/dashboard/cms/:path*` → `/cms/:path*`
  - `/dashboard/admin/:path*` → `/admin/:path*`
  - Catch‑all: `/dashboard/:path*` → `/pasien/:path*`
- Keep redirects for at least one release cycle; monitor 404s and redirect counts.

Phase 9 — SEO and Content
- If a sitemap is present, update to include new URLs and remove `/dashboard...`.
- Review any `metadata` exports for canonical/OG URLs and update as needed.
- Update internal links in content (`src/app/content/**`) if they reference `/dashboard...`.

Phase 10 — Caching, Webhooks, and Integrations
- If cache keys include path segments, update them and add backward‑compat invalidation.
- Review any webhooks or external services that call back to `/dashboard...` and update.

Phase 11 — Build, Lint, and Type Check
- Run `bun run build` and fix any route import/type issues exposed by moves.
- Run `bun run lint` and resolve path/unused import warnings.

Phase 12 — QA and Verification
- Manual QA checklist across all sections:
  - Pages render in new locations (page/loading/error/not‑found still wired).
  - Dynamic routes (`[id]`, `[[...slug]]`) navigate correctly and params resolve.
  - Navigation active states and visibility by role are correct.
  - Breadcrumbs show the new hierarchy and links work.
  - Middleware protects all intended routes; `/admin/**` remains restricted.
  - Redirects return 308 and land on the correct page.
  - API endpoints under `/api/**` still function; UI calls succeed.

Phase 13 — Cleanup and Docs
- Remove any leftover `src/app/dashboard/**` artifacts.
- Replace remaining inline path strings with `src/lib/routes.ts` constants where high‑impact.
- Update README/internal docs/screenshots to reference the new URLs.

Phase 14 — Deploy and Monitor
- Deploy; verify build and runtime logs.
- Monitor 404s and redirect hits; fix stragglers if discovered.

Acceptance Criteria
- All `/dashboard...` URLs permanently redirect to the correct new paths.
- New routes (`/pasien`, `/pengingat`, `/berita`, `/video-edukasi`, `/cms`, `/admin`) render with the intended shared shell and section layouts.
- RBAC enforcement on new prefixes matches previous behavior.
- Navigation, breadcrumbs, and deep links work across all subpages.
- Build and lint pass with TypeScript strict enabled.

Appendix — Quick File Map (current tree)
- Shared shell: `src/app/dashboard/layout.tsx`
- Subsections:
  - `src/app/dashboard/pasien/{layout.tsx,page.tsx}`
  - `src/app/dashboard/pengingat/{layout.tsx,page.tsx}`
  - `src/app/dashboard/berita/page.tsx`
  - `src/app/dashboard/video/page.tsx`
  - `src/app/dashboard/cms/{layout.tsx,page.tsx}`
  - `src/app/dashboard/admin/page.tsx`
- Middleware: `src/middleware.ts` (protects `/dashboard(.*)` and redirects `/pengingat → /dashboard/pengingat`)
- Navigation and breadcrumbs to update:
  - `src/components/ui/desktop-header.tsx`
  - `src/components/ui/mobile-admin-actions.tsx`
  - `src/components/ui/navigation.tsx`
  - `src/components/ui/mobile-header.tsx`
  - `src/components/ui/back-button.tsx`
  - `src/components/ui/breadcrumb.tsx`
  - `src/components/dashboard/**` and `src/components/cms/**`

Notes
- Use a route group `(shell)` to preserve the current shell across all new top‑level routes without affecting URL paths.
- Prefer absolute paths in `Link href` to avoid relative path breakage after moves.
- Add `src/lib/routes.ts` to centralize route constants and reduce future churn.
