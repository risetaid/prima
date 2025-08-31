import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Get patient data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        assignedVolunteer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hospitalName: true
          }
        },
        patientMedications: {
          where: { isActive: true },
          include: {
            medication: {
              select: {
                name: true
              }
            },
            createdByUser: {
              select: {
                firstName: true,
                lastName: true,
                hospitalName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        reminderSchedules: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            createdByUser: {
              select: {
                firstName: true,
                lastName: true,
                hospitalName: true
              }
            }
          }
        },
        medicalRecords: {
          include: {
            recordedByUser: {
              select: {
                firstName: true,
                lastName: true,
                hospitalName: true
              }
            }
          },
          orderBy: { recordedDate: 'desc' },
          take: 1
        }
      }
    })

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get current user details for fallback values
    const currentUserDetails = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        firstName: true,
        lastName: true,
        hospitalName: true
      }
    })

    // Build auto-fill data with smart priority system
    const autoFillData = {
      // Patient basic data (always available)
      nama: patient.name || '',
      nomor: patient.phoneNumber || '',

      // Medication data (priority: latest active medication > reminder schedule)
      obat: patient.patientMedications[0]?.medication.name || 
            patient.reminderSchedules[0]?.medicationName || '',
      
      // Dosage data (priority: patient medication > reminder schedule)
      dosis: patient.patientMedications[0]?.dosage || 
             patient.reminderSchedules[0]?.dosage || '',

      // Doctor data (priority: current user > assigned volunteer > medication prescriber > medical record recorder)
      dokter: currentUserDetails?.firstName && currentUserDetails?.lastName 
              ? `${currentUserDetails.firstName} ${currentUserDetails.lastName}`
              : patient.assignedVolunteer?.firstName && patient.assignedVolunteer?.lastName
              ? `${patient.assignedVolunteer.firstName} ${patient.assignedVolunteer.lastName}`
              : patient.patientMedications[0]?.createdByUser?.firstName && patient.patientMedications[0]?.createdByUser?.lastName
              ? `${patient.patientMedications[0].createdByUser.firstName} ${patient.patientMedications[0].createdByUser.lastName}`
              : patient.medicalRecords[0]?.recordedByUser?.firstName && patient.medicalRecords[0]?.recordedByUser?.lastName
              ? `${patient.medicalRecords[0].recordedByUser.firstName} ${patient.medicalRecords[0].recordedByUser.lastName}`
              : patient.reminderSchedules[0]?.doctorName || '',

      // Hospital data (priority: current user > assigned volunteer > medication prescriber > medical record recorder)
      rumahSakit: currentUserDetails?.hospitalName ||
                  patient.assignedVolunteer?.hospitalName ||
                  patient.patientMedications[0]?.createdByUser?.hospitalName ||
                  patient.medicalRecords[0]?.recordedByUser?.hospitalName || '',

      // Volunteer data (current user)
      volunteer: currentUserDetails?.firstName && currentUserDetails?.lastName 
                 ? `${currentUserDetails.firstName} ${currentUserDetails.lastName}`
                 : currentUser.displayName || '',

      // Time and date (will be filled by form)
      waktu: '',
      tanggal: '',

      // Additional context for better UX
      dataContext: {
        hasActiveMedications: patient.patientMedications.length > 0,
        hasRecentReminders: patient.reminderSchedules.length > 0,
        hasMedicalRecords: patient.medicalRecords.length > 0,
        assignedVolunteerName: patient.assignedVolunteer 
          ? `${patient.assignedVolunteer.firstName || ''} ${patient.assignedVolunteer.lastName || ''}`.trim()
          : null,
        currentUserName: currentUserDetails 
          ? `${currentUserDetails.firstName || ''} ${currentUserDetails.lastName || ''}`.trim()
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
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}