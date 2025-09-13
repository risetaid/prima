import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { db, patients, verificationLogs, reminderSchedules, reminderLogs } from '@/db'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { PatientLookupService } from '@/services/patient/patient-lookup.service'
import { ConversationStateService } from '@/services/conversation-state.service'
import { logger } from '@/lib/logger'
// Poll-based messaging handled by WhatsAppService
import { WhatsAppService } from '@/services/whatsapp/whatsapp.service'

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  // Poll response fields (based on Fonnte poll response format)
  poll_name: z.string().optional(),
  pollname: z.string().optional(),
  selected_option: z.string().optional(),
  poll_response: z.string().optional(),
  poll_data: z.any().optional(),
})

function normalizeIncoming(body: any) {
  const sender = body.sender || body.phone || body.from || body.number || body.wa_number
  const message = body.message || body.text || body.body
  const device = body.device || body.gateway || body.instance
  const name = body.name || body.sender_name || body.contact_name
  const id = body.id || body.message_id || body.msgId
  const timestamp = body.timestamp || body.time || body.created_at
  
  // Poll response data
  const poll_name = body.poll_name || body.pollname
  const pollname = body.pollname || body.poll_name
  const selected_option = body.selected_option || body.poll_response || body.choice
  const poll_response = body.poll_response || body.selected_option
  const poll_data = body.poll_data || body.poll || {}
  
  return { 
    sender, message, device, name, id, timestamp,
    poll_name, pollname, selected_option, poll_response, poll_data
  }
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

const whatsappService = new WhatsAppService()

async function sendAck(phoneNumber: string, message: string) {
  try {
    await whatsappService.sendAck(phoneNumber, message)
  } catch (e) {
    console.warn('Failed to send ACK via WhatsApp:', e)
  }
}

/**
 * Process poll responses for verification and medication confirmation
 */
async function processPollResponse(
  pollName: string,
  selectedOption: string,
  patient: any
): Promise<{ processed: boolean; action?: string; message?: string }> {
  logger.info('Processing poll response', { pollName, selectedOption, patientId: patient.id })
  
  // Handle verification polls
  if (pollName === 'Verifikasi PRIMA') {
    return await handleVerificationPoll(selectedOption, patient)
  }
  
  // Handle medication polls
  if (pollName === 'Konfirmasi Obat' || pollName === 'Follow-up Obat') {
    return await handleMedicationPoll(selectedOption, patient)
  }
  
  return { processed: false }
}

/**
 * Handle verification poll responses (Ya/Tidak)
 */
async function handleVerificationPoll(
  selectedOption: string,
  patient: any
): Promise<{ processed: boolean; action?: string; message?: string }> {
  const option = selectedOption.toLowerCase().trim()
  
  if (option === 'ya') {
    // Accept verification
    await db.update(patients).set({
      verificationStatus: 'verified',
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(patients.id, patient.id))

    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: 'responded',
      patientResponse: selectedOption,
      verificationResult: 'verified',
    })

    await sendAck(patient.phoneNumber, `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima reminder dari relawan PRIMA.\n\nUntuk berhenti, ketik: BERHENTI`)

    return { processed: true, action: 'verified', message: 'Patient verified via poll' }
  }
  
  if (option === 'tidak') {
    // Decline verification
    await db.update(patients).set({
      verificationStatus: 'declined',
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(patients.id, patient.id))

    await db.insert(verificationLogs).values({
      patientId: patient.id,
      action: 'responded',
      patientResponse: selectedOption,
      verificationResult: 'declined',
    })

    await sendAck(patient.phoneNumber, `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏`)

    return { processed: true, action: 'declined', message: 'Patient declined verification via poll' }
  }
  
  return { processed: false }
}

/**
 * Handle medication poll responses (Sudah/Belum/Butuh Bantuan)
 */
async function handleMedicationPoll(
  selectedOption: string,
  patient: any
): Promise<{ processed: boolean; action?: string; message?: string }> {
  // Find the most recent pending reminder for this patient
  const pendingReminder = await db
    .select()
    .from(reminderLogs)
    .where(
      and(
        eq(reminderLogs.patientId, patient.id),
        eq(reminderLogs.status, 'SENT'), // Assuming SENT means waiting for confirmation
        isNull(reminderLogs.confirmedAt)
      )
    )
    .orderBy(desc(reminderLogs.sentAt))
    .limit(1)

  if (!pendingReminder.length) {
    logger.warn('No pending reminder found for medication poll response', { 
      patientId: patient.id, 
      selectedOption 
    })
    return { processed: false, message: 'No pending reminder found' }
  }

  const reminder = pendingReminder[0]
  const option = selectedOption.toLowerCase().trim()
  
  if (option === 'sudah' || option === 'sudah minum') {
    // Confirm medication taken
    await db.update(reminderLogs).set({
      status: 'DELIVERED', // Mark as completed
      confirmedAt: new Date(),
      confirmationResponse: selectedOption,
      updatedAt: new Date()
    }).where(eq(reminderLogs.id, reminder.id))

    await sendAck(patient.phoneNumber, `Terima kasih ${patient.name}! ✅\n\nObat sudah dikonfirmasi diminum pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}`)

    return { processed: true, action: 'confirmed', message: 'Medication confirmed via poll' }
  }
  
  if (option === 'belum' || option === 'belum minum') {
    // Patient hasn't taken medication yet - extend deadline
    await db.update(reminderLogs).set({
      confirmationResponse: selectedOption,
      updatedAt: new Date()
      // Keep status as SENT for potential follow-up
    }).where(eq(reminderLogs.id, reminder.id))

    await sendAck(patient.phoneNumber, `Baik ${patient.name}, jangan lupa minum obatnya ya! 💊\n\nRelawan akan menghubungi jika diperlukan.`)

    return { processed: true, action: 'extended', message: 'Medication reminder extended' }
  }
  
  if (option === 'butuh bantuan') {
    // Patient needs help - escalate to relawan
    await db.update(reminderLogs).set({
      confirmationResponse: selectedOption,
      updatedAt: new Date()
      // Keep status as SENT but flag for manual intervention
    }).where(eq(reminderLogs.id, reminder.id))

    await sendAck(patient.phoneNumber, `Baik ${patient.name}, relawan kami akan segera menghubungi Anda untuk membantu. 🤝\n\nTunggu sebentar ya!`)

    // TODO: Add notification to relawan dashboard for escalation
    logger.info('Patient requested help - escalating to relawan', { 
      patientId: patient.id, 
      reminderId: reminder.id 
    })

    return { processed: true, action: 'escalated', message: 'Medication reminder escalated to relawan' }
  }
  
  return { processed: false }
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

  const { sender, message, device, name, id, timestamp, poll_name, pollname, selected_option, poll_response, poll_data } = result.data

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
      messageType: poll_name || pollname ? 'confirmation' : 'general',
      intent: undefined,
      confidence: undefined,
      processedAt: new Date()
    })
  } catch {}

  // PRIORITY 1: Process poll responses first
  const activePollName = poll_name || pollname
  const pollOption = selected_option || poll_response
  
  if (activePollName && pollOption) {
    logger.info('Processing poll response', { 
      pollName: activePollName, 
      selectedOption: pollOption, 
      patientId: patient.id 
    })
    
    try {
      const pollResult = await processPollResponse(activePollName, pollOption, patient)
      
      if (pollResult.processed) {
        logger.info('Poll response processed successfully', {
          patientId: patient.id,
          action: pollResult.action,
          message: pollResult.message
        })
        
        return NextResponse.json({ 
          ok: true, 
          processed: true, 
          action: pollResult.action,
          source: 'poll_response'
        })
      }
    } catch (error) {
      logger.error('Failed to process poll response', error as Error, {
        patientId: patient.id,
        pollName: activePollName,
        selectedOption: pollOption
      })
      // Continue to text-based processing as fallback
    }
  }

  // FALLBACK: Text-based verification handling (for backward compatibility)
  const intent = detectIntentVerificationOnly(message)
  if (intent === 'other' && !activePollName) {
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
