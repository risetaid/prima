import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, users } from "@/db";
import { eq, desc, asc, ilike, or, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createErrorResponse, handleApiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createErrorResponse(
        "Unauthorized",
        401,
        undefined,
        "AUTHENTICATION_ERROR"
      );
    }

    // Only admins and developers can access user management
    if (currentUser.role !== "ADMIN" && currentUser.role !== "DEVELOPER") {
      return createErrorResponse(
        "Admin access required",
        403,
        undefined,
        "AUTHORIZATION_ERROR"
      );
    }

    // Parse query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const offset = (page - 1) * limit;

    // Create alias for approver table to avoid naming conflicts
    const approver = alias(users, "approver");

    // Build where conditions
    const whereConditions = [];
    
    // Status filter
    if (status === "pending") {
      whereConditions.push(eq(users.isApproved, false));
    } else if (status === "approved") {
      whereConditions.push(eq(users.isApproved, true));
    }
    
    // Search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    // Get users with approval info using Drizzle
    const query = db
      .select({
        // User fields
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
        createdAt: users.createdAt,
        approvedAt: users.approvedAt,
        approvedBy: users.approvedBy,
        // Approver fields
        approverFirstName: approver.firstName,
        approverLastName: approver.lastName,
        approverEmail: approver.email,
      })
      .from(users)
      .leftJoin(approver, eq(users.approvedBy, approver.id));

    // Apply where conditions if any
    const finalQuery = whereConditions.length > 0 
      ? query.where(and(...whereConditions))
      : query;

    // Get total count for pagination
    const countQuery = db
      .select({ count: users.id })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const [allUsers, totalCount] = await Promise.all([
      finalQuery
        .orderBy(
          asc(users.isApproved), // Pending approvals first
          desc(users.createdAt)
        )
        .limit(limit)
        .offset(offset),
      countQuery
    ]);

    // Format response to match Prisma structure
    const formattedUsers = allUsers.map((user) => ({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      approvedAt: user.approvedAt,
      approver: user.approverFirstName
        ? {
            firstName: user.approverFirstName,
            lastName: user.approverLastName,
            email: user.approverEmail,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
        hasMore: offset + limit < totalCount.length,
      },
      pendingCount: formattedUsers.filter((u) => !u.isApproved).length,
    });
  } catch (error) {
    return handleApiError(error, "fetching users for admin");
  }
}
