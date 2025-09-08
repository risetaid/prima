import { NextResponse } from 'next/server'
import { db, patients, reminderLogs, manualConfirmations } from '@/db'
import { eq, and, isNull, count, sql, inArray } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET() {
  try {
    // Since middleware with auth.protect() already handles authentication and authorization,
    // we can directly get the user without additional checks
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Combine all dashboard data in optimized Drizzle queries
    let patientsData, userStats
    
    if (user.role === 'ADMIN') {
      // Admin dashboard - optimized for all patients
      [patientsData, userStats] = await Promise.all([
        // Get basic patients data first (separate from compliance calculation for better performance)
        db.select({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          isActive: patients.isActive,
          photoUrl: patients.photoUrl,
          createdAt: patients.createdAt
        })
        .from(patients)
        .where(isNull(patients.deletedAt))
        .orderBy(patients.isActive, patients.name)
        .limit(100),
        
        // Get user statistics with conditional counting using SQL
        db.select({
          totalPatients: count(),
          activePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = true)`,
          inactivePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = false)`
        })
        .from(patients)
        .where(isNull(patients.deletedAt))
      ])
    } else {
      // Member dashboard - only their patients
      [patientsData, userStats] = await Promise.all([
        db.select({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          isActive: patients.isActive,
          photoUrl: patients.photoUrl,
          createdAt: patients.createdAt
        })
        .from(patients)
        .where(
          and(
            isNull(patients.deletedAt),
            eq(patients.assignedVolunteerId, user.id)
          )
        )
        .orderBy(patients.isActive, patients.name)
        .limit(50),
        
        db.select({
          totalPatients: count(),
          activePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = true)`,
          inactivePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = false)`
        })
        .from(patients)
        .where(
          and(
            isNull(patients.deletedAt),
            eq(patients.assignedVolunteerId, user.id)
          )
        )
      ])
    }

    // Calculate compliance rates separately for better performance (reuse logic from main patients API)
    const patientIds = patientsData.map(p => p.id)
    
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

    // Calculate compliance rates
    const complianceMap = new Map()
    patientIds.forEach(patientId => {
      const deliveredReminders = deliveredMap.get(patientId) || 0
      const confirmations = confirmationsMap.get(patientId) || 0
      const complianceRate = deliveredReminders > 0 
        ? Math.round((confirmations / deliveredReminders) * 100)
        : 0
      complianceMap.set(patientId, complianceRate)
    })

    // Format response with calculated compliance rates
    const patientsFormatted = patientsData.map(patient => ({
      id: patient.id,
      name: patient.name,
      phoneNumber: patient.phoneNumber,
      isActive: patient.isActive,
      photoUrl: patient.photoUrl,
      complianceRate: complianceMap.get(patient.id) || 0,
      createdAt: patient.createdAt
    }))

    const stats = userStats[0] ? {
      totalPatients: parseInt(userStats[0].totalPatients.toString()) || 0,
      activePatients: parseInt(userStats[0].activePatients.toString()) || 0,
      inactivePatients: parseInt(userStats[0].inactivePatients.toString()) || 0
    } : {
      totalPatients: 0,
      activePatients: 0,
      inactivePatients: 0
    }

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      patients: patientsFormatted,
      stats
    })
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}