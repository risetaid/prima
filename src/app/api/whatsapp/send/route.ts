import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, formatWhatsAppNumber, createMedicationReminder } from '@/lib/twilio'
import { nowWIB } from '@/lib/datetime'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      patientId,
      type = 'medication', // 'medication' | 'appointment' | 'custom'
      message,
      medicationName,
      dosage,
      educationLink
    } = body

    // Get patient details
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        isActive: true
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    if (!patient.isActive) {
      return NextResponse.json({ error: 'Patient is not active' }, { status: 400 })
    }

    // Format phone number for WhatsApp
    const whatsappNumber = formatWhatsAppNumber(patient.phoneNumber)
    
    // Create message based on type
    let messageText: string
    
    if (type === 'medication' && medicationName && dosage) {
      const currentTime = nowWIB().toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
      messageText = createMedicationReminder(
        patient.name,
        medicationName,
        dosage,
        currentTime,
        educationLink
      )
    } else if (type === 'custom' && message) {
      messageText = message
    } else {
      return NextResponse.json({ error: 'Invalid message type or missing required fields' }, { status: 400 })
    }

    // Send WhatsApp message via Twilio
    const result = await sendWhatsAppMessage({
      to: whatsappNumber,
      body: messageText
    })

    if (result.success) {
      // Log the message in database (if this is part of a reminder schedule)
      // For now, just return success
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        sentTo: whatsappNumber,
        message: 'WhatsApp message sent successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}