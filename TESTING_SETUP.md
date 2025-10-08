# Testing Setup Instructions

## Required Dependencies

Please install the following dependencies to enable testing:

```bash
bun add -d vitest @vitest/coverage-v8 @vitest/ui
```

## Test Scripts

Add the following scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Usage

- `bun test` - Run tests in watch mode
- `bun run test:run` - Run tests once
- `bun run test:ui` - Open Vitest UI in browser
- `bun run test:coverage` - Run tests with coverage report

## Configuration

- `vitest.config.ts` - Vitest configuration
- `tests/setup.ts` - Global test setup file
- Tests should be placed in `__tests__` folders or named `*.test.ts` / `*.spec.ts`
