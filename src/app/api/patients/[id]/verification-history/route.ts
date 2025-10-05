import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, conversationMessages, conversationStates } from '@/db'
import { eq, and, desc, inArray } from 'drizzle-orm'

import { logger } from '@/lib/logger';

// Get patient response history for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists and user has access
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

    // Get conversation states for this patient
    const conversationStateIds = await db
      .select({ id: conversationStates.id })
      .from(conversationStates)
      .where(and(
        eq(conversationStates.patientId, patientId),
        eq(conversationStates.isActive, true)
      ))

    const stateIds = conversationStateIds.map(state => state.id)

    if (stateIds.length === 0) {
      return NextResponse.json({
        success: true,
        history: [],
        total: 0
      })
    }

    // Get conversation messages for these states
    const messages = await db
      .select({
        id: conversationMessages.id,
        message: conversationMessages.message,
        direction: conversationMessages.direction,
        messageType: conversationMessages.messageType,
        intent: conversationMessages.intent,
        confidence: conversationMessages.confidence,
        processedAt: conversationMessages.processedAt,
        createdAt: conversationMessages.createdAt,
        conversationStateId: conversationMessages.conversationStateId,
        context: conversationStates.currentContext,
        expectedResponseType: conversationStates.expectedResponseType,
        relatedEntityType: conversationStates.relatedEntityType,
      })
      .from(conversationMessages)
      .innerJoin(conversationStates, eq(conversationMessages.conversationStateId, conversationStates.id))
      .where(inArray(conversationMessages.conversationStateId, stateIds))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(50) // Limit to last 50 messages

    // Transform messages into enhanced history format
    const history = messages.map((msg) => {
      let action = 'Pesan masuk'
      let result = undefined
      let classification = ''
      let processingTime = undefined

      // Enhanced action classification based on message type and intent
      if (msg.direction === 'outbound') {
        switch (msg.messageType) {
          case 'verification':
            action = '📱 Verifikasi dikirim'
            classification = 'Verifikasi'
            break
          case 'reminder':
            action = '⏰ Pengingat dikirim'
            classification = 'Pengingat'
            break
          case 'confirmation':
            action = '✅ Konfirmasi dikirim'
            classification = 'Konfirmasi'
            break
          default:
            action = '💬 Pesan keluar'
            classification = 'Umum'
        }
      } else if (msg.direction === 'inbound') {
        switch (msg.intent) {
          case 'verification_accept':
            action = '✅ Verifikasi diterima'
            result = 'verified'
            classification = 'Diterima'
            break
          case 'verification_decline':
            action = '❌ Verifikasi ditolak'
            result = 'declined'
            classification = 'Ditolak'
            break
          case 'reminder_confirmed':
            action = '✅ Pengingat dikonfirmasi'
            result = 'confirmed'
            classification = 'Selesai'
            break
          case 'reminder_missed':
            action = '❌ Pengingat dilewatkan'
            result = 'missed'
            classification = 'Belum'
            break
          case 'unrecognized':
            action = '❓ Respon tidak dikenali'
            classification = 'Tidak dikenali'
            break
          default:
            action = '💬 Respon pasien'
            classification = 'Umum'
        }

        // Calculate processing time if processedAt is available
        if (msg.processedAt) {
          processingTime = new Date(msg.processedAt).getTime() - new Date(msg.createdAt).getTime()
        }
      }

      return {
        id: msg.id,
        timestamp: msg.createdAt.toISOString(),
        action,
        message: msg.message,
        response: msg.direction === 'inbound' ? msg.message : undefined,
        result,
        classification,
        messageType: msg.messageType,
        intent: msg.intent,
        confidence: msg.confidence,
        context: msg.context,
        expectedResponseType: msg.expectedResponseType,
        relatedEntityType: msg.relatedEntityType,
        processingTime,
        direction: msg.direction
      }
    })

    return NextResponse.json({
      success: true,
      history,
      total: history.length
    })

  } catch (error: unknown) {
    logger.error('Verification history error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
