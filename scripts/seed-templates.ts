#!/usr/bin/env bun
/**
 * PRIMA WhatsApp Template Seeder - IMPROVED VERSION
 * Seeds the database with Indonesian healthcare message templates
 * 
 * Usage: bun run scripts/seed-templates.ts
 * 
 * REQUIREMENTS:
 * - Database must be reset first: bunx prisma migrate reset --force
 * - davidyusaku13@gmail.com must be logged in first to create user record
 * - User must be approved (ADMIN role)
 */

import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

interface TemplateData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

/**
 * IMPROVED TEMPLATES - Optimized for WhatsApp & Real Usage
 * - Kept under 200 characters for better WhatsApp delivery
 * - Variables match actual app usage patterns
 * - More practical and actionable content
 */
const templates: TemplateData[] = [
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
    templateText: 'Hai {nama}! Besok {tanggal} jam {waktu} kontrol ke Dr. {dokter}. Siapkan kartu BPJS & catatan keluhan ya! 🏥📋',
    variables: ['nama', 'dokter', 'tanggal', 'waktu'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'kontrol-dokter-hari-ini', 
    templateText: 'Selamat pagi {nama}! Hari ini jam {waktu} kontrol ke Dr. {dokter}. Jangan lupa bawa kartu & hasil lab! 🩺',
    variables: ['nama', 'dokter', 'waktu'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'persiapan-lab-test',
    templateText: 'Halo {nama}! Besok {tanggal} jam {waktu} cek lab. PENTING: Puasa {lamaPuasa} jam sebelumnya. Boleh minum air putih! 🔬',
    variables: ['nama', 'tanggal', 'waktu', 'lamaPuasa'],
    category: 'APPOINTMENT'
  },
  {
    templateName: 'reminder-bawa-obat',
    templateText: 'Hai {nama}! Saat kontrol nanti, bawa semua obat yang sedang diminum untuk ditunjukkan ke dokter ya! 💊👨‍⚕️',
    variables: ['nama'],
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
    templateText: 'Hai {nama}! Ingat, kamu tidak sendirian. Keluarga & tim medis selalu mendukungmu. Tetap kuat! 🤗❤️',
    variables: ['nama'],
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
  }
]

async function findAdminUser(): Promise<any> {
  console.log('🔍 Mencari user admin: davidyusaku13@gmail.com...')
  
  const adminUser = await prisma.user.findFirst({
    where: {
      email: 'davidyusaku13@gmail.com',
      role: 'ADMIN',
      isActive: true,
      isApproved: true
    }
  })
  
  if (!adminUser) {
    console.error('❌ ERROR: User davidyusaku13@gmail.com tidak ditemukan atau belum approved!')
    console.error('')
    console.error('📋 LANGKAH YANG DIPERLUKAN:')
    console.error('1. Jalankan aplikasi: bun run dev')  
    console.error('2. Login dengan davidyusaku13@gmail.com via Stack Auth')
    console.error('3. Approve user tersebut di admin panel')
    console.error('4. Pastikan role = ADMIN')
    console.error('')
    throw new Error('Admin user tidak tersedia untuk seeding')
  }
  
  console.log(`✅ Admin user ditemukan: ${adminUser.email} (${adminUser.firstName} ${adminUser.lastName})`)
  return adminUser
}

async function clearExistingTemplates() {
  console.log('🧹 Menghapus template yang sudah ada...')
  
  const deleteResult = await prisma.whatsAppTemplate.deleteMany({})
  console.log(`✅ Berhasil menghapus ${deleteResult.count} template lama`)
}

async function seedTemplates() {
  try {
    console.log('🚀 PRIMA Template Seeder - IMPROVED VERSION')
    console.log('=' .repeat(50))
    
    // Find admin user (must exist and be approved)
    const creatorUser = await findAdminUser()
    
    // Clear existing templates for fresh start
    await clearExistingTemplates()

    // Seed new templates
    let successCount = 0
    let errorCount = 0

    console.log('📝 Mulai membuat template baru...')
    
    for (const template of templates) {
      try {
        await prisma.whatsAppTemplate.create({
          data: {
            templateName: template.templateName,
            templateText: template.templateText,
            variables: template.variables,
            category: template.category,
            isActive: true,
            createdBy: creatorUser.id
          }
        })
        
        console.log(`  ✅ ${template.templateName} (${template.category})`)
        successCount++
      } catch (error) {
        console.error(`  ❌ GAGAL: ${template.templateName} - ${error}`)
        errorCount++
      }
    }

    // Final summary
    console.log('')
    console.log('🎉 SEEDING COMPLETED!')
    console.log('=' .repeat(50))
    console.log(`✅ Template berhasil dibuat: ${successCount}`)
    console.log(`❌ Template gagal: ${errorCount}`)
    
    // Show category breakdown
    const categoryStats = await prisma.whatsAppTemplate.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { isActive: true }
    })
    
    console.log('')
    console.log('📊 BREAKDOWN PER KATEGORI:')
    for (const stat of categoryStats) {
      console.log(`   ${stat.category}: ${stat._count.category} template`)
    }
    
    console.log('')
    console.log('🏆 Database siap untuk produksi!')

  } catch (error) {
    console.error('')
    console.error('💥 FATAL ERROR:', error)
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Execute the seeder
seedTemplates()
  .then(() => {
    console.log('✨ Template seeding berhasil sempurna!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Seeding gagal:', error)
    process.exit(1)
  })