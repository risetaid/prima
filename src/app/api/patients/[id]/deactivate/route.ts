import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, reminderSchedules, verificationLogs } from '@/db'
import { eq, and } from 'drizzle-orm'
import { invalidateAfterPatientOperation } from '@/lib/cache-invalidation'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/fonnte'

// Deactivate patient (BERHENTI): set inactive, decline verification, deactivate reminders, send ACK
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Load patient
    const rows = await db
      .select({ id: patients.id, name: patients.name, phoneNumber: patients.phoneNumber, isActive: patients.isActive, verificationStatus: patients.verificationStatus })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patient = rows[0]

    // Update patient status to declined + inactive
    await db.update(patients).set({
      verificationStatus: 'declined',
      isActive: false,
      verificationResponseAt: new Date(),
      updatedAt: new Date()
    }).where(eq(patients.id, patientId))

    // Deactivate all reminders
    await db.update(reminderSchedules).set({ isActive: false, updatedAt: new Date() }).where(eq(reminderSchedules.patientId, patientId))

    // Log action
    await db.insert(verificationLogs).values({
      patientId: patientId,
      action: 'manual_unsubscribe',
      patientResponse: 'BERHENTI (by volunteer)',
      verificationResult: 'declined',
      processedBy: user.id
    })

    // Send WhatsApp ACK
    try {
      const to = formatWhatsAppNumber(patient.phoneNumber)
      const body = `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑\n\nSemua pengingat obat telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.\n\nJika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏💙`
      await sendWhatsAppMessage({ to, body })
    } catch {}

    await invalidateAfterPatientOperation(patientId, 'update')

    return NextResponse.json({
      success: true,
      message: 'Pasien dinonaktifkan dan reminder dihentikan',
      newStatus: 'declined',
      isActive: false
    })
  } catch (error) {
    console.error('Deactivate patient error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

