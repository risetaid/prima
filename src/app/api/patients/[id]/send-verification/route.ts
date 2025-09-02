import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, verificationLogs } from '@/db'
import { eq, and } from 'drizzle-orm'
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

    // Generate simple verification message
    const verificationMessage = generateVerificationMessage(patient, user)
    
    // Send WhatsApp message via Fonnte
    const whatsappResult = await sendWhatsAppMessage(
      patient.phoneNumber,
      verificationMessage
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
        verificationMessage: verificationMessage,
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
        messageSent: verificationMessage,
        verificationResult: 'pending_verification',
        processedBy: user.id
      })

    return NextResponse.json({
      success: true,
      message: 'Verification message sent successfully',
      expiresAt: expiresAt.toISOString(),
      attempt: currentAttempts + 1
    })

  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate verification message
function generateVerificationMessage(patient: any, volunteer: any): string {
  return `Halo ${patient.name},

Anda didaftarkan ke dalam sistem PRIMA untuk reminder kesehatan oleh relawan kami.

Apakah Anda setuju?
YA
TIDAK

Terima kasih.`
}

// Helper function to send WhatsApp message via Fonnte
async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  try {
    // Format Indonesian phone number
    let formattedPhone = phoneNumber
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1)
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone
    }

    const fonnte_token = process.env.FONNTE_TOKEN
    if (!fonnte_token) {
      throw new Error('FONNTE_TOKEN not configured')
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnte_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: formattedPhone,
        message: message,
        countryCode: '62'
      })
    })

    const result = await response.json()
    
    if (response.ok && result.status) {
      return { success: true, data: result }
    } else {
      return { success: false, error: result.reason || 'Unknown error' }
    }

  } catch (error) {
    console.error('WhatsApp sending error:', error)
    return { success: false, error: error.message || 'Failed to send message' }
  }
}