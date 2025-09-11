import { NextRequest, NextResponse } from 'next/server'
import { db, patients, verificationLogs, reminderSchedules } from '@/db'
import { eq, and, or } from 'drizzle-orm'
import { safeInvalidatePatientCache } from '@/lib/cache'
import { logger } from '@/lib/logger'

// Process WhatsApp verification responses from patients
export async function POST(request: NextRequest) {
  try {
    // Get raw body first
    const rawBody = await request.text()
    
    // Try to parse as JSON
    let parsedBody
    try {
      parsedBody = JSON.parse(rawBody)
    } catch (parseError) {
      logger.error('Failed to parse verification webhook body', parseError instanceof Error ? parseError : new Error(String(parseError)), {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'parse_webhook_body',
        bodyLength: rawBody.length
      })
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Extract Fonnte webhook data
    const { device, sender, message, name } = parsedBody
    
    // Log incoming webhook for debugging
    logger.info('Patient verification response webhook received', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'webhook_received',
      device,
      sender,
      messageLength: message?.length,
      name
    })

    if (!sender || !message) {
      logger.warn('Missing required fields in verification webhook', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'validate_webhook_fields',
        hasSender: !!sender,
        hasMessage: !!message
      })
      return NextResponse.json(
        { error: 'Missing sender or message' },
        { status: 400 }
      )
    }

    // Use sender as phone number (Fonnte format)
    const phone = sender
    
    // Try to match phone number in both formats (international and local)  
    let alternativePhone = ''
    
    // If phone starts with 62, also try with 0
    if (phone.startsWith('62')) {
      alternativePhone = '0' + phone.slice(2)
    }
    // If phone starts with 0, also try with 62
    else if (phone.startsWith('0')) {
      alternativePhone = '62' + phone.slice(1)
    }

    // Process patient response
    const response = message.toLowerCase().trim()
    const verificationResult = processVerificationResponse(response)

    logger.info('Searching for patient by phone number', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'find_patient',
      phone,
      alternativePhone,
      verificationResult
    })

    // For BERHENTI (unsubscribe), accept from any active patient
    // For verification responses (YA/TIDAK), accept from any active patient regardless of current status
    // This allows patients to change their mind (declined → verified or verified → declined)
    const baseWhereClause = and(
      alternativePhone ?
        or(
          eq(patients.phoneNumber, phone),
          eq(patients.phoneNumber, alternativePhone)
        ) :
        eq(patients.phoneNumber, phone),
      eq(patients.isActive, true)
    )

    const whereClause = verificationResult === 'unsubscribed'
      ? baseWhereClause
      : baseWhereClause // Remove restriction - allow status changes from any current verification status

    const patientResult = await db
      .select()
      .from(patients)
      .where(whereClause)
      .limit(1)

    if (patientResult.length === 0) {
      logger.warn('No patient found for verification webhook', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'patient_not_found',
        phone,
        alternativePhone,
        verificationResult
      })
      return NextResponse.json(
        { message: 'No patient found or patient not eligible for this action' },
        { status: 200 }
      )
    }

    const patient = patientResult[0]
    logger.info('Patient found for verification webhook', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'patient_found',
      patientName: patient.name,
      currentStatus: patient.verificationStatus,
      newResult: verificationResult
    })

    // Check if patient is already verified - if so, only log the message but don't change status
    if (patient.verificationStatus === 'verified') {
      logger.info('Patient already verified, logging message only', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'patient_already_verified',
        patientName: patient.name,
        message: message,
        currentStatus: patient.verificationStatus
      })

      // Log the message for reference but don't change verification status
      await db
        .insert(verificationLogs)
        .values({
          patientId: patient.id,
          action: 'message_received',
          patientResponse: message,
          verificationResult: 'verified' // Keep current status
        })

      return NextResponse.json(
        { message: 'Message logged for verified patient' },
        { status: 200 }
      )
    }

    // Check if patient has unsubscribed - if so, only log the message but don't change status
    if (patient.verificationStatus === 'unsubscribed') {
      logger.info('Patient has unsubscribed, logging message only', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'patient_unsubscribed',
        patientName: patient.name,
        message: message,
        currentStatus: patient.verificationStatus
      })

      // Log the message for reference but don't change verification status
      await db
        .insert(verificationLogs)
        .values({
          patientId: patient.id,
          action: 'message_received',
          patientResponse: message,
          verificationResult: 'unsubscribed' // Keep current status
        })

      return NextResponse.json(
        { message: 'Message logged for unsubscribed patient' },
        { status: 200 }
      )
    }

    // Only process verification responses if patient is in pending_verification status
    if (patient.verificationStatus !== 'pending_verification') {
      logger.info('Patient not in pending verification status, ignoring response', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'ignore_non_pending_response',
        patientName: patient.name,
        currentStatus: patient.verificationStatus,
        message: message
      })

      // Log the message for reference
      await db
        .insert(verificationLogs)
        .values({
          patientId: patient.id,
          action: 'message_received',
          patientResponse: message,
          verificationResult: patient.verificationStatus as 'verified' | 'declined' | 'pending_verification'
        })

      return NextResponse.json(
        { message: 'Patient not waiting for verification' },
        { status: 200 }
      )
    }

    if (!verificationResult) {
      // Unknown response - log it but don't change status
      await db
        .insert(verificationLogs)
        .values({
          patientId: patient.id,
          action: 'responded',
          patientResponse: message,
          verificationResult: 'pending_verification' // Keep pending for unknown responses
        })

      logger.info('Unknown verification response received', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'unknown_response',
        response: response,
        patientName: patient.name
      })
      return NextResponse.json(
        { message: 'Unknown response logged' },
        { status: 200 }
      )
    }

    // Update patient verification status
    const updateData: any = {
      verificationStatus: verificationResult,
      verificationResponseAt: new Date(),
      updatedAt: new Date()
    }

    // Special handling for unsubscribe (BERHENTI)
    if (verificationResult === 'unsubscribed') {
      // For now, just set as declined and inactive until migration runs
      updateData.verificationStatus = 'declined'
      updateData.isActive = false // Deactivate patient completely
    }

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patient.id))

    // Invalidate patient cache after verification update with error handling
    const cacheResult = await safeInvalidatePatientCache(patient.id)
    if (!cacheResult.success) {
      logger.warn('Cache invalidation partially failed during verification update', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'cache_invalidation',
        patientId: patient.id,
        errors: cacheResult.errors
      })
      // Continue anyway - don't fail the webhook
    }

    logger.info('Patient verification status updated successfully', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'status_updated',
      patientName: patient.name,
      fromStatus: patient.verificationStatus,
      toStatus: updateData.verificationStatus,
      cacheInvalidation: cacheResult.success ? 'success' : 'partial_failure'
    })

    // If unsubscribed, also deactivate all related reminders
    if (verificationResult === 'unsubscribed') {
      try {
        await db
          .update(reminderSchedules)
          .set({
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(reminderSchedules.patientId, patient.id))
      } catch (error) {
        logger.warn('Failed to deactivate reminders during unsubscribe', {
          api: true,
          webhooks: true,
          verification: true,
          operation: 'deactivate_reminders',
          patientId: patient.id,
          patientName: patient.name,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue anyway
      }
    }

    // Log verification response
    await db
      .insert(verificationLogs)
      .values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: message,
        verificationResult: (verificationResult === 'unsubscribed' ? 'declined' : verificationResult) as 'verified' | 'declined' | 'pending_verification'
      })

    // Send confirmation message back to patient
    const confirmationMessage = generateConfirmationMessage(patient, verificationResult)
    if (confirmationMessage) {
      await sendConfirmationMessage(phone, confirmationMessage)
    }

    logger.info('Patient verification response processed successfully', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'response_processed',
      patientName: patient.name,
      verificationResult: verificationResult
    })

    return NextResponse.json({
      success: true,
      message: `Verification ${verificationResult} processed`,
      patientId: patient.id,
      result: verificationResult
    })

  } catch (error) {
    logger.error('Patient verification response webhook error', error instanceof Error ? error : new Error(String(error)), {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'webhook_processing'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to process patient responses
function processVerificationResponse(message: string): string | null {
  const response = message.toLowerCase().trim()
  
  // Positive responses
  if (['ya', 'iya', 'yes', 'ok', 'setuju', 'saya setuju', 'oke'].includes(response)) {
    return 'verified'
  }
  
  // Negative responses  
  if (['tidak', 'no', 'nope', 'tolak', 'menolak', 'ga', 'gak'].includes(response)) {
    return 'declined'
  }

  // Stop/cancel responses (unsubscribe)
  if (['berhenti', 'stop', 'cancel', 'batal', 'keluar', 'hapus'].includes(response)) {
    return 'unsubscribed'
  }
  
  return null // Unknown response
}

// Helper function to generate confirmation message
function generateConfirmationMessage(patient: any, status: string): string {
  if (status === 'verified') {
    return `Terima kasih ${patient.name}! ✅

Anda akan menerima reminder dari relawan PRIMA.

Untuk berhenti, ketik: BERHENTI`
  } else if (status === 'declined') {
    return `Baik ${patient.name}, terima kasih atas responsnya.

Semoga sehat selalu! 🙏`
  } else if (status === 'unsubscribed') {
    return `${patient.name}, Anda telah berhasil berhenti dari layanan PRIMA. 🛑

Semua reminder telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.

Jika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.

Semoga sehat selalu! 🙏💙`
  }
  
  return ''
}

// Helper function to send confirmation message
async function sendConfirmationMessage(phoneNumber: string, message: string) {
  try {
    const fonnte_token = process.env.FONNTE_TOKEN
    if (!fonnte_token) {
      logger.warn('FONNTE_TOKEN not configured, skipping confirmation message', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'send_confirmation',
        phoneNumber: phoneNumber
      })
      return
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fonnte_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        countryCode: '62'
      })
    })

    const result = await response.json()
    if (!response.ok) {
      logger.warn('Failed to send confirmation message via Fonnte', {
        api: true,
        webhooks: true,
        verification: true,
        operation: 'send_confirmation',
        phoneNumber: phoneNumber,
        responseStatus: response.status,
        fonnteResult: result
      })
    }

  } catch (error) {
    logger.warn('Error sending confirmation message', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'send_confirmation',
      phoneNumber: phoneNumber,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// GET endpoint for testing webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const test = searchParams.get('test')
  
  if (test === 'true') {
    // Simulate incoming webhook response
    const mockWebhook = {
      device: '628594257362',
      sender: '6281333852187', // This should match patient phone in database
      message: 'YA', // Test positive response
      name: 'Test Patient'
    }
    
    logger.info('Test verification webhook initiated', {
      api: true,
      webhooks: true,
      verification: true,
      operation: 'test_webhook',
      mockData: mockWebhook
    })
    
    // Process the mock webhook
    const mockRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockWebhook)
    })
    
    // Call POST handler with mock data
    return POST(mockRequest as NextRequest)
  }
  
  return NextResponse.json({
    message: 'Verification Response Webhook Endpoint',
    endpoint: '/api/webhooks/verification-response',
    methods: ['POST', 'GET'],
    test: 'Add ?test=true to simulate patient response',
    timestamp: new Date().toISOString()
  })
}