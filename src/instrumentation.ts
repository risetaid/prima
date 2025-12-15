// src/instrumentation.ts
// Next.js 15 instrumentation hook - runs on application startup

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./lib/env-validator');
    
    try {
      validateEnvironment();
    } catch (error) {
      // Log but don't crash in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }
}
