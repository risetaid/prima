import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all patients with their reminder data in a single query
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        photoUrl: true,
        phoneNumber: true,
        reminderSchedules: {
          where: { isActive: true },
          select: {
            id: true,
            reminderLogs: {
              where: { status: 'DELIVERED' },
              select: {
                id: true,
                manualConfirmations: {
                  select: {
                    medicationsTaken: true
                  }
                }
              }
            },
            manualConfirmations: {
              select: {
                medicationsTaken: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate compliance rates efficiently
    const patientsWithCompliance = patients.map(patient => {
      let totalReminders = 0
      let completedCount = 0

      // Count from reminder logs with confirmations
      patient.reminderSchedules.forEach(schedule => {
        schedule.reminderLogs.forEach(log => {
          totalReminders++
          if (log.manualConfirmations.length > 0 && log.manualConfirmations[0].medicationsTaken) {
            completedCount++
          }
        })

        // Count from manual confirmations not tied to logs
        schedule.manualConfirmations.forEach(confirmation => {
          if (confirmation.medicationsTaken) {
            // Only count if not already counted through logs
            const hasCorrespondingLog = schedule.reminderLogs.some(log => 
              log.manualConfirmations.length > 0
            )
            if (!hasCorrespondingLog) {
              totalReminders++
              completedCount++
            }
          }
        })
      })

      const complianceRate = totalReminders > 0 
        ? Math.round((completedCount / totalReminders) * 100)
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