# 📱 Panduan Aplikasi PRIMA untuk Relawan

## 📋 Table of Contents

1. [Tentang PRIMA](#tentang-prima)
2. [Cara Cepat Mulai](#cara-cepat-mulai)
3. [Workflow Lengkap](#workflow-lengkap)
4. [Fitur Tambahan](#fitur-tambahan)
5. [Tips & Best Practices](#tips--best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Kontak Support](#kontak-support)

---

## 🎯 Tentang PRIMA

**PRIMA** (Palliative Remote Integrated Monitoring and Assistance) adalah aplikasi manajemen pasien berbasis WhatsApp untuk relawan kesehatan Indonesia.

### ✨ Apa yang bisa Anda lakukan dengan PRIMA?
- 📋 **Mengelola pasien kanker** yang Anda dampingi
- 💊 **Pengingat obat otomatis** via WhatsApp
- 📊 **Monitoring kepatuhan** minum obat pasien
- 📚 **Memberikan edukasi** kesehatan

---

## 🚀 Cara Cepat Mulai

### Step 1: Install & Registrasi
```
📱 Download PRIMA dari Play Store
📝 Sign up dengan Gmail
⏳ Tunggu approval dari admin (1-2 hari)
👤 Login kembali setelah disetujui
```

### Step 2: Tambah Pasien
```
➕ Klik tombol + di halaman Pasien
⭐ Input Nama + Nomor WhatsApp (WAJIB)
📸 Upload foto (opsional)
✅ Simpan data pasien
```

### Step 3: Setup Pengingat
```
📱 Pasian akan menerima WhatsApp verifikasi
⚡ Pasien balas "YA" untuk konfirmasi
⏰ Tambah jadwal pengingat obat
📈 Monitor kepatuhan harian
```

---

## 🔄 Workflow Lengkap

### 1️⃣ **Registrasi Akun**

**📋 Langkah-langkah:**
1. Buka Aplikasi PRIMA (download dari Play Store atau via browser)
2. Klik **"Sign Up"**
3. Daftar menggunakan akun Gmail Anda
4. Isi formulir pendaftaran:
   - Nama lengkap
   - Email (otomatis dari Gmail)
   - Nomor telepon
   - Informasi tambahan yang diperlukan
5. Klik **"Daftar"**

### 2️⃣ **Menunggu Approval**

**⏱️ Setelah Registrasi:**
- Status akun Anda: **"Menunggu Persetujuan"**
- Admin akan memverifikasi data Anda
- Proses approval biasanya **1-2 hari kerja**
- Anda akan menerima email ketika disetujui

**🔍 Cara Mengecek Status:**
- Login kembali ke aplikasi PRIMA
- Jika masih menunggu approval, akan tetap di layar awal
- Refresh atau buka kembali aplikasi secara berkala

### 3️⃣ **Akses Dashboard**

**✅ Setelah Disetujui:**
1. Login kembali dengan Gmail Anda
2. System akan otomatis redirect ke halaman `/pasien`
3. Anda akan melihat dashboard daftar pasien

**📊 Dashboard Menampilkan:**
- Daftar pasien yang Anda kelola
- Status kepatuhan setiap pasien
- Tombol untuk menambah pasien baru

### 4️⃣ **Menambah Pasien Baru**

**➕ Langkah-langkah:**
1. Di halaman `/pasien`, klik tombol `+` (Add Patient)
2. Isi data pasien:

| 📋 WAJIB Diisi | ⭐ Sangat Penting |
|---|---|
| **Nama lengkap pasien** | Untuk identifikasi |
| **Nomor WhatsApp aktif** | Untuk pengiriman pesan |

| 📝 Opsional (bisa diisi nanti) | 💡 Informasi Tambahan |
|---|---|
| Alamat | Lokasi pasien |
| Tanggal lahir | Data demografi |
| Tanggal diagnosis kanker | Riwayat medis |
| Stadium kanker | Tingkat keparahan |
| Nama dokter penanggung jawab | Kontak medis |
| Rumah sakit tempat perawatan | Lokasi treatment |
| Kontak darurat (nama + nomor) | Emergency contact |
| Catatan tambahan | Notes khusus |
| Foto pasien | Identifikasi visual |

3. Klik **"Simpan Data Pasien"**

### 5️⃣ **Verifikasi Pasien**

**📱 Setelah Menambah Pasien:**
1. Status pasien awalnya: **"Menunggu Verifikasi"**
2. Pasien akan menerima WhatsApp verifikasi otomatis:
   ```
   Halo [Nama Pasien], ini adalah PRIMA - sistem monitoring kesehatan.
   Untuk mengaktifkan layanan, balas "YA" jika Anda bersedia bergabung.
   ```

**🔄 Status Response:**
| Response | Status Pasien | Aksi Selanjutnya |
|---|---|---|
| **"YA"** | ✅ Aktif | Bisa tambah pengingat |
| **"TIDAK"** | ❌ Nonaktif | Follow up manual |
| **No Response** | ⏳ Menunggu | Follow up manual |

**🔍 Cara Mengecek Status:**
- Refresh atau buka kembali aplikasi PRIMA
- Lihat kolom "Status" pada pasien yang bersangkutan
- Status akan berubah dari "Menunggu" menjadi "Aktif"

### 6️⃣ **Menambah Pengingat Obat**

**⚠️ Syarat:** Pasien harus sudah **Aktif** (verified)

**📝 Langkah-langkah:**
1. Klik nama pasien yang sudah aktif
2. Di halaman detail pasien, klik tab **"Pengingat"**
3. Klik **"Tambah Pengingat Baru"**
4. Isi formulir pengingat:

| Field | Contoh | Tips |
|---|---|---|
| **Nama Obat** | "Paracetamol" | Gunakan nama familiar |
| **Dosis** | "1 tablet" | Jelas dan spesifik |
| **Frekuensi** | 2x sehari | Sesuai resep dokter |
| **Waktu** | 08:00, 20:00 | Sesuai jadwal pasien |
| **Pesan Kustom** | "Halo Bunda, minum obat ya ❤️" | Personalisasi untuk engagement |

5. Klik **"Simpan Pengingat"**

**📅 Contoh Setup Pengingat:**
```
💊 Obat A: 2x sehari (08:00, 20:00)
💊 Obat B: 1x sehari (12:00 setelah makan)
🌿 Suplemen: 3x sehari (08:00, 14:00, 20:00)
```

### 7️⃣ **Monitoring Kepatuhan**

**📊 Dashboard Indicators:**
- 🟢 **Tinggi (80%+):** Pasien disiplin
- 🟡 **Sedang (50-79%):** Perlu attention
- 🔴 **Rendah (<50%):** Prioritas follow-up

**📋 Follow-up untuk Kepatuhan Rendah:**
1. Klik nama pasien dengan kepatuhan rendah
2. Review tab **"Pengingat"** untuk melihat yang terlewat
3. Hubungi pasien via WhatsApp
4. Tanyakan kendala dan berikan support

---

## 🛠️ Fitur Tambahan

### 📝 **Edit Data Pasien**
1. Klik nama pasien di dashboard
2. Klik tombol **"Edit"** pada bagian data yang ingin diubah
3. Update informasi
4. Klik **"Simpan Perubahan"**

### 🏥 **Catatan Kesehatan**
1. Di detail pasien, buka tab **"Kesehatan"**
2. Klik **"Tambah Catatan"**
3. Isi tanggal dan catatan perkembangan pasien
4. Klik **"Simpan"**

### 📚 **Edukasi Pasien**
1. **📰 Berita Edukasi:** Menu "Berita" untuk artikel kesehatan
2. **🎥 Video Edukasi:** Menu "Video Edukasi" untuk penjelasan visual
3. Share link ke pasien via WhatsApp

---

## 💡 Tips & Best Practices

### 🎯 **Saat Registrasi**
- ✅ Gunakan email Gmail resmi/aktif
- ✅ Isi data dengan lengkap dan jelas
- ✅ Pastikan nomor telepon bisa dihubungi

### 👥 **Saat Menambah Pasien**
- ⭐ **WAJIB:** Pastikan Nama dan Nomor WhatsApp sudah benar
- ✅ Konfirmasi nomor WhatsApp aktif sebelum input
- ✅ Pastikan pasien setuju untuk join PRIMA
- 💡 Data lain bisa diisi secara bertahap nanti
- 💡 Upload foto untuk identifikasi yang lebih mudah (opsional)

### ⏰ **Saat Setup Pengingat**
- 🕐 Sesuaikan waktu dengan jadwal pasien
- 💊 Gunakan nama obat yang familiar bagi pasien
- 💬 Personalisasi pesan untuk engagement lebih baik

### 📊 **Monitoring Rutin**
- 🔍 Check dashboard setiap hari
- 📞 Follow-up pasien dengan kepatuhan rendah
- 📝 Update catatan kesehatan secara berkala

---

## 🔧 Troubleshooting

### ❌ **Tidak Bisa Login**
- ✅ Pastikan menggunakan Gmail yang terdaftar
- ✅ Check apakah akun sudah diapprove
- 📞 Hubungi admin jika perlu bantuan

### 📱 **Pasien Tidak Menerima WhatsApp**
- ✅ Konfirmasi nomor WhatsApp pasien
- ✅ Pastikan format +62xxxxx sudah benar
- ✅ Coba kirim manual test message

### ⏰ **Pengingat Tidak Terkirim**
- ✅ Pastikan status pasien "Aktif"
- ✅ Check jam setup sudah benar
- ✅ Refresh aplikasi dan coba lagi

### 💾 **Error Saat Menyimpan Data**
- ✅ Check koneksi internet
- ✅ Refresh aplikasi dan coba lagi
- ✅ Pastikan semua required field terisi

---

## 📞 Kontak Support

### 🛠️ **Untuk Bantuan Teknis:**
- 📧 **Email:** davidyusaku13@gmail.com
- 📱 **Admin:** [contact admin/WhatsApp]
- 📚 **Documentation:** Update real-time di system

### 🚨 **Emergency Issues:**
- 📞 **Hotline:** 081333852187
- ⏰ **Available:** 24/7 untuk urgent issues

---

## 📄 Document Info

**Version:** 1.0
**Last Updated:** Oktober 2025
**Contact:** davidyusaku13@gmail.com

---

*© 2025 PRIMA - Palliative Remote Integrated Monitoring and Assistance*