import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { VerificationWebhookService } from "@/services/webhook/verification-webhook.service";

// Process WhatsApp verification responses from patients
export async function POST(request: NextRequest) {
  console.log(`🔍 WEBHOOK: Incoming POST request to verification-response`);

  try {
    // Check content type
    const contentType = request.headers.get("content-type") || "";
    console.log(`📦 WEBHOOK: Content-Type: "${contentType}"`);

    let parsedBody: any;

    if (contentType.includes("application/json")) {
      // Handle JSON payload
      const rawBody = await request.text();
      console.log(`📦 WEBHOOK: Raw body length: ${rawBody.length}`);
      console.log(`📦 WEBHOOK: Raw body content: "${rawBody}"`);

      try {
        parsedBody = JSON.parse(rawBody);
        console.log(`✅ WEBHOOK: JSON parsed successfully`);
        console.log(`📋 WEBHOOK: Parsed data:`, parsedBody);
      } catch (parseError) {
        console.error(`❌ WEBHOOK: Failed to parse JSON body`, parseError);
        console.error(`❌ WEBHOOK: Raw body was: "${rawBody}"`);
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
            rawBody: rawBody.substring(0, 500), // Log first 500 chars
          }
        );
        return NextResponse.json(
          {
            error: "Invalid JSON body",
            details:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            rawBody: rawBody.substring(0, 200), // Include part of raw body for debugging
          },
          { status: 400 }
        );
      }
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      // Handle form data
      console.log(`📦 WEBHOOK: Handling as form data`);
      const formData = await request.formData();
      parsedBody = {};
      for (const [key, value] of formData.entries()) {
        parsedBody[key] = value;
      }
      console.log(`✅ WEBHOOK: Form data parsed successfully`);
      console.log(`📋 WEBHOOK: Parsed data:`, parsedBody);
    } else {
      // Try to parse as JSON anyway (fallback)
      console.log(`📦 WEBHOOK: Unknown content type, trying JSON fallback`);
      const rawBody = await request.text();
      console.log(`📦 WEBHOOK: Raw body length: ${rawBody.length}`);
      console.log(`📦 WEBHOOK: Raw body content: "${rawBody}"`);

      try {
        parsedBody = JSON.parse(rawBody);
        console.log(`✅ WEBHOOK: JSON fallback parsed successfully`);
        console.log(`📋 WEBHOOK: Parsed data:`, parsedBody);
      } catch (parseError) {
        console.error(`❌ WEBHOOK: All parsing methods failed`);
        console.error(`❌ WEBHOOK: Raw body was: "${rawBody}"`);
        return NextResponse.json(
          {
            error: "Unsupported content type and invalid body",
            contentType,
            rawBody: rawBody.substring(0, 200),
          },
          { status: 400 }
        );
      }
    }

    // Extract Fonnte webhook data
    const { device, sender, message, name } = parsedBody;
    console.log(`📱 WEBHOOK: From ${sender}: "${message}" (device: ${device})`);

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

    console.log(
      `📋 WEBHOOK: Processing result: ${
        result.success ? "SUCCESS" : "FAILED"
      } - ${result.message}`
    );

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
  const message = searchParams.get("message") || "YA";
  const sender = searchParams.get("sender");

  if (test === "true") {
    console.log(`🧪 TEST: Initiating webhook test with message: "${message}"`);

    // Use provided sender or default test number
    const testSender = sender || "6281333852187";

    // Simulate incoming webhook response
    const mockWebhook = {
      device: "628594257362",
      sender: testSender,
      message: message,
      name: "Test Patient",
    };

    console.log(
      `📱 TEST: Mock webhook - sender: ${testSender}, message: "${message}"`
    );

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
    test: {
      usage: "Add ?test=true to simulate patient response",
      parameters: {
        message: "Message to test (default: 'YA')",
        sender: "Phone number to test with (optional)",
      },
      examples: [
        "/api/webhooks/verification-response?test=true",
        "/api/webhooks/verification-response?test=true&message=BERHENTI",
        "/api/webhooks/verification-response?test=true&message=YA&sender=6281234567890",
      ],
    },
    timestamp: new Date().toISOString(),
  });
}
