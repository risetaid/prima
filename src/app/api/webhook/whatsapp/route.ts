import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  VerificationWebhookService,
  WebhookPayload,
} from "@/services/webhook/verification-webhook.service";
import {
  MessageProcessorService,
  MessageContext,
  ResponseAction,
} from "@/services/message-processor.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { PatientContextService } from "@/services/patient/patient-context.service";
import { ReminderService } from "@/services/reminder/reminder.service";
import { logger, LogValue } from "@/lib/logger";
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
 * Execute response actions from LLM processing
 */
async function executeResponseActions(
  actions: ResponseAction[],
  patientId: string,
  phoneNumber: string,
  message: string
): Promise<void> {
  const reminderService = new ReminderService();

  for (const action of actions) {
    try {
      switch (action.type) {
        case "log_confirmation":
          // Log the confirmation in reminders table
          try {
            const { db, reminders } = await import("@/db");
            const { eq, and } = await import("drizzle-orm");

            // Find the most recent reminder for this patient that needs confirmation
            const recentReminders = await db
              .select({
                id: reminders.id,
                confirmationStatus: reminders.confirmationStatus,
                sentAt: reminders.sentAt,
              })
              .from(reminders)
              .where(
                and(
                  eq(reminders.patientId, patientId),
                  eq(reminders.confirmationStatus, "PENDING")
                )
              )
              .orderBy(reminders.sentAt)
              .limit(5); // Get last 5 pending confirmations

            if (recentReminders.length > 0) {
              // Update the most recent pending confirmation
              const reminderToUpdate =
                recentReminders[recentReminders.length - 1]; // Most recent

              const status = (action.data.status as string) || "CONFIRMED";
              const validStatuses = ["CONFIRMED", "MISSED", "PENDING"] as const;
              const confirmationStatus = validStatuses.includes(
                status as (typeof validStatuses)[number]
              )
                ? (status as "CONFIRMED" | "MISSED" | "PENDING")
                : "CONFIRMED";

              await db
                .update(reminders)
                .set({
                  confirmationStatus,
                  confirmationResponse:
                    (action.data.response as string) || message,
                  confirmationResponseAt: new Date(),
                })
                .where(eq(reminders.id, reminderToUpdate.id));

              logger.info("Confirmation logged in database", {
                patientId,
                reminderId: reminderToUpdate.id,
                status: action.data.status || "CONFIRMED",
                response: action.data.response || message,
              });
            } else {
              logger.warn("No pending reminders found for confirmation", {
                patientId,
                actionData: action.data,
              });
            }
          } catch (dbError) {
            logger.error(
              "Failed to log confirmation in database",
              dbError as Error,
              {
                patientId,
                actionData: action.data,
              }
            );
          }
          break;

        case "send_followup":
          // Schedule a follow-up reminder
          if (action.data.type === "reminder" && action.data.delay) {
            const delay =
              typeof action.data.delay === "number"
                ? action.data.delay
                : parseInt(String(action.data.delay));
            const followUpTime = new Date(Date.now() + delay);

            // Create a follow-up reminder schedule
            const followUpReminders = await reminderService.createReminder({
              patientId,
              message: `⏰ Pengingat Susulan\n\nHalo! Kami ingin memastikan Anda sudah menyelesaikan rutinitas kesehatan sebelumnya.\n\nBalas SUDAH atau BELUM.\n\n💙 Tim PRIMA`,
              time: followUpTime.toTimeString().split(" ")[0], // HH:MM:SS format
              selectedDates: [followUpTime.toISOString().split("T")[0]], // Today's date
              createdById: "system", // System-generated reminder
            });

            const followUpReminder = followUpReminders?.[0];
            logger.info("Follow-up reminder scheduled", {
              patientId,
              followUpTime: followUpTime.toISOString(),
              delay,
              reminderId: followUpReminder?.id,
            });
          }
          break;

        case "notify_volunteer":
          // This would notify volunteers - for now just log
          logger.warn("Volunteer notification required", {
            patientId,
            priority: action.data.priority || "medium",
            message: action.data.message || message,
            reason: action.data.reason || "llm_recommendation",
          });
          // Volunteer notification system would integrate with volunteer management
          break;

        case "update_patient_status":
          // Update patient status
          if (action.data.status) {
            // This would update patient status in database
            logger.info("Patient status update requested", {
              patientId,
              newStatus: action.data.status,
            });
            // Patient status update would update patient record in database
          }
          break;

        case "create_manual_confirmation":
          // Create manual confirmation record
          logger.info("Manual confirmation requested", {
            patientId,
            reminderLogId: action.data.reminderLogId as LogValue,
            volunteerId: action.data.volunteerId as LogValue,
          });
          // Manual confirmation creation would create reminder confirmation record
          break;

        default:
          logger.warn("Unknown action type", {
            actionType: action.type,
            patientId,
          });
      }
    } catch (error) {
      logger.error("Failed to execute response action", error as Error, {
        actionType: action.type,
        patientId,
      });
    }
  }
}

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

        // Step 5.3: Execute response actions (follow-up reminders, logging, etc.)
        if (
          llmResult.response.actions &&
          llmResult.response.actions.length > 0
        ) {
          try {
            await executeResponseActions(
              llmResult.response.actions,
              llmResult.context.patientId || "unknown",
              validatedData.sender,
              validatedData.message
            );
            logger.info("Response actions executed", {
              patientId: llmResult.context.patientId || "unknown",
              actionCount: llmResult.response.actions.length,
            });
          } catch (actionError) {
            logger.error(
              "Failed to execute response actions",
              actionError as Error,
              {
                patientId: llmResult.context.patientId || "unknown",
                actionCount: llmResult.response.actions.length,
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
    message: "WhatsApp webhook is operational",
    mode,
    timestamp: new Date().toISOString(),
    service: "verification-webhook",
  });
}
