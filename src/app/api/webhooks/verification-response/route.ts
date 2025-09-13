import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { VerificationWebhookService } from "@/services/webhook/verification-webhook.service";
import { MessageProcessorService } from "@/services/message-processor.service";
import { ConversationStateService } from "@/services/conversation-state.service";
import { EnhancedVerificationService } from "@/services/verification/enhanced-verification.service";
import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { validateWebhookRequest } from "@/lib/fonnte";
import { RateLimiter, API_RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/rate-limiter";

// Process WhatsApp verification responses from patients
export async function POST(request: NextRequest) {
  console.log(`🔍 WEBHOOK: Incoming POST request to verification-response`);

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);

    // Apply rate limiting to prevent abuse
    const rateLimitResult = await RateLimiter.rateLimitMiddleware(clientIP, {
      ...API_RATE_LIMITS.WHATSAPP,
      keyPrefix: 'webhook:ip'
    });

    if (!rateLimitResult.allowed) {
      logger.security('Webhook rate limit exceeded', {
        ip: clientIP,
        headers: rateLimitResult.headers
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later."
        },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

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

    // Enhanced webhook security validation
    const signature = request.headers.get("x-fonnte-signature") || "";
    const timestamp = request.headers.get("x-fonnte-timestamp") || "";

    const validation = validateWebhookRequest(signature, parsedBody, timestamp);
    if (!validation.valid) {
      logger.security('Invalid webhook signature', {
        ip: clientIP,
        sender,
        error: validation.error,
        signature: signature.substring(0, 10) + '...', // Log partial signature for debugging
        timestamp
      });

      return NextResponse.json(
        {
          error: "Invalid webhook signature",
          message: validation.error
        },
        { status: 401 }
      );
    }

    // Apply phone number specific rate limiting
    if (sender) {
      const phoneRateLimit = await RateLimiter.checkRateLimit(sender, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 messages per minute per phone number
        keyPrefix: 'webhook:phone'
      });

      if (!phoneRateLimit.allowed) {
        logger.security('Phone number rate limit exceeded', {
          sender,
          ip: clientIP,
          totalRequests: phoneRateLimit.totalRequests,
          remaining: phoneRateLimit.remaining
        });

        return NextResponse.json(
          {
            error: "Rate limit exceeded for this phone number",
            message: "Too many messages from this number. Please wait before sending another message."
          },
          { status: 429 }
        );
      }
    }

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
      ip: clientIP,
      rateLimitRemaining: rateLimitResult.headers?.['X-RateLimit-Remaining']
    });

    // Process message with enhanced NLP and conversation state management
    const messageProcessor = new MessageProcessorService();
    const conversationService = new ConversationStateService();
    const enhancedVerificationService = new EnhancedVerificationService();
    const patientLookupService = new PatientLookupService();

    // Find or create patient by phone number
    const patientLookup = await patientLookupService.findOrCreatePatientForOnboarding(sender);
    if (!patientLookup.found || !patientLookup.patient) {
      logger.error('Failed to find or create patient', new Error(patientLookup.error || 'Unknown error'), {
        sender,
        error: patientLookup.error
      });
      return NextResponse.json(
        {
          error: "Patient lookup failed",
          message: "Unable to process message for this phone number"
        },
        { status: 400 }
      );
    }

    const patientId = patientLookup.patient.id;

    // Get or create conversation state
    const conversationState = await conversationService.getOrCreateConversationState(
      patientId,
      sender,
      'general_inquiry'
    );

    // Process message with NLP
    const messageContext = {
      patientId,
      phoneNumber: sender,
      message,
      timestamp: new Date(),
      conversationState,
    };

    const processedMessage = await messageProcessor.processMessage(messageContext);

    // Log the processed message
    await conversationService.addMessage(conversationState.id, {
      message,
      direction: 'inbound',
      messageType: 'general', // TODO: Map from processedMessage.intent
      intent: processedMessage.intent.primary,
      confidence: Math.round((processedMessage.confidence ?? 0) * 100),
      processedAt: new Date(),
    });

    // Handle verification responses with enhanced service
    let verificationResult = null;
    if (conversationState.currentContext === 'verification') {
      try {
        verificationResult = await enhancedVerificationService.processVerificationResponse(
          conversationState.id,
          message
        );
      } catch (error) {
        logger.error('Enhanced verification processing failed', error as Error, {
          conversationStateId: conversationState.id,
          message
        });
      }
    }

    // Update conversation state based on processed message
    let updatedConversationState = conversationState
    if (processedMessage.intent.primary !== 'unknown') {
      updatedConversationState = await conversationService.updateConversationState(conversationState.id, {
        currentContext: processedMessage.intent.primary === 'accept' || processedMessage.intent.primary === 'decline'
          ? 'verification'
          : processedMessage.intent.primary === 'confirm_taken' || processedMessage.intent.primary === 'confirm_missed' || processedMessage.intent.primary === 'confirm_later'
          ? 'reminder_confirmation'
          : processedMessage.intent.primary === 'emergency'
          ? 'emergency'
          : 'general_inquiry',
        expectedResponseType: processedMessage.intent.primary.includes('confirm')
          ? 'confirmation'
          : processedMessage.intent.primary === 'accept' || processedMessage.intent.primary === 'decline'
          ? 'yes_no'
          : 'text',
      });
    }

    // Use the legacy service for backward compatibility while we migrate
    const legacyService = new VerificationWebhookService();
    const legacyResult = await legacyService.processWebhook({
      device,
      sender,
      message,
      name,
    });

    // If context is verification (post-update), process enhanced verification
    if (updatedConversationState.currentContext === 'verification') {
      try {
        verificationResult = await enhancedVerificationService.processVerificationResponse(
          updatedConversationState.id,
          message
        );
      } catch (error) {
        logger.error('Enhanced verification processing failed', error as Error, {
          conversationStateId: updatedConversationState.id,
          message
        });
      }
    }

    // Combine results from both processing methods
    const result = {
      ...legacyResult,
      processedMessage,
      conversationStateId: updatedConversationState.id,
      verificationResult,
    };

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
