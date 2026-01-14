const React = require('react');
const { Document, Page, Text, View, StyleSheet, Font, pdf } = require('@react-pdf/renderer');
const fs = require('fs');
const path = require('path');

// Register font
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: 'Helvetica'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: 20
  },
  section: {
    marginBottom: 15,
  },
  text: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  listItem: {
    marginLeft: 20,
    marginBottom: 5,
  },
  emphasis: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 10,
  }
});

const VolunteerPDFDocument = () => (
  React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Panduan Penggunaan Aplikasi PRIMA untuk Relawan"),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Tentang PRIMA"),
        React.createElement(Text, { style: styles.text },
          "PRIMA (Palliative Remote Integrated Monitoring and Assistance) adalah sistem manajemen pasien berbasis WhatsApp untuk relawan kesehatan di Indonesia. Aplikasi ini membantu relawan dalam:"
        ),
        React.createElement(Text, { style: styles.listItem }, "• Memantau kepatuhan pasien dalam mengonsumsi obat"),
        React.createElement(Text, { style: styles.listItem }, "• Mengelola pengingat obat otomatis via WhatsApp"),
        React.createElement(Text, { style: styles.listItem }, "• Melacak respons dan konfirmasi pasien"),
        React.createElement(Text, { style: styles.listItem }, "• Memberikan edukasi kesehatan"),
        React.createElement(Text, { style: styles.listItem }, "• Koordinasi tim relawan")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Dashboard Utama Relawan"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Mengakses Dashboard:")
        ),
        React.createElement(Text, { style: styles.listItem }, "1. Login menggunakan akun relawan yang telah disetujui admin"),
        React.createElement(Text, { style: styles.listItem }, "2. Dashboard akan menampilkan statistik real-time:"),
        React.createElement(Text, { style: styles.listItem }, "   - Total notifikasi"),
        React.createElement(Text, { style: styles.listItem }, "   - Notifikasi menunggu respons"),
        React.createElement(Text, { style: styles.listItem }, "   - Notifikasi darurat"),
        React.createElement(Text, { style: styles.listItem }, "   - Prioritas tinggi"),
        React.createElement(Text, { style: styles.listItem }, "   - Rata-rata waktu respons")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Tab Notifikasi"),
        React.createElement(Text, { style: styles.text }, "Dashboard memiliki 4 tab utama:"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "1. Menunggu (Pending)")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Menampilkan notifikasi yang belum ditangani"),
        React.createElement(Text, { style: styles.listItem }, "• Klik tombol \"Ambil\" untuk mengambil notifikasi"),
        React.createElement(Text, { style: styles.listItem }, "• Prioritas: Emergency (Merah) > High (Oranye) > Medium (Kuning) > Low (Hijau)"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "2. Ditugaskan (Assigned)")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Notifikasi yang sudah Anda ambil"),
        React.createElement(Text, { style: styles.listItem }, "• Tambahkan respons personal Anda"),
        React.createElement(Text, { style: styles.listItem }, "• Klik \"Selesai\" setelah menangani"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "3. Direspons (Responded)")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Notifikasi yang sudah Anda respons"),
        React.createElement(Text, { style: styles.listItem }, "• Review respons yang telah dikirim"),
        React.createElement(Text, { style: styles.listItem }, "• Status terakhir dari pasien"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "4. Semua (All)")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Melihat semua notifikasi"),
        React.createElement(Text, { style: styles.listItem }, "• Filter berdasarkan status dan prioritas")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Manajemen Notifikasi"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Mengambil Notifikasi Baru:")
        ),
        React.createElement(Text, { style: styles.listItem }, "1. Pilih tab \"Menunggu\""),
        React.createElement(Text, { style: styles.listItem }, "2. Review informasi pasien dan alasan eskalasi:"),
        React.createElement(Text, { style: styles.listItem }, "   • Deteksi Darurat: Pesan mengandung kata kunci darurat"),
        React.createElement(Text, { style: styles.listItem }, "   • Respons Tidak Yakin: AI tidak yakin dengan interpretasi respons"),
        React.createElement(Text, { style: styles.listItem }, "   • Pertanyaan Kompleks: Pasien menanyakan hal di luar skenario standar"),
        React.createElement(Text, { style: styles.listItem }, "3. Klik \"Ambil\" untuk menjadi penanggung jawab"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Memberikan Respons:")
        ),
        React.createElement(Text, { style: styles.listItem }, "1. Klik \"Respons\" pada notifikasi yang diambil"),
        React.createElement(Text, { style: styles.listItem }, "2. Review informasi pasien:"),
        React.createElement(Text, { style: styles.listItem }, "   - Nama dan nomor WhatsApp"),
        React.createElement(Text, { style: styles.listItem }, "   - Pesan asli pasien"),
        React.createElement(Text, { style: styles.listItem }, "   - Alasan eskalasi dan tingkat keyakinan AI"),
        React.createElement(Text, { style: styles.listItem }, "3. Ketik respons Anda di kotak teks"),
        React.createElement(Text, { style: styles.listItem }, "4. Klik \"Kirim Respons\""),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tips Respons:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Gunakan bahasa yang ramah dan empatik"),
        React.createElement(Text, { style: styles.listItem }, "• Berikan jawaban yang jelas dan langsung"),
        React.createElement(Text, { style: styles.listItem }, "• Untuk pertanyaan medis kompleks, arahkan ke dokter atau rumah sakit"),
        React.createElement(Text, { style: styles.listItem }, "• Jangan memberikan diagnosis atau pengobatan spesifik")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Manajemen Pasien"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Melihat Daftar Pasien:")
        ),
        React.createElement(Text, { style: styles.listItem }, "1. Klik menu \"Pasien\" di navigasi"),
        React.createElement(Text, { style: styles.listItem }, "2. Daftar pasien menampilkan:"),
        React.createElement(Text, { style: styles.listItem }, "   - Foto profil atau inisial"),
        React.createElement(Text, { style: styles.listItem }, "   - Nama pasien"),
        React.createElement(Text, { style: styles.listItem }, "   - Status (Aktif/Nonaktif)"),
        React.createElement(Text, { style: styles.listItem }, "   - Tingkat kepatuhan (%)"),
        React.createElement(Text, { style: styles.listItem }, "   - Nomor WhatsApp"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Filter dan Pencarian:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Pencarian: Ketik nama pasien di kotak pencarian"),
        React.createElement(Text, { style: styles.listItem }, "• Filter Aktif/Nonaktif: Klik tombol filter"),
        React.createElement(Text, { style: styles.listItem }, "• Tingkat Kepatuhan:"),
        React.createElement(Text, { style: styles.listItem }, "  - Hijau (80%+): Tinggi"),
        React.createElement(Text, { style: styles.listItem }, "  - Kuning (50-79%): Sedang"),
        React.createElement(Text, { style: styles.listItem }, "  - Merah (<50%): Rendah")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Detail Pasien"),
        React.createElement(Text, { style: styles.text }, "Klik nama pasien untuk melihat detail lengkap:"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tab Profil:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Informasi dasar (nama, telepon, alamat)"),
        React.createElement(Text, { style: styles.listItem }, "• Informasi medis (stadium kanker, dokter, rumah sakit)"),
        React.createElement(Text, { style: styles.listItem }, "• Kontak darurat"),
        React.createElement(Text, { style: styles.listItem }, "• Catatan tambahan"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tab Kesehatan:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Catatan kesehatan pasien"),
        React.createElement(Text, { style: styles.listItem }, "• Tambah catatan baru dengan tanggal"),
        React.createElement(Text, { style: styles.listItem }, "• Edit atau hapus catatan existing"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tab Pengingat:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Daftar pengingat obat pasien"),
        React.createElement(Text, { style: styles.listItem }, "• Tambah pengingat baru"),
        React.createElement(Text, { style: styles.listItem }, "• Riwayat pengingat terkirim"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tab Verifikasi:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Status verifikasi WhatsApp pasien"),
        React.createElement(Text, { style: styles.listItem }, "• Kirim ulang verifikasi jika needed")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Best Practices untuk Relawan"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Waktu Respons:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Emergency: Respon dalam 15 menit"),
        React.createElement(Text, { style: styles.listItem }, "• High Priority: Respon dalam 1 jam"),
        React.createElement(Text, { style: styles.listItem }, "• Normal Priority: Respon dalam 4 jam"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Komunikasi dengan Pasien:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• Gunakan nama depan pasien (mis: \"David\" bukan \"Bapak David\")"),
        React.createElement(Text, { style: styles.listItem }, "• Format WhatsApp: *bold* untuk penekanan"),
        React.createElement(Text, { style: styles.listItem }, "• Hindari emoji berlebihan"),
        React.createElement(Text, { style: styles.listItem }, "• Selalu tutup dengan tawaran bantuan")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Emergency Protocol"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Identifikasi Emergency:")
        ),
        React.createElement(Text, { style: styles.listItem }, "Pasien menyebutkan:"),
        React.createElement(Text, { style: styles.listItem }, "• Nyeri dada atau sesak napas"),
        React.createElement(Text, { style: styles.listItem }, "• Pingsan atau pusing berat"),
        React.createElement(Text, { style: styles.listItem }, "• Perdarahan hebat"),
        React.createElement(Text, { style: styles.listItem }, "• Gejala stroke (lemas sebelah badan, sulit bicara)"),

        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Tindakan Emergency:")
        ),
        React.createElement(Text, { style: styles.listItem }, "1. ",
          React.createElement(Text, { style: styles.emphasis }, "Immediate Response"),
          " (dalam 5 menit):"
        ),
        React.createElement(Text, { style: styles.listItem }, "   - Call emergency contact pasien"),
        React.createElement(Text, { style: styles.listItem }, "   - Sarankan ke rumah sakit terdekat"),
        React.createElement(Text, { style: styles.listItem }, "   - Tetap di line untuk monitoring"),

        React.createElement(Text, { style: styles.listItem }, "2. Documentation:"),
        React.createElement(Text, { style: styles.listItem }, "   - Catat waktu dan gejala"),
        React.createElement(Text, { style: styles.listItem }, "   - Document tindakan yang diambil"),
        React.createElement(Text, { style: styles.listItem }, "   - Update status di system"),

        React.createElement(Text, { style: styles.listItem }, "3. Follow-up:"),
        React.createElement(Text, { style: styles.listItem }, "   - Monitor status pasien"),
        React.createElement(Text, { style: styles.listItem }, "   - Koordinasi dengan tim medis"),
        React.createElement(Text, { style: styles.listItem }, "   - Update catatan pasien")
      ),

      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.subtitle }, "Troubleshooting"),
        React.createElement(Text, { style: styles.text },
          React.createElement(Text, { style: styles.bold }, "Common Issues:")
        ),
        React.createElement(Text, { style: styles.listItem }, "• ",
          React.createElement(Text, { style: styles.bold }, "Notifikasi Tidak Muncul:"),
          " Refresh dashboard, check koneksi, pastikan status aktif"
        ),
        React.createElement(Text, { style: styles.listItem }, "• ",
          React.createElement(Text, { style: styles.bold }, "Pasien Tidak Menerima Pesan:"),
          " Verifikasi nomor, check status verifikasi, coba kirim manual"
        ),
        React.createElement(Text, { style: styles.listItem }, "• ",
          React.createElement(Text, { style: styles.bold }, "Error Saat Menambah Pengingat:"),
          " Pastikan pasien terverifikasi, check format waktu, refresh halaman"
        )
      ),

      React.createElement(Text, { style: styles.text }),
      React.createElement(Text, { style: styles.text },
        "PRIMA dirancang untuk membantu relawan memberikan care terbaik untuk pasien kanker. System ini terus dikembangkan berdasarkan feedback relawan dan kebutuhan pasien."
      ),
      React.createElement(Text, { style: styles.text }),
      React.createElement(Text, { style: styles.text },
        React.createElement(Text, { style: styles.bold }, "Version 1.0"),
        " \nLast Updated: Oktober 2024 \nContact: support@prima.id"
      ),

      React.createElement(Text, { style: styles.footer },
        "© 2024 PRIMA - Palliative Remote Integrated Monitoring and Assistance"
      )
    )
  )
);

// Generate PDF file
const generatePDF = async () => {
  try {
    const blob = await pdf(React.createElement(VolunteerPDFDocument)).toBlob();

    // Save to file system
    const buffer = Buffer.from(await blob.arrayBuffer());
    const outputPath = path.join(__dirname, '../docs/Panduan_Relawan_PRIMA.pdf');
    fs.writeFileSync(outputPath, buffer);

    console.log('PDF generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  generatePDF();
}

module.exports = VolunteerPDFDocument;