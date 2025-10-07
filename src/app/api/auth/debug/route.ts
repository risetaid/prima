import { createApiHandler } from '@/lib/api-helpers'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const debugQuerySchema = z.object({
  type: z.enum(['email', 'user']).default('user'),
});

// GET /api/auth/debug - Debug endpoint for development
export const GET = createApiHandler(
  { auth: "required", query: debugQuerySchema },
  async (_, { query }) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Debug endpoint disabled in production');
    }

    const { type } = query!;

    if (type === 'email') {
      return await debugEmail();
    } else if (type === 'user') {
      return await debugUser();
    }

    throw new Error('Invalid debug type. Use ?type=email or ?type=user');
  }
);

async function debugEmail() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      throw new Error('Unauthorized');
    }

    const email = user.primaryEmailAddress?.emailAddress || ''

    const userByClerkIdResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
    
    const userByClerkId = userByClerkIdResult.length > 0 ? userByClerkIdResult[0] : null

    const userByEmailResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    const userByEmail = userByEmailResult.length > 0 ? userByEmailResult[0] : null

    const allUsersWithEmail = await db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.email, email))

    return {
      currentClerkId: userId,
      currentEmail: email,
      userByClerkId,
      userByEmail,
      allUsersWithEmail,
      conflict: userByEmail && userByEmail.clerkId !== userId
    };
  } catch (error: unknown) {
    logger.error('Debug email error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function debugUser() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      throw new Error('Unauthorized');
    }

    const dbUserResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
    
    const dbUser = dbUserResult.length > 0 ? dbUserResult[0] : null

    const totalUsersResult = await db
      .select({ count: count(users.id) })
      .from(users)
    
    const totalUsers = totalUsersResult[0]?.count || 0

    return {
      clerkUserId: userId,
      userFoundInDb: !!dbUser,
      userDetails: dbUser,
      totalUsersInDb: totalUsers
    };
  } catch (error: unknown) {
    logger.error('Debug user error:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

