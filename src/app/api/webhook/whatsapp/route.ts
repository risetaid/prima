import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  VerificationWebhookService,
  WebhookPayload,
} from "@/services/webhook/verification-webhook.service";
import { SimpleMessageProcessorService } from "@/services/simple-message-processor.service";
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

    // Step 5: Process message with simple keyword-based processing
    let processingResult = null;
    let processingSuccess = false;

    try {
      // Get patient context first
      const patientContextService = new PatientContextService();
      const patientContextResult =
        await patientContextService.getPatientContext(validatedData.sender);

      if (!patientContextResult.found || !patientContextResult.context) {
        logger.warn("Patient context not found", {
          phoneNumber: validatedData.sender,
        });
      } else {
        const simpleProcessor = new SimpleMessageProcessorService();
        const messageContext = {
          patientId: patientContextResult.context.patient.id,
          phoneNumber: validatedData.sender,
          message: validatedData.message,
          timestamp: new Date(),
          verificationStatus: patientContextResult.context.patient.verificationStatus,
        };

        processingResult = await simpleProcessor.processMessage(messageContext);
        processingSuccess = processingResult.processed;

        logger.info("Simple message processing completed", {
          processed: processingResult.processed,
          type: processingResult.type,
          action: processingResult.action,
          message: processingResult.message.substring(0, 50),
        });

        // Step 5.1: Send response if message was processed
        if (processingResult.processed && processingResult.message) {
          try {
            const whatsAppService = new WhatsAppService();
            await whatsAppService.sendPersonalizedResponse(
              validatedData.sender,
              patientContextResult.context.patient.name || "Pasien",
              processingResult.type,
              processingResult.message
            );
            logger.info("Simple response sent", {
              phoneNumber: validatedData.sender,
              type: processingResult.type,
              action: processingResult.action,
              responseLength: processingResult.message.length,
            });
          } catch (sendError) {
            logger.error(
              "Failed to send simple response",
              sendError as Error,
              {
                phoneNumber: validatedData.sender,
                type: processingResult.type,
              }
            );
          }
        }
      }
    } catch (error) {
      logger.warn("Simple processing failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      processingSuccess = false;
    }

    // Step 6: Process through verification webhook service ONLY if simple processing didn't handle it
    let result;
    if (processingSuccess) {
      // Simple processing succeeded, return success
      result = {
        success: true,
        message: "Message processed successfully",
        patientId: processingResult ? "processed" : "unknown",
        result: "simple_processed",
        status: 200,
      };
    } else {
      // Simple processing didn't handle it, fall back to verification service
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
      usedSimpleProcessing: true,
      processingType: processingResult?.type || "unknown",
      processingAction: processingResult?.action || "none",
    });

    // Step 8: Return appropriate response
    if (result.success) {
      const responseData: {
        success: boolean;
        message: string;
        patientId: string | null | undefined;
        result: string | undefined;
        processingTimeMs: number;
        processingType?: string;
        processingAction?: string;
        processedMessage?: boolean;
        responseMessage?: string;
      } = {
        success: true,
        message: result.message,
        patientId: result.patientId ?? null,
        result: result.result ?? '',
        processingTimeMs: processingTime,
      };

      // Include processing results if available
      if (processingResult) {
        responseData.processingType = processingResult.type;
        responseData.processingAction = processingResult.action;
        responseData.processedMessage = processingResult.processed;

        // Include response message if processed
        if (processingResult.processed) {
          responseData.responseMessage = processingResult.message;
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
    message: "WhatsApp webhook is operational",
    mode,
    timestamp: new Date().toISOString(),
    service: "verification-webhook",
  });
}
