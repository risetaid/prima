import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patients, verificationLogs, users } from '@/db'
import { eq, and, desc } from 'drizzle-orm'

// Get verification history for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists and user has access
    const patientResult = await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.id, patientId),
        eq(patients.isActive, true)
      ))
      .limit(1)

    if (patientResult.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Get verification history with user details
    const historyResult = await db
      .select({
        id: verificationLogs.id,
        action: verificationLogs.action,
        messageSent: verificationLogs.messageSent,
        patientResponse: verificationLogs.patientResponse,
        verificationResult: verificationLogs.verificationResult,
        createdAt: verificationLogs.createdAt,
        processedBy: verificationLogs.processedBy,
        // User details
        volunteerFirstName: users.firstName,
        volunteerLastName: users.lastName,
        volunteerEmail: users.email
      })
      .from(verificationLogs)
      .leftJoin(users, eq(verificationLogs.processedBy, users.id))
      .where(eq(verificationLogs.patientId, patientId))
      .orderBy(desc(verificationLogs.createdAt))

    // Format history for UI consumption
    const history = historyResult.map(entry => ({
      id: entry.id,
      timestamp: entry.createdAt.toISOString(),
      action: formatAction(entry.action, entry.verificationResult || undefined),
      message: entry.messageSent,
      response: entry.patientResponse,
      result: entry.verificationResult,
      processedBy: entry.processedBy ? {
        id: entry.processedBy,
        name: `${entry.volunteerFirstName || ''} ${entry.volunteerLastName || ''}`.trim() || entry.volunteerEmail || 'Unknown',
        email: entry.volunteerEmail
      } : null
    }))

    return NextResponse.json({
      success: true,
      history,
      total: history.length
    })

  } catch (error) {
    console.error('Verification history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to format action descriptions
function formatAction(action: string, result?: string): string {
  switch (action) {
    case 'sent':
      return '📱 Pesan verifikasi dikirim'
    case 'responded':
      return result === 'verified' 
        ? '✅ Pasien menyetujui' 
        : result === 'declined'
        ? '❌ Pasien menolak'
        : '💬 Pasien merespon'
    case 'manual_verified':
      return result === 'verified'
        ? '👤 Diverifikasi manual (setuju)'
        : result === 'declined' 
        ? '👤 Diverifikasi manual (tolak)'
        : '👤 Diverifikasi manual'
    case 'expired':
      return '⏰ Verifikasi kedaluwarsa'
    default:
      return `📝 ${action}`
  }
}