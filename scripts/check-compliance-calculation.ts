import { db, reminderLogs, manualConfirmations } from '../src/db'
import { eq, and, count } from 'drizzle-orm'

async function checkComplianceCalculation() {
  const patientId = '9831df16-f7e1-4f8a-82ed-dd201ace984d'

  try {
    console.log('🔍 Checking compliance calculation for patient:', patientId)
    console.log('=' .repeat(50))

    // Get delivered reminders count
    const deliveredResult = await db
      .select({ count: count() })
      .from(reminderLogs)
      .where(
        and(
          eq(reminderLogs.patientId, patientId),
          eq(reminderLogs.status, 'DELIVERED')
        )
      )

    // Get confirmations count
    const confirmationsResult = await db
      .select({ count: count() })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, patientId))

    const totalDelivered = deliveredResult[0]?.count ? Number(deliveredResult[0].count) : 0
    const totalConfirmed = confirmationsResult[0]?.count ? Number(confirmationsResult[0].count) : 0
    const complianceRate = totalDelivered > 0 ? Math.round((totalConfirmed / totalDelivered) * 100) : 0

    console.log('📊 Compliance Calculation:')
    console.log(`   Total Delivered Reminders: ${totalDelivered}`)
    console.log(`   Total Confirmations: ${totalConfirmed}`)
    console.log(`   Compliance Rate: ${complianceRate}%`)
    console.log(`   Formula: (${totalConfirmed} / ${totalDelivered}) * 100 = ${complianceRate}%`)

    console.log('\n📋 Current Schedule Status (from patient reminders page):')
    console.log('   Perlu Diperbarui: 4 (delivered but not confirmed)')
    console.log('   Selesai: 2 (delivered and confirmed)')
    console.log('   Total "current" reminders: 4 + 2 = 6')

    console.log('\n🔍 Analysis:')
    console.log('   If only using current status: 2/6 = 33%')
    console.log(`   But actual calculation uses ALL history: ${totalConfirmed}/${totalDelivered} = ${complianceRate}%`)
    console.log(`   This means there are ${totalDelivered - 6} additional historical reminders not shown in current view`)

  } catch (error) {
    console.error('❌ Error checking compliance:', error)
  }
}

checkComplianceCalculation()