import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    templateName: "Pengingat Minum Obat Pagi",
    templateText: "🌅 Selamat pagi {nama}!\n\nSaatnya minum obat {obat} dengan dosis {dosis}.\n\nJangan lupa minum air yang cukup ya! 💊💧\n\nSemangat untuk hari ini! 💪",
    variables: ["{nama}", "{obat}", "{dosis}"],
    category: "REMINDER"
  },
  {
    templateName: "Pengingat Minum Obat Siang",
    templateText: "☀️ Halo {nama}, sudah waktunya minum obat siang!\n\nObat: {obat}\nDosis: {dosis}\nWaktu: {waktu}\n\nJangan sampai terlewat ya! 🕐",
    variables: ["{nama}", "{obat}", "{dosis}", "{waktu}"],
    category: "REMINDER"
  },
  {
    templateName: "Pengingat Minum Obat Malam",
    templateText: "🌙 Selamat malam {nama}!\n\nWaktunya minum obat malam sebelum tidur:\n• {obat} - {dosis}\n\nSetelah minum obat, istirahat yang cukup ya! 😴\n\nSelamat malam dan mimpi indah! ✨",
    variables: ["{nama}", "{obat}", "{dosis}"],
    category: "REMINDER"
  },
  {
    templateName: "Pengingat Kontrol Rutin",
    templateText: "🏥 Halo {nama}, jangan lupa besok ada jadwal kontrol rutin!\n\n📅 Tanggal: {tanggal}\n⏰ Waktu: {waktu}\n🏥 Tempat: {rumahSakit}\n👨‍⚕️ Dokter: {dokter}\n\nJangan lupa bawa kartu berobat dan hasil lab terakhir ya!\n\nSemoga sehat selalu! 🙏",
    variables: ["{nama}", "{tanggal}", "{waktu}", "{rumahSakit}", "{dokter}"],
    category: "APPOINTMENT"
  },
  {
    templateName: "Pengingat Konsultasi Khusus",
    templateText: "📋 Halo {nama}!\n\nReminser untuk konsultasi khusus:\n📅 {tanggal} pukul {waktu}\n👨‍⚕️ Dengan {dokter}\n🏥 Di {rumahSakit}\n\nSiapkan daftar keluhan dan pertanyaan yang ingin disampaikan ya!\n\nSemoga konsultasinya lancar! 💙",
    variables: ["{nama}", "{tanggal}", "{waktu}", "{dokter}", "{rumahSakit}"],
    category: "APPOINTMENT"
  },
  {
    templateName: "Tips Nutrisi Sehat",
    templateText: "🥗 Halo {nama}!\n\nTips nutrisi hari ini:\n\n✅ Konsumsi buah dan sayur minimal 5 porsi sehari\n✅ Minum air putih minimal 8 gelas\n✅ Kurangi makanan olahan dan tinggi garam\n✅ Pilih protein rendah lemak\n\nNutrisi yang baik membantu proses penyembuhan!\n\nTetap semangat! 💪🌱",
    variables: ["{nama}"],
    category: "EDUCATIONAL"
  },
  {
    templateName: "Motivasi Semangat",
    templateText: "💪 Halo {nama}!\n\nIngat bahwa setiap hari adalah kesempatan baru untuk menjadi lebih baik.\n\nKamu tidak sendirian dalam perjalanan ini. Kami di sini untuk mendukungmu! 🤗\n\nTetap optimis dan jaga kesehatan ya!\n\nSalam hangat,\n{volunteer} 💙",
    variables: ["{nama}", "{volunteer}"],
    category: "EDUCATIONAL"
  },
  {
    templateName: "Pentingnya Istirahat Cukup",
    templateText: "😴 Halo {nama}!\n\nTahukah kamu? Tidur yang cukup (7-8 jam) sangat penting untuk:\n\n🛡️ Meningkatkan sistem imun\n🧠 Memulihkan fungsi otak\n⚡ Mengembalikan energi tubuh\n💊 Membantu kerja obat-obatan\n\nYuk, jaga pola tidur yang teratur!\n\nSelamat beristirahat! 🌙✨",
    variables: ["{nama}"],
    category: "EDUCATIONAL"
  }
]

async function seedTemplates() {
  console.log('🌱 Starting template seeding...')
  
  try {
    // Get the first admin user to be the creator
    const adminUser = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN',
        isActive: true,
        isApproved: true 
      }
    })

    if (!adminUser) {
      console.error('❌ No admin user found! Please create an admin user first.')
      return
    }

    console.log(`📝 Found admin user: ${adminUser.email}`)

    // Check which templates already exist
    const existingTemplates = await prisma.whatsAppTemplate.findMany({
      select: { templateName: true }
    })
    
    const existingNames = existingTemplates.map(t => t.templateName)

    // Filter out templates that already exist
    const templatestoCreate = defaultTemplates.filter(
      template => !existingNames.includes(template.templateName)
    )

    if (templatestoCreate.length === 0) {
      console.log('✅ All default templates already exist!')
      return
    }

    // Create templates
    const createdTemplates = await prisma.whatsAppTemplate.createMany({
      data: templatestoCreate.map(template => ({
        ...template,
        createdBy: adminUser.id
      }))
    })

    console.log(`✅ Created ${createdTemplates.count} new templates:`)
    templatestoCreate.forEach(template => {
      console.log(`  - ${template.templateName} (${template.category})`)
    })

  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedTemplates()