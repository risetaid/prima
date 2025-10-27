# WAHA Migration Plan: Fonnte → WAHA

**Document Version**: 1.0
**Date**: 2025-10-27
**Scope**: Complete migration from Fonnte WhatsApp API to WAHA (WhatsApp HTTP API)
**Total Files to Modify**: 27 files

---

## Table of Contents

1. [Overview](#overview)
2. [API Comparison](#api-comparison)
3. [Critical Files (Phase 1)](#critical-files-phase-1)
4. [Service Layer (Phase 2)](#service-layer-phase-2)
5. [API Routes (Phase 3)](#api-routes-phase-3)
6. [Database & Schema (Phase 4)](#database--schema-phase-4)
7. [Utilities & Helpers (Phase 5)](#utilities--helpers-phase-5)
8. [Tests & Fixtures (Phase 6)](#tests--fixtures-phase-6)
9. [Documentation (Phase 7)](#documentation-phase-7)
10. [Implementation Order](#implementation-order)
11. [Testing Strategy](#testing-strategy)

---

## Overview

### Current Status
- **Provider**: Fonnte (https://api.fonnte.com)
- **Configuration**: `FONNTE_TOKEN`, `FONNTE_BASE_URL`, `FONNTE_WEBHOOK_SECRET`
- **Files Affected**: 27 files across the codebase
- **Integration Points**:
  - Message sending (WhatsApp Service)
  - Webhook handling (incoming messages + status updates)
  - Phone number formatting
  - Verification workflows
  - Reminder confirmation flows

### Target Status
- **Provider**: WAHA (https://waha-production-078e.up.railway.app)
- **Configuration**: `WAHA_API_KEY`, `WAHA_ENDPOINT`
- **Key Differences**:
  - Phone format changes from `628xxxxxxxx` to `628xxxxxxxx@c.us`
  - Authentication via `X-Api-Key` header instead of `Authorization`
  - Different endpoint path: `/api/sendText` instead of `/send`
  - Requires `session` parameter for message sending
  - Different payload field names

---

## API Comparison

### Message Sending Endpoint

#### Fonnte (Current)
```
POST https://api.fonnte.com/send
Headers:
  Authorization: <FONNTE_TOKEN>
  Content-Type: application/json

Payload:
{
  "target": "628xxxxxxxxxx",
  "message": "Hello World",
  "url": "https://example.com/image.jpg" (optional)
}

Response:
{
  "status": true,
  "id": ["message_id_here"],
  "reason": "Message sent"
}
```

#### WAHA (New)
```
POST https://waha-production-078e.up.railway.app/api/sendText
Headers:
  X-Api-Key: <WAHA_API_KEY>
  Content-Type: application/json

Payload:
{
  "session": "default",
  "chatId": "628xxxxxxxxxx@c.us",
  "text": "Hello World"
}

Response:
(Needs verification - likely includes message ID in different format)
```

### Webhook Payload Format

#### Fonnte (Current)
```json
{
  "sender": "628xxxxxxxxxx",
  "phone": "628xxxxxxxxxx",
  "from": "628xxxxxxxxxx",
  "number": "628xxxxxxxxxx",
  "wa_number": "628xxxxxxxxxx",
  "message": "User response",
  "text": "User response",
  "body": "User response",
  "id": "message_id",
  "message_id": "message_id",
  "msgId": "message_id",
  "timestamp": 1234567890,
  "time": 1234567890,
  "created_at": 1234567890,
  "device": "device_name",
  "gateway": "gateway_name",
  "instance": "instance_name"
}
```

#### WAHA (Expected)
```json
{
  "from": "628xxxxxxxxxx@c.us",
  "chatId": "628xxxxxxxxxx@c.us",
  "text": "User response",
  "messageId": "message_id",
  "timestamp": 1234567890
}
```

---

## Critical Files (Phase 1)

### 1. `src/lib/fonnte.ts` → `src/lib/waha.ts`

**Current Implementation**: Fonnte API integration module (239 lines)

**What Changes**:

#### A. Environment Variables
```typescript
// BEFORE
const FONNTE_BASE_URL = process.env.FONNTE_BASE_URL || 'https://api.fonnte.com'
const FONNTE_TOKEN = process.env.FONNTE_TOKEN
const FONNTE_WEBHOOK_SECRET = process.env.FONNTE_WEBHOOK_SECRET
const ALLOW_UNSIGNED_WEBHOOKS = (process.env.ALLOW_UNSIGNED_WEBHOOKS || '').toLowerCase() === 'true'

// AFTER
const WAHA_ENDPOINT = process.env.WAHA_ENDPOINT || 'http://localhost:3000'
const WAHA_API_KEY = process.env.WAHA_API_KEY
const WAHA_SESSION = process.env.WAHA_SESSION || 'default'
const ALLOW_UNSIGNED_WEBHOOKS = (process.env.ALLOW_UNSIGNED_WEBHOOKS || '').toLowerCase() === 'true'
```

#### B. Interfaces (Keep Same)
```typescript
// Keep these interfaces - they're provider-agnostic
export interface WhatsAppMessage {
  to: string           // Will be normalized to chatId format
  body: string
  mediaUrl?: string    // May need verification for WAHA support
}

export interface WhatsAppMessageResult {
  success: boolean
  messageId?: string
  error?: string
}
```

#### C. Main Function: `sendWhatsAppMessage()`
```typescript
// BEFORE
export const sendWhatsAppMessage = async (message: WhatsAppMessage): Promise<WhatsAppMessageResult> => {
  const payload: Record<string, unknown> = {
    target: message.to,      // 628xxxxxxxxxx
    message: message.body
  }

  if (message.mediaUrl) {
    payload.url = message.mediaUrl
  }

  const response = await fetch(`${FONNTE_BASE_URL}/send`, {
    method: 'POST',
    headers: {
      'Authorization': FONNTE_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()

  if (result.status) {
    const messageId = Array.isArray(result.id) ? result.id[0] : result.id
    return { success: true, messageId: messageId || 'fonnte_' + Date.now() }
  } else {
    return { success: false, error: result.reason || 'Fonnte API error' }
  }
}

// AFTER
export const sendWhatsAppMessage = async (message: WhatsAppMessage): Promise<WhatsAppMessageResult> => {
  if (!WAHA_API_KEY) {
    return { success: false, error: 'WAHA not configured' }
  }

  try {
    const chatId = `${message.to}@c.us`  // Append @c.us suffix
    const payload: Record<string, unknown> = {
      session: WAHA_SESSION,
      chatId: chatId,
      text: message.body
    }

    // WAHA may not support media in same way - investigate
    // if (message.mediaUrl) {
    //   payload.media = message.mediaUrl
    // }

    const response = await fetch(`${WAHA_ENDPOINT}/api/sendText`, {
      method: 'POST',
      headers: {
        'X-Api-Key': WAHA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (result.success || response.ok) {
      return {
        success: true,
        messageId: result.messageId || result.id || 'waha_' + Date.now()
      }
    } else {
      return {
        success: false,
        error: result.error || result.message || 'WAHA API error'
      }
    }
  } catch (error) {
    logger.error(
      'WAHA WhatsApp send error',
      error instanceof Error ? error : new Error(String(error))
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

#### D. Function: `formatWhatsAppNumber()`
```typescript
// BEFORE - Returns: 628xxxxxxxxxx
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  // ... validation ...
  return cleaned // Clean number format for Fonnte
}

// AFTER - Returns: 628xxxxxxxxxx@c.us
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number: must be a non-empty string')
  }

  let cleaned = phoneNumber.replace(/\D/g, '')

  if (!cleaned || cleaned.length < 8) {
    throw new Error('Invalid phone number: too short after cleaning')
  }

  // Convert Indonesian numbers with validation
  if (cleaned.startsWith('08')) {
    if (cleaned.length < 10 || cleaned.length > 13) {
      throw new Error('Invalid Indonesian phone number length (08 format)')
    }
    cleaned = '628' + cleaned.slice(2) // 08xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith('8') && cleaned.length >= 9) {
    if (cleaned.length < 9 || cleaned.length > 12) {
      throw new Error('Invalid Indonesian phone number length (8 format)')
    }
    cleaned = '62' + cleaned // 8xxxxxxxx -> 628xxxxxxxx
  } else if (cleaned.startsWith('62')) {
    if (cleaned.length < 11 || cleaned.length > 14) {
      throw new Error('Invalid Indonesian phone number length (62 format)')
    }
  } else {
    if (cleaned.length < 8 || cleaned.length > 11) {
      throw new Error('Invalid phone number length')
    }
    cleaned = '62' + cleaned
  }

  if (!cleaned.startsWith('628')) {
    throw new Error('Invalid Indonesian mobile number format')
  }

  // WAHA requires @c.us suffix
  return cleaned + '@c.us'
}
```

#### E. Function: `validateFonnteWebhook()` → `validateWahaWebhook()`
```typescript
// BEFORE
export const validateFonnteWebhook = (signature: string, body: unknown): boolean => {
  const secret = FONNTE_WEBHOOK_SECRET || FONNTE_TOKEN
  if (!secret) return false

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex')
    return signature === expectedSignature
  } catch (error) {
    logger.error('Fonnte webhook validation error', error instanceof Error ? error : new Error(String(error)))
    return false
  }
}

// AFTER - WAHA may use different webhook validation
export const validateWahaWebhook = (signature: string, body: unknown): boolean => {
  // WAHA webhook validation strategy:
  // - Option 1: HMAC-SHA256 like Fonnte (if WAHA_WEBHOOK_SECRET exists)
  // - Option 2: API Key validation only (if using X-Api-Key header)
  // - TODO: Verify WAHA webhook validation requirements

  if (!WAHA_API_KEY) return false

  try {
    // For now, implement same HMAC validation
    // This may need adjustment based on WAHA's actual webhook format
    const expectedSignature = crypto
      .createHmac('sha256', WAHA_API_KEY)
      .update(JSON.stringify(body))
      .digest('hex')
    return signature === expectedSignature
  } catch (error) {
    logger.error(
      'WAHA webhook validation error',
      error instanceof Error ? error : new Error(String(error))
    )
    return false
  }
}
```

#### F. Function: `validateWebhookRequest()`
```typescript
// Update to use WAHA
export const validateWebhookRequest = (
  signature: string,
  body: unknown,
  timestamp?: string
): { valid: boolean; error?: string } => {
  if (!WAHA_API_KEY) {
    return { valid: false, error: 'WAHA not configured' }
  }

  if (!signature) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true }
    }
    return { valid: false, error: 'Missing webhook signature' }
  }

  if (!validateWahaWebhook(signature, body)) {
    if (ALLOW_UNSIGNED_WEBHOOKS) {
      return { valid: true }
    }
    return { valid: false, error: 'Invalid webhook signature' }
  }

  if (timestamp) {
    const now = Date.now()
    const webhookTime = parseInt(timestamp)
    const timeDiff = Math.abs(now - webhookTime)

    if (timeDiff > 5 * 60 * 1000) {
      return { valid: false, error: 'Webhook timestamp too old' }
    }
  }

  return { valid: true }
}
```

#### G. Keep These Functions (Provider-Agnostic)
- `createAppointmentReminder()` - No changes needed

#### H. Logger/Comments Updates
- Replace all "Fonnte" mentions with "WAHA"
- Update warning messages to reference WAHA configuration

---

### 2. `src/app/api/webhooks/fonnte/incoming/route.ts` → `src/app/api/webhooks/waha/incoming/route.ts`

**Current**: 320 lines handling incoming messages and status updates

**Directory Change**:
```
OLD: src/app/api/webhooks/fonnte/incoming/route.ts
NEW: src/app/api/webhooks/waha/incoming/route.ts
```

**What Changes**:

#### A. Imports
```typescript
// BEFORE
import { validateWebhookToken } from "@/lib/webhook-auth";

// AFTER - Same, but will call WAHA functions internally
import { validateWebhookToken } from "@/lib/webhook-auth";
```

#### B. Field Normalization: `normalizeIncoming()`
```typescript
// BEFORE
function normalizeIncoming(body: WebhookBody) {
  const sender = body.sender || body.phone || body.from || body.number || body.wa_number
  const message = body.message || body.text || body.body
  const device = body.device || body.gateway || body.instance
  const name = body.name || body.sender_name || body.contact_name
  const id = body.id || body.message_id || body.msgId
  const timestamp = body.timestamp || body.time || body.created_at

  return { sender, message, device, name, id, timestamp }
}

// AFTER - Adjust for WAHA field names
function normalizeIncoming(body: WebhookBody) {
  // WAHA sends in format: 628xxxxxxxxxx@c.us
  // We need to strip @c.us for lookups
  let sender = body.from || body.chatId || body.sender || body.phone || body.number

  // Strip @c.us suffix if present
  if (sender && sender.includes('@c.us')) {
    sender = sender.replace('@c.us', '')
  }

  const message = body.text || body.message || body.body
  const device = body.device || body.instance
  const name = body.pushName || body.name
  const id = body.messageId || body.id || body.message_id
  const timestamp = body.timestamp || body.time

  return { sender, message, device, name, id, timestamp }
}
```

#### C. Idempotency Key Updates
```typescript
// BEFORE
const idemKey = `webhook:fonnte:incoming:${fallbackId}`

// AFTER
const idemKey = `webhook:waha:incoming:${fallbackId}`

// AND in status updates
const idemKey = `webhook:waha:message-status:${hashFallbackId([id, String(timestamp || '')])}`
```

#### D. Status Mapping: `mapStatusToEnum()`
```typescript
// BEFORE - Maps Fonnte status values
function mapStatusToEnum(status?: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  const s = (status || '').toLowerCase()
  if (!s) return null
  if (['sent', 'queued'].includes(s)) return 'SENT'
  if (['delivered', 'read', 'opened', 'received'].includes(s)) return 'DELIVERED'
  if (['failed', 'error', 'undelivered'].includes(s)) return 'FAILED'
  return null
}

// AFTER - May need adjustment for WAHA status values
function mapStatusToEnum(status?: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | null {
  const s = (status || '').toLowerCase()
  if (!s) return null

  // WAHA status values (verify these)
  if (['sent', 'sending', 'queued'].includes(s)) return 'SENT'
  if (['delivered', 'read', 'received'].includes(s)) return 'DELIVERED'
  if (['failed', 'error', 'rejected'].includes(s)) return 'FAILED'
  return null
}
```

#### E. Logger Message Updates
```typescript
// BEFORE
logger.info("Fonnte incoming webhook received", { sender, device, ... })

// AFTER
logger.info("WAHA incoming webhook received", { sender, device, ... })

// AND
logger.warn('Fonnte message failed', { id, reason })
→
logger.warn('WAHA message failed', { id, reason })
```

#### F. Handle Status Updates
The `handleMessageStatusUpdate()` function will need adjustment for WAHA response format (TBD based on actual WAHA webhook structure)

---

### 3. `src/db/reminder-schema.ts`

**Change**: Rename database column

```typescript
// BEFORE (Line 58)
fonnteMessageId: text("fonnte_message_id"),

// AFTER
wahaMessageId: text("waha_message_id"),
```

**Migration Required**: See [Database & Schema (Phase 4)](#database--schema-phase-4) section

---

### 4. `src/app/api/patients/[id]/manual-verification/route.ts`

**Current**: Direct Fonnte API call (not using service abstraction)

**What Changes**:

```typescript
// BEFORE - Direct Fonnte call
const payload = {
  target: formattedPhoneNumber,
  message: verificationMessage
}

const response = await fetch('https://api.fonnte.com/send', {
  method: 'POST',
  headers: {
    'Authorization': process.env.FONNTE_TOKEN!,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})

// AFTER - Use WAHA service
const { sendWhatsAppMessage, formatWhatsAppNumber } = await import('@/lib/waha')

const result = await sendWhatsAppMessage({
  to: patient.phoneNumber,
  body: verificationMessage
})

if (!result.success) {
  throw new Error(`Failed to send verification: ${result.error}`)
}

return Response.json({
  success: true,
  messageId: result.messageId
})
```

---

## Service Layer (Phase 2)

### 5. `src/services/whatsapp/whatsapp.service.ts`

**Changes**:

```typescript
// BEFORE
import { sendWhatsAppMessage, formatWhatsAppNumber, WhatsAppMessageResult } from "@/lib/fonnte"

// AFTER
import { sendWhatsAppMessage, formatWhatsAppNumber, WhatsAppMessageResult } from "@/lib/waha"
```

**Notes**:
- No functional logic changes needed
- Logger messages can reference "WAHA" for clarity
- Retry logic and rate limiting remain unchanged

---

### 6. `src/services/verification/simple-verification.service.ts`

**Changes**:

```typescript
// BEFORE
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte"

// AFTER
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/waha"
```

**Notes**:
- Phone number formatting now auto-appends `@c.us`
- All validation logic remains the same
- Comments mentioning "Fonnte" should update to "WAHA"

---

### 7. `src/services/simple-confirmation.service.ts`

**Changes**:

```typescript
// BEFORE
// Comment: "Fonnte may update status to DELIVERED before patient responds"

// AFTER
// Comment: "WAHA may update status to DELIVERED before patient responds"

// Import update
import { sendWhatsAppMessage } from "@/lib/waha"
```

---

### 8. `src/services/reminder/context-aware-confirmations.service.ts`

**Changes**:

```typescript
// BEFORE
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte"

// AFTER
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/waha"
```

---

### 9. `src/services/reminder/reminder.service.ts`

**Critical Changes**: Update all database field references

```typescript
// BEFORE
fonnteMessageId: string
reminder.fonnteMessageId

// AFTER
wahaMessageId: string
reminder.wahaMessageId

// In create/update methods
const saved = await db.insert(reminders).values({
  // ... other fields ...
  fonnteMessageId: result.messageId  // OLD
})

// BECOMES
const saved = await db.insert(reminders).values({
  // ... other fields ...
  wahaMessageId: result.messageId  // NEW
})
```

---

## API Routes (Phase 3)

### 10. `src/app/api/reminders/instant-send-all/route.ts`

**Changes**:

```typescript
// In response metadata
// BEFORE
"provider": "FONNTE"

// AFTER
"provider": "WAHA"

// Database field references
// BEFORE
reminder.fonnteMessageId

// AFTER
reminder.wahaMessageId

// Logger updates
// BEFORE
logger.info('Fonnte message sent', { ... })

// AFTER
logger.info('WAHA message sent', { ... })
```

---

### 11. `src/app/api/cron/route.ts`

**Changes**: Update field references

```typescript
// BEFORE
fonnteMessageId

// AFTER
wahaMessageId
```

---

### 12. `src/app/api/patients/[id]/reminders/route.ts`

**Changes**: Update field references

```typescript
// BEFORE
fonnteMessageId

// AFTER
wahaMessageId
```

---

### 13. `src/app/api/patients/[id]/deactivate/route.ts`

**Changes**: Update field references and any logger messages

```typescript
// BEFORE
// Any "Fonnte" references

// AFTER
// Update to "WAHA"
```

---

## Database & Schema (Phase 4)

### 14. Create Database Migration

**File**: `drizzle/migrations/XXXXXXX_rename_fonnte_to_waha.sql`

```sql
-- Rename fonnte_message_id column to waha_message_id
ALTER TABLE reminders
RENAME COLUMN fonnte_message_id TO waha_message_id;

-- Update index names if they exist
-- (Drizzle usually handles this, but verify)
```

**Steps to Generate**:
1. Update `src/db/reminder-schema.ts` (change field name)
2. Run: `bunx drizzle-kit generate`
3. Review generated migration in `drizzle/migrations/`
4. Run: `bunx drizzle-kit push`

### 15. Update Type Exports

No changes needed - types are provider-agnostic:
```typescript
export type Reminder = typeof reminders.$inferSelect
```

---

## Utilities & Helpers (Phase 5)

### 16. `src/lib/phone-utils.ts`

**Changes**:

```typescript
// BEFORE
import { formatWhatsAppNumber } from "@/lib/fonnte"

// AFTER
import { formatWhatsAppNumber } from "@/lib/waha"
```

---

### 17. `src/lib/reminder-helpers.ts`

**Changes**:

```typescript
// BEFORE - All fonnteMessageId references
reminder.fonnteMessageId
fonnteMessageId: messageId

// AFTER
reminder.wahaMessageId
wahaMessageId: messageId

// Environment variable references
// BEFORE (if any)
process.env.FONNTE_TOKEN

// AFTER
process.env.WAHA_API_KEY
```

---

### 18. `src/lib/webhook-auth.ts`

**Changes**:

```typescript
// BEFORE - Comment
// "Fonnte which doesn't support auth"

// AFTER - Comment
// "WAHA uses X-Api-Key header for authentication"
```

---

### 19. `src/services/rate-limit.service.ts`

**Changes**:

```typescript
// BEFORE
WHATSAPP_MAX_REQUESTS = 30 // Fonnte typical rate limit

// AFTER
WHATSAPP_MAX_REQUESTS = 30 // WAHA typical rate limit

// Keep values the same - both use similar limits
```

---

## Tests & Fixtures (Phase 6)

### 20. `tests/helpers/mock-fixtures.ts`

**Changes**: Rename and update Fonnte mock payloads

```typescript
// BEFORE
export const MOCK_FONNTE_PAYLOADS = {
  validMessage: {
    sender: '628xxxxxxxxxx',
    phone: '628xxxxxxxxxx',
    message: 'Ya',
    id: 'msg_id_123',
    timestamp: 1234567890
  },
  // ... more payloads
}

// AFTER
export const MOCK_WAHA_PAYLOADS = {
  validMessage: {
    from: '628xxxxxxxxxx@c.us',
    chatId: '628xxxxxxxxxx@c.us',
    text: 'Ya',
    messageId: 'msg_id_123',
    timestamp: 1234567890
  },
  // ... more payloads with WAHA format
}
```

---

### 21. `tests/api/comprehensive.test.ts`

**Changes**:

```typescript
// BEFORE
import { MOCK_FONNTE_PAYLOADS } from '@/tests/helpers/mock-fixtures'

// AFTER
import { MOCK_WAHA_PAYLOADS } from '@/tests/helpers/mock-fixtures'

// Update all test cases
it('should process incoming message', async () => {
  const payload = MOCK_WAHA_PAYLOADS.validMessage
  // ... rest of test
})
```

---

### 22. `tests/helpers/auth-mocks.ts`

**Notes**: Review for any Fonnte-specific references and update if found

---

## Documentation (Phase 7)

### 23. `CLAUDE.md`

**Changes**: Update external services table

```markdown
<!-- BEFORE -->
| **Fonnte** | WhatsApp send & incoming | `FONNTE_API_KEY`, `FONNTE_DEVICE_ID` |

<!-- AFTER -->
| **WAHA** | WhatsApp send & incoming | `WAHA_API_KEY`, `WAHA_ENDPOINT` |
```

---

### 24. `README.md`

**Changes**: Update WhatsApp integration documentation

```markdown
<!-- BEFORE -->
## WhatsApp Integration (Fonnte)

This application uses Fonnte for WhatsApp messaging...

Configuration:
- `FONNTE_TOKEN`: API authentication token
- `FONNTE_BASE_URL`: API endpoint (default: https://api.fonnte.com)

<!-- AFTER -->
## WhatsApp Integration (WAHA)

This application uses WAHA (WhatsApp HTTP API) for WhatsApp messaging...

Configuration:
- `WAHA_API_KEY`: API authentication key
- `WAHA_ENDPOINT`: API endpoint (default: http://localhost:3000)
- `WAHA_SESSION`: Session identifier (default: default)
```

---

### 25. `.github/copilot-instructions.md`

**Changes**: Update any Fonnte references to WAHA

---

### 26. `.env.example`

**Changes**: Update environment variables

```bash
# BEFORE
FONNTE_TOKEN=your_token_here
FONNTE_BASE_URL=https://api.fonnte.com
FONNTE_WEBHOOK_SECRET=your_webhook_secret

# AFTER
WAHA_API_KEY=your_api_key_here
WAHA_ENDPOINT=https://waha-production-078e.up.railway.app
WAHA_SESSION=default
```

---

### 27. Any Other Documentation Files

Search codebase for remaining Fonnte references and update as needed

---

## Implementation Order

### Phase 1: Core Integration (CRITICAL)
1. ✅ Create `src/lib/waha.ts` (new file)
2. ✅ Create webhook route `src/app/api/webhooks/waha/incoming/route.ts` (new file)
3. ✅ Update `src/db/reminder-schema.ts` (rename column)
4. ✅ Create database migration
5. ✅ Update `src/app/api/patients/[id]/manual-verification/route.ts`

### Phase 2: Service Layer
6. ✅ Update `src/services/whatsapp/whatsapp.service.ts` (imports)
7. ✅ Update `src/services/verification/simple-verification.service.ts` (imports)
8. ✅ Update `src/services/simple-confirmation.service.ts` (imports)
9. ✅ Update `src/services/reminder/context-aware-confirmations.service.ts` (imports)
10. ✅ Update `src/services/reminder/reminder.service.ts` (field references)

### Phase 3: API Routes
11. ✅ Update `src/app/api/reminders/instant-send-all/route.ts` (field references)
12. ✅ Update `src/app/api/cron/route.ts` (field references)
13. ✅ Update `src/app/api/patients/[id]/reminders/route.ts` (field references)
14. ✅ Update `src/app/api/patients/[id]/deactivate/route.ts` (field references)

### Phase 4: Utilities & Helpers
15. ✅ Update `src/lib/phone-utils.ts` (imports)
16. ✅ Update `src/lib/reminder-helpers.ts` (field/import references)
17. ✅ Update `src/lib/webhook-auth.ts` (comments)
18. ✅ Update `src/services/rate-limit.service.ts` (comments)

### Phase 5: Tests
19. ✅ Update `tests/helpers/mock-fixtures.ts` (mock data)
20. ✅ Update `tests/api/comprehensive.test.ts` (test payloads)
21. ✅ Review `tests/helpers/auth-mocks.ts`

### Phase 6: Documentation
22. ✅ Update `CLAUDE.md`
23. ✅ Update `README.md`
24. ✅ Update `.github/copilot-instructions.md`
25. ✅ Update `.env.example`
26. ✅ Search and fix remaining Fonnte references

### Phase 7: Cleanup
27. ✅ Delete old Fonnte webhook route if no longer needed
28. ✅ Delete `src/lib/fonnte.ts` (after verification that all references updated)
29. ✅ Verify all imports updated
30. ✅ Run full test suite: `bun test`
31. ✅ Run type check: `bun run typecheck`
32. ✅ Run linting: `bun run lint`

---

## Testing Strategy

### Unit Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test tests/api/comprehensive.test.ts

# Run tests matching pattern
bun test --grep "webhook"
```

### Manual Testing Checklist

- [ ] **Incoming Message Handling**
  - [ ] Send test message to patient's WhatsApp
  - [ ] Verify webhook receives message correctly
  - [ ] Verify phone number normalization works (strips @c.us)
  - [ ] Verify idempotency prevents duplicate processing

- [ ] **Message Sending**
  - [ ] Send verification message to patient
  - [ ] Send reminder to patient
  - [ ] Verify message appears on WhatsApp
  - [ ] Verify database stores correct `wahaMessageId`

- [ ] **Status Updates**
  - [ ] Verify message status updates (SENT → DELIVERED)
  - [ ] Verify database field updates correctly

- [ ] **Verification Workflow**
  - [ ] Patient responds "YA" - verify acceptance
  - [ ] Patient responds "TIDAK" - verify rejection

- [ ] **Reminder Confirmation**
  - [ ] Patient responds to reminder prompt
  - [ ] Verify confirmation is processed

- [ ] **Rate Limiting**
  - [ ] Verify WhatsApp rate limiting still works
  - [ ] Verify patient response rate limiting still works

### Integration Tests
- [ ] Test webhook signature validation (if applicable)
- [ ] Test error handling for WAHA API failures
- [ ] Test retry logic with exponential backoff
- [ ] Test concurrent message sending

### Validation Checklist
- [ ] All `fonnteMessageId` references updated to `wahaMessageId`
- [ ] All imports from `@/lib/fonnte` updated to `@/lib/waha`
- [ ] All phone numbers formatted with `@c.us` suffix
- [ ] All logger messages reference "WAHA" instead of "Fonnte"
- [ ] All environment variable references updated
- [ ] Database migration applied successfully
- [ ] Type checking passes: `bun run typecheck`
- [ ] Linting passes: `bun run lint`
- [ ] All tests pass: `bun test`

---

## Known Considerations & TODOs

### 1. WAHA Response Format
**Status**: ⚠️ NEEDS VERIFICATION
- Fonnte returns `{status: true, id: string[]}`
- WAHA response format is TBD - verify in documentation or test
- Update `sendWhatsAppMessage()` response parsing accordingly

### 2. WAHA Webhook Validation
**Status**: ⚠️ NEEDS VERIFICATION
- Current implementation uses HMAC-SHA256 like Fonnte
- Verify if WAHA uses same validation method or different approach
- May need to adjust `validateWahaWebhook()` function

### 3. Media/File Support
**Status**: ⚠️ NEEDS VERIFICATION
- Fonnte supports `url` parameter for media
- WAHA support for media is unclear - needs testing
- May need different implementation for file sending

### 4. WAHA Session Management
**Status**: ⚠️ NEEDS VERIFICATION
- Currently hardcoded to `"default"` session
- May need dynamic session management in future
- Verify single session is sufficient for production

### 5. Phone Number Prefix Handling
**Status**: ⚠️ NEEDS TESTING
- Webhook incoming messages may already come in `@c.us` format
- Need to verify if `normalizeIncoming()` correctly strips suffix
- Test with real WAHA webhook data

### 6. Existing Data Migration
**Status**: ⚠️ OPTIONAL
- Database has `fonnteMessageId` values in production
- Consider: backfill `wahaMessageId` from `fonnteMessageId`
- Or: keep both columns during transition period
- Current migration just renames - may need adjustment

---

## Rollback Plan

If issues arise during migration:

1. **Database Rollback**
   ```bash
   # Create inverse migration
   ALTER TABLE reminders RENAME COLUMN waha_message_id TO fonnte_message_id;
   bunx drizzle-kit push
   ```

2. **Code Rollback**
   - Revert `src/lib/waha.ts` → use `src/lib/fonnte.ts`
   - Revert webhook route: use old route
   - Revert imports in all service files

3. **Keep Both Providers** (during transition)
   - Keep `fonnte.ts` file alongside `waha.ts`
   - Use feature flag to switch providers
   - Allows gradual rollout

---

## Success Criteria

Migration is complete when:

- ✅ All 27 files updated/migrated
- ✅ Database migration applied successfully
- ✅ All tests pass
- ✅ Type checking passes
- ✅ Linting passes
- ✅ Manual testing confirms workflows work:
  - ✅ Incoming messages processed
  - ✅ Outgoing messages sent
  - ✅ Status updates recorded
  - ✅ Verification flow works
  - ✅ Reminder confirmation works
- ✅ Production deployment successful
- ✅ No Fonnte references remain in codebase

---

## Appendix: File Checklist

### Critical Files (4)
- [ ] `src/lib/waha.ts` (CREATE)
- [ ] `src/app/api/webhooks/waha/incoming/route.ts` (CREATE)
- [ ] `src/db/reminder-schema.ts` (EDIT)
- [ ] `src/app/api/patients/[id]/manual-verification/route.ts` (EDIT)

### Service Layer (5)
- [ ] `src/services/whatsapp/whatsapp.service.ts`
- [ ] `src/services/verification/simple-verification.service.ts`
- [ ] `src/services/simple-confirmation.service.ts`
- [ ] `src/services/reminder/context-aware-confirmations.service.ts`
- [ ] `src/services/reminder/reminder.service.ts`

### API Routes (4)
- [ ] `src/app/api/reminders/instant-send-all/route.ts`
- [ ] `src/app/api/cron/route.ts`
- [ ] `src/app/api/patients/[id]/reminders/route.ts`
- [ ] `src/app/api/patients/[id]/deactivate/route.ts`

### Utilities (4)
- [ ] `src/lib/phone-utils.ts`
- [ ] `src/lib/reminder-helpers.ts`
- [ ] `src/lib/webhook-auth.ts`
- [ ] `src/services/rate-limit.service.ts`

### Tests & Fixtures (3)
- [ ] `tests/helpers/mock-fixtures.ts`
- [ ] `tests/api/comprehensive.test.ts`
- [ ] `tests/helpers/auth-mocks.ts`

### Documentation (4)
- [ ] `CLAUDE.md`
- [ ] `README.md`
- [ ] `.github/copilot-instructions.md`
- [ ] `.env.example`

### Database (1)
- [ ] `drizzle/migrations/XXXXXXX_rename_fonnte_to_waha.sql` (CREATE)

---

**Total**: 27 files

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-10-27
**Maintainer**: David Yusaku
