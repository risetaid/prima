import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patientVariables } from '@/db'
import { eq, and } from 'drizzle-orm'
import { PatientQueryBuilder } from '@/services/patient/patient-query-builder'

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

    // Get patient with assigned volunteer using consolidated query
    const patient = await PatientQueryBuilder.getPatientWithVolunteer(patientId)

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get custom patient variables (highest priority)
    const customVariables = await db
      .select({
        variableName: patientVariables.variableName,
        variableValue: patientVariables.variableValue,
      })
      .from(patientVariables)
      .where(and(
        eq(patientVariables.patientId, patientId),
        eq(patientVariables.isActive, true)
      ))

    const customVariablesMap = customVariables.reduce((acc, variable) => {
      acc[variable.variableName] = variable.variableValue
      return acc
    }, {} as Record<string, string>)

    // Get patient-related data using consolidated queries
    const [reminders, medicalRecords] = await Promise.all([
      PatientQueryBuilder.getPatientRemindersWithCreator(patientId, 3),
      PatientQueryBuilder.getPatientMedicalRecordsWithRecorder(patientId, 1),
    ])
    const recentReminders = reminders
    const latestMedicalRecord = medicalRecords

    // Mock current user data for now (since we bypassed auth)
    const mockCurrentUser = {
      firstName: 'Current',
      lastName: 'User',
      hospitalName: 'PRIMA Hospital'
    }

    // Build auto-fill data with smart priority system
    // Priority: Custom Variables > Database > Default values
    const autoFillData = {
      // Patient basic data (priority: custom > database)
      nama: customVariablesMap.nama || patient.name || '',
      nomor: customVariablesMap.nomor || patient.phoneNumber || '',

      // Medication data (priority: custom > reminder schedule)
      obat: customVariablesMap.obat ||
            recentReminders[0]?.medicationName || '',

      // Dosage data (priority: custom > reminder schedule)
      dosis: customVariablesMap.dosis ||
             recentReminders[0]?.dosage || '',

      // Doctor data (priority: custom > current user > assigned volunteer > medical record recorder)
      dokter: customVariablesMap.dokter ||
              (mockCurrentUser.firstName && mockCurrentUser.lastName
                ? `${mockCurrentUser.firstName} ${mockCurrentUser.lastName}`
                : patient.volunteerFirstName && patient.volunteerLastName
                ? `${patient.volunteerFirstName} ${patient.volunteerLastName}`
                 : latestMedicalRecord[0]?.recorderFirstName && latestMedicalRecord[0]?.recorderLastName
                 ? `${latestMedicalRecord[0].recorderFirstName} ${latestMedicalRecord[0].recorderLastName}`
                                 : (recentReminders[0]?.creatorFirstName && recentReminders[0]?.creatorLastName
                   ? `${recentReminders[0].creatorFirstName} ${recentReminders[0].creatorLastName}`
                   : '') || ''),

      // Hospital data (priority: custom > current user > assigned volunteer > medical record recorder)
      rumahSakit: customVariablesMap.rumahSakit ||
                  mockCurrentUser.hospitalName ||
                  patient.volunteerHospitalName ||
                                     latestMedicalRecord[0]?.recorderHospitalName || '',

      // Volunteer data (priority: custom > current user)
      volunteer: customVariablesMap.volunteer ||
                 (mockCurrentUser.firstName && mockCurrentUser.lastName 
                   ? `${mockCurrentUser.firstName} ${mockCurrentUser.lastName}`
                   : 'PRIMA Volunteer'),

      // Time and date (will be filled by form, but can be customized)
      waktu: customVariablesMap.waktu || '',
      tanggal: customVariablesMap.tanggal || '',

      // Additional context for better UX
      dataContext: {
        hasActiveMedications: false, // Medications removed
        hasRecentReminders: recentReminders.length > 0,
        hasMedicalRecords: latestMedicalRecord.length > 0,
        hasCustomVariables: customVariables.length > 0,
        customVariablesCount: customVariables.length,
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
