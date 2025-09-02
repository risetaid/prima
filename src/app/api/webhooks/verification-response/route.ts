import { NextRequest, NextResponse } from 'next/server'
import { db, patients, verificationLogs, reminderSchedules } from '@/db'
import { eq, and, or } from 'drizzle-orm'

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
      console.log('Failed to parse webhook body:', rawBody)
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Extract Fonnte webhook data
    const { device, sender, message, name } = parsedBody
    
    // Log incoming webhook for debugging
    console.log('Verification webhook received:', { device, sender, message, name })

    if (!sender || !message) {
      console.log('Missing required fields:', { sender, message })
      return NextResponse.json(
        { error: 'Missing sender or message' },
        { status: 400 }
      )
    }

    // Use sender as phone number (Fonnte format)
    const phone = sender
    
    // Try to match phone number in both formats (international and local)
    let phoneToMatch = phone
    let alternativePhone = ''
    
    // If phone starts with 62, also try with 0
    if (phone.startsWith('62')) {
      alternativePhone = '0' + phone.slice(2)
    }
    // If phone starts with 0, also try with 62
    else if (phone.startsWith('0')) {
      alternativePhone = '62' + phone.slice(1)
    }

    console.log('Looking for patient with phone:', { phone, alternativePhone })

    // Find patient by phone number (try both formats)
    const patientResult = await db
      .select()
      .from(patients)
      .where(and(
        alternativePhone ? 
          or(
            eq(patients.phoneNumber, phone),
            eq(patients.phoneNumber, alternativePhone)
          ) :
          eq(patients.phoneNumber, phone),
        eq(patients.isActive, true),
        eq(patients.verificationStatus, 'pending_verification')
      ))
      .limit(1)

    if (patientResult.length === 0) {
      console.log('No pending verification found for phone:', phone)
      return NextResponse.json(
        { message: 'No pending verification found' },
        { status: 200 }
      )
    }

    const patient = patientResult[0]

    // Process patient response
    const response = message.toLowerCase().trim()
    const verificationResult = processVerificationResponse(response)

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

      console.log('Unknown verification response:', response)
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
      updateData.isActive = false // Deactivate patient completely
    }

    await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patient.id))

    // If unsubscribed, also deactivate all related reminders
    if (verificationResult === 'unsubscribed') {
      await db
        .update(reminderSchedules)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(reminderSchedules.patientId, patient.id))
    }

    // Log verification response
    await db
      .insert(verificationLogs)
      .values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: message,
        verificationResult: verificationResult as 'verified' | 'declined' | 'pending_verification' | 'unsubscribed'
      })

    // Send confirmation message back to patient
    const confirmationMessage = generateConfirmationMessage(patient, verificationResult)
    if (confirmationMessage) {
      await sendConfirmationMessage(phone, confirmationMessage)
    }

    console.log(`Verification processed: ${patient.name} -> ${verificationResult}`)

    return NextResponse.json({
      success: true,
      message: `Verification ${verificationResult} processed`,
      patientId: patient.id,
      result: verificationResult
    })

  } catch (error) {
    console.error('Verification webhook error:', error)
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
      console.warn('FONNTE_TOKEN not configured, skipping confirmation message')
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
      console.warn('Failed to send confirmation message:', result)
    }

  } catch (error) {
    console.warn('Error sending confirmation message:', error)
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
    
    console.log('Test verification webhook:', mockWebhook)
    
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