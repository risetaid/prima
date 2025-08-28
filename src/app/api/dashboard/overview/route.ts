import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.canAccessDashboard) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Combine all dashboard data in single optimized queries
    let patientsData, userStats
    
    if (user.role === 'ADMIN') {
      // Admin dashboard - optimized for all patients
      [patientsData, userStats] = await Promise.all([
        // Get patients with compliance in one raw query
        prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            p.phone_number as "phoneNumber",
            p.is_active as "isActive",
            p.photo_url as "photoUrl",
            p.created_at as "createdAt",
            COALESCE(
              CASE 
                WHEN COUNT(DISTINCT rl.id) > 0 
                THEN ROUND((COUNT(DISTINCT mc.id)::numeric / COUNT(DISTINCT rl.id)) * 100)
                ELSE 0 
              END, 0
            ) as "complianceRate"
          FROM patients p
          LEFT JOIN reminder_logs rl ON rl.patient_id = p.id AND rl.status = 'DELIVERED'
          LEFT JOIN manual_confirmations mc ON mc.patient_id = p.id
          WHERE p.deleted_at IS NULL
          GROUP BY p.id, p.name, p.phone_number, p.is_active, p.photo_url, p.created_at
          ORDER BY p.is_active DESC, p.name ASC
          LIMIT 100
        `,
        
        // Get user statistics
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_patients,
            COUNT(*) FILTER (WHERE is_active = true) as active_patients,
            COUNT(*) FILTER (WHERE is_active = false) as inactive_patients
          FROM patients
          WHERE deleted_at IS NULL
        `
      ])
    } else {
      // Member dashboard - only their patients
      [patientsData, userStats] = await Promise.all([
        prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            p.phone_number as "phoneNumber",
            p.is_active as "isActive", 
            p.photo_url as "photoUrl",
            p.created_at as "createdAt",
            COALESCE(
              CASE 
                WHEN COUNT(DISTINCT rl.id) > 0 
                THEN ROUND((COUNT(DISTINCT mc.id)::numeric / COUNT(DISTINCT rl.id)) * 100)
                ELSE 0 
              END, 0
            ) as "complianceRate"
          FROM patients p
          LEFT JOIN reminder_logs rl ON rl.patient_id = p.id AND rl.status = 'DELIVERED'
          LEFT JOIN manual_confirmations mc ON mc.patient_id = p.id
          WHERE p.deleted_at IS NULL AND p.assigned_volunteer_id = ${user.id}::uuid
          GROUP BY p.id, p.name, p.phone_number, p.is_active, p.photo_url, p.created_at
          ORDER BY p.is_active DESC, p.name ASC
          LIMIT 50
        `,
        
        prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_patients,
            COUNT(*) FILTER (WHERE is_active = true) as active_patients,
            COUNT(*) FILTER (WHERE is_active = false) as inactive_patients
          FROM patients
          WHERE deleted_at IS NULL AND assigned_volunteer_id = ${user.id}::uuid
        `
      ])
    }

    // Format response
    const patients = Array.isArray(patientsData) ? patientsData.map((patient: any) => ({
      id: patient.id,
      name: patient.name,
      phoneNumber: patient.phoneNumber,
      isActive: patient.isActive,
      photoUrl: patient.photoUrl,
      complianceRate: parseInt(patient.complianceRate) || 0,
      createdAt: patient.createdAt
    })) : []

    const stats = Array.isArray(userStats) && userStats.length > 0 ? {
      totalPatients: parseInt(userStats[0].total_patients) || 0,
      activePatients: parseInt(userStats[0].active_patients) || 0,
      inactivePatients: parseInt(userStats[0].inactive_patients) || 0
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
      patients,
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