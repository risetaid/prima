import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { requirePatientAccess } from '@/lib/patient-access-control'
import { db, reminders, patients } from '@/db'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { handleApiError } from '@/lib/api-utils'

import { logger } from '@/lib/logger';
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

    // Check role-based access to this patient
    await requirePatientAccess(
      user.id,
      user.role,
      id,
      "view this patient's reminders"
    )

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build the where condition
    const whereCondition = includeDeleted
      ? eq(reminders.patientId, id)
      : and(
          eq(reminders.patientId, id),
          isNull(reminders.deletedAt)
        )

    // Get all reminders for patient with patient info
    const patientReminders = await db
      .select({
        // Reminder fields
        id: reminders.id,
        patientId: reminders.patientId,
        reminderType: reminders.reminderType,
        scheduledTime: reminders.scheduledTime,
        message: reminders.message,
        startDate: reminders.startDate,
        endDate: reminders.endDate,
        isActive: reminders.isActive,
        status: reminders.status,
        confirmationStatus: reminders.confirmationStatus,
        sentAt: reminders.sentAt,
        confirmationResponseAt: reminders.confirmationResponseAt,
        confirmationResponse: reminders.confirmationResponse,
        title: reminders.title,
        description: reminders.description,
        priority: reminders.priority,
        createdById: reminders.createdById,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        deletedAt: reminders.deletedAt,
        // Patient fields
        patientName: patients.name,
        patientPhoneNumber: patients.phoneNumber,
      })
      .from(reminders)
      .leftJoin(patients, eq(reminders.patientId, patients.id))
      .where(whereCondition)
      .orderBy(desc(reminders.createdAt))

    // Apply pagination if specified
    const paginatedReminders = limit ? patientReminders.slice(offset, offset + limit) : patientReminders

    // Format response to match expected structure
    const formattedReminders = paginatedReminders.map((reminder) => ({
      id: reminder.id,
      patientId: reminder.patientId,
      reminderType: reminder.reminderType,
      scheduledTime: reminder.scheduledTime,
      message: reminder.message,
      startDate: reminder.startDate,
      endDate: reminder.endDate,
      isActive: reminder.isActive,
      status: reminder.status,
      confirmationStatus: reminder.confirmationStatus,
      sentAt: reminder.sentAt,
      confirmationResponseAt: reminder.confirmationResponseAt,
      confirmationResponse: reminder.confirmationResponse,
      title: reminder.title,
      description: reminder.description,
      priority: reminder.priority,
      createdById: reminder.createdById,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
      deletedAt: reminder.deletedAt,
      patient: {
        name: reminder.patientName,
        phoneNumber: reminder.patientPhoneNumber,
      },
    }))

    // Include pagination metadata if pagination is requested
    const response = {
      reminders: formattedReminders,
      total: patientReminders.length,
      ...(limit && {
        pagination: {
          limit,
          offset,
          remaining: Math.max(0, patientReminders.length - (offset + limit))
        }
      })
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    logger.error('Error fetching all reminders:', error instanceof Error ? error : new Error(String(error)))
    return handleApiError(error, "fetching all patient reminders")
  }
}