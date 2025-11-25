# Testing PRIMA on Railway Deployment

This guide explains how to run the comprehensive test suite against your Railway production deployment.

## Prerequisites

✅ **Before Testing:**

- [ ] PRIMA is deployed on Railway
- [ ] Database is properly configured
- [ ] WAHA service is deployed (for WhatsApp tests)
- [ ] All environment variables are set on Railway
- [ ] You have the Railway deployment URL (e.g., https://prima.railway.app)

## Quick Start

### Basic Testing

```bash
# Test all features on Railway
bun run test:comprehensive --url https://prima.railway.app

# Test specific category
bun run test:auth --url https://prima.railway.app
bun run test:reminder --url https://prima.railway.app
bun run test:load --url https://prima.railway.app
```

### Using Environment Variable

```bash
# Set once, run multiple times
export TEST_BASE_URL=https://prima.railway.app

bun run test:comprehensive
bun run test:auth
bun run test:load
```

Or on Windows PowerShell:

```powershell
$env:TEST_BASE_URL = "https://prima.railway.app"
bun run test:comprehensive
```

## What Gets Tested

| Test Category          | Production Safe? | Notes                                           |
| ---------------------- | ---------------- | ----------------------------------------------- |
| Authentication         | ✅ Yes           | Creates test users with unique timestamps       |
| Reminder System        | ⚠️ Caution       | Creates real reminders and patients             |
| WhatsApp Integration   | ⚠️ Caution       | May send real WhatsApp messages if configured   |
| Content (Video/Berita) | ✅ Yes           | CRUD operations, data is cleaned up             |
| Load Testing           | ⚠️ Caution       | Simulates 10-100 concurrent users on production |

## Production Testing Considerations

### ⚠️ Important Warnings

1. **Real Data Creation**

   - Tests create real database records (patients, reminders, users)
   - Consider cleaning up test data afterwards
   - Use test accounts, not production user accounts

2. **Load Testing Impact**

   - 100 concurrent users test can stress your production system
   - May affect real user experience during test
   - Consider running during off-peak hours

3. **WhatsApp Messages**

   - If WAHA is configured, tests may send real messages
   - Use test phone numbers
   - Monitor your WhatsApp message quota

4. **Rate Limiting**
   - Production may have stricter rate limits
   - Some tests intentionally trigger rate limits
   - Allow cooldown time between test runs

### 🎯 Best Practices

1. **Timing**

   ```bash
   # Run during low-traffic periods
   # Example: 2 AM - 5 AM local time
   bun run test:comprehensive --url https://prima.railway.app
   ```

2. **Selective Testing**

   ```bash
   # Test critical features first
   bun run test:auth --url https://prima.railway.app

   # Then test content management
   bun run test:content --url https://prima.railway.app

   # Load test last (most impactful)
   bun run test:load --url https://prima.railway.app
   ```

3. **Skip WhatsApp Tests** (if not needed)

   - Edit `runner.ts` temporarily
   - Comment out WhatsApp category
   - Prevents accidental message sending

4. **Monitor Railway Dashboard**
   - Watch CPU/Memory usage during load tests
   - Check for errors in Railway logs
   - Monitor database connections

## Understanding Production Results

### Expected Differences from Localhost

| Metric        | Localhost | Railway   | Reason                        |
| ------------- | --------- | --------- | ----------------------------- |
| Response Time | <100ms    | 100-500ms | Network latency, SSL overhead |
| Success Rate  | 100%      | 95-99%    | Network issues, cold starts   |
| P99 Latency   | <200ms    | <1000ms   | Geographic distance           |
| Load Test     | Stable    | May vary  | Shared resources on Railway   |

### Performance Benchmarks

**Authentication (10 concurrent users):**

- ✅ Excellent: <300ms average, >99% success
- ⚠️ Acceptable: <500ms average, >95% success
- ❌ Needs Investigation: >500ms or <95% success

**Reminder System:**

- ✅ Excellent: <400ms average
- ⚠️ Acceptable: <800ms average
- ❌ Needs Investigation: >800ms average

**Load Test (100 users):**

- ✅ Excellent: >90% success rate
- ⚠️ Acceptable: >80% success rate
- ❌ Needs Investigation: <80% success rate

## Test Report Analysis

### Sample Production Report

When you run tests against Railway, the report will show:

```
═══════════════════════════════════════════════════════
    PRIMA COMPREHENSIVE TEST SUITE
═══════════════════════════════════════════════════════

🌐 Target Environment: 🚀 Production (Railway)
📍 Testing URL: https://prima.railway.app

⚠️  WARNING: Testing against production environment!
   - Real data will be created
   - Load tests will impact live users
   - Please review test data after completion

🔐 Running Authentication Tests...
✓ API Health Check (234ms)
✓ User Signup (178ms)
✓ User Login (156ms)
...
```

### Key Metrics to Watch

1. **Response Time Trends**

   - Consistent: Good (e.g., 200-250ms)
   - Increasing: May indicate resource exhaustion
   - Spiky: Network or cold start issues

2. **Success Rates**

   - > 99%: Excellent
   - 95-99%: Acceptable, investigate failures
   - <95%: Critical issues, stop load testing

3. **Error Messages**
   - "Connection refused": Railway service down
   - "Timeout": Increase timeout or check performance
   - "Rate limit": Expected, but note frequency

## Cleaning Up Test Data

After testing, clean up test data:

```sql
-- Connect to Railway database
-- Delete test users (created with timestamps)
DELETE FROM users
WHERE email LIKE '%test_user_%@test.com';

-- Delete test patients
DELETE FROM patients
WHERE nama LIKE 'Test Patient %';

-- Delete test reminders
DELETE FROM reminders
WHERE id IN (
  SELECT r.id FROM reminders r
  JOIN patients p ON r.patient_id = p.id
  WHERE p.nama LIKE 'Test Patient %'
);

-- Delete test videos/articles if needed
DELETE FROM videos WHERE title LIKE 'Test Video %';
DELETE FROM berita WHERE judul LIKE 'Test Article %';
```

Or use the admin panel to manually delete test records.

## Troubleshooting

### Common Railway Issues

**"Network request failed"**

- Railway service might be sleeping (free tier)
- Check Railway dashboard for service status
- Wait 30 seconds for service to wake up

**"Authentication failed"**

- Check Railway environment variables
- Ensure JWT_SECRET is set correctly
- Verify database connection

**"Database connection timeout"**

- Railway database might be overloaded
- Check database connection limits
- Consider upgrading Railway plan

**"Rate limit exceeded"**

- Railway may have aggressive rate limiting
- Increase delays between requests
- Contact Railway support for limits

**WhatsApp tests failing**

- WAHA not deployed on Railway
- WAHA_ENDPOINT not configured correctly
- Tests will skip gracefully

### Performance Issues

If load tests show poor performance:

1. **Check Railway Plan**

   - Free tier has limited resources
   - Consider upgrading for better performance

2. **Database Optimization**

   - Add indexes (already in schema)
   - Check query performance in Railway logs
   - Consider connection pooling

3. **Cold Starts**

   - First request after idle may be slow
   - Run health check before tests
   - Railway hobby plan reduces cold starts

4. **Geographic Distance**
   - Railway deploys to US regions by default
   - Response time includes network latency
   - Consider this in benchmarks

## CI/CD Integration

### GitHub Actions with Railway

```yaml
name: Railway Production Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: "0 2 * * *" # Run at 2 AM daily

jobs:
  test-railway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run comprehensive tests
        env:
          TEST_BASE_URL: ${{ secrets.RAILWAY_URL }}
        run: bun run test:comprehensive

      - name: Upload test reports
        uses: actions/upload-artifact@v3
        with:
          name: railway-test-reports
          path: test-results/

      - name: Notify on failure
        if: failure()
        run: |
          # Send notification (Slack, email, etc.)
          echo "Tests failed on Railway deployment!"
```

### Scheduled Health Checks

```bash
# Add to crontab for periodic testing
0 */6 * * * cd /path/to/prima && bun run test:auth --url https://prima.railway.app
```

## Next Steps

1. ✅ Run initial test suite on Railway
2. 📊 Review performance benchmarks
3. 🔍 Investigate any failures or slow responses
4. 🧹 Clean up test data
5. 📈 Set up automated monitoring
6. 📝 Document any Railway-specific issues
7. ⚡ Optimize based on production metrics

## Support

- Check HTML reports in `test-results/` for detailed analysis
- Review Railway logs for server-side errors
- Monitor Railway metrics dashboard
- Refer to main [README.md](./README.md) for general testing guide

---

**Remember:** Production testing is powerful but should be done responsibly. Always consider the impact on real users and system resources.
