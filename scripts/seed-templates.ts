#!/usr/bin/env bun
/**
 * PRIMA WhatsApp Templates Seeder
 * Seeds WhatsApp message templates for the PRIMA healthcare system
 *
 * Usage: bun run scripts/seed-templates.ts
 *
 * REQUIREMENTS:
 * - Database must be migrated first: bun run db:migrate
 * - Superadmin user (davidyusaku13@gmail.com) must exist and be approved
 */

import { db, whatsappTemplates, users } from '../src/db'
import { eq } from 'drizzle-orm'

// ===== TEMPLATE DATA =====

interface TemplateData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

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
    templateText: 'Hai {nama}! Ingat, kamu tidak sendirian dalam perjuangan ini. {volunteer} dan keluarga selalu mendukungmu. Tetap kuat! 🤗❤️',
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

// ===== UTILITY FUNCTIONS =====

/**
 * Find the superadmin user required for seeding
 */
async function findSuperAdminUser(): Promise<any> {
  console.log('🔍 Looking for superadmin user: davidyusaku13@gmail.com...')

  try {
    const adminUserResult = await db
      .select()
      .from(users)
      .where(eq(users.email, 'davidyusaku13@gmail.com'))
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

    // Check user status after retrieval
    if (!adminUser.isActive || !adminUser.isApproved || adminUser.role !== 'SUPERADMIN') {
      console.error('❌ ERROR: User found but not properly configured!')
      console.error(`   Status: active=${adminUser.isActive}, approved=${adminUser.isApproved}, role=${adminUser.role}`)
      throw new Error('Superadmin user not properly configured')
    }

    console.log(`✅ Superadmin found: ${adminUser.email} (${adminUser.firstName} ${adminUser.lastName})`)
    return adminUser
  } catch (error) {
    console.error('💥 Database connection error:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Check if a template already exists (to avoid duplicates)
 */
async function templateExists(templateName: string): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: whatsappTemplates.id })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.templateName, templateName))
      .limit(1)

    return existing.length > 0
  } catch (error) {
    console.warn(`⚠️  Error checking if template exists: ${templateName}`)
    return false
  }
}

// ===== SEEDING FUNCTION =====

/**
 * Seed WhatsApp templates
 */
async function seedTemplates(adminUserId: string) {
  console.log('💬 Seeding WhatsApp message templates...')

  const createdTemplates = []
  const skippedTemplates = []

  for (const template of messageTemplates) {
    try {
      // Check if template already exists
      const exists = await templateExists(template.templateName)

      if (exists) {
        console.log(`  ⏭️  Skipped (already exists): ${template.templateName}`)
        skippedTemplates.push(template.templateName)
        continue
      }

      // Create template
      const result = await db.insert(whatsappTemplates).values({
        templateName: template.templateName,
        templateText: template.templateText,
        variables: template.variables,
        category: template.category,
        isActive: true,
        createdBy: adminUserId
      }).returning()

      createdTemplates.push(result[0])
      console.log(`  ✅ Created: ${template.templateName} (${template.category})`)
    } catch (error) {
      console.warn(`  ⚠️  Failed to create template: ${template.templateName}`)
      console.warn(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log(`✅ Template seeding completed!`)
  console.log(`   Created: ${createdTemplates.length} templates`)
  console.log(`   Skipped: ${skippedTemplates.length} templates (already exist)`)

  return { created: createdTemplates.length, skipped: skippedTemplates.length }
}

// ===== MAIN FUNCTION =====

/**
 * Main seeding orchestrator
 */
async function seedTemplatesMain() {
  try {
    console.log('🚀 PRIMA WHATSAPP TEMPLATES SEEDER')
    console.log('=' .repeat(50))
    console.log('Seeding WhatsApp message templates...')
    console.log('')

    // Step 1: Find required admin user
    console.log('⏱️  Step 1/2: Finding superadmin user...')
    const adminUser = await findSuperAdminUser()

    // Step 2: Seed templates
    console.log('⏱️  Step 2/2: Creating WhatsApp templates...')
    const stats = await seedTemplates(adminUser.id)

    // Final summary
    console.log('')
    console.log('🎉 TEMPLATE SEEDING COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   ✅ Created: ${stats.created} new templates`)
    console.log(`   ⏭️  Skipped: ${stats.skipped} existing templates`)
    console.log(`   📱 Total available: ${stats.created + stats.skipped} templates`)
    console.log('')

    // Show template breakdown
    console.log('📋 TEMPLATE BREAKDOWN:')
    console.log(`   REMINDER: ${messageTemplates.filter(t => t.category === 'REMINDER').length} templates`)
    console.log(`   APPOINTMENT: ${messageTemplates.filter(t => t.category === 'APPOINTMENT').length} templates`)
    console.log(`   EDUCATIONAL: ${messageTemplates.filter(t => t.category === 'EDUCATIONAL').length} templates`)

    console.log('')
    console.log('🏆 Templates ready for use!')
    console.log('💡 You can now use these templates in the admin panel.')

  } catch (error) {
    console.error('')
    console.error('💥 TEMPLATE SEEDING FAILED:', error)
    console.error('')
    throw error
  }
}

// ===== SCRIPT EXECUTION =====

if (require.main === module) {
  seedTemplatesMain()
    .then(() => {
      console.log('✅ Template seeding completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Template seeding failed:', error)
      process.exit(1)
    })
}

export { seedTemplatesMain, messageTemplates }