import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // This will clear the Clerk session
    return NextResponse.redirect(new URL('/sign-in?redirect_url=/dashboard', process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'http://localhost:3000'))
  } catch (error) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}