# UI Component Inventory (main)

## Summary

- Total discovered component files under `src/components`: 96
- UI primitive library folder: `src/components/ui`
- Domain-oriented component folders: `admin`, `auth`, `cms`, `content`, `dashboard`, `patient`, `pengingat`, `reminder`, `volunteer`

## Component Categories

### UI Primitives (`src/components/ui`)

- Inputs/forms: `input.tsx`, `textarea.tsx`, `select.tsx`, `form.tsx`, `label.tsx`
- Feedback/status: `alert.tsx`, `badge.tsx`, `toast.tsx`, `loading-spinner.tsx`
- Layout/nav: `header.tsx`, `mobile-header.tsx`, `desktop-header.tsx`, `navigation.tsx`, `breadcrumb.tsx`
- Overlay/dialog: `dialog.tsx`, `confirmation-modal.tsx`, `alert-modal.tsx`

### Feature Modules

- Admin: user management, template management, actions, previews.
- Patient: profile tabs, verification workflows, reminders, history.
- Reminder/Pengingat: scheduling, editing, message composition, recurrence.
- CMS/Content: article/video forms, editor support, publish settings.
- Dashboard: list/summary widgets and patient interaction surfaces.

### Cross-Cutting

- Providers: app provider composition in `src/components/providers/app-providers.tsx`.
- Performance instrumentation: `src/components/performance/web-vitals.tsx`.

## Design System Notes

- Stack is based on Tailwind + Radix primitives with custom wrappers.
- Shared UI components indicate a reusable internal design system approach.
