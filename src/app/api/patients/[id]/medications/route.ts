import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patientMedications, medications } from '@/db'
import { eq, and, desc, sql } from 'drizzle-orm'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Get patient medications with medication details using optimized separate queries
    const patientMedsList = await db
      .select({
        id: patientMedications.id,
        patientId: patientMedications.patientId,
        medicationId: patientMedications.medicationId,
        dosage: patientMedications.dosage,
        frequency: patientMedications.frequency,
        instructions: patientMedications.instructions,
        startDate: patientMedications.startDate,
        endDate: patientMedications.endDate,
        isActive: patientMedications.isActive,
        createdAt: patientMedications.createdAt
      })
      .from(patientMedications)
      .where(
        and(
          eq(patientMedications.patientId, id),
          eq(patientMedications.isActive, true)
        )
      )
      .orderBy(desc(patientMedications.createdAt))

    // Get medication details for all patient medications
    const medicationIds = patientMedsList.map(pm => pm.medicationId)
    
    const medicationDetails = medicationIds.length > 0 ? await db
      .select({
        id: medications.id,
        name: medications.name
      })
      .from(medications)
      .where(sql`${medications.id} = ANY(${medicationIds}::uuid[])`) : []

    // Create medication lookup map
    const medicationMap = new Map()
    medicationDetails.forEach(med => {
      medicationMap.set(med.id, med)
    })

    // Format response to match expected API structure
    const formattedMedications = patientMedsList.map(pm => ({
      id: pm.id,
      patientId: pm.patientId,
      medicationId: pm.medicationId,
      dosage: pm.dosage,
      frequency: pm.frequency,
      instructions: pm.instructions,
      startDate: pm.startDate,
      endDate: pm.endDate,
      isActive: pm.isActive,
      createdAt: pm.createdAt,
      medication: medicationMap.get(pm.medicationId) || null
    }))

    return NextResponse.json(formattedMedications)
  } catch (error) {
    console.error('Error fetching patient medications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}