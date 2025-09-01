import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, users, patientMedications, medications, reminderSchedules, medicalRecords } from '@/db'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Get patient with assigned volunteer (simplified)
    const patientResult = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber,
        assignedVolunteerId: patients.assignedVolunteerId,
        volunteerId: users.id,
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerHospitalName: users.hospitalName
      })
      .from(patients)
      .leftJoin(users, eq(patients.assignedVolunteerId, users.id))
      .where(eq(patients.id, patientId))
      .limit(1)

    if (patientResult.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = patientResult[0]

    // Get latest active medication
    const latestMedication = await db
      .select({
        medicationName: medications.name,
        dosage: patientMedications.dosage,
        prescriberId: users.id,
        prescriberFirstName: users.firstName,
        prescriberLastName: users.lastName,
        prescriberHospitalName: users.hospitalName
      })
      .from(patientMedications)
      .leftJoin(medications, eq(patientMedications.medicationId, medications.id))
      .leftJoin(users, eq(patientMedications.createdBy, users.id))
      .where(and(
        eq(patientMedications.patientId, patientId),
        eq(patientMedications.isActive, true)
      ))
      .orderBy(desc(patientMedications.createdAt))
      .limit(1)

    // Get recent reminder schedules
    const recentReminders = await db
      .select({
        medicationName: reminderSchedules.medicationName,
        dosage: reminderSchedules.dosage,
        doctorName: reminderSchedules.doctorName,
        createdById: users.id,
        createdByFirstName: users.firstName,
        createdByLastName: users.lastName,
        createdByHospitalName: users.hospitalName
      })
      .from(reminderSchedules)
      .leftJoin(users, eq(reminderSchedules.createdById, users.id))
      .where(and(
        eq(reminderSchedules.patientId, patientId),
        eq(reminderSchedules.isActive, true)
      ))
      .orderBy(desc(reminderSchedules.createdAt))
      .limit(3)

    // Get latest medical record
    const latestMedicalRecord = await db
      .select({
        recordedById: users.id,
        recordedByFirstName: users.firstName,
        recordedByLastName: users.lastName,
        recordedByHospitalName: users.hospitalName
      })
      .from(medicalRecords)
      .leftJoin(users, eq(medicalRecords.recordedBy, users.id))
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.recordedDate))
      .limit(1)

    // Mock current user data for now (since we bypassed auth)
    const mockCurrentUser = {
      firstName: 'Current',
      lastName: 'User',
      hospitalName: 'PRIMA Hospital'
    }

    // Build auto-fill data with smart priority system
    const autoFillData = {
      // Patient basic data (always available)
      nama: patient.name || '',
      nomor: patient.phoneNumber || '',

      // Medication data (priority: latest active medication > reminder schedule)
      obat: latestMedication[0]?.medicationName || 
            recentReminders[0]?.medicationName || '',
      
      // Dosage data (priority: patient medication > reminder schedule)
      dosis: latestMedication[0]?.dosage || 
             recentReminders[0]?.dosage || '',

      // Doctor data (priority: current user > assigned volunteer > medication prescriber > medical record recorder)
      dokter: mockCurrentUser.firstName && mockCurrentUser.lastName 
              ? `${mockCurrentUser.firstName} ${mockCurrentUser.lastName}`
              : patient.volunteerFirstName && patient.volunteerLastName
              ? `${patient.volunteerFirstName} ${patient.volunteerLastName}`
              : latestMedication[0]?.prescriberFirstName && latestMedication[0]?.prescriberLastName
              ? `${latestMedication[0].prescriberFirstName} ${latestMedication[0].prescriberLastName}`
              : latestMedicalRecord[0]?.recordedByFirstName && latestMedicalRecord[0]?.recordedByLastName
              ? `${latestMedicalRecord[0].recordedByFirstName} ${latestMedicalRecord[0].recordedByLastName}`
              : recentReminders[0]?.doctorName || '',

      // Hospital data (priority: current user > assigned volunteer > medication prescriber > medical record recorder)
      rumahSakit: mockCurrentUser.hospitalName ||
                  patient.volunteerHospitalName ||
                  latestMedication[0]?.prescriberHospitalName ||
                  latestMedicalRecord[0]?.recordedByHospitalName || '',

      // Volunteer data (current user)
      volunteer: mockCurrentUser.firstName && mockCurrentUser.lastName 
                 ? `${mockCurrentUser.firstName} ${mockCurrentUser.lastName}`
                 : 'PRIMA Volunteer',

      // Time and date (will be filled by form)
      waktu: '',
      tanggal: '',

      // Additional context for better UX
      dataContext: {
        hasActiveMedications: latestMedication.length > 0,
        hasRecentReminders: recentReminders.length > 0,
        hasMedicalRecords: latestMedicalRecord.length > 0,
        assignedVolunteerName: patient.volunteerFirstName && patient.volunteerLastName
          ? `${patient.volunteerFirstName} ${patient.volunteerLastName}`.trim()
          : null,
        currentUserName: mockCurrentUser.firstName && mockCurrentUser.lastName
          ? `${mockCurrentUser.firstName} ${mockCurrentUser.lastName}`.trim()
          : null
      }
    }

    // Filter out empty values for cleaner response
    const nonEmptyData = Object.fromEntries(
      Object.entries(autoFillData).filter(([key, value]) => {
        if (key === 'dataContext') return true
        return value !== null && value !== undefined && value !== ''
      })
    )

    return NextResponse.json({
      success: true,
      patientId: patient.id,
      patientName: patient.name,
      autoFillData: nonEmptyData,
      availableVariables: Object.keys(nonEmptyData).filter(key => key !== 'dataContext'),
      message: 'Data auto-fill berhasil diambil'
    })

  } catch (error) {
    console.error('Error getting autofill data:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined },
      { status: 500 }
    )
  }
}