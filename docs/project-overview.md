# prima-system - Project Overview

**Date:** 2026-02-16
**Type:** Web application (single-part monolith)
**Architecture:** Next.js App Router layered monolith

## Executive Summary

`prima-system` is a healthcare-focused platform for patient records, reminders, and educational content workflows. It combines frontend pages, API handlers, and service/data layers in one codebase, optimized around Next.js App Router and TypeScript.

## Project Classification

- Repository type: monolith
- Project type id: web
- Primary language: TypeScript
- Key framework: Next.js + React

## Technology Highlights

- Next.js 15 + React 19
- Drizzle ORM + PostgreSQL
- Clerk authentication
- Tailwind + Radix-based UI system
- Vitest/testing-library test stack

## Key Feature Domains

- Patient lifecycle and profile management
- Reminder scheduling and confirmation workflows
- CMS/content management for educational media
- Admin tooling (users, templates, analytics)
- Webhooks and background/worker-related integrations

## Development Snapshot

- Runtime toolchain: Bun
- Typical commands: `bun dev`, `bun build`, `bun start`, `bun run lint`
- DB commands: `db:generate`, `db:migrate`, `db:push`, `db:studio`

## Related Documentation

- `index.md`
- `architecture.md`
- `source-tree-analysis.md`
- `api-contracts.md`
- `data-models.md`
- `component-inventory.md`
- `development-guide.md`
