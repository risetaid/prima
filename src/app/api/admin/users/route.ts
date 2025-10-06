import { createApiHandler } from "@/lib/api-helpers";
import { z } from "zod";
import { schemas } from "@/lib/api-schemas";
import { db, users } from "@/db";
import { eq, desc, asc, ilike, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Query schema for admin users listing
const adminUsersQuerySchema = schemas.list.merge(
  z.object({
    status: z.enum(["all", "pending", "approved"]).default("all"),
  })
);

// GET /api/admin/users - List users for admin management
export const GET = createApiHandler(
  { auth: "required", query: adminUsersQuerySchema },
  async (_, { user, query }) => {
    // Only admins and developers can access user management
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    const { status, page, limit, search } = query!;
    const offset = (page - 1) * limit;

    // Create alias for approver table to avoid naming conflicts
    const approver = alias(users, "approver");

    // Build where conditions
    const whereConditions = [isNull(users.deletedAt)]; // Always exclude deleted users

    // Status filter
    if (status === "pending") {
      whereConditions.push(eq(users.isApproved, false));
    } else if (status === "approved") {
      whereConditions.push(eq(users.isApproved, true));
    }
    
    // Search filter
    if (search) {
      whereConditions.push(
        ilike(users.email, `%${search}%`)
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

    return {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
        hasMore: offset + limit < totalCount.length,
      },
      pendingCount: formattedUsers.filter((u) => !u.isApproved).length,
    };
  }
);
