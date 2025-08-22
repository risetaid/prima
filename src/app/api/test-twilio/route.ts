import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json()
    
    if (!phoneNumber || !message) {
      return NextResponse.json({ error: 'Phone number and message required' }, { status: 400 })
    }

    const whatsappNumber = formatWhatsAppNumber(phoneNumber)
    console.log(`Testing Twilio with phone: ${whatsappNumber}`)
    
    const result = await sendWhatsAppMessage({
      to: whatsappNumber,
      body: message
    })

    const response = {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      formattedPhone: whatsappNumber,
      originalPhone: phoneNumber,
      twilioConfig: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING',
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'MISSING'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Test Twilio error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}