import { NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    // Get first superadmin user for contact info
    const superadminResult = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        hospitalName: users.hospitalName
      })
      .from(users)
      .where(eq(users.role, 'SUPERADMIN'))
      .orderBy(users.createdAt)
      .limit(1)

    const superadmin = superadminResult[0]

    if (!superadmin) {
      return NextResponse.json({
        name: 'Administrator PRIMA',
        email: 'admin@prima.com',
        hospitalName: 'PRIMA System'
      })
    }

    return NextResponse.json({
      name: `${superadmin.firstName} ${superadmin.lastName}`.trim() || 'Administrator PRIMA',
      email: superadmin.email,
      hospitalName: superadmin.hospitalName || 'PRIMA System'
    })

  } catch (error) {
    console.error('Error fetching superadmin contact:', error)
    
    // Return fallback contact info
    return NextResponse.json({
      name: 'Administrator PRIMA',
      email: 'admin@prima.com', 
      hospitalName: 'PRIMA System'
    })
  }
}

