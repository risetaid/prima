import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients } from '@/db'
import { isNull } from 'drizzle-orm'
import { ComplianceService } from '@/services/patient/compliance.service'

import { logger } from '@/lib/logger';
export async function GET() {
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

    // Calculate compliance rates using centralized service
    const compliance = new ComplianceService()
    const patientsWithCompliance = await compliance.attachCompliance(allPatients)
    // Keep the response shape aligned with previous route (select subset of fields)
    const response = patientsWithCompliance.map(p => ({
      id: p.id,
      name: p.name,
      complianceRate: p.complianceRate,
      isActive: p.isActive,
      photoUrl: p.photoUrl,
      phoneNumber: p.phoneNumber,
    }))

    return NextResponse.json(response)
  } catch (error: unknown) {
    logger.error('Error fetching patients with compliance:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

