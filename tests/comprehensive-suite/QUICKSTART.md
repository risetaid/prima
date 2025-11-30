# Quick Start - Comprehensive Testing

## Testing Localhost (Development)

```bash
# 1. Start the server
bun run dev

# 2. Open a new terminal and run tests
bun run test:comprehensive

# 3. Open the HTML report
# Navigate to test-results/ and open the latest .html file
```

## Testing Railway Deployment (Production)

```bash
# Test your Railway deployment
bun run test:comprehensive --url https://prima.railway.app

# Or test specific categories only
bun run test:auth --url https://prima.railway.app
bun run test:load --url https://prima.railway.app
```

### 🔐 Authenticated Load Testing (Recommended)

For realistic load testing that tests protected endpoints with real authentication:

```powershell
# PowerShell - Set API key and run load tests
$env:TEST_API_KEY = "sk_test_xxx..." # Your CLERK_SECRET_KEY
bun run test:load --url https://prima-production.up.railway.app
```

```bash
# Bash/Linux - Set API key and run load tests
TEST_API_KEY="sk_test_xxx..." bun run test:load --url https://prima-production.up.railway.app
```

**Why use TEST_API_KEY?**

- ✅ Tests protected endpoints (dashboard, patients, reminders, etc.)
- ✅ Simulates real authenticated user load
- ✅ No session expiration issues (API keys don't expire)
- ✅ Uses existing `CLERK_SECRET_KEY` from .env (no new secrets needed)

**Authentication Modes:**

| Mode            | How to Set                | Access Level | Notes                 |
| --------------- | ------------------------- | ------------ | --------------------- |
| **API Key** ⭐  | `TEST_API_KEY=sk_test_..` | Full admin   | Best for load testing |
| Session Token   | `TEST_AUTH_TOKEN=sess_..` | User level   | Expires in ~60 sec    |
| Unauthenticated | (none)                    | Public only  | Tests security        |

⚠️ **Production Testing Warning**: When testing production environments:

- Tests will create real data (test patients, reminders, etc.)
- Load tests will simulate 10-100 concurrent users
- Consider testing during low-traffic periods
- Review and clean up test data afterwards

## What You Get

### 📊 Beautiful HTML Report

- Visual charts and graphs
- Color-coded results (green/yellow/red)
- Easy to understand for non-technical users
- Shareable with stakeholders

### 📝 Plain Text Report

- Quick summary in Indonesian
- Easy to read in any text editor
- Copy-paste friendly

### 📈 Performance Metrics

- Response times (average, P50, P95, P99)
- Success rates
- Load test results
- Recommendations

## Test Categories

| Command                      | What It Tests        | Duration | Railway Support    |
| ---------------------------- | -------------------- | -------- | ------------------ |
| `bun run test:comprehensive` | Everything           | ~8 min   | ✅ Yes             |
| `bun run test:auth`          | Login & Security     | ~1 min   | ✅ Yes             |
| `bun run test:reminder`      | Reminder System      | ~2 min   | ✅ Yes             |
| `bun run test:whatsapp`      | WhatsApp Integration | ~2 min   | ⚠️ Requires Config |
| `bun run test:content`       | Videos & Articles    | ~1 min   | ✅ Yes             |
| `bun run test:load`          | Load & Performance   | ~3 min   | ✅ Yes             |

**Note**: WhatsApp tests require proper WAHA configuration on Railway. Tests will skip gracefully if not configured.

## Understanding Results

### ✅ Success (Green)

All tests passed. System is healthy.

### ⚠️ Warning (Yellow)

Some tests failed or performance degraded. Review recommendations.

### ❌ Failure (Red)

Critical issues detected. Needs immediate attention.

## Quick Troubleshooting

**Server not running?**

```bash
bun run dev
```

**Connection errors?**

- Make sure server is running
- Check `.env.local` for correct settings

**Some tests failing?**

- Check HTML report for details
- Review error messages
- Some failures might be expected (e.g., testing security)

## Example Output

```
═══════════════════════════════════════════════════════
    PRIMA COMPREHENSIVE TEST SUITE
═══════════════════════════════════════════════════════

🔐 Running Authentication Tests...
✓ API Health Check (142ms)
✓ User Signup (89ms)
✓ User Login (67ms)
...

⏰ Running Reminder System Tests...
✓ Setup Test Patient (234ms)
✓ Create New Reminder (156ms)
...

💬 Running WhatsApp Integration Tests...
✓ Phone Number Format Conversion (12ms)
...

📺 Running Content Management Tests...
✓ List All Videos (187ms)
...

🔥 Running Load Tests...
  Concurrent 10 Users: 100% ███████████ 30/30 - 3.2s
  ✅ Success Rate: 98.5%
  Avg Response: 420ms
...

═══════════════════════════════════════════════════════
  RINGKASAN HASIL PENGUJIAN
═══════════════════════════════════════════════════════

Status: ✅ SEMUA TES BERHASIL

📊 Total Tes: 65
✅ Berhasil: 63 (96.9%)
❌ Gagal: 2
⏱️  Durasi: 8.43 detik

📋 Per Kategori:
   🔐 Auth: 11/11
   ⏰ Reminder: 15/15
   💬 WhatsApp: 15/15
   📺 Content: 15/15

🔥 Load Testing:
   10 Users: 98.5% success, 420ms avg
   25 Users: 96.2% success, 680ms avg
   50 Users: 91.8% success, 1100ms avg
   100 Users (Stress): 82.3% success, 2400ms avg

💡 Rekomendasi:
   • ✅ Semua sistem berjalan dengan baik!

═══════════════════════════════════════════════════════
  Laporan lengkap tersimpan di folder test-results/
  Buka file HTML untuk tampilan yang lebih mudah dibaca
═══════════════════════════════════════════════════════
```

## Next Steps

1. **Review HTML Report**: Open in browser for detailed view
2. **Check Recommendations**: See what needs attention
3. **Share Results**: Send HTML report to team
4. **Schedule Regular Tests**: Run weekly for monitoring

## Need Help?

See full documentation:

- `tests/comprehensive-suite/README.md` - Technical details
- `docs/PANDUAN_PENGUJIAN.md` - Indonesian guide for non-technical users

---

**Happy Testing! 🚀**
