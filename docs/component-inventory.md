# Component Inventory

## Summary

- Source: `src/components/**`
- Estimated component files: 96
- Main style system: Tailwind + Radix wrappers

## Core UI Primitive Layer

Located in `src/components/ui`, including:

- controls: button, input, select, textarea, tabs
- layout/nav: header variants, breadcrumb, navigation
- feedback: alert, badge, toast, loading spinner
- overlays: dialog, confirmation/alert modals

## Feature Component Domains

- `src/components/admin` - user and template management surfaces
- `src/components/patient` - patient profile, verification, reminders
- `src/components/pengingat` - reminder dashboard and list interactions
- `src/components/reminder` - reminder composer/editor flows
- `src/components/cms` - article/video publishing interfaces
- `src/components/dashboard` - overview and list-focused dashboard widgets
- `src/components/auth` - auth UX and route guard support

## Composition and Providers

- `src/components/providers/app-providers.tsx` centralizes provider assembly.
- Shared UI primitives are consumed across domain modules for consistency.
