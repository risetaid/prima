# Panduan Lengkap Pengujian Sistem PRIMA

## 📋 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Cara Menjalankan Tes](#cara-menjalankan-tes)
3. [Memahami Hasil Tes](#memahami-hasil-tes)
4. [Interpretasi Metrik](#interpretasi-metrik)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Pengenalan

Sistem pengujian komprehensif ini dirancang untuk **pengguna non-teknis** agar dapat:

- ✅ Memastikan sistem PRIMA berfungsi dengan baik
- ✅ Mendeteksi masalah sebelum pengguna mengalaminya
- ✅ Memantau performa sistem di bawah beban
- ✅ Mendapatkan rekomendasi perbaikan yang mudah dipahami

### Yang Diuji

| Kategori           | Apa yang Diuji               | Mengapa Penting          |
| ------------------ | ---------------------------- | ------------------------ |
| 🔐 **Autentikasi** | Login, keamanan, akses       | Melindungi data pasien   |
| ⏰ **Pengingat**   | Membuat & mengirim pengingat | Fitur utama sistem       |
| 💬 **WhatsApp**    | Kirim & terima pesan         | Komunikasi dengan pasien |
| 📺 **Konten**      | Video & artikel kesehatan    | Edukasi pasien           |
| 🔥 **Beban**       | 10-100 pengguna bersamaan    | Stabilitas sistem        |

---

## 🚀 Cara Menjalankan Tes

### Persiapan

1. Pastikan server sedang berjalan:

   ```bash
   bun run dev
   ```

2. Buka terminal/command prompt baru

### Menjalankan Semua Tes (Rekomendasi)

```bash
bun run test:comprehensive
```

⏱️ Durasi: 5-10 menit

### Menjalankan Tes Tertentu (Lebih Cepat)

**Hanya autentikasi:**

```bash
bun run test:auth
```

⏱️ Durasi: ~1 menit

**Hanya pengingat:**

```bash
bun run test:reminder
```

⏱️ Durasi: ~2 menit

**Hanya WhatsApp:**

```bash
bun run test:whatsapp
```

⏱️ Durasi: ~2 menit

**Hanya konten (video & berita):**

```bash
bun run test:content
```

⏱️ Durasi: ~1 menit

**Hanya uji beban:**

```bash
bun run test:load
```

⏱️ Durasi: ~3 menit

---

## 📊 Memahami Hasil Tes

### Membuka Laporan

Setelah tes selesai, buka folder `test-results/`:

1. **File HTML** (paling mudah dibaca)

   - Klik file `.html` terbaru
   - Akan terbuka di browser
   - Tampilan berwarna dengan grafik

2. **File TXT** (ringkasan singkat)

   - Buka dengan Notepad/text editor
   - Format sederhana, mudah dicetak

3. **File JSON** (untuk programmer)
   - Data mentah untuk analisis lebih lanjut

### Indikator Status

#### ✅ HIJAU (Berhasil)

- **Artinya:** Tes berhasil, sistem berfungsi normal
- **Tindakan:** Tidak perlu tindakan

#### ⚠️ KUNING (Peringatan)

- **Artinya:** Tes berhasil tapi ada catatan/peringatan
- **Tindakan:** Perhatikan, tapi tidak urgent

#### ❌ MERAH (Gagal)

- **Artinya:** Tes gagal, ada masalah
- **Tindakan:** Perlu diperbaiki segera

### Contoh Interpretasi

```
✅ Autentikasi: 11/11 tes berhasil (100%)
   Status: Berhasil

⚠️ WhatsApp: 13/15 tes berhasil (87%)
   Status: Ada Masalah
   Tes yang gagal:
   • Send Text Message
     Alasan: Tidak dapat terhubung ke server

❌ Pengingat: 8/15 tes berhasil (53%)
   Status: Ada Masalah Serius
   ...
```

**Penjelasan:**

- Autentikasi OK ✅
- WhatsApp perlu dicek (mungkin server WhatsApp mati) ⚠️
- Pengingat bermasalah serius (perlu perhatian segera) ❌

---

## 📈 Interpretasi Metrik

### Metrik Performa

#### 1. Success Rate (Tingkat Keberhasilan)

```
Success Rate: 95.5%
```

- **Artinya:** 95.5% dari permintaan berhasil
- **Target:**
  - ✅ >95% = Bagus
  - ⚠️ 85-95% = Perlu perhatian
  - ❌ <85% = Masalah serius

#### 2. Response Time (Waktu Respons)

**Average (Rata-rata):**

```
Avg Response: 450ms
```

- **Artinya:** Rata-rata server merespons dalam 0.45 detik
- **Target:**
  - ✅ <500ms = Sangat cepat
  - ⚠️ 500-1000ms = Masih OK
  - ❌ >1000ms = Lambat

**P50 (Median):**

```
P50: 380ms
```

- **Artinya:** 50% permintaan lebih cepat dari 380ms
- **Gunanya:** Pengalaman pengguna tipikal

**P95:**

```
P95: 850ms
```

- **Artinya:** 95% permintaan lebih cepat dari 850ms
- **Gunanya:** Worst-case yang bisa diterima

**P99:**

```
P99: 1200ms
```

- **Artinya:** 99% permintaan lebih cepat dari 1200ms
- **Gunanya:** Kasus terburuk yang jarang terjadi

### Uji Beban

#### 10 Pengguna Bersamaan

```
✅ 10 Users: 98.5% success, 420ms avg
```

- **Artinya:** Sistem stabil dengan beban ringan
- **Ekspektasi:** >98% success

#### 25 Pengguna Bersamaan

```
✅ 25 Users: 96.2% success, 680ms avg
```

- **Artinya:** Sistem masih stabil dengan beban sedang
- **Ekspektasi:** >95% success

#### 50 Pengguna Bersamaan

```
⚠️ 50 Users: 91.8% success, 1100ms avg
```

- **Artinya:** Sistem mulai terasa lambat tapi masih berfungsi
- **Ekspektasi:** >90% success
- **Catatan:** Mungkin perlu upgrade server jika sering terjadi

#### 100 Pengguna (Stress Test)

```
⚠️ 100 Users: 82.3% success, 2400ms avg
```

- **Artinya:** Sistem di bawah tekanan ekstrem
- **Ekspektasi:** >80% success (wajar ada kegagalan)
- **Catatan:** Ini test batas kemampuan sistem

---

## 💡 Rekomendasi Umum

### Berdasarkan Hasil Tes

#### ✅ Semua Hijau

**Rekomendasi:** Tidak ada tindakan, sistem berjalan baik

#### ⚠️ Ada Kuning

**Kemungkinan Masalah:**

1. **WhatsApp gagal:**

   - Cek koneksi internet
   - Cek server WAHA berjalan
   - Cek kredensial API

2. **Response time tinggi:**

   - Server sedang sibuk
   - Banyak pengguna aktif
   - Pertimbangkan upgrade server

3. **Beberapa tes gagal:**
   - Masalah sementara (coba lagi)
   - Layanan eksternal down
   - Maintenance terjadwal

#### ❌ Ada Merah

**Tindakan Segera:**

1. **Database error:**

   - Cek koneksi database
   - Cek ruang disk
   - Hubungi developer

2. **Authentication gagal:**

   - Masalah serius - sistem tidak aman
   - Hubungi developer segera

3. **Multiple failures:**
   - Server mungkin down/restart
   - Hubungi developer

---

## 🔧 Troubleshooting

### Masalah Umum

#### 1. "ECONNREFUSED" atau "Cannot connect"

**Penyebab:** Server tidak berjalan

**Solusi:**

```bash
# Jalankan server
bun run dev
```

#### 2. "Rate limit exceeded"

**Penyebab:** Terlalu banyak permintaan

**Solusi:**

- Tunggu 5-10 menit
- Normal untuk tes rate limiting
- Tidak perlu tindakan

#### 3. "Timeout"

**Penyebab:** Server lambat merespons

**Solusi:**

- Cek beban server (CPU, RAM)
- Tunggu proses selesai
- Jalankan tes lagi

#### 4. "Authentication failed"

**Penyebab:** Tes memang mengecek proteksi

**Solusi:**

- Ini normal
- 401/403 errors expected
- Tidak perlu tindakan

#### 5. "WhatsApp tests failing"

**Penyebab:** WAHA service tidak tersedia

**Solusi:**

- Cek WAHA_ENDPOINT di .env.local
- Pastikan service WAHA berjalan
- Atau: Tes akan skip otomatis

---

## 📞 Bantuan Lebih Lanjut

### Langkah Troubleshooting

1. **Cek Laporan HTML**

   - Buka file HTML di test-results/
   - Lihat detail error message
   - Catat error yang muncul

2. **Cek Server Logs**

   - Lihat output terminal `bun run dev`
   - Cari error messages berwarna merah
   - Screenshot jika perlu

3. **Cek Environment Variables**

   - Buka file `.env.local`
   - Pastikan semua variabel terisi
   - Jangan share file ini (ada credentials)

4. **Coba Lagi**

   - Restart server: Ctrl+C, lalu `bun run dev`
   - Jalankan tes lagi
   - Catat apakah masalah tetap ada

5. **Hubungi Developer**
   - Kirim file HTML report
   - Sertakan screenshot error
   - Jelaskan langkah yang sudah dicoba

---

## 📅 Jadwal Pengujian Rekomendasi

### Rutin Mingguan

```bash
# Setiap Senin pagi
bun run test:comprehensive
```

- Deteksi masalah dini
- Monitoring performa
- Dokumentasi kesehatan sistem

### Sebelum Deploy

```bash
# Sebelum update/deployment
bun run test:comprehensive
```

- Pastikan tidak ada regresi
- Validasi fitur baru
- Confidence sebelum production

### Setelah Masalah

```bash
# Setelah fix bug
bun run test:comprehensive
```

- Validasi perbaikan
- Pastikan tidak ada side effects
- Dokumentasi resolusi

### Monitoring Performa

```bash
# Setiap bulan
bun run test:load
```

- Trend analysis
- Capacity planning
- Deteksi degradasi performa

---

## ✅ Checklist Kesehatan Sistem

Gunakan checklist ini untuk evaluasi cepat:

- [ ] All tests >90% pass rate
- [ ] No RED (failed) categories
- [ ] Response time <1000ms average
- [ ] Load test success rate >85%
- [ ] No critical errors in logs
- [ ] WhatsApp integration working
- [ ] Database queries fast (<500ms)
- [ ] Authentication secure
- [ ] Reports generated successfully

---

**Dibuat untuk:** Tim PRIMA Healthcare System  
**Versi:** 1.0  
**Terakhir Diperbarui:** November 2025
