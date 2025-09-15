import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { logger } from '@/lib/logger'

const ChainingSchema = z.object({
  sender: z.string().min(6).optional(),
  message: z.string().min(1).optional(),
  device: z.string().optional(),
  id: z.string().optional(),
  parent_id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
})

function normalize(body: Record<string, unknown>) {
  const sender = body.sender || body.phone || body.from || body.number || body.wa_number
  const message = body.message || body.text || body.body
  const device = body.device || body.gateway || body.instance
  const id = body.id || body.message_id || body.msgId
  const parent_id = body.parent_id || body.source_id
  const timestamp = body.timestamp || body.time || body.created_at
  return { sender, message, device, id, parent_id, timestamp }
}

export async function POST(request: NextRequest) {
  const authError = requireWebhookToken(request)
  if (authError) return authError

  let parsed: Record<string, unknown> = {}
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) parsed = await request.json()
    else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData(); form.forEach((v, k) => { (parsed as Record<string, unknown>)[k] = v })
    } else { const text = await request.text(); try { parsed = JSON.parse(text) } catch {} }
  } catch {}

  const normalized = normalize(parsed)
  const result = ChainingSchema.safeParse(normalized)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: result.error.flatten() }, { status: 400 })
  }

  const { sender, message, device, id, parent_id, timestamp } = result.data

  const idemKey = `webhook:fonnte:chaining:${hashFallbackId([id, parent_id, String(timestamp || '')])}`
  if (await isDuplicateEvent(idemKey)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  logger.info('Fonnte chaining webhook', { sender, hasMessage: Boolean(message), device, parent_id })

  // Log-only for now
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request)
  if (authError) return authError
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'ping'
  return NextResponse.json({ ok: true, route: 'fonnte/chaining', mode })
}
