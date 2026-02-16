# Deployment Guide

## Current Deployment Signals

- Next.js standalone output (`next.config.ts`).
- PWA registration via `next-pwa`.

## Build

```bash
bun build
```

## Start

```bash
bun start
```

## Observed Gaps

- No CI/CD manifest files detected in standard locations.
- No container/IaC files detected in standard root-level patterns.

## Recommendation

If release automation is required, add a pipeline definition (e.g., GitHub Actions) and deployment runbook aligned to the target host.
