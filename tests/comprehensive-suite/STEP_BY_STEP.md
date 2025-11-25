# 🎬 Step-by-Step Guide: Running Your First Test

This guide walks you through running the comprehensive test suite for the first time.

---

## Step 1: Prepare Your Environment 🛠️

### 1.1 Make Sure Server is Running

Open a terminal and start the development server:

```bash
bun run dev
```

You should see:

```
✓ Ready on http://localhost:3000
```

**Keep this terminal open!** The tests need the server to be running.

---

## Step 2: Run the Tests 🚀

### 2.1 Open a New Terminal

Don't close the server terminal. Open a **new terminal window** in the same project directory.

### 2.2 Choose Your Test Command

**Option A: Run Everything (Recommended for First Time)**

```bash
bun run test:comprehensive
```

⏱️ Duration: ~8 minutes  
✅ Tests everything: Auth, Reminders, WhatsApp, Content, Load

**Option B: Quick Check**

```bash
bun run test:auth
```

⏱️ Duration: ~1 minute  
✅ Just tests authentication

### 2.3 Watch the Magic Happen ✨

You'll see output like this:

```
═══════════════════════════════════════════════════════
    PRIMA COMPREHENSIVE TEST SUITE
    Testing: Auth, Reminders, WhatsApp, Content, Load
═══════════════════════════════════════════════════════

🔐 Running Authentication Tests...
✓ API Health Check (142ms)
✓ User Signup (89ms)
✓ User Login (67ms)
✓ User Logout (45ms)
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
  Running: Concurrent 10 Users...
  Concurrent 10 Users: [████████████] 30/30 - 3.2s

  ✅ Concurrent 10 Users Results:
     Success Rate: 98.5%
     Avg Response: 420ms
     Min Response: 89ms
     Max Response: 1234ms
     P50 (Median): 380ms
     P95: 850ms
     P99: 1200ms
...

═══════════════════════════════════════════════════════
  Generating Reports...
═══════════════════════════════════════════════════════

✅ Laporan berhasil disimpan:
   📄 Teks: test-results/test-report-2025-11-25T10-30-00.txt
   🌐 HTML: test-results/test-report-2025-11-25T10-30-00.html
   📊 JSON: test-results/test-report-2025-11-25T10-30-00.json

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
   💬 WhatsApp: 13/15
   📺 Content: 15/15

🔥 Load Testing:
   10 Users: 98.5% success, 420ms avg
   25 Users: 96.2% success, 680ms avg
   50 Users: 91.8% success, 1100ms avg
   100 Users (Stress): 82.3% success, 2400ms avg

💡 Rekomendasi:
   • ⚠️ Integrasi WhatsApp mengalami gangguan...
   • ✅ Sistem authentication berfungsi dengan baik!

═══════════════════════════════════════════════════════
```

---

## Step 3: View Your Reports 📊

### 3.1 Navigate to test-results Folder

In your file explorer, go to:

```
prima/test-results/
```

You'll see 3 new files:

- 📄 `test-report-{timestamp}.txt` (Text summary)
- 🌐 `test-report-{timestamp}.html` (Beautiful report)
- 📊 `test-report-{timestamp}.json` (Raw data)

### 3.2 Open the HTML Report

**Double-click** the `.html` file.

It will open in your web browser and show:

📊 **Dashboard Section:**

- Total tests
- Passed/Failed counts
- Success percentage
- Total duration

🔐 **Authentication Section:**

- All auth tests listed
- Green checkmarks for passed tests
- Red X for failed tests
- Click to expand details

⏰ **Reminder Section:**

- Reminder system tests
- Schedule validation
- Sending verification

💬 **WhatsApp Section:**

- Message sending tests
- Webhook processing
- Phone formatting

📺 **Content Section:**

- Video tests
- Article tests
- Search & filtering

🔥 **Load Testing Section:**

- Beautiful cards for each load level
- Success rates
- Response times (avg, min, max, P95, P99)

💡 **Recommendations Section:**

- Actionable advice
- Color-coded (green = good, yellow = warning, red = critical)

---

