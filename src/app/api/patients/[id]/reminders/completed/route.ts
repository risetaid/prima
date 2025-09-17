import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, reminderSchedules, reminderLogs, manualConfirmations, patientVariables } from '@/db'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { convertUTCToWIBString } from '@/lib/timezone'
import { MedicationParser, type MedicationDetails } from '@/lib/medication-parser'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    
    // Extract pagination parameters from request
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Get manual confirmations for this patient
    const confirmations = await db
      .select({
        id: manualConfirmations.id,
        patientId: manualConfirmations.patientId,
        reminderLogId: manualConfirmations.reminderLogId,
        visitDate: manualConfirmations.visitDate,
        visitTime: manualConfirmations.visitTime,
        confirmedAt: manualConfirmations.confirmedAt,
        notes: manualConfirmations.notes,
        medicationsTaken: manualConfirmations.medicationsTaken
      })
      .from(manualConfirmations)
      .where(eq(manualConfirmations.patientId, id))
      .orderBy(desc(manualConfirmations.confirmedAt))
      .offset(offset)
      .limit(limit)

    // Get associated data for each confirmation
    const completedReminders = []
    for (const confirmation of confirmations) {
      let customMessage = 'Pengingat medikasi'
      let sentAt = null
      let medicationDetails: MedicationDetails | null = null

      // Get reminder log details if available
      if (confirmation.reminderLogId) {
        const logResult = await db
          .select({
            sentAt: reminderLogs.sentAt,
            reminderScheduleId: reminderLogs.reminderScheduleId
          })
          .from(reminderLogs)
          .where(eq(reminderLogs.id, confirmation.reminderLogId))
          .limit(1)

        if (logResult.length > 0) {
          sentAt = logResult[0].sentAt

           // Get schedule details if available
           if (logResult[0].reminderScheduleId) {
             const scheduleResult = await db
               .select({
                 customMessage: reminderSchedules.customMessage
               })
               .from(reminderSchedules)
               .where(
                 and(
                   eq(reminderSchedules.id, logResult[0].reminderScheduleId),
                   isNull(reminderSchedules.deletedAt)
                 )
               )
               .limit(1)

             if (scheduleResult.length > 0) {
               customMessage = scheduleResult[0].customMessage || customMessage

               // Extract medication details from custom message if available
               if (scheduleResult[0].customMessage) {
                 medicationDetails = MedicationParser.parseFromReminder(undefined, scheduleResult[0].customMessage)
               }
             }

             // Get medication details from patient variables if not found in custom message
             if (!medicationDetails) {
               try {
                 // Get all active patient variables, not just MEDICATION category
                 // The parser will extract medication-related info from all variables
                 const variables = await db
                   .select({
                     variableName: patientVariables.variableName,
                     variableValue: patientVariables.variableValue,
                     variableCategory: patientVariables.variableCategory
                   })
                   .from(patientVariables)
                   .where(
                     and(
                       eq(patientVariables.patientId, id),
                       eq(patientVariables.isActive, true)
                     )
                   )

                 const variableArray = variables.map(v => ({
                   name: v.variableName,
                   value: v.variableValue
                 }))

                 medicationDetails = MedicationParser.parseFromVariables(variableArray)
               } catch (error) {
                 console.warn('Failed to get medication details for completed reminder:', error)
               }
             }
           }
        }
      }

        completedReminders.push({
          id: confirmation.id,
          patientId: confirmation.patientId,
          reminderLogId: confirmation.reminderLogId,
          visitDate: confirmation.visitDate,
          visitTime: confirmation.visitTime,
          confirmedAt: confirmation.confirmedAt,
          notes: confirmation.notes,
          medicationsTaken: confirmation.medicationsTaken || [],
          customMessage,
          sentAt,
          medicationDetails
        })
    }

    // Transform to match frontend interface
    const formattedReminders = completedReminders.map(reminder => ({
      id: reminder.id,
      scheduledTime: reminder.visitTime,
      completedDate: reminder.visitDate.toISOString().split('T')[0],
      customMessage: reminder.customMessage,
      medicationTaken: reminder.medicationsTaken.length > 0,
      confirmedAt: convertUTCToWIBString(reminder.confirmedAt)
    }))

    return NextResponse.json(formattedReminders)
  } catch (error) {
    console.error('Error fetching completed reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
