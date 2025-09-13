import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWebhookToken } from '@/lib/webhook-auth'
import { isDuplicateEvent, hashFallbackId } from '@/lib/idempotency'
import { logger } from '@/lib/logger'

const ConnectSchema = z.object({
  device: z.string().optional(),
  status: z.string().optional(),
  phone_status: z.string().optional(),
  battery: z.union([z.string(), z.number()]).optional(),
  signal: z.union([z.string(), z.number()]).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  id: z.string().optional(),
})

function normalize(body: any) {
  return {
    device: body.device || body.instance || body.gateway,
    status: body.status,
    phone_status: body.phone_status,
    battery: body.battery,
    signal: body.signal,
    timestamp: body.timestamp || body.time || body.updated_at,
    id: body.id,
  }
}

export async function POST(request: NextRequest) {
  const authError = requireWebhookToken(request)
  if (authError) return authError

  let parsed: any = {}
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) parsed = await request.json()
    else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await request.formData(); form.forEach((v, k) => { (parsed as any)[k] = v })
    } else { const text = await request.text(); try { parsed = JSON.parse(text) } catch {} }
  } catch {}

  const normalized = normalize(parsed)
  const result = ConnectSchema.safeParse(normalized)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: result.error.flatten() }, { status: 400 })
  }

  const { device, status, phone_status, battery, signal, timestamp, id } = result.data

  const idemKey = `webhook:fonnte:connect:${hashFallbackId([device, String(timestamp || ''), id])}`
  if (await isDuplicateEvent(idemKey)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  logger.info('Fonnte connect webhook', { device, status, phone_status, battery, signal })

  // Log-only for now; future: cache last-seen status for dashboard
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request)
  if (authError) return authError
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'ping'
  return NextResponse.json({ ok: true, route: 'fonnte/connect', mode })
}
