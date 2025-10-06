import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

import { logger } from '@/lib/logger';
export async function GET() {
  try {
    // OPTIMIZATION: Bypass cache and Redis entirely for faster auth checks
    // Get user directly from Clerk and DB
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Fetch user directly from database (no cache)
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    
    const user = dbUsers[0];
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }
    
    // Compute derived properties
    const canAccessDashboard = user.isApproved && user.isActive;
    const needsApproval = !user.isApproved;
    
    logger.info('✅ User status computed', {
      userId,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive,
      canAccessDashboard,
      needsApproval
    });
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive,
      canAccessDashboard,
      needsApproval,
      createdAt: user.createdAt
    })
  } catch (error: unknown) {
    logger.error('Error fetching user status:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to fetch user status' },
      { status: 500 }
    )
  }
}

