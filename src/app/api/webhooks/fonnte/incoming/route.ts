import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWebhookToken } from "@/lib/webhook-auth";
import { isDuplicateEvent, hashFallbackId } from "@/lib/idempotency";
import {
  db,
  patients,
  verificationLogs,
  reminderSchedules,
  reminderLogs,
} from "@/db";
import { eq, and, desc } from "drizzle-orm";
import type { Patient, ReminderLog } from "@/db";

interface WebhookBody {
  sender?: string;
  phone?: string;
  from?: string;
  number?: string;
  wa_number?: string;
  message?: string;
  text?: string;
  body?: string;
  device?: string;
  gateway?: string;
  instance?: string;
  name?: string;
  sender_name?: string;
  contact_name?: string;
  id?: string;
  message_id?: string;
  msgId?: string;
  timestamp?: string | number;
  time?: string | number;
  created_at?: string | number;
  [key: string]: unknown;
}

import { PatientLookupService } from "@/services/patient/patient-lookup.service";
import { ConversationStateService } from "@/services/conversation-state.service";
import { logger } from "@/lib/logger";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";

const whatsappService = new WhatsAppService();

const IncomingSchema = z.object({
  sender: z.string().min(6),
  message: z.string().min(1),
  device: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

function normalizeIncoming(body: WebhookBody) {
  const sender =
    body.sender || body.phone || body.from || body.number || body.wa_number;
  const message = body.message || body.text || body.body;
  const device = body.device || body.gateway || body.instance;
  const name = body.name || body.sender_name || body.contact_name;
  const id = body.id || body.message_id || body.msgId;
  const timestamp = body.timestamp || body.time || body.created_at;

  const normalized = {
    sender,
    message,
    device,
    name,
    id,
    timestamp,
  };

  // Log normalization for debugging
  logger.info("Webhook normalization result", {
    sender: Boolean(sender),
    message: Boolean(message),
    originalKeys: Object.keys(body || {}),
    normalizedKeys: Object.keys(normalized).filter(
      (key) => normalized[key as keyof typeof normalized]
    ),
  });

  return normalized;
}

interface IntentResult {
  intent:
    | "accept"
    | "decline"
    | "unsubscribe"
    | "medication_taken"
    | "medication_pending"
    | "need_help"
    | "other";
  confidence: number;
  matchedWords: string[];
}

function detectIntentEnhanced(
  rawMessage: string,
  context?: "verification" | "medication"
): IntentResult {
  const msg = (rawMessage || "").toLowerCase().trim();
  const words = msg.split(/\s+/);

  // Enhanced Indonesian language patterns with weights
  const patterns = {
    accept: [
      // Direct acceptance
      { words: ["ya", "iya", "yaa", "iya", "yes", "yep", "yup"], weight: 10 },
      { words: ["setuju", "stuju", "setujuu"], weight: 10 },
      { words: ["boleh", "blh", "bole", "bolh"], weight: 9 },
      { words: ["baik", "bagus", "good"], weight: 8 },
      { words: ["ok", "oke", "okay", "okey", "okeh"], weight: 8 },
      { words: ["siap", "ready", "sip"], weight: 7 },
      { words: ["mau", "ingin", "pengen", "want"], weight: 7 },
      { words: ["terima", "accept", "trimakasih"], weight: 6 },
      // Phrases
      { words: ["ya boleh", "iya setuju", "ok siap"], weight: 12 },
    ],
    decline: [
      {
        words: ["tidak", "tdk", "gak", "ga", "engga", "enggak", "no", "nope"],
        weight: 10,
      },
      { words: ["tolak", "refuse", "nolak"], weight: 10 },
      { words: ["nanti", "besok", "later"], weight: 7 },
      { words: ["jangan", "dont", "stop"], weight: 8 },
      { words: ["maaf", "sorry", "sori"], weight: 6 },
      // Phrases
      { words: ["tidak mau", "ga mau", "tidak setuju"], weight: 12 },
    ],
    unsubscribe: [
      { words: ["berhenti", "stop", "cancel", "batal"], weight: 10 },
      { words: ["keluar", "out", "exit"], weight: 9 },
      { words: ["hapus", "delete", "remove"], weight: 9 },
      { words: ["unsubscribe", "unsub", "cabut"], weight: 10 },
    ],
    confirmation_taken: [
      { words: ["sudah", "udah", "done", "selesai"], weight: 10 },
      { words: ["sudah lakukan", "sudah selesai", "sudah dilakukan"], weight: 9 },
      { words: ["oke", "ok", "siap", "good"], weight: 7 },
      // Phrases
      { words: ["sudah selesai", "sudah lakukan", "sudah dilakukan"], weight: 15 },
      { words: ["sudah beres", "sudah selesai"], weight: 14 },
    ],
    confirmation_pending: [
      { words: ["belum", "not yet", "nanti"], weight: 10 },
      { words: ["sebentar", "tunggu", "wait"], weight: 8 },
      { words: ["lupa", "forgot", "lupaa"], weight: 9 },
      // Phrases
      { words: ["belum selesai", "belum lakukan"], weight: 14 },
      { words: ["nanti dulu", "sebentar lagi"], weight: 12 },
    ],
    need_help: [
      { words: ["bantuan", "help", "tolong"], weight: 10 },
      { words: ["bingung", "confused", "susah"], weight: 9 },
      { words: ["tanya", "ask", "pertanyaan"], weight: 8 },
      { words: ["relawan", "staff", "perawat"], weight: 8 },
      // Phrases
      { words: ["butuh bantuan", "perlu bantuan", "minta tolong"], weight: 15 },
    ],
  };

  let bestMatch: IntentResult = {
    intent: "other",
    confidence: 0,
    matchedWords: [],
  };

  for (const [intentKey, patternList] of Object.entries(patterns)) {
    const intent = intentKey as IntentResult['intent'];
    let totalScore = 0;
    const matchedWords: string[] = [];

    for (const pattern of patternList) {
      const patternWords = pattern.words.join(" ");

      // Check for full phrase match
      if (msg.includes(patternWords)) {
        totalScore += pattern.weight * 1.5; // Bonus for phrase match
        matchedWords.push(patternWords);
        continue;
      }

      // Check individual words
      for (const word of pattern.words) {
        if (words.includes(word) || msg.includes(word)) {
          totalScore += pattern.weight;
          matchedWords.push(word);
        }
      }
    }

    // Calculate confidence based on score and context
    let confidence = Math.min(totalScore / 10, 1); // Normalize to 0-1

    // Context bonus
    if (context === "verification" && ["accept", "decline"].includes(intent)) {
      confidence *= 1.2;
    } else if (
      context === "medication" &&
      ["medication_taken", "medication_pending", "need_help"].includes(intent)
    ) {
      confidence *= 1.2;
    }

    if (confidence > bestMatch.confidence) {
      bestMatch = {
        intent,
        confidence,
        matchedWords: [...new Set(matchedWords)],
      };
    }
  }

  return bestMatch;
}



async function sendAck(phoneNumber: string, message: string) {
  try {
    await whatsappService.sendAck(phoneNumber, message);
  } catch (e) {
    logger.warn("Failed to send ACK via WhatsApp", { error: e as Error });
  }
}

async function handleVerificationLowConfidence(patient: Patient) {
  await sendAck(
    patient.phoneNumber,
    `Halo ${patient.name}, mohon balas dengan jelas:\n\n✅ *YA* atau *SETUJU* untuk menerima pengingat\n❌ *TIDAK* atau *TOLAK* untuk menolak\n\nTerima kasih! 💙 Tim PRIMA`
  );
  return {
    processed: true,
    action: "clarification_requested",
    message: "Low confidence response - clarification sent",
  };
}

async function handleVerificationAccept(message: string, patient: Patient) {
  logger.info("Updating patient verification status to verified", {
    patientId: patient.id,
  });

  await db
    .update(patients)
    .set({
      verificationStatus: "verified",
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patient.id));

  await db.insert(verificationLogs).values({
    patientId: patient.id,
    action: "responded",
    patientResponse: message,
    verificationResult: "verified",
  });

  await sendAck(
    patient.phoneNumber,
    `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima pengingat obat dari relawan PRIMA.\n\nUntuk berhenti kapan saja, ketik: *BERHENTI*\n\n💙 Tim PRIMA`
  );

  return {
    processed: true,
    action: "verified",
    message: "Patient verified via text",
  };
}

async function handleVerificationDecline(message: string, patient: Patient) {
  logger.info("Updating patient verification status to declined", {
    patientId: patient.id,
  });

  await db
    .update(patients)
    .set({
      verificationStatus: "declined",
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(patients.id, patient.id));

  await db.insert(verificationLogs).values({
    patientId: patient.id,
    action: "responded",
    patientResponse: message,
    verificationResult: "declined",
  });

  await sendAck(
    patient.phoneNumber,
    `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏\n\n💙 Tim PRIMA`
  );

  return {
    processed: true,
    action: "declined",
    message: "Patient declined verification via text",
  };
}

async function handleVerificationUnsubscribe(message: string, patient: Patient) {
  logger.info("Processing unsubscribe request", { patientId: patient.id });

  await db
    .update(patients)
    .set({
      verificationStatus: "declined",
      verificationResponseAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
    })
    .where(eq(patients.id, patient.id));

  await db
    .update(reminderSchedules)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(reminderSchedules.patientId, patient.id));

  await db.insert(verificationLogs).values({
    patientId: patient.id,
    action: "responded",
    patientResponse: message,
    verificationResult: "unsubscribed",
  });

  await sendAck(
    patient.phoneNumber,
    `Baik ${patient.name}, kami akan berhenti mengirimkan pengingat. 🛑\n\nSemua pengingat obat telah dinonaktifkan.\n\nJika suatu saat ingin bergabung kembali, hubungi relawan PRIMA.\n\nSemoga sehat selalu! 🙏💙`
  );

  return {
    processed: true,
    action: "unsubscribed",
    message: "Patient unsubscribed",
  };
}

/**
 * Handle verification text responses using enhanced intent detection
 */
async function handleVerificationResponse(
  message: string,
  patient: Patient
): Promise<{ processed: boolean; action?: string; message?: string }> {
  const intentResult = detectIntentEnhanced(message, "verification");

  logger.info("Processing verification text response", {
    originalMessage: message,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    matchedWords: intentResult.matchedWords,
    patientId: patient.id,
  });

  if (intentResult.confidence < 0.4) {
    return handleVerificationLowConfidence(patient);
  }

  switch (intentResult.intent) {
    case "accept":
      return handleVerificationAccept(message, patient);
    case "decline":
      return handleVerificationDecline(message, patient);
    case "unsubscribe":
      return handleVerificationUnsubscribe(message, patient);
    default:
      return { processed: false };
  }
}

async function findPendingReminder(patientId: string) {
  return await db
    .select()
    .from(reminderLogs)
    .where(
      and(
        eq(reminderLogs.patientId, patientId),
        eq(reminderLogs.status, "SENT")
      )
    )
    .orderBy(desc(reminderLogs.sentAt))
    .limit(1);
}

async function handleMedicationLowConfidence(patient: Patient) {
  await sendAck(
    patient.phoneNumber,
    `Halo ${patient.name}, mohon balas dengan jelas:\n\n✅ *SUDAH* jika sudah minum obat\n⏰ *BELUM* jika belum minum\n🆘 *BANTUAN* jika butuh bantuan\n\nTerima kasih! 💙 Tim PRIMA`
  );
  return {
    processed: true,
    action: "clarification_requested",
    message: "Low confidence response - clarification sent",
  };
}

async function handleMedicationNoPendingReminder(message: string, patient: Patient) {
  const intentResult = detectIntentEnhanced(message, "medication");

  if (intentResult.intent !== "other" && intentResult.confidence > 0.5) {
    await sendAck(
      patient.phoneNumber,
      `Halo ${patient.name}, saat ini tidak ada pengingat obat yang menunggu konfirmasi.\n\nJika ada pertanyaan, hubungi relawan PRIMA.\n\n💙 Tim PRIMA`
    );
    return {
      processed: true,
      action: "no_pending_reminder",
      message: "Response without pending reminder",
    };
  }

  return { processed: false, message: "No pending reminder found" };
}

async function handleMedicationTaken(message: string, reminder: ReminderLog, patient: Patient) {
  await db
    .update(reminderLogs)
    .set({
      status: "DELIVERED",
      confirmationResponse: message,
    })
    .where(eq(reminderLogs.id, reminder.id));

  await sendAck(
    patient.phoneNumber,
    `Terima kasih ${
      patient.name
    }! ✅\n\nObat sudah dikonfirmasi diminum pada ${new Date().toLocaleTimeString(
      "id-ID",
      { timeZone: "Asia/Jakarta" }
    )}\n\n💙 Tim PRIMA`
  );

  return {
    processed: true,
    action: "confirmed",
    message: "Medication confirmed via text",
  };
}

async function handleMedicationPending(message: string, reminder: ReminderLog, patient: Patient) {
  await db
    .update(reminderLogs)
    .set({
      confirmationResponse: message,
    })
    .where(eq(reminderLogs.id, reminder.id));

  await sendAck(
    patient.phoneNumber,
    `Baik ${patient.name}, jangan lupa minum obatnya ya! 💊\n\nKami akan mengingatkan lagi nanti.\n\n💙 Tim PRIMA`
  );

  return {
    processed: true,
    action: "extended",
    message: "Medication reminder extended",
  };
}

async function handleMedicationHelp(message: string, reminder: ReminderLog, patient: Patient) {
  await db
    .update(reminderLogs)
    .set({
      confirmationResponse: message,
    })
    .where(eq(reminderLogs.id, reminder.id));

  await sendAck(
    patient.phoneNumber,
    `Baik ${patient.name}, relawan kami akan segera menghubungi Anda untuk membantu. 🤝\n\nTunggu sebentar ya!\n\n💙 Tim PRIMA`
  );

  logger.info("Patient requested help - escalating to relawan", {
    patientId: patient.id,
    reminderId: reminder.id,
  });

  return {
    processed: true,
    action: "escalated",
    message: "Medication reminder escalated to relawan",
  };
}

/**
 * Handle medication text responses using enhanced intent detection
 */
async function handleMedicationResponse(
  message: string,
  patient: Patient
): Promise<{ processed: boolean; action?: string; message?: string }> {
  const pendingReminder = await findPendingReminder(patient.id);

  if (!pendingReminder.length) {
    return handleMedicationNoPendingReminder(message, patient);
  }

  const reminder = pendingReminder[0];
  const intentResult = detectIntentEnhanced(message, "medication");

  logger.info("Processing medication text response", {
    originalMessage: message,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    matchedWords: intentResult.matchedWords,
    patientId: patient.id,
    reminderId: reminder.id,
  });

  if (intentResult.confidence < 0.4) {
    return handleMedicationLowConfidence(patient);
  }

  switch (intentResult.intent) {
    case "medication_taken":
      return handleMedicationTaken(message, reminder, patient);
    case "medication_pending":
      return handleMedicationPending(message, reminder, patient);
    case "need_help":
      return handleMedicationHelp(message, reminder, patient);
    default:
      return { processed: false };
  }
}

async function parseWebhookBody(request: NextRequest) {
  let parsed: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      parsed = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      form.forEach((v, k) => {
        parsed[k] = v;
      });
    } else {
      const text = await request.text();
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }
    }
  } catch {}
  return { parsed, contentType };
}

