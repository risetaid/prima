import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("🔍 TEST WEBHOOK RECEIVED", {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
    });

    return NextResponse.json({
      success: true,
      message: "Test webhook received successfully",
      receivedAt: new Date().toISOString(),
      bodyKeys: Object.keys(body || {}),
      sender: body?.sender || body?.phone || body?.from,
      message: body?.message || body?.text || body?.body,
    });

  } catch (error) {
    console.error("🔍 TEST WEBHOOK ERROR", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Test webhook endpoint is working",
    timestamp: new Date().toISOString(),
    method: "GET"
  });
}