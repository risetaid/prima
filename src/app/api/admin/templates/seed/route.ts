import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, whatsappTemplates } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Template data (same as in seed script)
interface TemplateData {
  templateName: string;
  templateText: string;
  variables: string[];
  category: "REMINDER" | "APPOINTMENT" | "EDUCATIONAL";
}

const messageTemplates: TemplateData[] = [
  // REMINDER TEMPLATES - General health reminders
  {
    templateName: "pengingat-pagi",
    templateText:
      "Selamat pagi {nama}! 🌅 Saatnya menjalani rutinitas kesehatan harian. Semangat menjalani hari! 💪✨",
    variables: ["{nama}"],
    category: "REMINDER",
  },
  {
    templateName: "pengingat-siang",
    templateText:
      "Halo {nama}! ☀️ Jangan lupa menjalankan rutinitas kesehatan jam {waktu}. Tetap semangat! 💪",
    variables: ["{nama}", "{waktu}"],
    category: "REMINDER",
  },
  {
    templateName: "pengingat-malam",
    templateText:
      "Selamat malam {nama}! 🌙 Waktunya istirahat yang cukup. Jaga kesehatan Anda! 😴",
    variables: ["{nama}"],
    category: "REMINDER",
  },
  {
    templateName: "pengingat-makan-sehat",
    templateText:
      "Hai {nama}! Pastikan makan makanan sehat dan bergizi untuk menjaga kesehatan! 🍽️💚",
    variables: ["{nama}"],
    category: "REMINDER",
  },
  {
    templateName: "pengingat-minum-air",
    templateText:
      "Halo {nama}! Ingat minum air putih minimal 8 gelas sehari. Air membantu kesehatan bekerja lebih baik! 💧✨",
    variables: ["{nama}"],
    category: "REMINDER",
  },

  // APPOINTMENT TEMPLATES - Medical appointments & tests
  {
    templateName: "kontrol-dokter-besok",
    templateText:
      "Hai {nama}! Besok {tanggal} jam {waktu} kontrol ke Dr. {dokter} di {rumahSakit}. Siapkan kartu BPJS & catatan keluhan ya! 🏥📋",
    variables: ["{nama}", "{dokter}", "{tanggal}", "{waktu}", "{rumahSakit}"],
    category: "APPOINTMENT",
  },
  {
    templateName: "kontrol-dokter-hari-ini",
    templateText:
      "Selamat pagi {nama}! Hari ini jam {waktu} kontrol ke Dr. {dokter} di {rumahSakit}. Jangan lupa bawa kartu & hasil lab! 🩺",
    variables: ["{nama}", "{dokter}", "{waktu}", "{rumahSakit}"],
    category: "APPOINTMENT",
  },
  {
    templateName: "persiapan-lab-test",
    templateText:
      "Halo {nama}! Besok {tanggal} jam {waktu} cek lab di {rumahSakit}. PENTING: Puasa 12 jam sebelumnya. Boleh minum air putih! 🔬",
    variables: ["{nama}", "{tanggal}", "{waktu}", "{rumahSakit}"],
    category: "APPOINTMENT",
  },
  {
    templateName: "reminder-bawa-dokumen",
    templateText:
      "Hai {nama}! Saat kontrol nanti, bawa semua dokumen kesehatan yang diperlukan untuk ditunjukkan ke dokter ya! 📋👨‍⚕️",
    variables: ["{nama}"],
    category: "APPOINTMENT",
  },
  {
    templateName: "konfirmasi-kunjungan",
    templateText:
      "Halo {nama}! {volunteer} akan berkunjung besok {tanggal} jam {waktu} untuk cek kondisi. Mohon disiapkan ya! 👩‍⚕️🏠",
    variables: ["{nama}", "{volunteer}", "{tanggal}", "{waktu}"],
    category: "APPOINTMENT",
  },

  // EDUCATIONAL TEMPLATES - Motivation & health tips
  {
    templateName: "motivasi-pagi",
    templateText:
      "Selamat pagi {nama}! 🌅 Setiap hari adalah kesempatan baru untuk sembuh. Tetap optimis & jaga kesehatan! 💪✨",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "tips-nutrisi-harian",
    templateText:
      "Halo {nama}! Tips hari ini: makan protein (telur, ikan), sayuran hijau, dan buah. Nutrisi baik = tubuh kuat! 🥗🍎",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "dukungan-semangat",
    templateText:
      "Hai {nama}! Ingat, kamu tidak sendirian dalam perjuangan ini. {volunteer} dan keluarga selalu mendukungmu. Tetap kuat! 🤗❤️",
    variables: ["{nama}", "{volunteer}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "tips-olahraga-ringan",
    templateText:
      "Halo {nama}! Coba jalan santai 15 menit atau stretching ringan. Olahraga meningkatkan mood & stamina! 🚶‍♀️💪",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "atasi-mual",
    templateText:
      "Hai {nama}! Kalau merasa mual, coba dengan biskuit atau air jahe hangat. Kalau terus berlanjut, hubungi dokter! 🫖",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "pentingnya-konsistensi",
    templateText:
      "Hai {nama}! Ingat: Konsistensi dalam menjaga kesehatan = kunci kesembuhan. Jangan skip rutinitas ya! Semangat terus! ⏰💚",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "istirahat-cukup",
    templateText:
      "Halo {nama}! Tidur 7-8 jam sangat penting untuk pemulihan. Tubuh perlu istirahat untuk melawan penyakit! 😴🌙",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "dukungan-keluarga",
    templateText:
      "Untuk keluarga {nama}: Terima kasih sudah setia mendampingi. Dukungan kalian sangat berarti! 👨‍👩‍👧‍👦💙",
    variables: ["{nama}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "kontak-darurat",
    templateText:
      "DARURAT {nama}! Jika ada keluhan serius, segera hubungi Dr. {dokter} di {rumahSakit} atau {volunteer} di {nomor}. Jangan tunda! 🚨📞",
    variables: ["{nama}", "{dokter}", "{rumahSakit}", "{volunteer}", "{nomor}"],
    category: "EDUCATIONAL",
  },
  {
    templateName: "konfirmasi-data",
    templateText:
      "Halo {nama}! Konfirmasi data: Kontrol ke Dr. {dokter} di {rumahSakit}. Jika ada yang salah, hubungi {volunteer}. ✅",
    variables: ["{nama}", "{dokter}", "{rumahSakit}", "{volunteer}"],
    category: "EDUCATIONAL",
  },
];

/**
 * Check if a template already exists (to avoid duplicates)
 */
async function templateExists(templateName: string): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: whatsappTemplates.id })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.templateName, templateName))
      .limit(1);

    return existing.length > 0;
  } catch {
    logger.warn(`⚠️  Error checking if template exists: ${templateName}`);
    return false;
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "DEVELOPER")) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    logger.info("🚀 Starting template seeding via API...");

    const createdTemplates = [];
    const skippedTemplates = [];

    for (const template of messageTemplates) {
      try {
        // Check if template already exists
        const exists = await templateExists(template.templateName);

        if (exists) {
          logger.info(
            `  ⏭️  Skipped (already exists): ${template.templateName}`
          );
          skippedTemplates.push(template.templateName);
          continue;
        }

        // Create template
        const result = await db
          .insert(whatsappTemplates)
          .values({
            templateName: template.templateName,
            templateText: template.templateText,
            variables: template.variables,
            category: template.category,
            isActive: true,
            createdBy: user.id,
          })
          .returning();

        createdTemplates.push(result[0]);
        logger.info(
          `  ✅ Created: ${template.templateName} (${template.category})`
        );
      } catch (error) {
        logger.warn(
          `  ⚠️  Failed to create template: ${template.templateName}`
        );
        logger.warn(
          `     Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    logger.info("✅ Template seeding completed via API!");

    return NextResponse.json({
      success: true,
      message: "Template seeding completed successfully!",
      stats: {
        created: createdTemplates.length,
        skipped: skippedTemplates.length,
        total: createdTemplates.length + skippedTemplates.length,
      },
      breakdown: {
        reminder: messageTemplates.filter((t) => t.category === "REMINDER")
          .length,
        appointment: messageTemplates.filter(
          (t) => t.category === "APPOINTMENT"
        ).length,
        educational: messageTemplates.filter(
          (t) => t.category === "EDUCATIONAL"
        ).length,
      },
    });
  } catch (error) {
    logger.error("💥 Template seeding failed", error as Error);
    return NextResponse.json(
      {
        error: "Failed to seed templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
