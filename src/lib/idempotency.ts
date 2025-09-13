import { createHash } from 'crypto'
import { redis } from '@/lib/redis'

export async function isDuplicateEvent(key: string, ttlSeconds = 24 * 60 * 60): Promise<boolean> {
  try {
    const exists = await redis.exists(key)
    if (exists) return true
    await redis.set(key, '1', ttlSeconds)
    return false
  } catch {
    // If Redis unavailable, proceed without idempotency
    return false
  }
}

export function hashFallbackId(parts: (string | undefined)[]): string {
  const h = createHash('sha1')
  h.update(parts.filter(Boolean).join('|'))
  return h.digest('hex')
}

