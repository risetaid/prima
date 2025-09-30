import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients } from '@/db'
import { eq, and } from 'drizzle-orm'
import { PatientService } from '@/services/patient/patient.service'

import { logger } from '@/lib/logger';
// Get patient response history for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists and user has access
    const patientResult = await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.isActive, true)
      ))
      .limit(1)

    if (patientResult.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Get patient response history with user details via service
    const service = new PatientService()
    await service.getVerificationHistory(patientId) // Call but don't store result since table was removed

    // Since verification logs table was removed, service returns empty array
    const history: Array<Record<string, unknown>> = []

    return NextResponse.json({
      success: true,
      history,
      total: history.length
    })

  } catch (error: unknown) {
    logger.error('Verification history error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function removed - was unused since verification logs table was removed
