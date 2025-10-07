import { createApiHandler } from '@/lib/api-helpers'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
// GET /api/admin/developer-contact - Get developer contact information
export const GET = createApiHandler(
  { auth: "required" },
  async (_, { user }) => {
    // Only admins and developers can access developer contact info
    if (user!.role !== 'ADMIN' && user!.role !== 'DEVELOPER') {
      throw new Error('Admin access required');
    }

    try {
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
        logger.info('No developer found, returning fallback contact info');
        return {
          name: "David Yusaku",
          email: "davidyusaku13@gmail.com",
          hospitalName: "PRIMA System",
        };
      }

      const contactInfo = {
        name:
          `${developer.firstName} ${developer.lastName}`.trim() || "David Yusaku",
        email: developer.email || "davidyusaku13@gmail.com",
        hospitalName: developer.hospitalName || "PRIMA System",
      };

      logger.info('Developer contact information retrieved', {
        requestedBy: user!.id
      });

      return contactInfo;
    } catch (error: unknown) {
      logger.error("Error fetching developer contact:", error instanceof Error ? error : new Error(String(error)));

      // Return fallback contact info
      return {
        name: "David Yusaku",
        email: "davidyusaku13@gmail.com",
        hospitalName: "PRIMA System",
      };
    }
  }
);
