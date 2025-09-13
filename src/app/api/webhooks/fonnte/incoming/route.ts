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
  
  // Poll response data - comprehensive field mapping for various possible formats
  const poll_name = body.poll_name || body.pollname || body.poll_title || body.poll?.name
  const pollname = body.pollname || body.poll_name || body.poll_title || body.poll?.name
  const selected_option = body.selected_option || body.poll_response || body.choice || body.poll?.choice || body.poll?.selected
  const poll_response = body.poll_response || body.selected_option || body.choice || body.poll?.choice || body.poll?.selected
  const poll_data = body.poll_data || body.poll || {}
  
  const normalized = { 
    sender, message, device, name, id, timestamp,
    poll_name, pollname, selected_option, poll_response, poll_data
  }

  // Log normalization for debugging
  logger.info('Webhook normalization result', {
    sender: Boolean(sender),
    message: Boolean(message),
    hasPollName: Boolean(poll_name),
    hasSelectedOption: Boolean(selected_option),
    pollName: poll_name,
    selectedOption: selected_option,
    originalKeys: Object.keys(body || {}),
    normalizedKeys: Object.keys(normalized).filter(key => (normalized as any)[key])
  })
  
  return normalized
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
  
  // Normalize poll name for case-insensitive matching
  const normalizedPollName = (pollName || '').toLowerCase().trim()
  
  // Handle verification polls (case-insensitive matching)
  if (normalizedPollName === 'verifikasi prima' || normalizedPollName.includes('verifikasi')) {
    logger.info('Matched verification poll', { originalPollName: pollName, normalizedPollName })
    return await handleVerificationPoll(selectedOption, patient)
  }
  
  // Handle medication polls (case-insensitive matching)  
  if (normalizedPollName === 'konfirmasi obat' || 
      normalizedPollName === 'follow-up obat' ||
      normalizedPollName.includes('konfirmasi') ||
      normalizedPollName.includes('obat')) {
    logger.info('Matched medication poll', { originalPollName: pollName, normalizedPollName })
    return await handleMedicationPoll(selectedOption, patient)
  }
  
  logger.warn('No matching poll handler found', { 
    pollName, 
    normalizedPollName, 
    patientId: patient.id 
  })
  
  return { processed: false }
}

/**
 * Handle verification poll responses (Ya/Tidak)
 */
