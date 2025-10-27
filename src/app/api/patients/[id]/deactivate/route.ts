import { createApiHandler } from '@/lib/api-helpers'
import { schemas } from '@/lib/api-schemas'
import { db, patients } from '@/db'
import { eq } from 'drizzle-orm'
import { invalidatePatientCache } from '@/lib/cache'
import { sendWhatsAppMessage, formatWhatsAppNumber } from '@/lib/waha'

// POST /api/patients/[id]/deactivate - Deactivate patient and send confirmation
export const POST = createApiHandler(
  { auth: "required", params: schemas.patientIdParam },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_req, { user: _, params }) => {
    const { id: patientId } = params!

    // Load patient
    const rows = await db
      .select({ id: patients.id, name: patients.name, phoneNumber: patients.phoneNumber, isActive: patients.isActive, verificationStatus: patients.verificationStatus })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (rows.length === 0) {
      throw new Error('Patient not found');
    }

    const patient = rows[0]

    // Update patient status to declined + inactive
    await db.update(patients).set({
      verificationStatus: 'DECLINED',
      isActive: false,
      verificationResponseAt: new Date(),
      updatedAt: new Date()
    }).where(eq(patients.id, patientId))

    // DISABLED: Reminder deactivation - reminderSchedules table removed in schema cleanup
    // DISABLED: Verification logging - verificationLogs table removed in schema cleanup

    // Send WhatsApp ACK
    try {
      const to = formatWhatsAppNumber(patient.phoneNumber)
      const body = `Baik ${patient.name}, kami akan berhenti mengirimkan reminder. 🛑\n\nSemua pengingat kesehatan telah dinonaktifkan. Kami tetap mendoakan kesehatan Anda.\n\nJika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏💙`
      await sendWhatsAppMessage({ to, body })
    } catch {}

    await invalidatePatientCache(patientId)

    return {
      message: 'Pasien dinonaktifkan dan reminder dihentikan',
      newStatus: 'declined',
      isActive: false
    }
  }
);

