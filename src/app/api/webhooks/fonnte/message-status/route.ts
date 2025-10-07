import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { db, reminders } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { del, CACHE_KEYS } from '@/lib/cache'
import { createApiHandler } from '@/lib/api-helpers'

const StatusSchema = z.object({
  id: z.string().min(1), // message id
  status: z.string().optional(),
  state: z.string().optional(),
  reason: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
})

function normalizeStatus(body: Record<string, unknown>) {
  const id = String((body.id as string) || (body.message_id as string) || (body.msgId as string) || '')
  const status = (body.status as string) || (body.state as string)
  const reason = body.reason as string
  const timestamp = (body.timestamp as string | number) || (body.time as string | number) || (body.updated_at as string | number)
  return { id, status, state: body.state as string, reason, timestamp }
}

function mapStatusToEnum(status?: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  const s = (status || '').toLowerCase()
  if (!s) return null
  if (['sent', 'queued'].includes(s)) return 'SENT'
  if (['delivered', 'read', 'opened', 'received'].includes(s)) return 'DELIVERED'
  if (['failed', 'error', 'undelivered'].includes(s)) return 'FAILED'
  return null
}

// Custom authentication function for webhook
async function verifyWebhookToken(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) {
    throw new Error("Unauthorized webhook");
  }
  return null; // No user object for webhooks
}

export const POST = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false } // Disable rate limiting for webhooks
  },
  async (body, { request }) => {
    // The body is already parsed by createApiHandler with support for different content types
    const parsed = body as Record<string, unknown>
    const contentType = request.headers.get('content-type') || ''

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
      throw new Error(`Invalid payload: ${JSON.stringify(result.error.flatten())}`)
    }

    const { id, status, reason, timestamp } = result.data

    const idemKey = `webhook:fonnte:message-status:${hashFallbackId([id, String(timestamp || '')])}`
    if (await isDuplicateEvent(idemKey)) {
      return { ok: true, duplicate: true }
    }

    const mapped = mapStatusToEnum(status)
    if (!mapped) return { ok: true, ignored: true }

    try {
      // First get the patientId for cache invalidation
      const logData = await db
        .select({ patientId: reminders.patientId })
        .from(reminders)
        .where(eq(reminders.fonnteMessageId, id))
        .limit(1)

      const updates = { status: mapped! }
      // optional: could add deliveredAt/failedAt if columns exist; schema not defined for those explicitly
      if (mapped === 'FAILED' && reason) {
        // store reason in confirmationResponse temporarily? Skip; just log.
        logger.warn('Fonnte message failed', { id, reason })
      }

      await db.update(reminders).set(updates).where(eq(reminders.fonnteMessageId, id))
      logger.info('Updated reminder log status from webhook', { id, mapped })

      // Invalidate cache if we have patientId
      if (logData.length > 0) {
        await del(CACHE_KEYS.reminderStats(logData[0].patientId))
      }
    } catch (error) {
      logger.error('Failed to update message status', error as Error, { id, status })
      throw new Error('Failed to update message status')
    }

    return { ok: true, processed: true }
  }
);

export const GET = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyWebhookToken,
    rateLimit: { enabled: false } // Disable rate limiting for webhooks
  },
  async (body, { request }) => {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'ping'
    return { ok: true, route: 'fonnte/message-status', mode }
  }
);
