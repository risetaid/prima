#!/usr/bin/env bun
/**
 * PRIMA Unified Database Seeder
 * Complete database seeding script for the PRIMA healthcare system
 * 
 * This script combines all individual seed scripts into one unified seeder:
 * - Users and authentication data
 * - Patient data with complete profiles
 * - Reminder schedules and logs
 * - Manual confirmations and health notes
 * - WhatsApp message templates
 * - CMS content (articles and videos)
 * 
 * Usage: bun run scripts/seed-all.ts
 * 
 * REQUIREMENTS:
 * - Database must be migrated first: bun run db:migrate
 * - Superadmin user (davidyusaku13@gmail.com) must exist and be approved
 * - Redis cache should be running (optional but recommended)
 */

import { db, users, patients, reminderSchedules, reminderLogs, manualConfirmations, 
         whatsappTemplates, healthNotes, patientVariables, verificationLogs,
         cmsArticles, cmsVideos } from '../src/db/index'
import { eq, and, count, sql } from 'drizzle-orm'

// ===== TYPE DEFINITIONS =====

interface TemplateData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

interface PatientData {
  name: string
  phoneNumber: string
  address: string
  birthDate: Date
  diagnosisDate: Date
  cancerStage: 'I' | 'II' | 'III' | 'IV'
  assignedVolunteerId?: string
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
  isActive: boolean
}

interface SeederStats {
  users: number
  patients: number
  reminders: number
  confirmations: number
  templates: number
  healthNotes: number
  cmsArticles: number
  cmsVideos: number
}

// ===== SEED DATA =====

/**
 * WhatsApp Message Templates - Optimized for Indonesian Healthcare
 * Based on real-world usage patterns and feedback from healthcare volunteers
 */
