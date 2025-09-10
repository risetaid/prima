import { db, reminderSchedules, reminderLogs, manualConfirmations } from '../src/db'
import { eq, and, isNull, desc } from 'drizzle-orm'

async function testRemindersStatsFix() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    console.log('🧪 Testing Reminders Stats Fix')
    console.log('=' .repeat(40))

    // Simulate the new API logic
    const allSchedules = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        startDate: reminderSchedules.startDate,
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .where(
        and(
          eq(reminderSchedules.patientId, patientId),
          eq(reminderSchedules.isActive, true),
          isNull(reminderSchedules.deletedAt)
        )
      )

    const allLogs = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt
      })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.status, 'DELIVERED')
        )
      )
      .orderBy(desc(reminderLogs.sentAt))

    const allConfirmations = await db
      .select({
        id: manualConfirmations.id,
        reminderLogId: manualConfirmations.reminderLogId,
        reminderScheduleId: manualConfirmations.reminderScheduleId,
        visitDate: manualConfirmations.visitDate
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))

    // NEW LOGIC: Process each individual log
    let terjadwal = 0
    let perluDiperbarui = 0
    let selesai = 0

    console.log(`\n📊 Processing ${allLogs.length} individual logs:`)

    for (const log of allLogs) {
      const logConfirmation = allConfirmations.find(conf => conf.reminderLogId === log.id)

      if (logConfirmation) {
        selesai++
        console.log(`✅ Log ${log.id.slice(0,8)}... : SELESAI (confirmed)`)
      } else if (log.status === 'DELIVERED') {
        perluDiperbarui++
        console.log(`⏳ Log ${log.id.slice(0,8)}... : PERLU DIPERBARUI (delivered but not confirmed)`)
      } else if (log.status === 'FAILED') {
        terjadwal++
        console.log(`📅 Log ${log.id.slice(0,8)}... : TERJADWAL (failed)`)
      } else {
        terjadwal++
        console.log(`❓ Log ${log.id.slice(0,8)}... : TERJADWAL (unknown status)`)
      }
    }

    // Add schedules that have no logs yet
    for (const schedule of allSchedules) {
      const hasLogs = allLogs.some(log => log.reminderScheduleId === schedule.id)
      if (!hasLogs) {
        terjadwal++
        console.log(`📅 Schedule ${schedule.id.slice(0,8)}... : TERJADWAL (no logs yet)`)
      }
    }

    const semua = terjadwal + perluDiperbarui + selesai

    console.log('\n📈 FINAL RESULTS:')
    console.log(`Terjadwal: ${terjadwal}`)
    console.log(`Perlu Diperbarui: ${perluDiperbarui}`)
    console.log(`Selesai: ${selesai}`)
    console.log(`Semua: ${semua}`)

    console.log('\n✅ EXPECTED: Should now show all 9 reminders instead of 6!')
    console.log(`   Before: 4 Perlu Diperbarui + 2 Selesai = 6 total`)
    console.log(`   After: ${perluDiperbarui} Perlu Diperbarui + ${selesai} Selesai = ${semua} total`)

  } catch (error) {
    console.error('❌ Error testing reminders stats:', error)
  }
}

testRemindersStatsFix()