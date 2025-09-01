import { db, whatsappTemplates } from './src/db'

async function seedTemplates() {
  console.log('🌱 Seeding WhatsApp templates...')
  
  try {
    const templates = [
      {
        templateName: 'Pengingat Minum Obat Pagi',
        templateText: 'Selamat pagi {nama}! 🌅\n\nSaatnya minum obat {obat} dengan dosis {dosis}.\n\nJangan lupa minum dengan air putih ya!\n\nSalam sehat,\n{volunteer}',
        variables: ['nama', 'obat', 'dosis', 'volunteer'],
        category: 'REMINDER' as const
      },
      {
        templateName: 'Reminder Janji Dokter',
        templateText: 'Halo {nama}! 👨‍⚕️\n\nKamu punya janji dengan {dokter} besok jam {waktu}.\n\nJangan lupa ya!\n\n{volunteer}',
        variables: ['nama', 'dokter', 'waktu', 'volunteer'],
        category: 'APPOINTMENT' as const
      },
      {
        templateName: 'Tips Kesehatan Harian',
        templateText: 'Hi {nama}! 💊\n\nTips kesehatan hari ini:\n- Minum obat tepat waktu\n- Istirahat cukup\n- Makan bergizi\n\nSemangat!\n{volunteer}',
        variables: ['nama', 'volunteer'],
        category: 'EDUCATIONAL' as const
      }
    ]

    for (const template of templates) {
      await db.insert(whatsappTemplates).values({
        templateName: template.templateName,
        templateText: template.templateText,
        variables: template.variables,
        category: template.category,
        isActive: true,
        createdBy: '00000000-0000-0000-0000-000000000001' // Dummy user ID
      })
      console.log(`✅ Added: ${template.templateName}`)
    }

    console.log('🎉 Templates seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  }
}

seedTemplates().then(() => process.exit(0))