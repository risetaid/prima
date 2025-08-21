import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumber, message } = body

    if (!phoneNumber || !message) {
      return NextResponse.json({ 
        error: 'Phone number and message are required' 
      }, { status: 400 })
    }

    // Format phone number for WhatsApp
    const whatsappNumber = formatWhatsAppNumber(phoneNumber)
    
    console.log('Testing Twilio WhatsApp with:', {
      originalPhone: phoneNumber,
      formattedPhone: whatsappNumber,
      messageLength: message.length,
      twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    })

    // Send WhatsApp message via Twilio
    const result = await sendWhatsAppMessage({
      to: whatsappNumber,
      body: message
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      sentTo: whatsappNumber,
      originalPhone: phoneNumber,
      debug: {
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID?.slice(0, 10) + '...',
        twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Twilio test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}