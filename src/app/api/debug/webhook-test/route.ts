import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireWebhookToken } from "@/lib/webhook-auth";

export async function POST(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    logger.info("🔍 DEBUG WEBHOOK RECEIVED", {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      bodyKeys: Object.keys(body || {}),
      url: request.url,
      method: request.method,
    });

    // Log specific fields that are important for debugging
    if (body) {
      logger.info("📝 Webhook key fields", {
        sender: body.sender || body.phone || body.from,
        message: body.message || body.text || body.body,
        hasMessage: !!(body.message || body.text || body.body),
        device: body.device || body.gateway,
        id: body.id || body.message_id,
        timestamp: body.timestamp || body.time,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
      debug: true,
      receivedAt: new Date().toISOString(),
      bodyPreview: body ? {
        hasSender: !!(body.sender || body.phone || body.from),
        hasMessage: !!(body.message || body.text || body.body),
        sender: body.sender || body.phone || body.from,
        messagePreview: (body.message || body.text || body.body || "")?.substring(0, 50),
      } : null
    });

  } catch (error) {
    logger.error("🔍 DEBUG WEBHOOK ERROR", error as Error);
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

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;

  return NextResponse.json({
    success: true,
    message: "Debug webhook endpoint is working",
    timestamp: new Date().toISOString(),
    method: "GET"
  });
}