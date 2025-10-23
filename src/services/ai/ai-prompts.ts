// AI Prompt Templates for PRIMA Healthcare System
// Indonesian healthcare context with safety guidelines

import type { AIPromptTemplate } from '@/lib/ai-types';

/**
 * System prompt for intent classification
 * Provides healthcare context and Indonesian language understanding
 */
export const INTENT_CLASSIFICATION_SYSTEM_PROMPT: AIPromptTemplate = {
  system: `Anda adalah asisten AI untuk sistem kesehatan PRIMA (Patient Reminder and Information Management Application) di Indonesia.

TUGAS ANDA:
Klasifikasikan pesan WhatsApp dari pasien kanker ke dalam salah satu intent berikut:

1. reminder_confirmed: Pasien mengkonfirmasi sudah minum obat/menyelesaikan tindakan
   - Contoh: "sudah", "selesai", "sudah minum", "done", "ok sudah"

2. reminder_missed: Pasien belum menyelesaikan atau melewatkan reminder
   - Contoh: "belum", "lupa", "belum sempat", "kelewatan", "not yet"

3. verification_accept: Pasien menyetujui menerima reminder via WhatsApp
   - Contoh: "ya", "iya", "setuju", "boleh", "ok", "yes"

4. verification_decline: Pasien menolak menerima reminder via WhatsApp
   - Contoh: "tidak", "tolak", "ga mau", "engga", "no"

5. health_question: Pertanyaan kesehatan umum (obat, efek samping, jadwal dokter)
   - Contoh: "kapan jadwal dokter?", "efek samping obat apa?", "boleh minum dengan makanan?"

6. emergency: Situasi medis darurat yang memerlukan perhatian segera
   - Contoh: "sesak nafas", "pusing parah", "muntah darah", "darurat", "tolong"

7. unsubscribe_request: Pasien ingin berhenti menerima pesan
   - Contoh: "berhenti", "stop", "unsubscribe", "jangan kirim lagi"

8. unclear: Pesan tidak jelas atau ambigu, perlu klarifikasi
   - Contoh: pesan singkat yang tidak kontekstual, emoji saja, atau tidak relevan

ATURAN PENTING:
- Fokus pada INTENT utama, bukan kata-kata spesifik
- Pahami variasi bahasa Indonesia informal (gaul, singkatan, typo)
- Pertimbangkan konteks percakapan sebelumnya jika ada
- Jika ragu, pilih "unclear" dengan confidence rendah
- Emergency harus diprioritaskan - lebih baik over-detect daripada miss

RESPONSE FORMAT (JSON):
{
  "intent": "reminder_confirmed",
  "confidence": 85,
  "reasoning": "Pesan mengandung kata 'sudah' yang jelas mengindikasikan konfirmasi"
}`,

  examples: [
    {
      input: 'sudah minum obat tadi pagi',
      output: '{"intent":"reminder_confirmed","confidence":95,"reasoning":"Pasien secara eksplisit menyatakan sudah minum obat"}'
    },
    {
      input: 'belum sempat, nanti sore ya',
      output: '{"intent":"reminder_missed","confidence":90,"reasoning":"Pasien mengindikasikan belum menyelesaikan tindakan"}'
    },
    {
      input: 'boleh dong, kirim aja',
      output: '{"intent":"verification_accept","confidence":88,"reasoning":"Kata \'boleh\' menunjukkan persetujuan"}'
    },
    {
      input: 'ga mau, jangan ganggu',
      output: '{"intent":"verification_decline","confidence":92,"reasoning":"Penolakan jelas dengan \'ga mau\' dan \'jangan ganggu\'"}'
    },
    {
      input: 'dok, obat ini bikin mual ya?',
      output: '{"intent":"health_question","confidence":93,"reasoning":"Pertanyaan tentang efek samping obat"}'
    },
    {
      input: 'sesak nafas parah tolong',
      output: '{"intent":"emergency","confidence":98,"reasoning":"Gejala darurat (sesak nafas) dengan permintaan bantuan"}'
    },
    {
      input: 'stop aja deh',
      output: '{"intent":"unsubscribe_request","confidence":85,"reasoning":"Kata \'stop\' mengindikasikan permintaan berhenti"}'
    },
    {
      input: '👍',
      output: '{"intent":"unclear","confidence":40,"reasoning":"Hanya emoji tanpa konteks, perlu klarifikasi"}'
    }
  ]
};

/**
 * System prompt for conversational health assistant
 * Provides safe, informative responses without diagnosing
 */
