import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  VerificationWebhookService,
  WebhookPayload,
} from "@/services/webhook/verification-webhook.service";
import {
  MessageProcessorService,
  MessageContext,
} from "@/services/message-processor.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { PatientContextService } from "@/services/patient/patient-context.service";
import { logger } from "@/lib/logger";
import { requireWebhookToken } from "@/lib/webhook-auth";

// Validation schema for WhatsApp webhook payload
const WhatsAppWebhookSchema = z.object({
  sender: z.string().min(1, "Sender is required"),
  message: z.string().min(1, "Message is required"),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

// Type for validated webhook data
type ValidatedWebhookData = z.infer<typeof WhatsAppWebhookSchema>;

/**
 * Production WhatsApp Webhook Route
 *
 * This route handles incoming WhatsApp messages and processes them through
 * the verification webhook service. It provides proper validation, error handling,
 * and logging for all incoming messages.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Step 1: Authenticate webhook request
    const authError = requireWebhookToken(request);
    if (authError) {
      logger.warn("WhatsApp webhook authentication failed", {
        ip:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
        url: request.url,
      });
      return authError;
    }

    // Step 2: Parse and validate request body
    const body = await request.json();
    logger.info("WhatsApp webhook received", {
      method: request.method,
      url: request.url,
      contentType: request.headers.get("content-type"),
      bodyKeys: Object.keys(body),
      hasSender: Boolean(body.sender),
      hasMessage: Boolean(body.message),
    });

    const validationResult = WhatsAppWebhookSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn("WhatsApp webhook validation failed", {
        errors: validationResult.error.issues,
        body: body,
      });
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const validatedData: ValidatedWebhookData = validationResult.data;

    // Step 3: Log incoming message details
    logger.info("Processing WhatsApp message", {
      sender: validatedData.sender,
      messageLength: validatedData.message.length,
      messagePreview:
        validatedData.message.substring(0, 100) +
        (validatedData.message.length > 100 ? "..." : ""),
      device: validatedData.device,
      messageId: validatedData.id,
      timestamp: validatedData.timestamp,
    });

    // Step 4: Prepare payload for verification service
    const webhookPayload: WebhookPayload = {
      device: validatedData.device || "unknown",
      sender: validatedData.sender,
      message: validatedData.message,
      name: validatedData.name,
    };

    // Step 5: Process message with LLM-based conversation handling
    let useLLM = true; // Feature flag for LLM processing
    let llmResult = null;
    let llmSuccess = false;

    if (useLLM) {
      try {
        // Get patient context first
        const patientContextService = new PatientContextService();
        const patientContextResult =
          await patientContextService.getPatientContext(validatedData.sender);

        const messageProcessor = new MessageProcessorService();
        const messageContext: MessageContext = {
          patientId: patientContextResult.context?.patient.id || "unknown",
          phoneNumber: validatedData.sender,
          message: validatedData.message,
          timestamp: new Date(),
          patientName: patientContextResult.context?.patient.name,
          verificationStatus:
            patientContextResult.context?.patient.verificationStatus,
          activeReminders: patientContextResult.context?.activeReminders,
          fullPatientContext: patientContextResult.context,
        };

        llmResult = await messageProcessor.processMessage(messageContext);
        llmSuccess = true;

        logger.info("LLM message processing successful", {
          intent: llmResult.intent.primary,
          confidence: llmResult.intent.confidence,
          requiresHumanIntervention: llmResult.requiresHumanIntervention,
          responseType: llmResult.response.type,
        });

        // Step 5.1: Send LLM-generated response if auto-reply is recommended
        if (
          llmResult.response.type === "auto_reply" &&
          llmResult.response.message
        ) {
          try {
            const whatsAppService = new WhatsAppService();
            await whatsAppService.sendPersonalizedResponse(
              validatedData.sender,
              llmResult.context.patientName || "Pasien",
              llmResult.intent.primary,
              llmResult.response.message
            );
            logger.info("LLM personalized response sent", {
              phoneNumber: validatedData.sender,
              intent: llmResult.intent.primary,
              responseLength: llmResult.response.message.length,
            });
          } catch (sendError) {
            logger.error(
              "Failed to send LLM personalized response",
              sendError as Error,
              {
                phoneNumber: validatedData.sender,
                intent: llmResult.intent.primary,
              }
            );
          }
        }

        // Step 5.2: Handle emergency situations
        if (llmResult.intent.primary === "emergency") {
          try {
            const whatsAppService = new WhatsAppService();
            await whatsAppService.sendEmergencyAlert(
              validatedData.sender,
              llmResult.context.patientName || "Pasien",
              validatedData.message,
              "urgent"
            );
            logger.warn("LLM emergency alert sent", {
              phoneNumber: validatedData.sender,
              message: validatedData.message,
            });
          } catch (alertError) {
            logger.error(
              "Failed to send LLM emergency alert",
              alertError as Error,
              {
                phoneNumber: validatedData.sender,
              }
            );
          }
        }
      } catch (error) {
        logger.warn("LLM processing failed, falling back to keyword-based", {
          error: error instanceof Error ? error.message : String(error),
        });
        useLLM = false;
        llmSuccess = false;
      }
    }

    // Step 6: Process through verification webhook service ONLY if LLM failed
    let result;
    if (llmSuccess) {
      // LLM succeeded, return success without calling verification service
      result = {
        success: true,
        message: "LLM processed successfully",
        patientId: llmResult?.context.patientId || "unknown",
        result: "llm_processed",
        status: 200,
      };
    } else {
      // LLM failed, fall back to verification service
      const verificationService = new VerificationWebhookService();
      result = await verificationService.processWebhook(webhookPayload);
    }

    // Step 7: Log processing result
    const processingTime = Date.now() - startTime;
    logger.info("WhatsApp webhook processed", {
      success: result.success,
      message: result.message,
      patientId: result.patientId,
      result: result.result,
      status: result.status,
      processingTimeMs: processingTime,
      usedLLM: useLLM,
      llmIntent: llmResult?.intent.primary,
      llmConfidence: llmResult?.intent.confidence,
    });

    // Step 8: Return appropriate response
    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData: any = {
        success: true,
        message: result.message,
        patientId: result.patientId,
        result: result.result,
        processingTimeMs: processingTime,
      };

      // Include LLM results if available
      if (llmResult) {
        responseData.llmIntent = llmResult.intent.primary;
        responseData.llmConfidence = llmResult.intent.confidence;
        responseData.requiresHumanIntervention =
          llmResult.requiresHumanIntervention;

        // Use LLM-generated response if confidence is high enough
        if (llmResult.intent.confidence && llmResult.intent.confidence >= 0.6) {
          responseData.llmResponse = llmResult.response.message;
          responseData.recommendedActions = llmResult.response.actions;
        }
      }

      return NextResponse.json(responseData, { status: result.status || 200 });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          processingTimeMs: processingTime,
        },
        { status: result.status || 400 }
      );
    }
  } catch (error) {
    // Step 8: Handle unexpected errors
    const processingTime = Date.now() - startTime;

    logger.error(
      "WhatsApp webhook processing error",
      error instanceof Error ? error : new Error(String(error)),
      {
        processingTimeMs: processingTime,
        url: request.url,
        method: request.method,
      }
    );

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        processingTimeMs: processingTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook health check and testing
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const authError = requireWebhookToken(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "status";

  logger.info("WhatsApp webhook health check", {
    mode,
    url: request.url,
  });

  return NextResponse.json({
    success: true,
    message: "WhatsApp webhook is operational",
    mode,
    timestamp: new Date().toISOString(),
    service: "verification-webhook",
  });
}
