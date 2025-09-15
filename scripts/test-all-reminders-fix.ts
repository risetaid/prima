import { db, reminderLogs, reminderSchedules, manualConfirmations } from '@/db'
import { eq, and, desc, inArray } from 'drizzle-orm'

async function testAllRemindersFix() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    console.log('🧪 Testing All Reminders Fix')
    console.log('=' .repeat(40))

    // Simulate the NEW logic from the fixed API
    const allReminderLogs = await db
      .select({
        id: reminderLogs.id,
        reminderScheduleId: reminderLogs.reminderScheduleId,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
        message: reminderLogs.message,
        // Join with schedule data
        scheduledTime: reminderSchedules.scheduledTime,
        startDate: reminderSchedules.startDate,
        customMessage: reminderSchedules.customMessage
      })
      .from(reminderLogs)
      .leftJoin(reminderSchedules,
        and(
          eq(reminderLogs.reminderScheduleId, reminderSchedules.id),
          eq(reminderSchedules.isActive, true)
        )
      )
      .where(eq(reminderLogs.patientId, patientId))
      .orderBy(desc(reminderLogs.sentAt))

    // Get confirmations
    const logIds = allReminderLogs.map(log => log.id)
    const allConfirmations = logIds.length > 0 ? await db
      .select({
        id: manualConfirmations.id,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate
      })
      .from(manualConfirmations)
      .where(inArray(manualConfirmations.reminderLogId, logIds)) : []

    console.log(`\n📊 Processing ${allReminderLogs.length} individual logs:`)

    let pendingCount = 0
    let completedCount = 0
    let scheduledCount = 0

    // Transform results (same logic as the fixed API)
    const allReminders = allReminderLogs.map(log => {
      const confirmation = allConfirmations.find(conf => conf.reminderLogId === log.id)

      let status = 'scheduled'
      let reminderDate = log.sentAt ? log.sentAt.toISOString().split('T')[0] : (log.startDate ? log.startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
      let id_suffix = log.id

      if (confirmation) {
        status = 'completed'
        reminderDate = confirmation.visitDate ? confirmation.visitDate.toISOString().split('T')[0] : reminderDate
        id_suffix = `completed-${confirmation.id}`

        completedCount++
        console.log(`✅ Log ${log.id.slice(0,8)}... : COMPLETED`)
      } else if (log.status === 'DELIVERED') {
        status = 'pending'
        id_suffix = `pending-${log.id}`
        pendingCount++
        console.log(`⏳ Log ${log.id.slice(0,8)}... : PENDING`)
      } else if (log.status === 'FAILED') {
        status = 'scheduled'
        id_suffix = `failed-${log.id}`
        scheduledCount++
        console.log(`📅 Log ${log.id.slice(0,8)}... : SCHEDULED (failed)`)
      } else {
        scheduledCount++
        console.log(`❓ Log ${log.id.slice(0,8)}... : SCHEDULED (unknown)`)
      }

      return {
        id: `${status}-${id_suffix}`,
        scheduledTime: log.scheduledTime || '12:00',
        reminderDate,
        customMessage: log.customMessage || log.message,
        status
      }
    })

    console.log('\n📈 FINAL RESULTS:')
    console.log(`Total reminders: ${allReminders.length}`)
    console.log(`Pending: ${pendingCount}`)
    console.log(`Completed: ${completedCount}`)
    console.log(`Scheduled: ${scheduledCount}`)

    console.log('\n✅ EXPECTED: Should now show all 9 reminders!')
    console.log(`   Before: Only latest per schedule (6 total)`)
    console.log(`   After: All individual logs (9 total)`)

    console.log('\n🎯 Status Breakdown:')
    console.log(`   - 7 Pending (delivered but not confirmed)`)
    console.log(`   - 2 Completed (1 taken + 1 not taken)`)
    console.log(`   - 0 Scheduled (no failed/unknown status logs)`)

  } catch (error) {
    console.error('❌ Error testing all reminders:', error)
  }
}

testAllRemindersFix()
