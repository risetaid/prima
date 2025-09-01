import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, reminderSchedules, patients, reminderLogs } from "@/db";
import { eq, desc } from 'drizzle-orm'
import { sendWhatsAppMessage, formatWhatsAppNumber } from "@/lib/fonnte";
import { getWIBTime, getWIBTimeString, getWIBDateString } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test endpoint disabled in production" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const testType = searchParams.get("type") || "timing";

  if (testType === "timing") {
    return await timingTest();
  }

  return NextResponse.json(
    { error: "Invalid test type. Use ?type=timing" },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test endpoint disabled in production" },
      { status: 403 }
    );
  }

  // TODO: Re-enable auth after migration complete
  // const user = await getCurrentUser();
  // if (!user) {
  //   return NextResponse.json(
  //     { error: "Authentication required" },
  //     { status: 401 }
  //   );
  // }

  const { searchParams } = new URL(request.url);
  const testType = searchParams.get("type");

  if (testType === "whatsapp") {
    return await whatsappTest(request);
  } else if (testType === "log") {
    return await logTest();
  }

  return NextResponse.json(
    {
      error: "Invalid test type. Use ?type=whatsapp or ?type=log",
    },
    { status: 400 }
  );
}

async function timingTest() {
  const currentWIBTime = getWIBTimeString();
  const currentWIBDate = getWIBDateString();

  const testScenarios = [
    { scheduledTime: "14:00", description: "Exactly on time" },
    { scheduledTime: "14:01", description: "1 minute late" },
    { scheduledTime: "14:05", description: "5 minutes late" },
    { scheduledTime: "14:10", description: "10 minutes late" },
    {
      scheduledTime: "14:11",
      description: "11 minutes late (should not send)",
    },
    { scheduledTime: "13:59", description: "1 minute early (should not send)" },
  ];

  const simulatedCurrentTime = "14:10";

  const results = testScenarios.map((scenario) => {
    const [currentHour, currentMinute] = simulatedCurrentTime
      .split(":")
      .map(Number);
    const [scheduledHour, scheduledMinute] = scenario.scheduledTime
      .split(":")
      .map(Number);

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;
    const timeDifference = currentTotalMinutes - scheduledTotalMinutes;

    const shouldSend = timeDifference >= 0 && timeDifference <= 10;

    return {
      ...scenario,
      timeDifference,
      shouldSend,
      status: shouldSend ? "✅ SEND" : "❌ SKIP",
    };
  });

  return NextResponse.json({
    success: true,
    currentWIBTime,
    currentWIBDate,
    simulatedTime: simulatedCurrentTime,
    configuration: {
      windowMinutes: 10,
      cronInterval: "Every 3 minutes (app.fastcron.com)",
      provider: "Fonnte (Primary)",
    },
    testResults: results,
    summary: {
      totalTests: results.length,
      shouldSend: results.filter((r) => r.shouldSend).length,
      shouldSkip: results.filter((r) => !r.shouldSend).length,
    },
  });
}

async function whatsappTest(request: NextRequest) {
  try {
    const { phoneNumber, patientName, medicationName, dosage } =
      await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    const name = patientName || "Testing User";
    const medication = medicationName || "Tamoxifen";
    const medicationDose = dosage || "20mg - 1 tablet";

    const currentHour = new Date().toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
    });

    const greeting = (() => {
      const hour = new Date().getHours();
      if (hour < 12) return "Selamat Pagi";
      if (hour < 15) return "Selamat Siang";
      if (hour < 18) return "Selamat Sore";
      return "Selamat Malam";
    })();

    const testMessage = `🏥 *PRIMA Reminder*

${greeting}, ${name}! 👋

⏰ Waktunya minum obat:
💊 ${medication}
📝 Dosis: ${medicationDose}
🕐 Jam: ${currentHour} WIB

📌 Catatan Penting:
Minum setelah makan dengan air putih

✅ Balas "MINUM" jika sudah minum obat
❓ Balas "BANTUAN" untuk bantuan
📞 Darurat: 0341-550171

Semangat sembuh! 💪
Tim PRIMA - Berbagi Kasih`;

    console.log("🧪 Testing FONNTE provider");
    const result = await sendWhatsAppMessage({
      to: formatWhatsAppNumber(phoneNumber),
      body: testMessage,
    });

    return NextResponse.json({
      success: true,
      provider: "fonnte",
      result,
      message: "Test message sent successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("WhatsApp test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function logTest() {
  try {
    // Get the latest active reminder schedule
    const scheduleData = await db
      .select({
        id: reminderSchedules.id,
        patientId: reminderSchedules.patientId,
        medicationName: reminderSchedules.medicationName,
        scheduledTime: reminderSchedules.scheduledTime
      })
      .from(reminderSchedules)
      .where(eq(reminderSchedules.isActive, true))
      .orderBy(desc(reminderSchedules.createdAt))
      .limit(1)

    if (scheduleData.length === 0) {
      return NextResponse.json(
        { error: "No reminder schedule found" },
        { status: 404 }
      );
    }

    const schedule = scheduleData[0]

    // Get patient details
    const patientData = await db
      .select({
        id: patients.id,
        name: patients.name,
        phoneNumber: patients.phoneNumber
      })
      .from(patients)
      .where(eq(patients.id, schedule.patientId))
      .limit(1)

    if (patientData.length === 0) {
      return NextResponse.json(
        { error: "Patient not found for schedule" },
        { status: 404 }
      );
    }

    const patient = patientData[0]

    const testLogData = {
      reminderScheduleId: schedule.id,
      patientId: patient.id,
      sentAt: getWIBTime(),
      status: "DELIVERED" as const,
      fonnteMessageId: "test-" + Date.now(),
      message: "Test message",
      phoneNumber: patient.phoneNumber,
      scheduledTime: getWIBTimeString()
    };

    const createdLog = await db
      .insert(reminderLogs)
      .values(testLogData)
      .returning({
        id: reminderLogs.id,
        status: reminderLogs.status,
        sentAt: reminderLogs.sentAt,
        fonnteMessageId: reminderLogs.fonnteMessageId
      })

    return NextResponse.json({
      success: true,
      message: "Test log created successfully",
      createdLog: {
        id: createdLog[0].id,
        status: createdLog[0].status,
        sentAt: createdLog[0].sentAt.toISOString(),
        fonnteMessageId: createdLog[0].fonnteMessageId,
      },
    });
  } catch (error) {
    console.error("❌ Test log creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to create test log",
      },
      { status: 500 }
    );
  }
}
