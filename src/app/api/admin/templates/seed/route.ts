import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, whatsappTemplates } from '@/db'
import { eq } from 'drizzle-orm'

// Template data (same as in seed script)
interface TemplateData {
  templateName: string
  templateText: string
  variables: string[]
  category: 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL'
}

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Superadmin access required.' },
        { status: 401 }
      )
    }

    console.log('🚀 Starting template seeding via API...')

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
          createdBy: user.id
        }).returning()

        createdTemplates.push(result[0])
        console.log(`  ✅ Created: ${template.templateName} (${template.category})`)
      } catch (error) {
        console.warn(`  ⚠️  Failed to create template: ${template.templateName}`)
        console.warn(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('✅ Template seeding completed via API!')

    return NextResponse.json({
      success: true,
      message: 'Template seeding completed successfully!',
      stats: {
        created: createdTemplates.length,
        skipped: skippedTemplates.length,
        total: createdTemplates.length + skippedTemplates.length
      },
      breakdown: {
        reminder: messageTemplates.filter(t => t.category === 'REMINDER').length,
        appointment: messageTemplates.filter(t => t.category === 'APPOINTMENT').length,
        educational: messageTemplates.filter(t => t.category === 'EDUCATIONAL').length
      }
    })

  } catch (error) {
    console.error('💥 Template seeding failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}