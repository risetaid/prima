import { NextRequest, NextResponse } from 'next/server'
import { sendUniversalWhatsApp } from '@/lib/fonnte'
import { sendWhatsAppMessageFonnte, formatFonnteNumber } from '@/lib/fonnte'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  try {
    const { phoneNumber, testProvider } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    const testMessage = `🧪 *PRIMA Backup System Test*\n\nTest message sent at: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\nProvider: ${testProvider || 'AUTO'}\n\nJika Anda menerima pesan ini, backup system berfungsi dengan baik! ✅\n\n_Test dari PRIMA - Sistem Backup_`

    let result

    if (testProvider === 'fonnte') {
      // Force Fonnte
      console.log('🧪 Testing FONNTE provider specifically')
      result = await sendWhatsAppMessageFonnte({
        to: formatFonnteNumber(phoneNumber),
        body: testMessage
      })
    } else {
      // Use universal sender (respects WHATSAPP_PROVIDER env)
      console.log('🧪 Testing universal sender')
      result = await sendUniversalWhatsApp(phoneNumber, testMessage)
    }

    const provider = process.env.WHATSAPP_PROVIDER || 'twilio'

    return NextResponse.json({
      success: true,
      provider: testProvider || provider,
      result,
      message: 'Test message sent successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Backup system test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
