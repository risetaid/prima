import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Register font
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 25,
    fontSize: 11,
    lineHeight: 1.4,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5
  },
  section: {
    marginBottom: 12,
  },
  text: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  listItem: {
    marginLeft: 15,
    marginBottom: 4,
  },
  emphasis: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: 2,
    borderRadius: 3,
    fontSize: 9,
  },
  table: {
    display: 'table',
    width: 'auto',
    marginBottom: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    padding: 4,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCol: {
    width: '33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 4,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
  }
});

const VolunteerPDFDocument = () => React.createElement(
  Document,
  null,
  React.createElement(
    Page,
    { size: "A4", style: styles.page },
    React.createElement(Text, { style: styles.title }, "📱 Panduan Aplikasi PRIMA untuk Relawan"),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "🎯 Tentang PRIMA"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "PRIMA (Palliative Remote Integrated Monitoring and Assistance) adalah aplikasi manajemen pasien berbasis WhatsApp untuk relawan kesehatan Indonesia.")
      ),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "✨ Apa yang bisa Anda lakukan dengan PRIMA?")
      ),
      React.createElement(Text, { style: styles.listItem }, "📋 Mengelola pasien kanker yang Anda dampingi"),
      React.createElement(Text, { style: styles.listItem }, "💊 Pengingat obat otomatis via WhatsApp"),
      React.createElement(Text, { style: styles.listItem }, "📊 Monitoring kepatuhan minum obat pasien"),
      React.createElement(Text, { style: styles.listItem }, "📚 Memberikan edukasi kesehatan")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "🚀 Cara Cepat Mulai"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "Step 1: Install & Registrasi")
      ),
      React.createElement(Text, { style: styles.listItem }, "📱 Download PRIMA dari Play Store"),
      React.createElement(Text, { style: styles.listItem }, "📝 Sign up dengan Gmail"),
      React.createElement(Text, { style: styles.listItem }, "⏳ Tunggu approval dari admin (1-2 hari)"),
      React.createElement(Text, { style: styles.listItem }, "👤 Login kembali setelah disetujui"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "Step 2: Tambah Pasien")
      ),
      React.createElement(Text, { style: styles.listItem }, "➕ Klik tombol + di halaman Pasien"),
      React.createElement(Text, { style: styles.listItem }, "⭐ Input Nama + Nomor WhatsApp (WAJIB)"),
      React.createElement(Text, { style: styles.listItem }, "📸 Upload foto (opsional)"),
      React.createElement(Text, { style: styles.listItem }, "✅ Simpan data pasien"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "Step 3: Setup Pengingat")
      ),
      React.createElement(Text, { style: styles.listItem }, "📱 Pasian akan menerima WhatsApp verifikasi"),
      React.createElement(Text, { style: styles.listItem }, "⚡ Pasien balas \"YA\" untuk konfirmasi"),
      React.createElement(Text, { style: styles.listItem }, "⏰ Tambah jadwal pengingat obat"),
      React.createElement(Text, { style: styles.listItem }, "📈 Monitor kepatuhan harian")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "🔄 Workflow Lengkap"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "1️⃣ Registrasi Akun")
      ),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📋 Langkah-langkah:")
      ),
      React.createElement(Text, { style: styles.listItem }, "1. Buka Aplikasi PRIMA (download dari Play Store atau via browser)"),
      React.createElement(Text, { style: styles.listItem }, "2. Klik \"Sign Up\""),
      React.createElement(Text, { style: styles.listItem }, "3. Daftar menggunakan akun Gmail Anda"),
      React.createElement(Text, { style: styles.listItem }, "4. Isi formulir pendaftaran:"),
      React.createElement(Text, { style: styles.listItem }, "   - Nama lengkap"),
      React.createElement(Text, { style: styles.listItem }, "   - Email (otomatis dari Gmail)"),
      React.createElement(Text, { style: styles.listItem }, "   - Nomor telepon"),
      React.createElement(Text, { style: styles.listItem }, "   - Informasi tambahan yang diperlukan"),
      React.createElement(Text, { style: styles.listItem }, "5. Klik \"Daftar\""),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "2️⃣ Menunggu Approval")
      ),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "⏱️ Setelah Registrasi:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- Status akun Anda: \"Menunggu Persetujuan\""),
      React.createElement(Text, { style: styles.listItem }, "- Admin akan memverifikasi data Anda"),
      React.createElement(Text, { style: styles.listItem }, "- Proses approval biasanya 1-2 hari kerja"),
      React.createElement(Text, { style: styles.listItem }, "- Anda akan menerima email ketika disetujui"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "🔍 Cara Mengecek Status:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- Login kembali ke aplikasi PRIMA"),
      React.createElement(Text, { style: styles.listItem }, "- Jika masih menunggu approval, akan tetap di layar awal"),
      React.createElement(Text, { style: styles.listItem }, "- Refresh atau buka kembali aplikasi secara berkala"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "3️⃣ Akses Dashboard")
      ),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "✅ Setelah Disetujui:")
      ),
      React.createElement(Text, { style: styles.listItem }, "1. Login kembali dengan Gmail Anda"),
      React.createElement(Text, { style: styles.listItem }, "2. System akan otomatis redirect ke halaman \"/pasien\""),
      React.createElement(Text, { style: styles.listItem }, "3. Anda akan melihat dashboard daftar pasien"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📊 Dashboard Menampilkan:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- Daftar pasien yang Anda kelola"),
      React.createElement(Text, { style: styles.listItem }, "- Status kepatuhan setiap pasien"),
      React.createElement(Text, { style: styles.listItem }, "- Tombol untuk menambah pasien baru")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "➕ Menambah Pasien Baru"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📋 WAJIB Diisi:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- Nama lengkap pasien ⭐"),
      React.createElement(Text, { style: styles.listItem }, "- Nomor WhatsApp aktif ⭐"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📝 Opsional (bisa diisi nanti):")
      ),
      React.createElement(Text, { style: styles.listItem }, "- Alamat"),
      React.createElement(Text, { style: styles.listItem }, "- Tanggal lahir"),
      React.createElement(Text, { style: styles.listItem }, "- Tanggal diagnosis kanker"),
      React.createElement(Text, { style: styles.listItem }, "- Stadium kanker"),
      React.createElement(Text, { style: styles.listItem }, "- Nama dokter penanggung jawab"),
      React.createElement(Text, { style: styles.listItem }, "- Rumah sakit tempat perawatan"),
      React.createElement(Text, { style: styles.listItem }, "- Kontak darurat (nama + nomor)"),
      React.createElement(Text, { style: styles.listItem }, "- Catatan tambahan"),
      React.createElement(Text, { style: styles.listItem }, "- Foto pasien (klik \"Choose File\" atau drag & drop)"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📱 Verifikasi Pasien:")
      ),
      React.createElement(Text, { style: styles.listItem }, "1. Status pasien awalnya: \"Menunggu Verifikasi\""),
      React.createElement(Text, { style: styles.listItem }, "2. Pasien akan menerima WhatsApp verifikasi otomatis"),
      React.createElement(Text, { style: styles.listItem }, "3. Isi pesan WhatsApp verifikasi:"),
      React.createElement(Text, { style: styles.listItem }, "   \"Halo [Nama Pasien], ini adalah PRIMA - sistem monitoring kesehatan.\""),
      React.createElement(Text, { style: styles.listItem }, "   \"Untuk mengaktifkan layanan, balas \"YA\" jika Anda bersedia bergabung.\""),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "🔄 Status Response:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- \"YA\" → Pasien terverifikasi, status berubah \"Aktif\""),
      React.createElement(Text, { style: styles.listItem }, "- \"TIDAK\" → Pasien menolak, status \"Nonaktif\""),
      React.createElement(Text, { style: styles.listItem }, "- No Response → Pasien akan di-follow up manual oleh relawan")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "⏰ Menambah Pengingat Obat"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "⚠️ Syarat:") + " Pasien harus sudah Aktif (verified)"
      ),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📝 Langkah-langkah:")
      ),
      React.createElement(Text, { style: styles.listItem }, "1. Klik nama pasien yang sudah aktif"),
      React.createElement(Text, { style: styles.listItem }, "2. Di halaman detail pasien, klik tab \"Pengingat\""),
      React.createElement(Text, { style: styles.listItem }, "3. Klik \"Tambah Pengingat Baru\""),
      React.createElement(Text, { style: styles.listItem }, "4. Isi formulir pengingat:"),
      React.createElement(Text, { style: styles.listItem }, "   - Nama Obat: Contoh \"Paracetamol\""),
      React.createElement(Text, { style: styles.listItem }, "   - Dosis: Contoh \"1 tablet\""),
      React.createElement(Text, { style: styles.listItem }, "   - Frekuensi: Pilih jadwal (Setiap hari, 2x sehari, 3x sehari, Kustom)"),
      React.createElement(Text, { style: styles.listItem }, "   - Waktu Pengiriman: Pilih jam (08:00, 12:00, 20:00, dll)"),
      React.createElement(Text, { style: styles.listItem }, "   - Pesan Kustom: Personalisasi pesan reminder"),
      React.createElement(Text, { style: styles.listItem }, "5. Klik \"Simpan Pengingat\""),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📅 Contoh Setup Pengingat:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 💊 Obat A: 2x sehari (08:00, 20:00)"),
      React.createElement(Text, { style: styles.listItem }, "- 💊 Obat B: 1x sehari (12:00 setelah makan)"),
      React.createElement(Text, { style: styles.listItem }, "- 🌿 Suplemen: 3x sehari (08:00, 14:00, 20:00)")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "📊 Monitoring Kepatuhan"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📊 Dashboard Indicators:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 🟢 Tinggi (80%+): Pasien disiplin"),
      React.createElement(Text, { style: styles.listItem }, "- 🟡 Sedang (50-79%): Perlu attention"),
      React.createElement(Text, { style: styles.listItem }, "- 🔴 Rendah (<50%): Prioritas follow-up"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📋 Follow-up untuk Kepatuhan Rendah:")
      ),
      React.createElement(Text, { style: styles.listItem }, "1. Klik nama pasien dengan kepatuhan rendah"),
      React.createElement(Text, { style: styles.listItem }, "2. Review tab \"Pengingat\" untuk melihat yang terlewat"),
      React.createElement(Text, { style: styles.listItem }, "3. Hubungi pasien via WhatsApp"),
      React.createElement(Text, { style: styles.listItem }, "4. Tanyakan kendala dan berikan support")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "💡 Tips & Best Practices"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "🎯 Saat Registrasi:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Gunakan email Gmail resmi/aktif"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Isi data dengan lengkap dan jelas"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Pastikan nomor telepon bisa dihubungi"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "👥 Saat Menambah Pasien:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- ⭐ WAJIB: Pastikan Nama dan Nomor WhatsApp sudah benar"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Konfirmasi nomor WhatsApp aktif sebelum input"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Pastikan pasien setuju untuk join PRIMA"),
      React.createElement(Text, { style: styles.listItem }, "- 💡 Data lain bisa diisi secara bertahap nanti"),
      React.createElement(Text, { style: styles.listItem }, "- 💡 Upload foto untuk identifikasi yang lebih mudah (opsional)"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "⏰ Saat Setup Pengingat:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 🕐 Sesuaikan waktu dengan jadwal pasien"),
      React.createElement(Text, { style: styles.listItem }, "- 💊 Gunakan nama obat yang familiar bagi pasien"),
      React.createElement(Text, { style: styles.listItem }, "- 💬 Personalisasi pesan untuk engagement lebih baik"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📊 Monitoring Rutin:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 🔍 Check dashboard setiap hari"),
      React.createElement(Text, { style: styles.listItem }, "- 📞 Follow-up pasien dengan kepatuhan rendah"),
      React.createElement(Text, { style: styles.listItem }, "- 📝 Update catatan kesehatan secara berkala")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "🔧 Troubleshooting"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "❌ Tidak Bisa Login:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Pastikan menggunakan Gmail yang terdaftar"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Check apakah akun sudah diapprove"),
      React.createElement(Text, { style: styles.listItem }, "- 📞 Hubungi admin jika perlu bantuan"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "📱 Pasien Tidak Menerima WhatsApp:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Konfirmasi nomor WhatsApp pasien"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Pastikan format +62xxxxx sudah benar"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Coba kirim manual test message"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "⏰ Pengingat Tidak Terkirim:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Pastikan status pasien \"Aktif\""),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Check jam setup sudah benar"),
      React.createElement(Text, { style: styles.listItem }, "- ✅ Refresh aplikasi dan coba lagi")
    ),

    React.createElement(
      View,
      { style: styles.section },
      React.createElement(Text, { style: styles.subtitle }, "📞 Kontak Support"),
      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "🛠️ Untuk Bantuan Teknis:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 📧 Email: davidyusaku13@gmail.com"),
      React.createElement(Text, { style: styles.listItem }, "- 📱 Admin: [contact admin/WhatsApp]"),
      React.createElement(Text, { style: styles.listItem }, "- 📚 Documentation: Update real-time di system"),

      React.createElement(
        Text,
        { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "🚨 Emergency Issues:")
      ),
      React.createElement(Text, { style: styles.listItem }, "- 📞 Hotline: [nomor emergency]"),
      React.createElement(Text, { style: styles.listItem }, "- ⏰ Available: 24/7 untuk urgent issues")
    ),

    React.createElement(Text, { style: styles.text }),
    React.createElement(
      Text,
      { style: styles.text },
      React.createElement(Text, { style: styles.bold }, "Version 1.0"),
      " \nLast Updated: Oktober 2025 \nContact: davidyusaku13@gmail.com"
    ),

    React.createElement(
      Text,
      { style: styles.footer },
      "© 2025 PRIMA - Palliative Remote Integrated Monitoring and Assistance"
    )
  )
);

// Generate PDF file
const generatePDF = async () => {
  const blob = await pdf(React.createElement(VolunteerPDFDocument)).toBlob();

  // Save to file system
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(path.join(__dirname, '../docs/Panduan_Relawan_PRIMA.pdf'), buffer);

  console.log('PDF generated successfully!');
};

// Run if this file is executed directly
if (require.main === module) {
  generatePDF().catch(console.error);
}

export default VolunteerPDFDocument;