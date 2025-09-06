import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, verificationLogs } from '@/db'
import { eq } from 'drizzle-orm'

// Reactivate patient after BERHENTI (unsubscribe)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Get current patient status
    const patientResult = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (patientResult.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patient = patientResult[0]

    // Validate patient can be reactivated
    if (patient.isActive) {
      return NextResponse.json(
        { error: 'Patient is already active' },
        { status: 400 }
      )
    }

    if (patient.verificationStatus !== 'declined') {
      return NextResponse.json(
        { error: 'Patient cannot be reactivated. Only declined patients can be reactivated.' },
        { status: 400 }
      )
    }

    // Reactivate patient - reset to pending verification state
    const updateData = {
      isActive: true,
      verificationStatus: 'pending_verification' as const,
      verificationSentAt: null,
      verificationResponseAt: null,
      verificationMessage: null,
      verificationAttempts: '0',
      verificationExpiresAt: null,
      updatedAt: new Date()
    }

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId))

    // Log reactivation event
    await db
      .insert(verificationLogs)
      .values({
        patientId: patientId,
        action: 'reactivated',
        patientResponse: `Patient reactivated by volunteer: ${user.firstName} ${user.lastName}`.trim() || user.email,
        verificationResult: 'pending_verification',
        processedBy: user.id
      })

    return NextResponse.json({
      success: true,
      message: 'Patient berhasil diaktifkan kembali',
      newStatus: 'pending_verification',
      processedBy: `${user.firstName} ${user.lastName}`.trim() || user.email,
      nextStep: 'Patient siap untuk menerima pesan verifikasi ulang'
    })

  } catch (error) {
    console.error('Reactivation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}