function logWebhookPayload(parsed: WebhookBody, request: NextRequest, contentType: string) {
  logger.info("Raw Fonnte webhook payload received", {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    contentType,
    headers: Object.fromEntries(request.headers.entries()),
    queryParams: Object.fromEntries(
      new URL(request.url).searchParams.entries()
    ),
    rawPayload: parsed,
    payloadKeys: Object.keys(parsed || {}),
    payloadValues: Object.entries(parsed || {}).reduce((acc, [key, value]) => {
      acc[key] =
        typeof value === "string"
          ? value.substring(0, 100) + (value.length > 100 ? "..." : "")
          : value;
      return acc;
    }, {} as Record<string, unknown>),
    messageFields: {
      message: Boolean(parsed.message),
      text: Boolean(parsed.text),
      body: Boolean(parsed.body),
      sender: Boolean(parsed.sender || parsed.phone || parsed.from),
      device: Boolean(parsed.device || parsed.gateway),
    },
  });
}

async function validateAndNormalizePayload(parsed: WebhookBody) {
  const normalized = normalizeIncoming(parsed);
  const result = IncomingSchema.safeParse(normalized);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: result.error.flatten() },
      { status: 400 }
    );
  }
  return result.data;
}

async function checkIdempotency(data: { id?: string; sender: string; timestamp?: string | number; message: string }) {
  const fallbackId = hashFallbackId([
    data.id,
    data.sender,
    String(data.timestamp || ""),
    data.message,
  ]);
  const idemKey = `webhook:fonnte:incoming:${fallbackId}`;
  if (await isDuplicateEvent(idemKey)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  return null;
}

async function findPatient(sender: string, parsed: WebhookBody) {
  const lookup = new PatientLookupService();
  const found = await lookup.findPatientByPhone(sender);
  if (!found.found || !found.patient) {
    logger.warn("Incoming webhook: no patient matched; ignoring", {
      sender,
      normalizedSender: sender,
      allPayloadFields: Object.keys(parsed || {}),
      senderFields: {
        sender: parsed.sender,
        phone: parsed.phone,
        from: parsed.from,
        number: parsed.number,
        wa_number: parsed.wa_number,
      },
    });
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "no_patient_match",
    });
  }
  return found.patient;
}