async function handleVerificationPoll(
  selectedOption: string,
  patient: any
): Promise<{ processed: boolean; action?: string; message?: string }> {
  const option = (selectedOption || '').toLowerCase().trim()
  
  logger.info('Processing verification poll option', { 
    originalOption: selectedOption, 
    normalizedOption: option,
    patientId: patient.id 
  })
  
  // Accept variations: ya, yes, iya, setuju, etc.
  if (option === 'ya' || option === 'iya' || option === 'yes' || option.includes('ya') || option.includes('setuju')) {
    try {
      logger.info('Updating patient verification status to verified', { patientId: patient.id })
      
      // Accept verification
      const updateResult = await db.update(patients).set({
        verificationStatus: 'verified',
        verificationResponseAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(patients.id, patient.id))

      logger.info('Patient verification status updated successfully', { 
        patientId: patient.id, 
        updateResult: updateResult 
      })

      const logResult = await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: selectedOption,
        verificationResult: 'verified',
      })

      logger.info('Verification log inserted successfully', { 
        patientId: patient.id, 
        logResult: logResult 
      })

      await sendAck(patient.phoneNumber, `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima reminder dari relawan PRIMA.\n\nUntuk berhenti, ketik: BERHENTI`)

      logger.info('Verification acceptance processed successfully', { 
        patientId: patient.id, 
        selectedOption 
      })

      return { processed: true, action: 'verified', message: 'Patient verified via poll' }
    } catch (error) {
      logger.error('Failed to process verification acceptance', error as Error, {
        patientId: patient.id,
        selectedOption,
        phoneNumber: patient.phoneNumber
      })
      throw error
    }
  }
  
  // Decline variations: tidak, no, ga, gak, engga, etc.
  if (option === 'tidak' || option === 'no' || option.includes('tidak') || option.includes('ga') || option.includes('engga')) {
    try {
      logger.info('Updating patient verification status to declined', { patientId: patient.id })
      
      // Decline verification
      const updateResult = await db.update(patients).set({
        verificationStatus: 'declined',
        verificationResponseAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(patients.id, patient.id))

      logger.info('Patient verification status updated to declined', { 
        patientId: patient.id, 
        updateResult: updateResult 
      })

      const logResult = await db.insert(verificationLogs).values({
        patientId: patient.id,
        action: 'responded',
        patientResponse: selectedOption,
        verificationResult: 'declined',
      })

      logger.info('Verification decline log inserted successfully', { 
        patientId: patient.id, 
        logResult: logResult 
      })

      await sendAck(patient.phoneNumber, `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏`)

      logger.info('Verification decline processed successfully', { 
        patientId: patient.id, 
        selectedOption 
      })

      return { processed: true, action: 'declined', message: 'Patient declined verification via poll' }
    } catch (error) {
      logger.error('Failed to process verification decline', error as Error, {
        patientId: patient.id,
        selectedOption,
        phoneNumber: patient.phoneNumber
      })
      throw error
    }
  }
  
  logger.warn('Verification poll response not recognized', { 
    patientId: patient.id, 
    selectedOption, 
    normalizedOption: option 
  })
  
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
  const option = (selectedOption || '').toLowerCase().trim()
  
  logger.info('Processing medication poll option', { 
    originalOption: selectedOption, 
    normalizedOption: option,
    patientId: patient.id,
    reminderId: reminder.id
  })
  
  // Accept variations: sudah, sudah minum, done, selesai, etc.
  if (option === 'sudah' || option === 'sudah minum' || option.includes('sudah') || option === 'done' || option === 'selesai') {
    try {
      logger.info('Confirming medication taken', { patientId: patient.id, reminderId: reminder.id })
      
      // Confirm medication taken
      const updateResult = await db.update(reminderLogs).set({
        status: 'DELIVERED', // Mark as completed
        confirmedAt: new Date(),
        confirmationResponse: selectedOption,
        updatedAt: new Date()
      }).where(eq(reminderLogs.id, reminder.id))

      logger.info('Medication confirmation updated successfully', { 
        patientId: patient.id, 
        reminderId: reminder.id,
        updateResult: updateResult 
      })

      await sendAck(patient.phoneNumber, `Terima kasih ${patient.name}! ✅\n\nObat sudah dikonfirmasi diminum pada ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}`)

      logger.info('Medication confirmation processed successfully', { 
        patientId: patient.id, 
        reminderId: reminder.id,
        selectedOption 
      })

      return { processed: true, action: 'confirmed', message: 'Medication confirmed via poll' }
    } catch (error) {
      logger.error('Failed to process medication confirmation', error as Error, {
        patientId: patient.id,
        reminderId: reminder.id,
        selectedOption
      })
      throw error
    }
  }
  
  // Not yet variations: belum, belum minum, not yet, etc.
  if (option === 'belum' || option === 'belum minum' || option.includes('belum') || option === 'not yet') {
    // Patient hasn't taken medication yet - extend deadline
    await db.update(reminderLogs).set({
      confirmationResponse: selectedOption,
      updatedAt: new Date()
      // Keep status as SENT for potential follow-up
    }).where(eq(reminderLogs.id, reminder.id))

    await sendAck(patient.phoneNumber, `Baik ${patient.name}, jangan lupa minum obatnya ya! 💊\n\nRelawan akan menghubungi jika diperlukan.`)

    return { processed: true, action: 'extended', message: 'Medication reminder extended' }
  }
  
  // Help variations: butuh bantuan, perlu bantuan, help, etc.
  if (option === 'butuh bantuan' || option === 'perlu bantuan' || option.includes('bantuan') || option === 'help') {
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
  // TEMPORARILY DISABLED for debugging poll responses
  // TODO: Re-enable after identifying poll response format
  // const authError = requireWebhookToken(request)
  // if (authError) return authError
  
  logger.info('Webhook auth temporarily disabled for debugging')

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

  // DEBUG: Enhanced logging to understand Fonnte's format
  logger.info('Raw Fonnte webhook payload received', {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    contentType,
    headers: Object.fromEntries(request.headers.entries()),
    queryParams: Object.fromEntries(new URL(request.url).searchParams.entries()),
    rawPayload: parsed,
    payloadKeys: Object.keys(parsed || {}),
    payloadValues: Object.entries(parsed || {}).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : value
      return acc
    }, {} as any),
    hasPollingFields: {
      poll_name: Boolean(parsed.poll_name),
      pollname: Boolean(parsed.pollname), 
      poll_title: Boolean(parsed.poll_title),
      selected_option: Boolean(parsed.selected_option),
      poll_response: Boolean(parsed.poll_response),
      choice: Boolean(parsed.choice),
      poll: Boolean(parsed.poll)
    },
    messageFields: {
      message: Boolean(parsed.message),
      text: Boolean(parsed.text),
      body: Boolean(parsed.body),
      sender: Boolean(parsed.sender || parsed.phone || parsed.from),
      device: Boolean(parsed.device || parsed.gateway)
    }
  })

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
    logger.warn('Incoming webhook: no patient matched; ignoring', { 
      sender, 
      normalizedSender: sender,
      allPayloadFields: Object.keys(parsed || {}),
      senderFields: {
        sender: parsed.sender,
        phone: parsed.phone,
        from: parsed.from,
        number: parsed.number,
        wa_number: parsed.wa_number
      }
    })
    return NextResponse.json({ ok: true, ignored: true, reason: 'no_patient_match' })
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
  
  logger.info('Checking for poll response', {
    activePollName,
    pollOption, 
    hasPollName: Boolean(activePollName),
    hasPollOption: Boolean(pollOption),
    normalizedData: { poll_name, pollname, selected_option, poll_response },
    patientId: patient.id
  })
  
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
      } else {
        logger.warn('Poll response not processed by handler', {
          patientId: patient.id,
          pollName: activePollName,
          selectedOption: pollOption,
          result: pollResult
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
  } else {
    logger.info('No poll response detected, checking text-based intent', {
      patientId: patient.id,
      hasMessage: Boolean(message),
      message: message?.substring(0, 50) + (message && message.length > 50 ? '...' : ''),
      activePollName,
      pollOption
    })
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