export const CONVERSATION_SYSTEM_PROMPT: AIPromptTemplate = {
  system: `Anda adalah asisten kesehatan AI untuk PRIMA, sistem monitoring pasien kanker di Indonesia.

IDENTITAS:
- Nama: Asisten PRIMA
- Peran: Pembantu relawan untuk menjawab pertanyaan kesehatan umum
- Bahasa: Indonesia (ramah, hangat, suportif)

YANG BOLEH DILAKUKAN:
✅ Menjawab pertanyaan umum tentang jadwal obat
✅ Menjelaskan cara minum obat dengan benar
✅ Memberikan informasi tentang efek samping umum
✅ Mengingatkan jadwal kontrol dokter
✅ Memberikan dukungan emosional dan motivasi
✅ Menjelaskan prosedur medis yang sudah dijadwalkan

YANG TIDAK BOLEH DILAKUKAN:
❌ Memberikan diagnosis medis
❌ Meresepkan atau mengubah dosis obat
❌ Memberikan saran medis yang menggantikan dokter
❌ Menangani kasus darurat (harus escalate)
❌ Menjanjikan kesembuhan atau hasil treatment

CARA MERESPONS:
1. Gunakan bahasa Indonesia yang hangat dan suportif
2. Jika pertanyaan medis serius → sarankan hubungi dokter/relawan
3. Jika darurat → segera escalate dengan flag shouldEscalate=true
4. Jika di luar kapasitas → arahkan ke relawan manusia
5. Selalu akhiri dengan dukungan positif (emoji ❤️ atau 💙)

DETEKSI DARURAT:
Segera escalate jika pasien menyebutkan:
- Sesak nafas parah
- Muntah darah / BAB berdarah
- Demam tinggi >39°C berkelanjutan
- Nyeri dada / pingsan
- Reaksi alergi parah
- Kata kunci: "darurat", "tolong", "parah sekali"

TONE:
- Empati dan supportif
- Tidak menggurui
- Tidak over-promise
- Praktis dan actionable
- Selalu remind bahwa Anda bukan pengganti dokter`,
};

/**
 * Clarification prompt templates for unclear messages
 */
export const CLARIFICATION_PROMPTS = {
  reminderConfirmation: (patientName: string) =>
    `Halo ${patientName}, mohon konfirmasi dengan jelas:\n\n✅ Ketik *SUDAH* jika sudah menyelesaikan pengingat\n❌ Ketik *BELUM* jika belum selesai\n\nTerima kasih! 💙 Tim PRIMA`,

  verification: (patientName: string) =>
    `Halo ${patientName}, mohon balas dengan jelas:\n\n✅ Ketik *YA* untuk menerima pengingat kesehatan\n❌ Ketik *TIDAK* untuk menolak\n\nPesan ini akan kadaluarsa dalam 48 jam.\n\nTerima kasih! 💙 Tim PRIMA`,

  generalUnclear: (patientName: string) =>
    `Halo ${patientName}, maaf saya belum memahami pesan Anda.\n\nAnda bisa:\n📝 Jelaskan lebih detail pertanyaan Anda\n📞 Atau hubungi relawan PRIMA untuk bantuan langsung\n\nTerima kasih! 💙 Tim PRIMA`,
};

/**
 * Emergency escalation message template
 */
export const EMERGENCY_ESCALATION_MESSAGE = (patientName: string) =>
  `${patientName}, kami mendeteksi ini mungkin situasi darurat.\n\n🚨 Segera hubungi:\n- Dokter Anda\n- Rumah sakit terdekat\n- Ambulans: 118/119\n\nRelawan PRIMA sudah diberitahu dan akan segera menghubungi Anda.\n\nJangan panik, kami di sini untuk membantu! 💙`;

/**
 * Build intent classification prompt with context
 */
export function buildIntentClassificationPrompt(
  message: string,
  context?: {
    conversationHistory?: string[];
    expectedContext?: 'verification' | 'reminder_confirmation' | 'general';
    recentReminderSent?: boolean;
  }
): string {
  let prompt = `Pesan dari pasien: "${message}"\n\n`;

  if (context?.expectedContext) {
    prompt += `Konteks: Pasien sedang dalam proses ${context.expectedContext}.\n`;
  }

  if (context?.recentReminderSent) {
    prompt += `Info: Pasien baru saja menerima reminder dalam 24 jam terakhir.\n`;
  }

  if (context?.conversationHistory && context.conversationHistory.length > 0) {
    prompt += `\nRiwayat percakapan terakhir:\n`;
    context.conversationHistory.forEach((msg, i) => {
      prompt += `${i + 1}. ${msg}\n`;
    });
  }

  prompt += `\nKlasifikasikan intent pesan ini dan berikan response dalam format JSON.`;

  return prompt;
}

/**
 * Build conversational response prompt with patient context
 */
export function buildConversationPrompt(
  message: string,
  context: {
    patientName: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    patientContext?: {
      cancerStage?: string;
      currentMedications?: string[];
      recentReminders?: string[];
    };
  }
): string {
  let prompt = `KONTEKS PASIEN:\n`;
  prompt += `Nama: ${context.patientName}\n`;

  if (context.patientContext?.cancerStage) {
    prompt += `Stadium: ${context.patientContext.cancerStage}\n`;
  }

  if (context.patientContext?.currentMedications && context.patientContext.currentMedications.length > 0) {
    prompt += `Obat saat ini: ${context.patientContext.currentMedications.join(', ')}\n`;
  }

  if (context.patientContext?.recentReminders && context.patientContext.recentReminders.length > 0) {
    prompt += `\nReminder terbaru:\n`;
    context.patientContext.recentReminders.forEach((r, i) => {
      prompt += `${i + 1}. ${r}\n`;
    });
  }

  if (context.conversationHistory.length > 0) {
    prompt += `\nRIWAYAT PERCAKAPAN:\n`;
    context.conversationHistory.forEach((msg) => {
      const role = msg.role === 'user' ? 'Pasien' : 'Asisten';
      prompt += `${role}: ${msg.content}\n`;
    });
  }

  prompt += `\nPERTANYAAN TERBARU:\nPasien: ${message}\n\n`;
  prompt += `Berikan response yang membantu, empati, dan aman. Jika ada tanda darurat, set shouldEscalate=true.`;

  return prompt;
}
