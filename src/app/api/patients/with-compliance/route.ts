import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, isNull, count, inArray } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active patients first (reuse optimized logic from dashboard)
    const allPatients = await db
      .select({
        id: patients.id,
        name: patients.name,
        isActive: patients.isActive,
        photoUrl: patients.photoUrl,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(isNull(patients.deletedAt))
      .orderBy(patients.createdAt)

    // Calculate compliance rates using same optimized approach
    const patientIds = allPatients.map(p => p.id)
    
    // Get delivered reminders count for each patient
    const deliveredRemindersCounts = patientIds.length > 0 ? await db
      .select({
        patientId: reminderLogs.patientId,
        count: count(reminderLogs.id).as('delivered_count')
      })
      .from(reminderLogs)
      .where(
        and(
          inArray(reminderLogs.patientId, patientIds),
          eq(reminderLogs.status, 'DELIVERED')
        )
      )
      .groupBy(reminderLogs.patientId) : []

    // Get confirmations count for each patient
    const confirmationsCounts = patientIds.length > 0 ? await db
      .select({
        patientId: manualConfirmations.patientId,
        count: count(manualConfirmations.id).as('confirmations_count')
      })
      .from(manualConfirmations)
      .where(inArray(manualConfirmations.patientId, patientIds))
      .groupBy(manualConfirmations.patientId) : []

    // Create compliance rate maps
    const deliveredMap = new Map()
    deliveredRemindersCounts.forEach(row => {
      deliveredMap.set(row.patientId, parseInt(row.count.toString()) || 0)
    })

    const confirmationsMap = new Map()
    confirmationsCounts.forEach(row => {
      confirmationsMap.set(row.patientId, parseInt(row.count.toString()) || 0)
    })

    // Calculate compliance rates and format response
    const patientsWithCompliance = allPatients.map(patient => {
      const deliveredReminders = deliveredMap.get(patient.id) || 0
      const confirmations = confirmationsMap.get(patient.id) || 0
      const complianceRate = deliveredReminders > 0 
        ? Math.round((confirmations / deliveredReminders) * 100)
        : 0

      return {
        id: patient.id,
        name: patient.name,
        complianceRate,
        isActive: patient.isActive,
        photoUrl: patient.photoUrl,
        phoneNumber: patient.phoneNumber
      }
    })

    return NextResponse.json(patientsWithCompliance)
  } catch (error) {
    console.error('Error fetching patients with compliance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}