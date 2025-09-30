import { NextResponse } from "next/server";
import { db, patients } from "@/db";
import { eq, and, isNull, count, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { ComplianceService } from "@/services/patient/compliance.service";

import { logger } from '@/lib/logger';
export async function GET() {
  try {
    // Since middleware with auth.protect() already handles authentication and authorization,
    // we can directly get the user without additional checks
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Combine all dashboard data in optimized Drizzle queries
    let patientsData, userStats;

    if (user.role === "ADMIN" || user.role === "DEVELOPER") {
      // Admin/Developer dashboard - optimized for all patients
      [patientsData, userStats] = await Promise.all([
        // Get basic patients data first (separate from compliance calculation for better performance)
        db
          .select({
            id: patients.id,
            name: patients.name,
            phoneNumber: patients.phoneNumber,
            isActive: patients.isActive,
            photoUrl: patients.photoUrl,
            createdAt: patients.createdAt,
          })
          .from(patients)
          .where(isNull(patients.deletedAt))
          .orderBy(patients.isActive, patients.name)
          .limit(100),

        // Get user statistics with conditional counting using SQL
        db
          .select({
            totalPatients: count(),
            activePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = true)`,
            inactivePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = false)`,
          })
          .from(patients)
          .where(isNull(patients.deletedAt)),
      ]);
    } else {
      // RELAWAN dashboard - only their assigned patients
      [patientsData, userStats] = await Promise.all([
        db
          .select({
            id: patients.id,
            name: patients.name,
            phoneNumber: patients.phoneNumber,
            isActive: patients.isActive,
            photoUrl: patients.photoUrl,
            createdAt: patients.createdAt,
          })
          .from(patients)
          .where(
            and(
              isNull(patients.deletedAt),
              eq(patients.assignedVolunteerId, user.id)
            )
          )
          .orderBy(patients.isActive, patients.name)
          .limit(50),

        db
          .select({
            totalPatients: count(),
            activePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = true)`,
            inactivePatients: sql<number>`COUNT(*) FILTER (WHERE ${patients.isActive} = false)`,
          })
          .from(patients)
          .where(
            and(
              isNull(patients.deletedAt),
              eq(patients.assignedVolunteerId, user.id)
            )
          ),
      ]);
    }

    // Calculate compliance rates using the simplified ComplianceService
    const complianceService = new ComplianceService();
    const patientsWithCompliance = await complianceService.attachCompliance(
      patientsData
    );

    // Create compliance rate map
    const complianceMap = new Map();
    patientsWithCompliance.forEach((patient) => {
      complianceMap.set(patient.id, patient.complianceRate);
    });

    // Format response with calculated compliance rates
    const patientsFormatted = patientsData.map((patient) => ({
      id: patient.id,
      name: patient.name,
      phoneNumber: patient.phoneNumber,
      isActive: patient.isActive,
      photoUrl: patient.photoUrl,
      complianceRate: complianceMap.get(patient.id) || 0,
      createdAt: patient.createdAt,
    }));

    const stats = userStats[0]
      ? {
          totalPatients: parseInt(userStats[0].totalPatients.toString()) || 0,
          activePatients: parseInt(userStats[0].activePatients.toString()) || 0,
          inactivePatients:
            parseInt(userStats[0].inactivePatients.toString()) || 0,
        }
      : {
          totalPatients: 0,
          activePatients: 0,
          inactivePatients: 0,
        };

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      patients: patientsFormatted,
      stats,
    });
  } catch (error: unknown) {
    logger.error("Error fetching dashboard overview:", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