async function logConversation(patient: Patient, sender: string, message: string | undefined) {
  try {
    const conv = new ConversationStateService();
    const state = await conv.getOrCreateConversationState(
      patient.id,
      sender,
      "general_inquiry"
    );
    await conv.addMessage(state.id, {
      message: message || "",
      direction: "inbound",
      messageType: "general",
      intent: undefined,
      confidence: undefined,
      processedAt: new Date(),
    });
  } catch {}
}

async function processVerificationResponse(message: string | undefined, patient: Patient) {
  logger.info("Processing verification response", {
    patientId: patient.id,
    hasMessage: Boolean(message),
    message:
      message?.substring(0, 100) +
      (message && message.length > 100 ? "..." : ""),
  });

  try {
    const verificationResult = await handleVerificationResponse(message || "", patient);

    if (verificationResult.processed) {
      logger.info("Verification response processed successfully", {
        patientId: patient.id,
        action: verificationResult.action,
        message: verificationResult.message,
      });

      return NextResponse.json({
        ok: true,
        processed: true,
        action: verificationResult.action,
        source: "text_verification",
      });
    }
  } catch (error) {
    logger.error("Failed to process verification response", error as Error, {
      patientId: patient.id,
      message: message?.substring(0, 100),
    });
    return NextResponse.json(
      { error: "Internal error processing verification" },
      { status: 500 }
    );
  }
  return null;
}

