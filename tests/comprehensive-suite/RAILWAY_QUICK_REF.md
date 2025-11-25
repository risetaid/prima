# Railway Testing - Quick Reference

This is a quick reference card for testing PRIMA on Railway deployment.

## Commands

### All Tests on Railway

```bash
bun run test:comprehensive --url https://prima.railway.app
```

### Category-Specific Tests

```bash
bun run test:auth --url https://prima.railway.app
bun run test:reminder --url https://prima.railway.app
bun run test:whatsapp --url https://prima.railway.app
bun run test:content --url https://prima.railway.app
bun run test:load --url https://prima.railway.app
```

### Using Environment Variable

```bash
# Bash/Zsh
export TEST_BASE_URL=https://prima.railway.app
bun run test:comprehensive

# PowerShell
$env:TEST_BASE_URL = "https://prima.railway.app"
bun run test:comprehensive

# Windows CMD
set TEST_BASE_URL=https://prima.railway.app
bun run test:comprehensive
```

## Pre-Test Checklist

- [ ] Railway deployment is running
- [ ] Database is accessible
- [ ] WAHA service is configured (for WhatsApp tests)
- [ ] Testing during off-peak hours
- [ ] Ready to clean up test data after

## What Tests Do

| Category | Creates              | Sends Messages | Impact |
| -------- | -------------------- | -------------- | ------ |
| Auth     | Test users           | No             | Low    |
| Reminder | Patients + Reminders | No\*           | Medium |
| WhatsApp | Webhooks             | Yes\*\*        | High   |
| Content  | Videos/Articles      | No             | Low    |
| Load     | API requests         | No             | High   |

\* Reminders are created but not automatically sent  
\*\* Only if WAHA is configured

## Expected Results

### Response Times (Production)

- Auth: <300ms (excellent), <500ms (acceptable)
- Reminder: <400ms (excellent), <800ms (acceptable)
- Content: <300ms (excellent), <600ms (acceptable)

### Success Rates

- ✅ >99%: Excellent
- ⚠️ 95-99%: Acceptable
- ❌ <95%: Investigate

### Load Test (100 users)

- ✅ >90%: Excellent
- ⚠️ >80%: Acceptable
- ❌ <80%: Needs optimization

## Quick Troubleshooting

| Error              | Solution                              |
| ------------------ | ------------------------------------- |
| Connection refused | Check Railway service status          |
| Timeout            | Increase timeout or check performance |
| Auth failed        | Verify Railway environment variables  |
| Rate limit         | Wait between test runs                |
| WhatsApp fail      | Skip or configure WAHA properly       |

## After Testing

1. Check test reports in `test-results/`
2. Review Railway logs for errors
3. Clean up test data:
   - Delete test users (email contains `test_user_`)
   - Delete test patients (`Test Patient %`)
   - Delete test reminders linked to test patients

## Links

- **Full Guide:** [RAILWAY_TESTING.md](./RAILWAY_TESTING.md)
- **General Docs:** [README.md](./README.md)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Indonesian Guide:** [PANDUAN_PENGUJIAN.md](./PANDUAN_PENGUJIAN.md)

---

**⚠️ Remember:** Production testing creates real data and may impact live users. Test responsibly!