const messageTemplates: TemplateData[] = [
  // REMINDER TEMPLATES - Core medication reminders
  {
    templateName: 'pengingat-obat-pagi',
    templateText: 'Selamat pagi {nama}! 🌅 Saatnya minum obat {obat} dosis {dosis}. Semangat menjalani hari! 💊✨',
    variables: ['nama', 'obat', 'dosis'],
    category: 'REMINDER'
  },
  {
    templateName: 'pengingat-obat-siang', 
    templateText: 'Halo {nama}! ☀️ Jangan lupa minum obat {obat} jam {waktu}. Tetap semangat! 💪',
    variables: ['nama', 'obat', 'waktu'],
    category: 'REMINDER'
  },
  {
    templateName: 'pengingat-obat-malam',
    templateText: 'Selamat malam {nama}! 🌙 Waktunya minum obat {obat}. Istirahat yang cukup ya! 💊😴',
    variables: ['nama', 'obat'],
    category: 'REMINDER'
  },
  {
    templateName: 'pengingat-makan-dulu',
    templateText: 'Hai {nama}! Sebelum minum obat {obat}, pastikan sudah makan dulu ya. Perut kenyang = obat bekerja optimal! 🍽️💊',
    variables: ['nama', 'obat'],
    category: 'REMINDER'
  },
  {
    templateName: 'pengingat-minum-air',
    templateText: 'Halo {nama}! Ingat minum air putih minimal 8 gelas sehari. Air membantu obat bekerja lebih baik! 💧✨',
    variables: ['nama'],
    category: 'REMINDER'
  },

  // APPOINTMENT TEMPLATES - Medical appointments & tests
  {
    templateName: 'kontrol-dokter-besok',
    templateText: 'Hai {nama}! Besok {tanggal} jam {waktu} kontrol ke Dr. {dokter} di {rumahSakit}. Siapkan kartu BPJS & catatan keluhan ya! 🏥📋',
    variables: ['nama', 'dokter', 'tanggal', 'waktu', 'rumahSakit'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'kontrol-dokter-hari-ini', 
    templateText: 'Selamat pagi {nama}! Hari ini jam {waktu} kontrol ke Dr. {dokter} di {rumahSakit}. Jangan lupa bawa kartu & hasil lab! 🩺',
    variables: ['nama', 'dokter', 'waktu', 'rumahSakit'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'persiapan-lab-test',
    templateText: 'Halo {nama}! Besok {tanggal} jam {waktu} cek lab di {rumahSakit}. PENTING: Puasa 12 jam sebelumnya. Boleh minum air putih! 🔬',
    variables: ['nama', 'tanggal', 'waktu', 'rumahSakit'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'reminder-bawa-obat',
    templateText: 'Hai {nama}! Saat kontrol nanti, bawa semua obat yang sedang diminum untuk ditunjukkan ke dokter ya! 💊👨‍⚕️',
    variables: ['nama'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'konfirmasi-kunjungan',
    templateText: 'Halo {nama}! {volunteer} akan berkunjung besok {tanggal} jam {waktu} untuk cek kondisi. Mohon disiapkan ya! 👩‍⚕️🏠',
    variables: ['nama', 'volunteer', 'tanggal', 'waktu'],
    category: 'APPOINTMENT'
  },

  // EDUCATIONAL TEMPLATES - Motivation & health tips  
  {
    templateName: 'motivasi-pagi',
    templateText: 'Selamat pagi {nama}! 🌅 Setiap hari adalah kesempatan baru untuk sembuh. Tetap optimis & patuh minum obat! 💪✨',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'tips-nutrisi-harian',
    templateText: 'Halo {nama}! Tips hari ini: makan protein (telur, ikan), sayuran hijau, dan buah. Nutrisi baik = tubuh kuat! 🥗🍎',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'dukungan-semangat',
    templateText: 'Hai {nama}! Ingat, kamu tidak sendirian. {volunteer} dan keluarga selalu mendukungmu. Tetap kuat! 🤗❤️',
    variables: ['nama', 'volunteer'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'tips-olahraga-ringan',
    templateText: 'Halo {nama}! Coba jalan santai 15 menit atau stretching ringan. Olahraga meningkatkan mood & stamina! 🚶‍♀️💪',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'atasi-mual-obat',
    templateText: 'Hai {nama}! Kalau mual setelah minum obat, coba dengan biskuit atau air jahe hangat. Kalau terus berlanjut, hubungi dokter! 🫖',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'pentingnya-kepatuhan',
    templateText: 'Hai {nama}! Ingat: minum obat tepat waktu & dosis = kunci kesembuhan. Jangan skip ya! Semangat terus! ⏰💊',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'istirahat-cukup',
    templateText: 'Halo {nama}! Tidur 7-8 jam sangat penting untuk pemulihan. Tubuh perlu istirahat untuk melawan penyakit! 😴🌙',
    variables: ['nama'], 
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'dukungan-keluarga',
    templateText: 'Untuk keluarga {nama}: Terima kasih sudah setia mendampingi. Dukungan kalian sangat berarti! 👨‍👩‍👧‍👦💙',
    variables: ['nama'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'kontak-darurat',
    templateText: 'DARURAT {nama}! Jika ada keluhan serius, segera hubungi Dr. {dokter} di {rumahSakit} atau {volunteer} di {nomor}. Jangan tunda! 🚨📞',
    variables: ['nama', 'dokter', 'rumahSakit', 'volunteer', 'nomor'],
    category: 'EDUCATIONAL'
  },
  {
    templateName: 'konfirmasi-data',
    templateText: 'Halo {nama}! Konfirmasi data: Obat {obat} {dosis}, kontrol ke Dr. {dokter} di {rumahSakit}. Jika ada yang salah, hubungi {volunteer}. ✅',
    variables: ['nama', 'obat', 'dosis', 'dokter', 'rumahSakit', 'volunteer'],
    category: 'EDUCATIONAL'
  }
]

/**
 * Sample Patient Data - Realistic Indonesian profiles
 */
const samplePatients: PatientData[] = [
  {
    name: 'Budi Santoso',
    phoneNumber: '+6281234567890',
    address: 'Jl. Sudirman No. 123, Jakarta Selatan',
    birthDate: new Date('1975-05-15'),
    diagnosisDate: new Date('2023-01-10'),
    cancerStage: 'II',
    emergencyContactName: 'Siti Santoso (Istri)',
    emergencyContactPhone: '+6281234567891',
    notes: 'Pasien kooperatif, rutin kontrol. Riwayat hipertensi terkontrol.',
    isActive: true
  },
  {
    name: 'Ani Wijaya',
    phoneNumber: '+6281234567892',
    address: 'Jl. Thamrin No. 456, Jakarta Pusat',
    birthDate: new Date('1980-08-20'),
    diagnosisDate: new Date('2023-03-15'),
    cancerStage: 'I',
    emergencyContactName: 'Eko Wijaya (Suami)',
    emergencyContactPhone: '+6281234567893',
    notes: 'Pasien memerlukan perhatian khusus. Riwayat diabetes tipe 2.',
    isActive: true
  },
  {
    name: 'Made Sari Dewi',
    phoneNumber: '+6281234567894',
    address: 'Jl. Gajah Mada No. 789, Denpasar, Bali',
    birthDate: new Date('1968-12-03'),
    diagnosisDate: new Date('2022-11-20'),
    cancerStage: 'III',
    emergencyContactName: 'I Ketut Dewi (Suami)',
    emergencyContactPhone: '+6281234567895',
    notes: 'Pasien lansia, butuh bantuan keluarga untuk obat-obatan.',
    isActive: true
  },
  {
    name: 'Ahmad Rahman',
    phoneNumber: '+6281234567896',
    address: 'Jl. Diponegoro No. 321, Bandung',
    birthDate: new Date('1982-07-14'),
    diagnosisDate: new Date('2023-06-08'),
    cancerStage: 'I',
    emergencyContactName: 'Fatimah Rahman (Istri)',
    emergencyContactPhone: '+6281234567897',
    notes: 'Pasien muda, semangat tinggi. Sering traveling untuk work.',
    isActive: true
  }
]

/**
 * CMS Article Content - Educational health content
 */
const sampleArticles = [
  {
    title: "Panduan Nutrisi untuk Pasien Kanker Paliatif",
    slug: "panduan-nutrisi-pasien-kanker-paliatif",
    content: `Nutrisi yang tepat sangat penting bagi pasien kanker paliatif. Berikut adalah panduan nutrisi yang dapat membantu meningkatkan kualitas hidup:

## Prinsip Dasar Nutrisi

### 1. Makan Sedikit tapi Sering
- Makan 5-6 kali sehari dengan porsi kecil
- Hindari makan dalam porsi besar yang dapat menyebabkan mual
- Siapkan camilan sehat seperti buah-buahan

### 2. Pilih Makanan Berkalori Tinggi
- Alpukat untuk lemak sehat
- Kacang-kacangan untuk protein
- Susu dan produk olahan susu

### 3. Atasi Masalah Pencernaan
- Minum air putih yang cukup
- Hindari makanan pedas dan berlemak
- Konsultasikan dengan dokter tentang suplemen

## Menu Sehari-hari

**Sarapan:**
- Bubur ayam dengan sayuran
- Jus buah segar

**Snack Pagi:**
- Pisang dengan selai kacang
- Teh hangat

**Makan Siang:**
- Nasi tim dengan ikan
- Sayur bening
- Buah potong

**Snack Sore:**
- Yogurt dengan madu
- Biskuit gandum

**Makan Malam:**
- Sup ayam dengan sayuran
- Nasi lembek
- Infused water

Selalu konsultasikan dengan tim medis Anda tentang kebutuhan nutrisi yang spesifik.`,
    excerpt: "Panduan lengkap nutrisi untuk pasien kanker paliatif dengan menu sehari-hari dan tips praktis untuk meningkatkan asupan gizi.",
    featuredImageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800",
    category: "nutrisi" as const,
    tags: ["nutrisi", "makanan", "tips", "paliatif"],
    seoTitle: "Panduan Nutrisi Lengkap untuk Pasien Kanker Paliatif",
    seoDescription: "Tips nutrisi praktis dan menu sehari-hari untuk pasien kanker paliatif. Tingkatkan kualitas hidup dengan pola makan yang tepat.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  },
  {
    title: "Olahraga Ringan untuk Pasien Paliatif", 
    slug: "olahraga-ringan-pasien-paliatif",
    content: `Olahraga ringan dapat membantu pasien paliatif merasa lebih baik secara fisik dan mental. Berikut adalah panduan olahraga yang aman:

## Manfaat Olahraga Ringan

### Manfaat Fisik
- Meningkatkan sirkulasi darah
- Mencegah kekakuan otot dan sendi
- Meningkatkan nafsu makan
- Membantu tidur lebih nyenyak

### Manfaat Mental
- Mengurangi stres dan kecemasan
- Meningkatkan mood
- Memberikan rasa pencapaian
- Meningkatkan interaksi sosial

## Jenis Olahraga yang Direkomendasikan

### 1. Jalan Kaki Ringan
- Mulai dengan 5-10 menit per hari
- Tingkatkan durasi secara bertahap
- Gunakan sepatu yang nyaman
- Pilih waktu yang sejuk

### 2. Latihan Pernapasan
- Tarik napas dalam-dalam selama 4 detik
- Tahan napas selama 4 detik
- Hembuskan napas selama 6 detik
- Ulangi 5-10 kali

### 3. Gerakan Peregangan
- Peregangan leher dan bahu
- Gerakan memutar pergelangan tangan
- Peregangan kaki sambil duduk
- Gerakan mengangkat tangan

### 4. Tai Chi atau Yoga Ringan
- Gerakan lambat dan terkontrol
- Fokus pada keseimbangan
- Dapat dilakukan sambil duduk
- Membantu relaksasi

## Tips Penting

- Selalu konsultasikan dengan dokter sebelum memulai
- Dengarkan tubuh Anda
- Berhenti jika merasa sakit atau lelah
- Minum air yang cukup
- Lakukan secara konsisten

Ingat, yang terpenting adalah bergerak sesuai kemampuan, bukan intensitas.`,
    excerpt: "Panduan olahraga ringan yang aman dan bermanfaat untuk pasien kanker paliatif, termasuk gerakan sederhana yang dapat dilakukan di rumah.",
    featuredImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    category: "olahraga" as const,
    tags: ["olahraga", "fisioterapi", "gerakan", "kesehatan"],
    seoTitle: "Olahraga Ringan Aman untuk Pasien Kanker Paliatif",
    seoDescription: "Gerakan dan olahraga ringan yang aman untuk pasien paliatif. Tingkatkan kualitas hidup dengan aktivitas fisik yang tepat.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  },
  {
    title: "Mengelola Rasa Sakit dengan Cara Alami",
    slug: "mengelola-rasa-sakit-cara-alami", 
    content: `Mengelola rasa sakit adalah aspek penting dalam perawatan paliatif. Selain obat-obatan, ada cara-cara alami yang dapat membantu:

## Teknik Relaksasi

### Meditasi Sederhana
- Duduk dengan nyaman
- Fokus pada pernapasan
- Bayangkan tempat yang damai
- Lakukan 10-15 menit sehari

### Progressive Muscle Relaxation
- Tegang dan rilekskan otot secara bergantian
- Mulai dari kaki hingga kepala
- Bantu mengurangi ketegangan otot
- Efektif untuk nyeri kronis

## Terapi Komplemen

### Kompres Hangat/Dingin
- Kompres hangat untuk nyeri otot
- Kompres dingin untuk peradangan
- Gunakan maksimal 15-20 menit
- Beri jeda antar penggunaan

### Aromaterapi
- Lavender untuk relaksasi
- Peppermint untuk meredakan mual
- Eucalyptus untuk pernapasan
- Gunakan diffuser atau hirup langsung

### Musik dan Seni
- Dengarkan musik yang menenangkan
- Lukis atau gambar sebagai distraksi
- Menulis jurnal untuk ekspresikan perasaan
- Aktivitas kreatif sebagai terapi

## Posisi dan Postur

### Posisi Tidur yang Nyaman
- Gunakan bantal penyangga
- Posisi miring dengan bantal di antara kaki
- Kepala sedikit lebih tinggi
- Ganti posisi secara berkala

### Duduk yang Ergonomis
- Kaki rata di lantai
- Punggung lurus tapi rileks
- Gunakan bantalan jika perlu
- Hindari duduk terlalu lama

## Dukungan Sosial

- Berbagi perasaan dengan keluarga
- Bergabung dengan support group
- Komunikasi terbuka dengan tim medis
- Jangan ragu meminta bantuan

Ingat, cara alami ini melengkapi, bukan menggantikan pengobatan medis. Selalu diskusikan dengan dokter Anda.`,
    excerpt: "Tips dan teknik alami untuk membantu mengelola rasa sakit pada pasien paliatif, termasuk relaksasi, terapi komplemen, dan dukungan sosial.",
    featuredImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    category: "medical" as const,
    tags: ["nyeri", "relaksasi", "terapi", "alami"],
    seoTitle: "Cara Alami Mengelola Rasa Sakit untuk Pasien Paliatif",
    seoDescription: "Teknik dan tips alami untuk membantu mengelola nyeri pada pasien paliatif. Metode komplementer yang aman dan efektif.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  }
]

/**
 * CMS Video Content - Educational and motivational videos
 */
const sampleVideos = [
  {
    title: "Latihan Pernapasan untuk Pasien Kanker",
    slug: "latihan-pernapasan-pasien-kanker",
    description: `Video panduan latihan pernapasan yang dapat membantu pasien kanker paliatif:

- Teknik pernapasan dasar untuk relaksasi
- Cara mengatasi sesak napas ringan  
- Pernapasan untuk mengurangi kecemasan
- Latihan yang dapat dilakukan kapan saja

Durasi: 8 menit
Panduan: Dr. Sarah, Spesialis Paliatif

Manfaat:
✅ Mengurangi stres dan kecemasan
✅ Membantu relaksasi otot
✅ Meningkatkan kualitas tidur
✅ Mudah dilakukan di mana saja

Lakukan secara rutin untuk hasil optimal.`,
    videoUrl: "https://www.youtube.com/embed/inpok4MKVLM",
    thumbnailUrl: "https://img.youtube.com/vi/inpok4MKVLM/maxresdefault.jpg",
    durationMinutes: "8 menit",
    category: "medical" as const,
    tags: ["pernapasan", "relaksasi", "latihan", "kecemasan"],
    seoTitle: "Latihan Pernapasan Untuk Pasien Kanker - Video Panduan",
    seoDescription: "Video panduan latihan pernapasan untuk pasien kanker paliatif. Teknik sederhana untuk mengurangi stres dan meningkatkan relaksasi.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  },
  {
    title: "Gerakan Stretching Ringan di Tempat Tidur",
    slug: "gerakan-stretching-ringan-tempat-tidur",
    description: `Video panduan gerakan stretching ringan yang dapat dilakukan di tempat tidur:

- Peregangan leher dan bahu
- Gerakan kaki untuk sirkulasi darah
- Stretching lengan dan pergelangan tangan
- Gerakan punggung untuk mencegah kaku

Durasi: 12 menit  
Panduan: Fisioterapis Maya

Cocok untuk:
✅ Pasien yang banyak berbaring
✅ Mencegah kekakuan otot
✅ Meningkatkan sirkulasi darah
✅ Gerakan mudah dan aman

Lakukan 2-3 kali sehari untuk menjaga fleksibilitas tubuh.`,
    videoUrl: "https://www.youtube.com/embed/g_tea8ZNk5A",
    thumbnailUrl: "https://img.youtube.com/vi/g_tea8ZNk5A/maxresdefault.jpg",
    durationMinutes: "12 menit",
    category: "olahraga" as const, 
    tags: ["stretching", "tempat-tidur", "fisioterapi", "sirkulasi"],
    seoTitle: "Gerakan Stretching di Tempat Tidur - Video Panduan Pasien Paliatif",
    seoDescription: "Video panduan gerakan stretching ringan di tempat tidur untuk pasien paliatif. Cegah kekakuan otot dan tingkatkan sirkulasi darah.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  },
  {
    title: "Motivasi dan Semangat Hidup",
    slug: "motivasi-semangat-hidup-pasien-kanker",
    description: `Video inspiratif untuk pasien kanker dan keluarga:

- Cerita inspiratif dari survivor kanker
- Tips menjaga semangat hidup
- Peran keluarga dalam memberikan dukungan
- Makna hidup dan harapan

Durasi: 15 menit
Narasumber: Support Group PRIMA

Pesan utama:
🌟 Setiap hari adalah anugerah
🌟 Anda tidak sendirian dalam perjuangan ini
🌟 Kekuatan datang dari dalam diri
🌟 Dukungan keluarga sangat berarti

Video ini dapat ditonton bersama keluarga untuk saling menguatkan.`,
    videoUrl: "https://www.youtube.com/embed/Kb24RrHIbFk",
    thumbnailUrl: "https://img.youtube.com/vi/Kb24RrHIbFk/maxresdefault.jpg", 
    durationMinutes: "15 menit",
    category: "motivational" as const,
    tags: ["motivasi", "inspirasi", "semangat", "dukungan"],
    seoTitle: "Video Motivasi untuk Pasien Kanker dan Keluarga",
    seoDescription: "Video inspiratif dan motivasi untuk pasien kanker paliatif dan keluarga. Cerita penuh harapan dan semangat hidup.",
    status: "published" as const,
    publishedAt: new Date(),
    createdBy: "system"
  }
]

// ===== UTILITY FUNCTIONS =====

/**
 * Find the superadmin user required for seeding
 */
async function findSuperAdminUser(): Promise<any> {
  console.log('🔍 Looking for superadmin user: davidyusaku13@gmail.com...')
  
  const adminUserResult = await db
    .select()
    .from(users)
    .where(and(
      eq(users.email, 'davidyusaku13@gmail.com'),
      eq(users.role, 'SUPERADMIN'),
      eq(users.isActive, true),
      eq(users.isApproved, true)
    ))
    .limit(1)
  
  const adminUser = adminUserResult.length > 0 ? adminUserResult[0] : null
  
  if (!adminUser) {
    console.error('❌ ERROR: Superadmin user not found!')
    console.error('')
    console.error('📋 REQUIRED STEPS:')
    console.error('1. Start the application: bun run dev')  
    console.error('2. Login with davidyusaku13@gmail.com via Clerk')
    console.error('3. Approve the user in admin panel')
    console.error('4. Ensure role = SUPERADMIN')
    console.error('')
    throw new Error('Superadmin user not available for seeding')
  }
  
  console.log(`✅ Superadmin found: ${adminUser.email} (${adminUser.firstName} ${adminUser.lastName})`)
  return adminUser
}

/**
 * Clear existing data for fresh seeding
 */
async function clearExistingData() {
  console.log('🧹 Clearing existing seed data...')
  
  try {
    // Clear in reverse dependency order
    await db.delete(manualConfirmations)
    await db.delete(reminderLogs) 
    await db.delete(reminderSchedules)
    await db.delete(healthNotes)
    await db.delete(patientVariables)
    await db.delete(verificationLogs)
    await db.delete(patients)
    await db.delete(whatsappTemplates)
    await db.delete(cmsArticles)
    await db.delete(cmsVideos)
    
    // Keep admin user, only delete test users
    const adminUser = await findSuperAdminUser()
    await db.delete(users).where(
      and(
        eq(users.email, 'volunteer@prima.com')
      )
    )

    console.log('✅ Existing data cleared successfully')
  } catch (error) {
    console.warn('⚠️  Some data might not exist yet, continuing...')
  }
}

// ===== SEEDING FUNCTIONS =====

/**
 * Seed volunteer users
 */
async function seedUsers(adminUser: any) {
  console.log('👥 Seeding volunteer users...')
  
  const volunteerUser = await db.insert(users).values({
    email: 'volunteer@prima.com',
    firstName: 'Dr. Volunteer',
    lastName: 'Prima',
    hospitalName: 'RS PRIMA Healthcare',
    clerkId: 'seed-volunteer-clerk-id',
    role: 'MEMBER',
    isActive: true,
    isApproved: true,
    approvedBy: adminUser.id,
    approvedAt: new Date()
  }).returning()

  console.log(`✅ Created volunteer: ${volunteerUser[0].firstName} ${volunteerUser[0].lastName}`)
  return volunteerUser[0]
}

/**
 * Seed patient data with complete profiles
 */
async function seedPatients(volunteerId: string) {
  console.log('🏥 Seeding patient data...')
  
  const createdPatients = []
  
  for (const patientData of samplePatients) {
    const patient = await db.insert(patients).values({
      ...patientData,
      assignedVolunteerId: volunteerId,
      verificationStatus: 'verified'
    }).returning()
    
    createdPatients.push(patient[0])
    console.log(`✅ Created patient: ${patient[0].name}`)
    
    // Add patient variables for template personalization
    await db.insert(patientVariables).values([
      {
        patientId: patient[0].id,
        variableName: 'nama',
        variableValue: patient[0].name,
        createdById: volunteerId,
        isActive: true
      },
      {
        patientId: patient[0].id,
        variableName: 'dokter',
        variableValue: 'Dr. Prima Volunteer',
        createdById: volunteerId,
        isActive: true
      },
      {
        patientId: patient[0].id,
        variableName: 'volunteer',
        variableValue: 'Dr. Volunteer Prima',
        createdById: volunteerId,
        isActive: true
      },
      {
        patientId: patient[0].id,
        variableName: 'rumahSakit',
        variableValue: 'RS PRIMA Healthcare',
        createdById: volunteerId,
        isActive: true
      }
    ])
  }
  
  console.log(`✅ Created ${createdPatients.length} patients with variables`)
  return createdPatients
}

/**
 * Seed reminder schedules and logs
 */
async function seedReminders(patients: any[], volunteerId: string) {
  console.log('⏰ Seeding reminder schedules and logs...')
  
  const medications = [
    { name: 'Candesartan', dosage: '8mg', time: '08:00' },
    { name: 'Paracetamol', dosage: '500mg', time: '20:00' },
    { name: 'Metformin', dosage: '500mg', time: '07:30' },
    { name: 'Omeprazole', dosage: '20mg', time: '06:00' }
  ]
  
  const schedules = []
  let medicationIndex = 0
  
  for (const patient of patients) {
    const medication = medications[medicationIndex % medications.length]
    
    const schedule = await db.insert(reminderSchedules).values({
      patientId: patient.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      doctorName: 'Dr. Prima Volunteer',
      scheduledTime: medication.time,
      frequency: 'CUSTOM',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      customMessage: `Selamat pagi ${patient.name}! Saatnya minum obat ${medication.name} ${medication.dosage}. Semangat!`,
      isActive: true,
      createdById: volunteerId
    }).returning()
    
    schedules.push(schedule[0])
    medicationIndex++
    
    // Create sample reminder logs (delivered messages)
    const logDates = [
      new Date('2024-01-01T08:00:00Z'),
      new Date('2024-01-02T08:00:00Z'),
      new Date('2024-01-03T08:00:00Z')
    ]
    
    for (let i = 0; i < logDates.length; i++) {
      await db.insert(reminderLogs).values({
        reminderScheduleId: schedule[0].id,
        patientId: patient.id,
        sentAt: logDates[i],
        status: 'DELIVERED',
        message: schedule[0].customMessage || 'Reminder message',
        phoneNumber: patient.phoneNumber,
        fonnteMessageId: `fonnte-msg-${patient.id}-${i}`
      })
    }
  }
  
  console.log(`✅ Created ${schedules.length} reminder schedules with logs`)
  return schedules
}

/**
 * Seed manual confirmations
 */
async function seedConfirmations(patients: any[], schedules: any[], volunteerId: string) {
  console.log('✅ Seeding manual confirmations...')
  
  const confirmations = []
  
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i]
    
    // Create confirmations for the last 3 days
    const confirmationDates = [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03')
    ]
    
    for (let j = 0; j < confirmationDates.length; j++) {
      const confirmation = await db.insert(manualConfirmations).values({
        patientId: patient.id,
        volunteerId: volunteerId,
        reminderScheduleId: schedules[i % schedules.length]?.id || null,
        visitDate: confirmationDates[j],
        visitTime: j === 0 ? '09:00' : (j === 1 ? '14:30' : '16:15'),
        medicationsTaken: true,
        medicationsMissed: [],
        patientCondition: j === 2 ? 'FAIR' : 'GOOD',
        symptomsReported: j === 2 ? ['mild fatigue'] : [],
        notes: j === 0 ? 'Pasien sudah minum obat sesuai jadwal. Kondisi baik.' : 
               (j === 1 ? 'Kunjungan rutin. Pasien dalam kondisi stabil.' : 
                'Obat berhasil diminum tepat waktu. Keluarga kooperatif.'),
        followUpNeeded: j === 2
      }).returning()
      
      confirmations.push(confirmation[0])
    }
  }
  
  console.log(`✅ Created ${confirmations.length} manual confirmations`)
  return confirmations
}

/**
 * Seed health notes
 */
async function seedHealthNotes(patients: any[], volunteerId: string) {
  console.log('📝 Seeding health notes...')
  
  const notes = []
  const sampleNotes = [
    'Pasien mengeluh sedikit mual setelah makan. Disarankan makan porsi kecil tapi sering.',
    'Kondisi pasien stabil. Nafsu makan baik, tidur nyenyak.',
    'Pasien merasa lebih berenergi hari ini. Obat diminum tepat waktu.',
    'Sedikit nyeri di area perut. Sudah diberikan kompres hangat.',
    'Pasien dalam kondisi baik, mood positif. Keluarga sangat supportif.'
  ]
  
  for (const patient of patients) {
    // Create 2-3 health notes per patient
    const numNotes = 2 + Math.floor(Math.random() * 2) // 2-3 notes
    
    for (let i = 0; i < numNotes; i++) {
      const noteDate = new Date()
      noteDate.setDate(noteDate.getDate() - i - 1) // Previous days
      
      const note = await db.insert(healthNotes).values({
        patientId: patient.id,
        note: sampleNotes[i % sampleNotes.length],
        noteDate: noteDate,
        recordedBy: volunteerId
      }).returning()
      
      notes.push(note[0])
    }
  }
  
  console.log(`✅ Created ${notes.length} health notes`)
  return notes
}

/**
 * Seed WhatsApp templates
 */
async function seedTemplates(adminUserId: string) {
  console.log('💬 Seeding WhatsApp message templates...')
  
  const createdTemplates = []
  
  for (const template of messageTemplates) {
    const result = await db.insert(whatsappTemplates).values({
      templateName: template.templateName,
      templateText: template.templateText,
      variables: template.variables,
      category: template.category,
      isActive: true,
      createdBy: adminUserId
    }).returning()
    
    createdTemplates.push(result[0])
    console.log(`  ✅ ${template.templateName} (${template.category})`)
  }
  
  console.log(`✅ Created ${createdTemplates.length} WhatsApp templates`)
  return createdTemplates
}

/**
 * Seed CMS content (articles and videos)
 */
async function seedCMSContent(adminUserId: string) {
  console.log('📄 Seeding CMS content...')
  
  const createdArticles = []
  const createdVideos = []
  
  // Seed articles
  for (const article of sampleArticles) {
    const result = await db.insert(cmsArticles).values({
      ...article,
      createdBy: adminUserId
    }).returning()
    
    createdArticles.push(result[0])
    console.log(`  ✅ Article: ${result[0].title}`)
  }
  
  // Seed videos  
  for (const video of sampleVideos) {
    const result = await db.insert(cmsVideos).values({
      ...video,
      createdBy: adminUserId
    }).returning()
    
    createdVideos.push(result[0])
    console.log(`  ✅ Video: ${result[0].title}`)
  }
  
  console.log(`✅ Created ${createdArticles.length} articles and ${createdVideos.length} videos`)
  return { articles: createdArticles, videos: createdVideos }
}

// ===== MAIN SEEDING FUNCTION =====

/**
 * Main seeding orchestrator
 */
async function seedAll() {
  const stats: SeederStats = {
    users: 0, patients: 0, reminders: 0, 
    confirmations: 0, templates: 0, healthNotes: 0,
    cmsArticles: 0, cmsVideos: 0
  }

  try {
    console.log('🚀 PRIMA UNIFIED DATABASE SEEDER')
    console.log('=' .repeat(60))
    console.log('Starting complete database seeding process...')
    console.log('')

    // Step 1: Find required admin user
    const adminUser = await findSuperAdminUser()
    
    // Step 2: Clear existing seed data
    await clearExistingData()
    
    // Step 3: Seed users
    const volunteerUser = await seedUsers(adminUser)
    stats.users = 1
    
    // Step 4: Seed patients
    const patients = await seedPatients(volunteerUser.id)
    stats.patients = patients.length
    
    // Step 5: Seed reminders
    const schedules = await seedReminders(patients, volunteerUser.id)
    stats.reminders = schedules.length
    
    // Step 6: Seed confirmations
    const confirmations = await seedConfirmations(patients, schedules, volunteerUser.id)
    stats.confirmations = confirmations.length
    
    // Step 7: Seed health notes
    const healthNotes = await seedHealthNotes(patients, volunteerUser.id)
    stats.healthNotes = healthNotes.length
    
    // Step 8: Seed templates
    const templates = await seedTemplates(adminUser.id)
    stats.templates = templates.length
    
    // Step 9: Seed CMS content
    const cmsContent = await seedCMSContent(adminUser.id)
    stats.cmsArticles = cmsContent.articles.length
    stats.cmsVideos = cmsContent.videos.length

    // Final summary
    console.log('')
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(60))
    console.log(`👥 Users created: ${stats.users}`)
    console.log(`🏥 Patients created: ${stats.patients}`)
    console.log(`⏰ Reminder schedules: ${stats.reminders}`)
    console.log(`✅ Manual confirmations: ${stats.confirmations}`) 
    console.log(`📝 Health notes: ${stats.healthNotes}`)
    console.log(`💬 WhatsApp templates: ${stats.templates}`)
    console.log(`📄 CMS articles: ${stats.cmsArticles}`)
    console.log(`🎬 CMS videos: ${stats.cmsVideos}`)
    console.log('')
    
    // Show template breakdown
    const templateStats = await db
      .select({
        category: whatsappTemplates.category,
        count: count(whatsappTemplates.id)
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.isActive, true))
      .groupBy(whatsappTemplates.category)
    
    console.log('📊 TEMPLATE BREAKDOWN:')
    for (const stat of templateStats) {
      console.log(`   ${stat.category}: ${stat.count} templates`)
    }
    
    console.log('')
    console.log('🏆 Database ready for development and testing!')
    console.log('✨ You can now start the application: bun run dev')

  } catch (error) {
    console.error('')
    console.error('💥 SEEDING FAILED:', error)
    console.error('')
    throw error
  }
}

// ===== SCRIPT EXECUTION =====

if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('✅ Seeding completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}

export { seedAll, seedUsers, seedPatients, seedReminders, seedConfirmations, 
         seedTemplates, seedCMSContent, seedHealthNotes }