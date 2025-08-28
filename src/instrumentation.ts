import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Completely disable instrumentation in development to avoid critical dependency warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
  } else {
    // Development mode - no instrumentation
    console.log('🔧 Development mode: Instrumentation disabled to prevent warnings');
  }
}

export const onRequestError = process.env.NODE_ENV === 'production' 
  ? Sentry.captureRequestError 
  : undefined;
