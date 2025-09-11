import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { VerificationWebhookService } from "@/services/webhook/verification-webhook.service";

// Process WhatsApp verification responses from patients
export async function POST(request: NextRequest) {
  try {
    // Get raw body first
    const rawBody = await request.text();

    // Try to parse as JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error(
        "Failed to parse verification webhook body",
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError)),
        {
          api: true,
          webhooks: true,
          verification: true,
          operation: "parse_webhook_body",
          bodyLength: rawBody.length,
        }
      );
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Extract Fonnte webhook data
    const { device, sender, message, name } = parsedBody;

    // Log incoming webhook for debugging
    logger.info("Patient verification response webhook received", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "webhook_received",
      device,
      sender,
      messageLength: message?.length,
      name,
    });

    // Use the centralized service to process the webhook
    const service = new VerificationWebhookService();
    const result = await service.processWebhook({
      device,
      sender,
      message,
      name,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        ...(result.patientId && { patientId: result.patientId }),
        ...(result.result && { result: result.result }),
      },
      { status: result.status || 200 }
    );
  } catch (error) {
    logger.error(
      "Patient verification response webhook error",
      error instanceof Error ? error : new Error(String(error)),
      {
        api: true,
        webhooks: true,
        verification: true,
        operation: "webhook_processing",
      }
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint for testing webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get("test");

  if (test === "true") {
    // Simulate incoming webhook response
    const mockWebhook = {
      device: "628594257362",
      sender: "6281333852187", // This should match patient phone in database
      message: "YA", // Test positive response
      name: "Test Patient",
    };

    logger.info("Test verification webhook initiated", {
      api: true,
      webhooks: true,
      verification: true,
      operation: "test_webhook",
      mockData: mockWebhook,
    });

    // Process the mock webhook
    const mockRequest = new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mockWebhook),
    });

    // Call POST handler with mock data
    return POST(mockRequest as NextRequest);
  }

  return NextResponse.json({
    message: "Verification Response Webhook Endpoint",
    endpoint: "/api/webhooks/verification-response",
    methods: ["POST", "GET"],
    test: "Add ?test=true to simulate patient response",
    timestamp: new Date().toISOString(),
  });
}

