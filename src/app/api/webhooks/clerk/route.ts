import { createApiHandler } from '@/lib/api-helpers'
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db, users } from "@/db";
import { eq, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

type WebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string;
    last_name?: string;
  };
};

// Custom auth function for Clerk webhooks with Svix verification
async function verifyClerkWebhook(request: Request): Promise<null> {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error("No svix headers found");
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  // Verify the payload with the headers
  try {
    const evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    // Store the event globally for later use
    (global as unknown as { webhookEvent: WebhookEvent }).webhookEvent = evt;
    return null; // No user object for webhooks
  } catch (error) {
    logger.error("Webhook verification failed", error as Error);
    throw new Error("Invalid webhook signature");
  }
}

// POST /api/webhooks/clerk - Handle Clerk webhooks
export const POST = createApiHandler(
  {
    auth: "custom",
    customAuth: verifyClerkWebhook,
    rateLimit: { enabled: false } // Disable rate limiting for webhooks
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_req, { request: _ }) => {
    // Get the webhook event from global storage
    const evt = (global as unknown as { webhookEvent: WebhookEvent }).webhookEvent;
    if (!evt) {
      throw new Error("Webhook event not found");
    }

    // Handle the webhook
    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = evt.data;

      // Use transaction for idempotent user creation
      await db.transaction(async (tx) => {
        // First, check if user already exists (idempotency check)
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.clerkId, id))
          .limit(1);

        if (existingUser[0]) {
          logger.info(`User ${id} already exists, skipping creation`, { webhook: true, userId: id });
          return; // User already exists, skip creation
        }

        // Check if this is the first user (should be admin) - within transaction
        const userCountResult = await tx
          .select({ count: count(users.id) })
          .from(users);

        const userCount = userCountResult[0]?.count || 0;
        const isFirstUser = userCount === 0;

        // Create user in database
        await tx.insert(users).values({
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || "",
          lastName: last_name || "",
          role: isFirstUser ? "ADMIN" : "RELAWAN",
          isApproved: isFirstUser, // First user auto-approved
          approvedAt: isFirstUser ? new Date() : null,
        });

        logger.info(`User ${id} created successfully via webhook`, {
          webhook: true,
          userId: id,
          role: isFirstUser ? "ADMIN" : "RELAWAN",
          isApproved: isFirstUser,
        });
      });

      logger.info('Clerk webhook processed successfully', {
        eventType: evt.type,
        userId: id,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        eventType: evt.type,
        userId: id
      };
    }

    logger.info('Clerk webhook processed successfully', {
      eventType: evt.type,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      eventType: evt.type,
      message: "Webhook processed successfully"
    };
  }
);