async function processMedicationResponse(message: string | undefined, patient: Patient) {
  logger.info("Processing potential medication response", {
    patientId: patient.id,
    hasMessage: Boolean(message),
    message:
      message?.substring(0, 100) +
      (message && message.length > 100 ? "..." : ""),
  });

  try {
    const medicationResult = await handleMedicationResponse(message || "", patient);

    if (medicationResult.processed) {
      logger.info("Medication response processed successfully", {
        patientId: patient.id,
        action: medicationResult.action,
        message: medicationResult.message,
      });

      return NextResponse.json({
        ok: true,
        processed: true,
        action: medicationResult.action,
        source: "text_medication",
      });
    }
  } catch (error) {
    logger.error("Failed to process medication response", error as Error, {
      patientId: patient.id,
      message: message?.substring(0, 100),
    });
    return NextResponse.json(
      { error: "Internal error processing medication response" },
      { status: 500 }
    );
  }
  return null;
}

async function handleUnrecognizedMessage(message: string | undefined, patient: Patient) {
  logger.info("Message not processed by specific handlers", {
    patientId: patient.id,
    verificationStatus: patient.verificationStatus,
    messageLength: message?.length || 0,
    message:
      message?.substring(0, 50) + (message && message.length > 50 ? "..." : ""),
  });

  if (patient.verificationStatus === "pending_verification") {
    await sendAck(
      patient.phoneNumber,
      `Halo ${patient.name}, mohon balas pesan verifikasi dengan:\n\n✅ *YA* atau *SETUJU* untuk menerima pengingat\n❌ *TIDAK* atau *TOLAK* untuk menolak\n\nTerima kasih! 💙 Tim PRIMA`
    );
  } else if (patient.verificationStatus === "verified") {
    const intentResult = detectIntentEnhanced(message || "");
    if (intentResult.confidence > 0.3) {
      await sendAck(
        patient.phoneNumber,
        `Halo ${patient.name}, untuk konfirmasi obat, mohon balas dengan:\n\n✅ *SUDAH* jika sudah minum obat\n⏰ *BELUM* jika belum minum\n🆘 *BANTUAN* jika butuh bantuan\n\nTerima kasih! 💙 Tim PRIMA`
      );
    } else {
      await sendAck(
        patient.phoneNumber,
        `Halo ${patient.name}, terima kasih atas pesannya.\n\nJika ada pertanyaan tentang obat, hubungi relawan PRIMA.\n\n💙 Tim PRIMA`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;

  const { parsed, contentType } = await parseWebhookBody(request);
  logWebhookPayload(parsed, request, contentType);

  const validationResult = await validateAndNormalizePayload(parsed);
  if (validationResult instanceof NextResponse) return validationResult;

  const {
    sender,
    message,
    device,
    id,
    timestamp,
  } = validationResult;

  const duplicateCheck = await checkIdempotency({ id, sender, timestamp, message });
  if (duplicateCheck) return duplicateCheck;

  logger.info("Fonnte incoming webhook received", {
    sender,
    device,
    hasId: Boolean(id),
  });

  const patientResult = await findPatient(sender, parsed);
  if (patientResult instanceof NextResponse) return patientResult;
  const patient = patientResult as Patient;

  await logConversation(patient, sender, message || "");

  // PRIORITY 1: Check if patient is awaiting verification
  if (patient.verificationStatus === "pending_verification") {
    const result = await processVerificationResponse(message || "", patient);
    if (result) return result;
  }

  // PRIORITY 2: Check for medication responses (if patient is verified)
  if (patient.verificationStatus === "verified") {
    const result = await processMedicationResponse(message || "", patient);
    if (result) return result;
  }

  // FALLBACK: Handle unrecognized messages
  await handleUnrecognizedMessage(message || "", patient);

  return NextResponse.json({ ok: true, processed: true, action: "none" });
}

export async function GET(request: NextRequest) {
  const authError = requireWebhookToken(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "ping";
  return NextResponse.json({ ok: true, route: "fonnte/incoming", mode });
}
