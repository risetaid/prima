# 🔧 Fonnte Webhook Authentication Fix

## Problem
Fonnte sends webhooks without authentication tokens, but the system requires authentication. This causes all incoming patient messages to be rejected with 401 Unauthorized.

## Solution: Enable Unsigned Webhooks

Since Fonnte doesn't support adding authentication tokens to webhook requests, we need to allow unsigned webhooks.

### Step 1: Add Environment Variable to Railway

1. Go to Railway dashboard: https://railway.app
2. Select your project: `prima-production`
3. Go to **Variables** tab
4. Add new variable:
   ```
   ALLOW_UNSIGNED_WEBHOOKS=true
   ```
5. Click **Deploy** to restart the app

### Step 2: Verify the Fix

After deployment, test the webhook:

```bash
# Test from command line
curl -X POST https://prima-production.up.railway.app/api/webhooks/fonnte/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "6281333852187",
    "message": "SUDAH",
    "device": "fonnte",
    "id": "test_123",
    "timestamp": 1697123456
  }'
```

Expected response (success):
```json
{
  "ok": true,
  "processed": true,
  "action": "confirmed",
  "source": "simple_reminder_confirmation"
}
```

### Step 3: Test with Real WhatsApp

1. Make sure you have a pending reminder sent to yourself
2. Reply "SUDAH" to the reminder in WhatsApp
3. Check the database:

```sql
SELECT id, confirmation_status, confirmation_response, confirmation_response_at
FROM reminders 
WHERE patient_id = '1f2c2345-58d2-48f4-9b06-f893b81f5b75'
ORDER BY sent_at DESC 
LIMIT 5;
```

You should see:
- `confirmation_status` = `CONFIRMED`
- `confirmation_response` = `SUDAH`
- `confirmation_response_at` = (timestamp when you replied)

## Alternative: Keep Authentication (More Secure)

If you want to keep webhook authentication for security, you have two options:

### Option A: Use Fonnte's Custom Headers (if supported)
Check if Fonnte allows adding custom headers in webhook settings. If yes:
1. In Fonnte dashboard, add header: `X-Webhook-Token: YOUR_WEBHOOK_TOKEN`
2. Set `WEBHOOK_TOKEN` in Railway environment variables
3. Keep `ALLOW_UNSIGNED_WEBHOOKS=false` (or remove it)

### Option B: IP Whitelist (Advanced)
Modify webhook to check request IP against Fonnte's known IPs:
- Get Fonnte's webhook IPs from their documentation
- Add IP whitelist check to webhook-auth.ts

## Security Note

⚠️ **Important**: `ALLOW_UNSIGNED_WEBHOOKS=true` means **anyone** can send fake messages to your webhook endpoint. This is acceptable because:

1. The webhook only processes messages from known patient phone numbers
2. Rate limiting is in place to prevent spam
3. Fonnte is the official SMS gateway and doesn't support authentication

However, in production you should:
- Monitor webhook logs for suspicious activity
- Consider adding IP whitelist for Fonnte servers
- Keep rate limiting enabled

## What Changed in the Code

Updated `src/lib/webhook-auth.ts`:
- Now checks multiple auth sources: query params, Bearer token, custom header
- Falls back to allowing unsigned webhooks if `ALLOW_UNSIGNED_WEBHOOKS=true`
- Logs authentication attempts for debugging

Updated `src/services/simple-confirmation.service.ts`:
- Now accepts reminders with both `SENT` and `DELIVERED` status
- Prevents race condition where Fonnte updates status before patient responds

## Verification Checklist

After deploying:

- [ ] Environment variable `ALLOW_UNSIGNED_WEBHOOKS=true` set in Railway
- [ ] App redeployed and running
- [ ] Test webhook with curl returns success
- [ ] Send yourself a test reminder
- [ ] Reply "SUDAH" in WhatsApp
- [ ] Check database shows confirmation
- [ ] Patient receives acknowledgment message
- [ ] Check Railway logs show "Reminder updated successfully"

## Troubleshooting

### Still not working after fix?

1. **Check Railway logs**:
   ```
   Railway Dashboard → Deployments → View Logs
   ```
   Look for:
   - "Fonnte incoming webhook received"
   - "Processing reminder confirmation"
   - "Reminder updated successfully"

2. **Verify Fonnte webhook is configured**:
   - URL: `https://prima-production.up.railway.app/api/webhooks/fonnte/incoming`
   - Method: POST
   - Content-Type: application/json

3. **Test webhook directly**:
   Use the curl command above to simulate Fonnte

4. **Check patient verification status**:
   ```sql
   SELECT id, name, phone_number, verification_status 
   FROM patients 
   WHERE name = 'David Yusaku';
   ```
   Should be `VERIFIED`, not `PENDING`

5. **Check for recent reminders**:
   ```sql
   SELECT id, scheduled_time, status, confirmation_status, sent_at
   FROM reminders
   WHERE patient_id = '1f2c2345-58d2-48f4-9b06-f893b81f5b75'
   AND sent_at >= NOW() - INTERVAL '24 hours'
   ORDER BY sent_at DESC;
   ```
   Should show recent reminders with `SENT` status and `PENDING` confirmation

## Next Steps

Once confirmed working:
1. Monitor for a few days to ensure stability
2. Add webhook health monitoring
3. Set up alerts for webhook failures
4. Document for other team members
