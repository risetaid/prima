import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { db, reminderLogs } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { invalidateCache, CACHE_KEYS } from '@/lib/cache'

const StatusSchema = z.object({
  id: z.string().min(1), // message id
  status: z.string().optional(),
  state: z.string().optional(),
  reason: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
})

function normalizeStatus(body: any) {
  const id = body.id || body.message_id || body.msgId
  const status = body.status || body.state
  const reason = body.reason
  const timestamp = body.timestamp || body.time || body.updated_at
  return { id, status, state: body.state, reason, timestamp }
}

function mapStatusToEnum(status?: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  const s = (status || '').toLowerCase()
  if (!s) return null
  if (['sent', 'queued'].includes(s)) return 'SENT'
  if (['delivered', 'read', 'opened', 'received'].includes(s)) return 'DELIVERED'
  if (['failed', 'error', 'undelivered'].includes(s)) return 'FAILED'
  return null
}

export async function POST(request: NextRequest) {
  // Re-enabled webhook authentication
  const authError = requireWebhookToken(request)
  if (authError) return authError

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

  // Add debug logging for message status
  logger.info('Message status webhook payload received', {
    contentType,
    rawPayload: parsed,
    payloadKeys: Object.keys(parsed || {})
  })

  const normalized = normalizeStatus(parsed)
  logger.info('Message status normalized', { normalized })
  
  const result = StatusSchema.safeParse(normalized)
  if (!result.success) {
    logger.error('Message status validation failed', new Error('Validation failed'), {
      rawPayload: parsed,
      normalized,
      validationErrors: result.error.flatten()
    })
    return NextResponse.json({ error: 'Invalid payload', issues: result.error.flatten() }, { status: 400 })
  }

  const { id, status, reason, timestamp } = result.data

  const idemKey = `webhook:fonnte:message-status:${hashFallbackId([id, String(timestamp || '')])}`
  if (await isDuplicateEvent(idemKey)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  const mapped = mapStatusToEnum(status)
  if (!mapped) return NextResponse.json({ ok: true, ignored: true })

  try {
    // First get the patientId for cache invalidation
    const logData = await db
      .select({ patientId: reminderLogs.patientId })
      .from(reminderLogs)
      .where(eq(reminderLogs.fonnteMessageId, id))
      .limit(1)

    const updates: any = { status: mapped }
    // optional: could add deliveredAt/failedAt if columns exist; schema not defined for those explicitly
    if (mapped === 'FAILED' && reason) {
      // store reason in confirmationResponse temporarily? Skip; just log.
      logger.warn('Fonnte message failed', { id, reason })
    }

    const res = await db.update(reminderLogs).set(updates).where(eq(reminderLogs.fonnteMessageId, id))
    logger.info('Updated reminder log status from webhook', { id, mapped })

    // Invalidate cache if we have patientId
    if (logData.length > 0) {
      await invalidateCache(CACHE_KEYS.reminderStats(logData[0].patientId))
    }
  } catch (error) {
    logger.error('Failed to update message status', error as Error, { id, status })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, processed: true })
}

export async function GET(request: NextRequest) {
  // Re-enabled webhook authentication
  const authError = requireWebhookToken(request)
  if (authError) return authError
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'ping'
  return NextResponse.json({ ok: true, route: 'fonnte/message-status', mode })
}
