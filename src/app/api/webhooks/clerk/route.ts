import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { db, users } from '@/db'
import { eq, count } from 'drizzle-orm'

type WebhookEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      id: string
    }>
    first_name?: string
    last_name?: string
  }
}

export async function POST(request: NextRequest) {
  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await request.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    }) as WebhookEvent
  } catch (err) {
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    try {
      // Check if this is the first user (should be admin)
      const userCountResult = await db
        .select({ count: count(users.id) })
        .from(users)
      
      const userCount = userCountResult[0]?.count || 0
      const isFirstUser = userCount === 0

      // Create user in database
      await db
        .insert(users)
        .values({
          clerkId: id,
          email: email_addresses[0]?.email_address || '',
          firstName: first_name || '',
          lastName: last_name || '',
          role: isFirstUser ? 'SUPERADMIN' : 'MEMBER',
          isApproved: isFirstUser, // First user auto-approved
          approvedAt: isFirstUser ? new Date() : null
        })

      if (isFirstUser) {
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}