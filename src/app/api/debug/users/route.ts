import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Disable debug routes in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug routes disabled in production' }, { status: 404 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })
    
    return NextResponse.json({
      message: 'Users from database',
      count: users.length,
      users,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error },
      { status: 500 }
    )
  }
}