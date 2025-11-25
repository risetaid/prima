SPS E:\Portfolio\Web\prima> bun run test:comprehensive
$ bun run tests/comprehensive-suite/index.ts
═══════════════════════════════════════════════════════
    PRIMA COMPREHENSIVE TEST SUITE
    Testing: Auth, Reminders, WhatsApp, Content, Load
═══════════════════════════════════════════════════════


🔐 Running Authentication Tests...
   ℹ️  Note: No rate limiting detected (might be disabled for health checks)

⏰ Running Reminder System Tests...
   ℹ️  Created 0/15 reminders (rate limiting may apply)

💬 Running WhatsApp Integration Tests...
   ℹ️  Duplicate detection may use Redis (check Redis connection)
   ℹ️  WhatsApp service structure validated

📺 Running Content Management Tests...

═══════════════════════════════════════════════════════
  Starting Load & Performance Tests
═══════════════════════════════════════════════════════

🔥 Running Load Tests...

  Running: Concurrent 10 Users...
  Concurrent 10 Users: 30/30 (100%) - 1.4s
  Concurrent 10 Users: 30/30 (100%) - 1.5s

  ⚠️ Concurrent 10 Users Results:
     Success Rate: 20.0%
     Avg Response: 394ms
     Min Response: 117ms
     Max Response: 608ms
     P50 (Median): 495ms
     P95: 593ms
     P99: 608ms
     Total Requests: 50
     Failed: 20

  Running: Concurrent 25 Users...
  Concurrent 25 Users: 75/75 (100%) - 3.6s
  Concurrent 25 Users: 75/75 (100%) - 3.7s

  ⚠️ Concurrent 25 Users Results:
     Success Rate: 20.0%
     Avg Response: 1020ms
     Min Response: 371ms
     Max Response: 1614ms
     P50 (Median): 1096ms
     P95: 1592ms
     P99: 1614ms
     Total Requests: 125
     Failed: 50

  Running: Concurrent 50 Users...
  Concurrent 50 Users: 150/150 (100%) - 8.4s
  Concurrent 50 Users: 150/150 (100%) - 8.5s

  ⚠️ Concurrent 50 Users Results:
     Success Rate: 20.0%
     Avg Response: 2708ms
     Min Response: 695ms
     Max Response: 3811ms
     P50 (Median): 3547ms
     P95: 3775ms
     P99: 3809ms
     Total Requests: 250
     Failed: 100

  Running: Stress Test 100 Users...
  ⚠️  This test is designed to push limits - some failures are expected

  Stress Test 100 Users: 500/500 (100%) - 29.7s
  Stress Test 100 Users: 500/500 (100%) - 29.8s

  ⚠️ Stress Test 100 Users Results:
     Success Rate: 11.1%
     Avg Response: 5873ms
     Min Response: 1426ms
     Max Response: 7600ms
     P50 (Median): 6874ms
     P95: 7301ms
     P99: 7443ms
     Total Requests: 900
     Failed: 400

═══════════════════════════════════════════════════════

📊 Running Response Time Analysis...

  Testing individual endpoint performance (10 requests each)...

  ✅ Health Check         Avg: 129ms  Min: 101ms  Max: 310ms
  ✅ Dashboard Stats      Avg: 89ms  Min: 75ms  Max: 96ms
  ✅ Patient List         Avg: 93ms  Min: 80ms  Max: 116ms
  ✅ Reminder List        Avg: 88ms  Min: 77ms  Max: 95ms
  ✅ Content List         Avg: 86ms  Min: 75ms  Max: 106ms
  ✅ Video List           Avg: 91ms  Min: 88ms  Max: 97ms
  ✅ Article List         Avg: 94ms  Min: 84ms  Max: 112ms

═══════════════════════════════════════════════════════
  Generating Reports...
═══════════════════════════════════════════════════════

✅ Laporan berhasil disimpan:
   📄 Teks: E:\Portfolio\Web\prima\test-results\test-report-2025-11-25T05-52-39-691Z.txt
   🌐 HTML: E:\Portfolio\Web\prima\test-results\test-report-2025-11-25T05-52-39-691Z.html
   📊 JSON: E:\Portfolio\Web\prima\test-results\test-report-2025-11-25T05-52-39-691Z.json

═══════════════════════════════════════════════════════
  RINGKASAN HASIL PENGUJIAN
═══════════════════════════════════════════════════════

Status: ⚠️ ADA TES YANG GAGAL

📊 Total Tes: 55
✅ Berhasil: 45 (81.8%)
❌ Gagal: 10
⏱️  Durasi: 63.57 detik

📋 Per Kategori:
   🔐 Auth: 7/11
   ⏰ Reminder: 15/15
   💬 WhatsApp: 8/14
   📺 Content: 15/15

🔥 Load Testing:
   10 Users: 20.0% success, 394ms avg
   25 Users: 20.0% success, 1020ms avg
   50 Users: 20.0% success, 2708ms avg
   100 Users (Stress): 11.1% success, 5873ms avg

💡 Rekomendasi:
   • 🔐 Ada masalah pada sistem autentikasi. Periksa konfigurasi login dan keamanan.
   • 💬 Integrasi WhatsApp bermasalah. Cek koneksi ke server WhatsApp dan kredensial API.
   • ⚠️ Performa sistem menurun pada beban rendah (10 pengguna). Ini masalah serius yang perlu segera diperbaiki.
   • 🔥 Sistem tidak stabil pada beban tinggi (100 pengguna). Ini normal untuk stress test, tapi perlu monitoring.

═══════════════════════════════════════════════════════
  Laporan lengkap tersimpan di folder test-results/
  Buka file HTML untuk tampilan yang lebih mudah dibaca
═══════════════════════════════════════════════════════