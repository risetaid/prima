/**
 * Circuit Breaker Admin Endpoint
 *
 * Internal endpoint for monitoring and managing circuit breakers.
 * REQUIRES: X-API-Key header
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllCircuitBreakerStates, resetAllCircuitBreakers } from '@/lib/circuit-breaker';

export async function GET(request: NextRequest) {
  // Verify API key
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return all circuit breaker states
  const states = getAllCircuitBreakerStates();

  return NextResponse.json({
    circuitBreakers: states,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  // Verify API key
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Reset all circuit breakers
  resetAllCircuitBreakers();

  return NextResponse.json({
    success: true,
    message: 'All circuit breakers have been reset',
    timestamp: new Date().toISOString(),
  });
}
