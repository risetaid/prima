# State Management Patterns (main)

## Frontend State Patterns

- App-wide auth state is managed with React Context (`src/lib/auth-context.tsx`).
- Provider composition is centralized in `src/components/providers/app-providers.tsx`.
- Form state follows `react-hook-form` + wrapper components (`src/components/ui/form.tsx`).
- Feature-local state is primarily component-local (`useState`/hooks) in feature components.

## Backend and Server State Patterns

- Route-level operations delegate to service modules in `src/services/**`.
- Background and reliability-related state uses Redis-backed helpers (`src/lib/redis.ts`, `src/lib/response-cache.ts`).
- Reminder and conversation flow state is modeled in dedicated service modules.

## Observed Characteristics

- No Redux/Zustand/MobX global store detected.
- Context + service-layer boundaries are the primary state management strategy.
