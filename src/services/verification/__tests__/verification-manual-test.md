# Manual Test Cases for WhatsApp Verification

## Test Setup
- Use Fonnte webhook endpoint: `/api/webhooks/fonnte/incoming`
- Set webhook token in request headers
- Patient must exist in database with PENDING verification status

## Test Cases

### 1. Accept Verification - "YA"
**Input:**
```json
{
  "sender": "628123456789",
  "message": "YA"
}
```
**Expected Output:**
- Patient `verificationStatus` updated to `VERIFIED`
- WhatsApp ack message sent: "Terima kasih {name}! ✅..."
- Response: `{ ok: true, processed: true, action: 'verified' }`

### 2. Accept Verification - "ya" (lowercase)
**Input:**
```json
{
  "sender": "628123456789",
  "message": "ya"
}
```
**Expected Output:**
- Same as Test 1

### 3. Accept Verification - "SETUJU"
**Input:**
```json
{
  "sender": "628123456789",
  "message": "SETUJU"
}
```
**Expected Output:**
- Same as Test 1

### 4. Accept Verification - "YA" with extra words
**Input:**
```json
{
  "sender": "628123456789",
  "message": "ya saya setuju"
}
```
**Expected Output:**
- Same as Test 1

### 5. Decline Verification - "TIDAK"
**Input:**
```json
{
  "sender": "628123456789",
  "message": "TIDAK"
}
```
**Expected Output:**
- Patient `verificationStatus` updated to `DECLINED`
- WhatsApp ack message sent: "Baik {name}, terima kasih..."
- Response: `{ ok: true, processed: true, action: 'declined' }`

### 6. Decline Verification - "TOLAK"
**Input:**
```json
{
  "sender": "628123456789",
  "message": "TOLAK"
}
```
**Expected Output:**
- Same as Test 5

### 7. Invalid Response - Ambiguous text
**Input:**
```json
{
  "sender": "628123456789",
  "message": "mungkin nanti"
}
```
**Expected Output:**
- Patient `verificationStatus` remains `PENDING`
- WhatsApp clarification message sent: "Halo {name}, mohon balas dengan jelas..."
- Response: `{ ok: true, processed: true, action: 'invalid_response' }`

### 8. Invalid Response - Empty message
**Input:**
```json
{
  "sender": "628123456789",
  "message": ""
}
```
**Expected Output:**
- Same as Test 7

## Context Tracking Tests

### 9. Verification with Active Context
**Setup:** Patient has active verification context (set within 48 hours)
**Input:**
```json
{
  "sender": "628123456789",
  "message": "YA"
}
```
**Expected Output:**
- Verification processed through active context path
- Response includes: `source: 'simple_verification'`

### 10. Verification with Expired Context
**Setup:** Patient verification context expired (> 48 hours)
**Input:**
```json
{
  "sender": "628123456789",
  "message": "YA"
}
```
**Expected Output:**
- Verification processed through fallback path
- Response includes: `source: 'fallback_verification'`

## Rate Limiting Tests

### 11. Rate Limit Exceeded
**Setup:** Patient has sent too many messages within rate limit window
**Input:**
```json
{
  "sender": "628123456789",
  "message": "YA"
}
```
**Expected Output:**
- Response: `{ ok: true, processed: false, action: 'rate_limited' }`
- No database update

## Edge Cases

### 12. Patient Not Found
**Input:**
```json
{
  "sender": "628999999999",
  "message": "YA"
}
```
**Expected Output:**
- Response: `{ ok: true, ignored: true, reason: 'no_patient_match' }`

### 13. Already Verified Patient
**Setup:** Patient already has `verificationStatus` = `VERIFIED`
**Input:**
```json
{
  "sender": "628123456789",
  "message": "YA"
}
```
**Expected Output:**
- Verification check bypassed
- Generic thank you message sent

## Reminder Confirmation Tests

### 14. Simple Reminder Confirmation - "SUDAH"
**Setup:** Patient has VERIFIED status and recent SENT reminder
**Input:**
```json
{
  "sender": "628123456789",
  "message": "SUDAH"
}
```
**Expected Output:**
- Reminder status updated to `DELIVERED`, `confirmationStatus` = `CONFIRMED`
- WhatsApp ack: "Terima kasih {name}! ✅..."
- Response: `{ ok: true, processed: true, action: 'confirmed' }`

### 15. Simple Reminder Confirmation - "BELUM"
**Input:**
```json
{
  "sender": "628123456789",
  "message": "BELUM"
}
```
**Expected Output:**
- Reminder `confirmationResponse` updated with message
- WhatsApp ack: "Baik {name}, jangan lupa..."
- Response: `{ ok: true, processed: true, action: 'not_yet' }`

## Test Commands

### Using curl:
```bash
curl -X POST https://your-domain.com/api/webhooks/fonnte/incoming \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN" \
  -d '{"sender":"628123456789","message":"YA"}'
```

### Using psql to verify database:
```bash
PGPASSWORD=eVBMjcVNugdOgeXoMdCMoaQxTDalGkoN psql -h switchyard.proxy.rlwy.net -U postgres -p 23431 -d railway

# Check patient verification status
SELECT id, name, phone_number, verification_status, verification_response_at 
FROM patients 
WHERE phone_number = '628123456789';

# Check conversation state
SELECT * FROM conversation_states 
WHERE phone_number = '628123456789' 
ORDER BY updated_at DESC LIMIT 1;

# Check conversation messages
SELECT cm.* FROM conversation_messages cm
JOIN conversation_states cs ON cm.conversation_state_id = cs.id
WHERE cs.phone_number = '628123456789'
ORDER BY cm.created_at DESC;
```