## Step 4: Understanding Results 📈

### ✅ Green = Success

**What it means:** Test passed, feature works correctly

**Example:**

```
✓ API Health Check (142ms)
```

**Action:** Nothing needed, all good! 🎉

### ⚠️ Yellow = Warning

**What it means:** Test passed but with notes, or partial success

**Example:**

```
WhatsApp: 13/15 (87%)
⚠ Some tests had connection issues
```

**Action:** Check the notes, might need attention

### ❌ Red = Failed

**What it means:** Test failed, something is broken

**Example:**

```
✗ Send WhatsApp Message
Alasan: Tidak dapat terhubung ke server
```

**Action:** Fix the issue (check service is running, check credentials)

---

## Step 5: Common First-Time Issues 🔧

### Issue 1: "ECONNREFUSED"

**Symptom:** Many tests fail with connection errors

**Cause:** Server not running

**Fix:**

```bash
# In first terminal
bun run dev
```

Wait for "Ready on http://localhost:3000", then run tests again.

---

### Issue 2: "WhatsApp tests failing"

**Symptom:** WhatsApp category has failures

**Cause:** WAHA service not configured or not running

**Fix:**
This is OK! WhatsApp tests will gracefully skip if service unavailable.

**To fix properly:**

1. Check `.env.local` has `WAHA_ENDPOINT` and `WAHA_API_KEY`
2. Make sure WAHA service is running
3. Run tests again

---

### Issue 3: "Rate limit exceeded"

**Symptom:** Some tests fail with rate limit message

**Cause:** Tests running too fast (this is expected!)

**Fix:**
This is actually **expected behavior** - we're testing rate limiting!

- Wait 5 minutes
- Run tests again
- They should pass

---

### Issue 4: "Auth tests show 401 errors"

**Symptom:** Tests show 401/403 errors

**Cause:** This is **intentional** - we're testing access control!

**Fix:**
No fix needed! 401/403 errors in auth tests are **expected**.
We're verifying that unauthorized requests are properly rejected.

---

## Step 6: What to Do Next 🎯

### Share with Your Team

1. **Open the HTML report** in browser
2. **Take screenshots** or share the file
3. **Discuss results** in team meeting

### Schedule Regular Testing

Run tests regularly:

- ✅ Every Monday morning (weekly health check)
- ✅ Before every deployment (pre-release validation)
- ✅ After fixing bugs (regression testing)

### Monitor Trends

Keep HTML reports to:

- Track performance over time
- Identify degradation early
- Validate improvements

---

## Quick Reference Card 📝

### Commands You'll Use Often

```bash
# Start server (always first)
bun run dev

# Run all tests (new terminal)
bun run test:comprehensive

# Quick auth check
bun run test:auth

# Load test only
bun run test:load
```

### File Locations

```
prima/
├── tests/comprehensive-suite/   # Test code
├── test-results/                # Reports (after running)
│   └── *.html                   # Open this!
└── docs/PANDUAN_PENGUJIAN.md   # Full guide
```

### Getting Help

1. **Quick Start**: `tests/comprehensive-suite/QUICKSTART.md`
2. **Full Guide**: `docs/PANDUAN_PENGUJIAN.md`
3. **Technical**: `tests/comprehensive-suite/README.md`

---

## Success Checklist ✅

After following this guide, you should have:

- [ ] Server running (`bun run dev`)
- [ ] Tests executed successfully
- [ ] Reports generated in `test-results/`
- [ ] HTML report viewed in browser
- [ ] Understand green/yellow/red indicators
- [ ] Know how to run tests again

---

## 🎉 Congratulations!

You've successfully run your first comprehensive test suite!

**What you've accomplished:**

- ✅ Verified authentication works
- ✅ Tested reminder system
- ✅ Validated WhatsApp integration
- ✅ Checked content management
- ✅ Stress-tested with concurrent users
- ✅ Generated beautiful reports

**Keep testing regularly to maintain system health!** 💪

---

**Need Help?** See `docs/PANDUAN_PENGUJIAN.md` for detailed troubleshooting.

**Happy Testing!** 🚀
