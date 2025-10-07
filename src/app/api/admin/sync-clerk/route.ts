import { createApiHandler } from '@/lib/api-helpers'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { getWIBTime } from '@/lib/datetime'
import { clerkClient } from '@clerk/nextjs/server'
import { logger } from '@/lib/logger'
// POST /api/admin/sync-clerk - Sync users from Clerk to database
export const POST = createApiHandler(
  { auth: "required" },
  async (_, { user }) => {
    // Only admins and developers can sync users
    if (user!.role !== "ADMIN" && user!.role !== "DEVELOPER") {
      throw new Error("Admin access required");
    }

    // Get all users from Clerk using await clerkClient()
    const clerk = await clerkClient();
    const clerkUsers = await clerk.users.getUserList({
      limit: 500, // Adjust as needed
    });

    // Get all users from our database
    const dbUsers = await db
      .select({
        id: users.id,
        email: users.email,
        clerkId: users.clerkId,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isApproved: users.isApproved,
      })
      .from(users);

    const syncResults = {
      updated: 0,
      created: 0,
      deactivated: 0,
      reactivated: 0,
      conflicts: 0,
      errors: [] as string[],
    };

    // Sync Clerk users to database
    for (const clerkUser of clerkUsers.data) {
      try {
        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        );
        if (!primaryEmail) continue;

        // Check if user exists by Clerk ID
        const existingUserByClerkId = dbUsers.find(
          (u) => u.clerkId === clerkUser.id
        );

        // Check if user exists by email (different Clerk ID)
        const existingUserByEmail = dbUsers.find(
          (u) =>
            u.email === primaryEmail.emailAddress && u.clerkId !== clerkUser.id
        );

        if (existingUserByClerkId) {
          // Update existing user info
          const hasChanges =
            existingUserByClerkId.firstName !== clerkUser.firstName ||
            existingUserByClerkId.lastName !== clerkUser.lastName ||
            existingUserByClerkId.email !== primaryEmail.emailAddress;

          if (hasChanges) {
            await db
              .update(users)
              .set({
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                email: primaryEmail.emailAddress,
                updatedAt: getWIBTime(),
              })
              .where(eq(users.clerkId, clerkUser.id));

            syncResults.updated++;
          }

          // Reactivate if user was inactive
          if (!existingUserByClerkId.isActive) {
            await db
              .update(users)
              .set({
                isActive: true,
                updatedAt: getWIBTime(),
              })
              .where(eq(users.clerkId, clerkUser.id));

            syncResults.reactivated++;
          }
        } else if (existingUserByEmail) {
          await db
            .update(users)
            .set({
              clerkId: clerkUser.id,
              firstName: clerkUser.firstName,
              lastName: clerkUser.lastName,
              isActive: true,
              updatedAt: getWIBTime(),
            })
            .where(eq(users.email, primaryEmail.emailAddress));

          syncResults.updated++;
        } else {
          // Create new user
          await db.insert(users).values({
            email: primaryEmail.emailAddress,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            clerkId: clerkUser.id,
            role: "RELAWAN",
            isActive: true,
            isApproved: false, // New users need approval
            createdAt: getWIBTime(),
            updatedAt: getWIBTime(),
          });

          syncResults.created++;
        }
      } catch (error: unknown) {
        logger.error(`❌ Error syncing user ${clerkUser.id}:`, error instanceof Error ? error : new Error(String(error)));
        syncResults.errors.push(
          `User ${clerkUser.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        syncResults.conflicts++;
      }
    }

    // Deactivate users that no longer exist in Clerk
    const clerkUserIds = clerkUsers.data.map((u) => u.id);
    const usersToDeactivate = dbUsers.filter(
      (u) => u.isActive && !clerkUserIds.includes(u.clerkId)
    );

    for (const user of usersToDeactivate) {
      try {
        await db
          .update(users)
          .set({
            isActive: false,
            updatedAt: getWIBTime(),
          })
          .where(eq(users.clerkId, user.clerkId));

        syncResults.deactivated++;
      } catch (error: unknown) {
        logger.error(`❌ Error deactivating user ${user.email}:`, error instanceof Error ? error : new Error(String(error)));
        syncResults.errors.push(
          `Deactivate ${user.email}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    logger.info('Clerk sync completed successfully', {
      requestedBy: user!.id,
      results: syncResults
    });

    return {
      success: true,
      message: "Clerk sync completed successfully",
      results: syncResults,
    };
  }
);
