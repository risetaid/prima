import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { getWIBTime } from "@/lib/timezone";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only developers can change user roles
    if (currentUser.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Developer access required" },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const { role } = await request.json();

    if (!role || !["DEVELOPER", "ADMIN", "RELAWAN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent demoting the last developer
    if (targetUser[0].role === "DEVELOPER" && role !== "DEVELOPER") {
      const developerCount = await db
        .select({ count: users.id })
        .from(users)
        .where(eq(users.role, "DEVELOPER"));

      if (developerCount.length <= 1) {
        return NextResponse.json(
          {
            error: "Cannot demote the last developer",
          },
          { status: 400 }
        );
      }
    }

    // Update user role in database
    await db
      .update(users)
      .set({
        role: role as "DEVELOPER" | "ADMIN" | "RELAWAN",
        updatedAt: getWIBTime(),
      })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role} successfully`,
      user: {
        id: targetUser[0].id,
        email: targetUser[0].email,
        newRole: role,
      },
    });
  } catch (error) {
    console.error("Error toggling user role:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
