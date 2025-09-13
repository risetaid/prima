import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, verificationLogs } from '@/db'
import { eq, and } from 'drizzle-orm'
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service'
// import { addHours } from 'date-fns'

// Send verification message to patient
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

    // Get patient details
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

    const patient = patientResult[0]

    // Send verification poll with Ya/Tidak options
    const whatsappService = new WhatsAppService()
    const whatsappResult = await whatsappService.sendVerificationPoll(
      patient.phoneNumber,
      patient.name
    )

    if (!whatsappResult.success) {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp message: ' + whatsappResult.error },
        { status: 500 }
      )
    }

    // Update patient verification status
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours expiry
    const currentAttempts = parseInt(patient.verificationAttempts || '0')
    
    await db
      .update(patients)
      .set({
        verificationStatus: 'pending_verification',
        verificationSentAt: new Date(),
        verificationMessage: `Poll: Verification request sent to ${patient.name}`,
        verificationAttempts: (currentAttempts + 1).toString(),
        verificationExpiresAt: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId))

    // Log verification attempt
    await db
      .insert(verificationLogs)
      .values({
        patientId: patientId,
        action: 'sent',
        messageSent: `Poll verification sent with Ya/Tidak options`,
        verificationResult: 'pending_verification',
        processedBy: user.id
      })

    return NextResponse.json({
      success: true,
      message: 'Verification poll sent successfully with Ya/Tidak options',
      expiresAt: expiresAt.toISOString(),
      attempt: currentAttempts + 1,
      method: 'poll_verification'
    })

  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
