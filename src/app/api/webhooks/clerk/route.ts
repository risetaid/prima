import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || ''

export async function POST(request: Request) {
  // Skip database operations during build time
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({ message: 'Build time skip' })
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'No CLERK_WEBHOOK_SECRET found' },
      { status: 500 }
    )
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Error occurred -- no svix headers' },
      { status: 400 }
    )
  }

  const payload = await request.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(webhookSecret)

  let evt: any

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as any
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return NextResponse.json(
      { error: 'Error occurred' },
      { status: 400 }
    )
  }

  const { id } = evt.data
  const eventType = evt.type

  try {
    if (eventType === 'user.created') {
      await prisma.user.create({
        data: {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address || '',
          firstName: evt.data.first_name || '',
          lastName: evt.data.last_name || '',
          phoneNumber: evt.data.phone_numbers[0]?.phone_number || null,
          role: 'VOLUNTEER', // Default role for new users
        },
      })
      console.log(`✅ User created: ${evt.data.email_addresses[0]?.email_address}`)
    }

    if (eventType === 'user.updated') {
      await prisma.user.update({
        where: { clerkId: evt.data.id },
        data: {
          email: evt.data.email_addresses[0]?.email_address || '',
          firstName: evt.data.first_name || '',
          lastName: evt.data.last_name || '',
          phoneNumber: evt.data.phone_numbers[0]?.phone_number || null,
        },
      })
      console.log(`✅ User updated: ${evt.data.email_addresses[0]?.email_address}`)
    }

    if (eventType === 'user.deleted') {
      await prisma.user.update({
        where: { clerkId: evt.data.id },
        data: {
          isActive: false,
        },
      })
      console.log(`✅ User deactivated: ${evt.data.id}`)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}