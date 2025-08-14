import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  try {
    // Intentionally throw an error to test Sentry
    throw new Error('Test Sentry error from API route - this is intentional!')
  } catch (error) {
    // Capture the error with Sentry
    Sentry.captureException(error)
    
    return NextResponse.json({
      message: 'Error thrown and captured by Sentry',
      error: error instanceof Error ? error.message : 'Unknown error',
      sentryEventId: Sentry.lastEventId(),
    }, { status: 500 })
  }
}