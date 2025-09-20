import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminders, manualConfirmations } from "@/db";
import {
  eq,
  and,
  or,
  desc,
  gte,
  lte,
  notExists,
  isNull,
} from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Extract pagination and date filter parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const dateFilter = searchParams.get("date");
    const offset = (page - 1) * limit;

    // Build where conditions with proper logic - match stats API criteria
    const whereConditions = [
      eq(reminders.patientId, id),
      // Match stats API logic: include SENT or DELIVERED reminders
      or(
        eq(reminders.status, "SENT"),
        eq(reminders.status, "DELIVERED")
      ),
      // Include soft delete filter like other APIs
      isNull(reminders.deletedAt),
      eq(reminders.isActive, true),
      // Must not have manual confirmation
      notExists(
        db
          .select()
          .from(manualConfirmations)
          .where(eq(manualConfirmations.reminderId, reminders.id))
      ),
      // Must not be confirmed (manually or automatically)
      and(
        isNull(reminders.confirmationStatus),
        isNull(reminders.confirmationResponse)
      ),
    ];

    // Add date range filter if provided - use consistent timezone logic
    if (dateFilter) {
      try {
        // Use the same helper function for consistency
        function createWIBDateRange(dateString: string) {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format: ${dateString}`);
          }

          const startOfDay = new Date(date);
          startOfDay.setUTCHours(17, 0, 0, 0); // 17:00 UTC = 00:00 WIB (UTC+7)

          const endOfDay = new Date(date);
          endOfDay.setUTCHours(16, 59, 59, 999); // 16:59 UTC next day = 23:59 WIB
          endOfDay.setDate(endOfDay.getDate() + 1);

          return { startOfDay, endOfDay };
        }

        const { startOfDay, endOfDay } = createWIBDateRange(dateFilter);
        whereConditions.push(gte(reminders.sentAt, startOfDay));
        whereConditions.push(lte(reminders.sentAt, endOfDay));
      } catch (dateError) {
        console.error("Error in date filtering:", dateError);
        // Continue without date filter if there's an error
      }
    }

    // Get reminders that are SENT but don't have manual confirmation yet
    const pendingReminders = await db
      .select({
        id: reminders.id,
        sentAt: reminders.sentAt,
        // Automated confirmation fields
        confirmationStatus: reminders.confirmationStatus,
        confirmationResponse: reminders.confirmationResponse,
        confirmationResponseAt: reminders.confirmationResponseAt,
        confirmationSentAt: reminders.confirmationSentAt,
        // Schedule fields from reminders table
        scheduledTime: reminders.scheduledTime,
        customMessage: reminders.message,
      })
      .from(reminders)
      .where(and(...whereConditions))
      .orderBy(desc(reminders.sentAt))
      .offset(offset)
      .limit(limit);

    // Transform to match frontend interface
    const formattedReminders = pendingReminders.map((reminder) => ({
      id: reminder.id,
      scheduledTime: reminder.scheduledTime || "12:00",
      sentDate: reminder.sentAt ? reminder.sentAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      customMessage: reminder.customMessage,
      status: "PENDING_UPDATE",
      // Include automated confirmation fields for UI to handle properly
      confirmationStatus: reminder.confirmationStatus,
      confirmationResponse: reminder.confirmationResponse,
      confirmationResponseAt: reminder.confirmationResponseAt,
      confirmationSentAt: reminder.confirmationSentAt,
    }));

    return NextResponse.json(formattedReminders);
  } catch (error) {
    console.error("Error fetching pending reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
