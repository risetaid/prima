import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { db, patients, verificationLogs, reminderSchedules } from '@/db'
import { eq } from 'drizzle-orm'
import { PatientLookupService } from '@/services/patient/patient-lookup.service'
import { ConversationStateService } from '@/services/conversation-state.service'
import { logger } from '@/lib/logger'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
})

function normalizeIncoming(body: any) {
  const sender = body.sender || body.phone || body.from || body.number || body.wa_number
  const message = body.message || body.text || body.body
  const device = body.device || body.gateway || body.instance
  const name = body.name || body.sender_name || body.contact_name
  const id = body.id || body.message_id || body.msgId
  const timestamp = body.timestamp || body.time || body.created_at
  return { sender, message, device, name, id, timestamp }
}

function detectIntentVerificationOnly(rawMessage: string): 'accept' | 'decline' | 'unsubscribe' | 'other' {
  const msg = (rawMessage || '').toLowerCase().trim()
  // contains-based matching to support phrases like "Ya saya setuju"
  const contains = (arr: string[]) => arr.some(w => msg.includes(w))

  const unsub = ['berhenti', 'stop', 'cancel', 'batal', 'keluar', 'hapus', 'unsubscribe', 'cabut']
  if (contains(unsub)) return 'unsubscribe'

  const accept = ['ya', 'iya', 'yes', 'ok', 'oke', 'setuju', 'boleh', 'baik', 'siap', 'mau', 'ingin', 'terima']
  if (contains(accept)) return 'accept'

  const decline = ['tidak', 'no', 'ga ', ' gak', 'engga', 'enggak', 'tolak', 'nanti', 'besok']
  if (contains(decline)) return 'decline'

  return 'other'
}

async function sendAck(phoneNumber: string, message: string) {
  try {
    const to = formatWhatsAppNumber(phoneNumber)
    await sendWhatsAppMessage({ to, body: message })
  } catch (e) {
    console.warn('Failed to send ACK via WhatsApp:', e)
  }
}

export async function POST(request: NextRequest) {
  // token auth
  const authError = requireWebhookToken(request)
  if (authError) return authError

  // parse body as json or form
  let parsed: any = {}
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      parsed = await request.json()
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      form.forEach((v, k) => { (parsed as any)[k] = v })
    } else {
      const text = await request.text()
      try { parsed = JSON.parse(text) } catch { parsed = {} }
    }
  } catch {}

  const normalized = normalizeIncoming(parsed)
  const result = IncomingSchema.safeParse(normalized)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: result.error.flatten() }, { status: 400 })
  }

  const { sender, message, device, name, id, timestamp } = result.data

  // idempotency key
  const fallbackId = hashFallbackId([id, sender, String(timestamp || ''), message])
  const idemKey = `webhook:fonnte:incoming:${fallbackId}`
  if (await isDuplicateEvent(idemKey)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  logger.info('Fonnte incoming webhook received', { sender, device, hasId: Boolean(id) })

  // find existing patient
  const lookup = new PatientLookupService()
  const found = await lookup.findPatientByPhone(sender)
  if (!found.found || !found.patient) {
    logger.warn('Incoming webhook: no patient matched; ignoring', { sender })
    return NextResponse.json({ ok: true, ignored: true })
  }

  const patient = found.patient

  // conversation log (best-effort)
  try {
    const conv = new ConversationStateService()
    const state = await conv.getOrCreateConversationState(patient.id, sender, 'general_inquiry')
    await conv.addMessage(state.id, {
      message,
      direction: 'inbound',
      messageType: 'general',
      intent: undefined,
      confidence: undefined,
      processedAt: new Date()
    })
  } catch {}

  // verification-only handling
  const intent = detectIntentVerificationOnly(message)
  if (intent === 'other') {
    return NextResponse.json({ ok: true, processed: true, action: 'none' })
  }

  try {
    if (intent === 'accept' && patient.verificationStatus === 'pending_verification') {
      await db.update(patients).set({
        verificationStatus: 'verified',
        verificationResponseAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(patients.id, patient.id))

      await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: message,
        verificationResult: 'verified',
      })

      await sendAck(patient.phoneNumber, `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima reminder dari relawan PRIMA.\n\nUntuk berhenti, ketik: BERHENTI`)

      return NextResponse.json({ ok: true, processed: true, action: 'verified' })
    }

    if (intent === 'decline' && patient.verificationStatus === 'pending_verification') {
      await db.update(patients).set({
        verificationStatus: 'declined',
        verificationResponseAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(patients.id, patient.id))

      await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: message,
        verificationResult: 'declined',
      })

      await sendAck(patient.phoneNumber, `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏`)

      return NextResponse.json({ ok: true, processed: true, action: 'declined' })
    }

    if (intent === 'unsubscribe') {
      // set declined + deactivate reminders
      await db.update(patients).set({
        verificationStatus: 'declined',
        verificationResponseAt: new Date(),
        updatedAt: new Date(),
        isActive: false,
      }).where(eq(patients.id, patient.id))

      await db.update(reminderSchedules).set({ isActive: false, updatedAt: new Date() }).where(eq(reminderSchedules.patientId, patient.id))

      await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: message,
        verificationResult: 'declined',
      })

      await sendAck(patient.phoneNumber, `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑\n\nSemua pengingat obat telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.\n\nJika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏💙`)

      return NextResponse.json({ ok: true, processed: true, action: 'unsubscribed' })
    }
  } catch (error) {
    logger.error('Incoming verification handling failed', error as Error, { patientId: patient.id })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, processed: true, action: 'none' })
}

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request)
  if (authError) return authError
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'ping'
  return NextResponse.json({ ok: true, route: 'fonnte/incoming', mode })
}
