import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { createErrorResponse } from "@/lib/api-helpers";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

import { logger } from '@/lib/logger';
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'DEVELOPER')) {
      return createErrorResponse(
        'Unauthorized. Admin access required.',
        401,
        undefined,
        'AUTHORIZATION_ERROR'
      );
    }

    // Get first developer user for contact info
    const developerResult = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        hospitalName: users.hospitalName,
      })
      .from(users)
      .where(eq(users.role, "DEVELOPER"))
      .orderBy(users.createdAt)
      .limit(1);

    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json({
        name: "David Yusaku",
        email: "davidyusaku13@gmail.com",
        hospitalName: "PRIMA System",
      });
    }

    return NextResponse.json({
      name:
        `${developer.firstName} ${developer.lastName}`.trim() || "David Yusaku",
      email: developer.email || "davidyusaku13@gmail.com",
      hospitalName: developer.hospitalName || "PRIMA System",
    });
  } catch (error: unknown) {
    logger.error("Error fetching developer contact:", error instanceof Error ? error : new Error(String(error)));

    // Return fallback contact info
    return NextResponse.json({
      name: "David Yusaku",
      email: "davidyusaku13@gmail.com",
      hospitalName: "PRIMA System",
    });
  }
}
