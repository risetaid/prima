import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendUniversalWhatsApp } from '@/lib/fonnte'
import { sendWhatsAppMessageFonnte, formatFonnteNumber } from '@/lib/fonnte'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
  }

  // Require authentication even in development
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { phoneNumber, testProvider, patientName, medicationName, dosage } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    // Use form data or defaults
    const name = patientName || 'Testing User'
    const medication = medicationName || 'Tamoxifen'
    const medicationDose = dosage || '20mg - 1 tablet'

    const currentHour = new Date().toLocaleTimeString('id-ID', { 
      timeZone: 'Asia/Jakarta', 
      hour: '2-digit', 
      minute: '2-digit'
    })

    const greeting = (() => {
      const hour = new Date().getHours()
      if (hour < 12) return 'Selamat Pagi'
      if (hour < 15) return 'Selamat Siang' 
      if (hour < 18) return 'Selamat Sore'
      return 'Selamat Malam'
    })()

    const testMessage = `🏥 *PRIMA Reminder*

${greeting}, ${name}! 👋

⏰ Waktunya minum obat:
💊 ${medication}
📝 Dosis: ${medicationDose}
🕐 Jam: ${currentHour} WIB

📌 Catatan Penting:
Minum setelah makan dengan air putih

✅ Balas "MINUM" jika sudah minum obat
❓ Balas "BANTUAN" untuk bantuan
📞 Darurat: 0341-550171

Semangat sembuh! 💪
Tim PRIMA - Berbagi Kasih`

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
