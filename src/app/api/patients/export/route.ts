/**
 * Patient Export API Endpoint
 *
 * Handles GDPR-compliant patient data export requests.
 * Requires admin role and logs all export operations for audit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db, patients } from '@/db';
import { isNull, eq } from 'drizzle-orm';
import { auditService } from '@/services/audit/audit.service';
import { setAuditContext, clearAuditContext } from '@/services/patient/patient.repository';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const { userId, userId: clerkUserId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Role check - only admin can export patient data
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== 'admin') {
      // Log unauthorized export attempt
      auditService.logAccess({
        action: 'EXPORT',
        resourceType: 'export',
        metadata: {
          operation: 'patient_export_unauthorized',
          attemptedBy: userId,
        },
      }).catch(() => {});

      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // 3. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const patientId = searchParams.get('patientId') || undefined;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // 4. Set audit context
    const auditContext = {
      userId: clerkUserId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      requestId: request.headers.get('x-request-id') || undefined,
    };
    setAuditContext(auditContext);

    try {
      // 5. Build query conditions
      const conditions = [];
      if (!includeDeleted) {
        conditions.push(isNull(patients.deletedAt));
      }
      if (patientId) {
        conditions.push(eq(patients.id, patientId));
      }
      const whereClause = conditions.length ? conditions[0] : undefined;

      // 6. Fetch patient data (PHI included for export)
      const patientData = await db
        .select({
          id: patients.id,
          name: patients.name,
          phoneNumber: patients.phoneNumber,
          address: patients.address,
          birthDate: patients.birthDate,
          diagnosisDate: patients.diagnosisDate,
          cancerStage: patients.cancerStage,
          assignedVolunteerId: patients.assignedVolunteerId,
          doctorName: patients.doctorName,
          hospitalName: patients.hospitalName,
          emergencyContactName: patients.emergencyContactName,
          emergencyContactPhone: patients.emergencyContactPhone,
          notes: patients.notes,
          isActive: patients.isActive,
          verificationStatus: patients.verificationStatus,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt,
          deletedAt: patients.deletedAt,
        })
        .from(patients)
        .where(whereClause as typeof whereClause);

      // 7. Log the export operation
      await auditService.logExport(
        'patient',
        patientData.length,
        auditContext
      );

      // 8. Format response based on requested format
      if (format === 'csv') {
        return exportAsCSV(patientData);
      }

      return NextResponse.json({
        success: true,
        exportedAt: new Date().toISOString(),
        recordCount: patientData.length,
        format: 'json',
        data: patientData,
      });

    } finally {
      // 9. Clear audit context
      clearAuditContext();
    }

  } catch (error) {
    console.error('Patient export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Convert patient data to CSV format
 */
function exportAsCSV(data: Array<Record<string, unknown>>) {
  if (data.length === 0) {
    return new NextResponse('', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="patients-empty.csv"',
      },
    });
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return String(value);
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="patients-${Date.now()}.csv"`,
    },
  });
}
