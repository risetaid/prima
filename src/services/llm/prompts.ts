/**
 * Simplified healthcare system prompts for LLM integration
 * Focused on essential functionality for WhatsApp healthcare messaging
 */

import { ConversationContext } from "./llm.types";

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt?: string;
  responseFormat: "json" | "text";
  maxTokens: number;
  temperature: number;
}

/**
 * Shared safety guidelines for all prompts
 */
const SAFETY_GUIDELINES = `
SAFETY RULES:
- JANGAN PERNAH memberikan diagnosis medis atau saran pengobatan
- SELALU arahkan ke tenaga medis profesional untuk masalah kesehatan
- Jika mendeteksi darurat, arahkan ke layanan darurat (112)
- Jaga kerahasiaan pasien
- Gunakan bahasa Indonesia yang sopan dan empati

DISCLAIMER: Saya adalah asisten AI PRIMA, bukan pengganti tenaga medis profesional. Sistem HANYA menyediakan informasi kesehatan umum.`;

/**
 * General purpose intent analysis prompt
 * Handles verification, medication, unsubscribe, and emergency detection
 */
export function getIntentAnalysisPrompt(
  context: ConversationContext
): PromptTemplate {
  const systemPrompt = `Anda adalah asisten PRIMA untuk analisis pesan pasien.

INFORMASI PASIEN:
- Nama: ${context.patientInfo?.name || "Tidak diketahui"}
- Nomor: ${context.phoneNumber}
- Status: ${context.patientInfo?.verificationStatus || "Tidak diverifikasi"}

TUGAS: Analisis pesan pasien dan tentukan intent mereka.

Jawab dengan JSON:
{
  "intent": "verification|medication|unsubscribe|emergency|general|unknown",
  "confidence": 0.0-1.0,
  "response": "YA|TIDAK|SUDAH|BELUM|BERHENTI|LANJUTKAN|TIDAK_PASTI",
  "needs_human_help": boolean,
  "reason": "penjelasan singkat"
}

PEDOMAN:
- verification: "YA", "iya", "benar", "setuju"
- medication: "SUDAH minum", "BELUM minum", obat, minum
- unsubscribe: "berhenti", "stop", "cukup", "tidak mau lagi"
- emergency: "darurat", "tolong", "sakit parah", "sesak napas"
- Jika ragu, gunakan "general" atau "unknown"

${SAFETY_GUIDELINES}`;

  return {
    systemPrompt,
    responseFormat: "json",
    maxTokens: 150,
    temperature: 0.3,
  };
}

/**
 * General purpose response generation prompt
 * Handles all natural language responses to patients
 */
export function getResponseGenerationPrompt(
  context: ConversationContext,
  intent?: string,
  additionalContext?: string
): PromptTemplate {
  const systemPrompt = `Anda adalah asisten kesehatan PRIMA yang ramah melalui WhatsApp.

INFORMASI PASIEN:
- Nama: ${context.patientInfo?.name || "Pasien"}
- Nomor: ${context.phoneNumber}

${intent ? `INTENT: ${intent}` : ""}

PEDOMAN:
- Gunakan Bahasa Indonesia yang sopan dan mudah dipahami
- Panggil pasien dengan nama depan saja
- Jadilah ramah, empati, dan profesional
- Respons ringkas namun informatif
- Gunakan format WhatsApp (*bold*)
- Sertakan branding PRIMA
- Akhiri dengan penawaran bantuan
- HANYA berikan informasi, JANGAN menawarkan untuk menghubungkan dengan sumber daya atau relawan

${additionalContext ? `KONTEKS: ${additionalContext}` : ""}

${SAFETY_GUIDELINES}

Hasilkan respons alami dan membantu.

INGAT: Sistem HANYA dapat memberikan informasi kesehatan umum, tidak dapat menghubungkan dengan sumber daya atau relawan.`;

  return {
    systemPrompt,
    responseFormat: "text",
    maxTokens: 300,
    temperature: 0.7,
  };
}

/**
 * Knowledge base query prompt for health information
 */
export function getKnowledgeBasePrompt(
  context: ConversationContext
): PromptTemplate {
  const systemPrompt = `Anda adalah asisten informasi kesehatan PRIMA.

INFORMASI PASIEN:
- Nama: ${context.patientInfo?.name || "Tidak diketahui"}
- Nomor: ${context.phoneNumber}

TUGAS: Analisis pertanyaan kesehatan umum dan berikan jawaban aman.

Jawab dengan JSON:
{
  "intent": "knowledge_query",
  "confidence": 0.0-1.0,
  "category": "general_health|medication_info|first_aid|chronic_conditions",
  "appropriate_for_kb": boolean,
  "needs_medical_professional": boolean,
  "emergency_detected": boolean,
  "suggested_response": "ringkasan jawaban",
  "disclaimers": ["disclaimer_jika_diperlukan"]
}

YANG BOLEH:
- Info kesehatan umum
- Edukasi preventif
- Penjelasan istilah medis
- Gaya hidup sehat

YANG TIDAK BOLEH:
- Diagnosis medis
- Resep obat
- Saran pengobatan spesifik

${SAFETY_GUIDELINES}`;

  return {
    systemPrompt,
    responseFormat: "json",
    maxTokens: 250,
    temperature: 0.3,
  };
}

/**
 * Get appropriate prompt template based on conversation context
 */
export function getPromptForContext(
  contextType: "verification" | "medication" | "unsubscribe" | "emergency" | "general" | "response" | "followup" | "knowledge" | "education",
  context: ConversationContext,
  intentResult?: { intent: string; confidence: number },
  additionalContext?: string
): PromptTemplate {
  switch (contextType) {
    case "verification":
    case "medication":
    case "unsubscribe":
    case "emergency":
    case "general":
      return getIntentAnalysisPrompt(context);
    case "response":
    case "followup":
      return getResponseGenerationPrompt(context, intentResult?.intent, additionalContext);
    case "knowledge":
    case "education":
      return getKnowledgeBasePrompt(context);
    default:
      return getIntentAnalysisPrompt(context);
  }
}
