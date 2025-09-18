import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";


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

    // DISABLED: This endpoint depends on removed tables (reminderSchedules, reminderLogs, patientVariables)
    return NextResponse.json({
      success: false,
      disabled: true,
      reason: 'Completed reminders endpoint disabled - depends on removed tables',
      patientId: id,
      message: 'This functionality is temporarily disabled due to schema cleanup'
    });

  } catch (error) {
    console.error("Error fetching completed reminders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}