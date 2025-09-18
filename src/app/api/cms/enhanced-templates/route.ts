import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, cmsArticles, cmsVideos } from "@/db";
import { eq } from "drizzle-orm";
import { MedicationParser, MedicationDetails } from "@/lib/medication-parser";
import { z } from "zod";

// Enhanced reminder templates with CMS content integration
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Future: Add filtering by type and category from search params
    // const { searchParams } = new URL(request.url)
    // const type = searchParams.get('type') || 'all' // template, article, video, all

    // Enhanced template suggestions with medication variable support
    const enhancedTemplates = [
      {
        id: "medication_with_article",
        name: "Pengingat Obat + Artikel",
        category: "MEDICATION_EDUCATIONAL",
        template:
          "Halo {nama}, saatnya minum {medicationName} {dosage}! 💊\n\n{timingInstructions}\n\n📖 Baca tips kesehatan: {artikel_url}\n\nSemoga cepat sembuh! 🙏",
        variables: ["{nama}", "{medicationName}", "{dosage}", "{timingInstructions}", "{artikel_url}"],
        description: "Pengingat obat personal dengan link artikel edukasi",
        supportsMedication: true,
      },
      {
        id: "medication_reminder_detailed",
        name: "Pengingat Obat Detail",
        category: "MEDICATION",
        template:
          "Halo {nama}! 💊⏰\n\n{reminderHeader}\n\n📋 *Detail Obat:*\n• Nama: {medicationName}\n• Dosis: {dosage}\n• Frekuensi: {frequency}\n• Waktu: {timing}\n\n{specialInstructions}\n\nApakah sudah minum obatnya? Balas \"SUDAH\" atau \"BELUM\".\n\n💙 Tim PRIMA",
        variables: ["{nama}", "{reminderHeader}", "{medicationName}", "{dosage}", "{frequency}", "{timing}", "{specialInstructions}"],
        description: "Pengingat obat dengan informasi lengkap",
        supportsMedication: true,
      },
      {
        id: "medication_side_effect_reminder",
        name: "Pengingat Obat dengan Efek Samping",
        category: "MEDICATION_SAFETY",
        template:
          "Halo {nama}! 💊⏰\n\nSaatnya minum {medicationName} {dosage}. {timingInstructions}\n\n⚠️ *Catatan:* Jika mengalami {sideEffects}, segera hubungi relawan PRIMA.\n\nApakah sudah minum obatnya? Balas \"SUDAH\" atau \"BELUM\".\n\n💙 Tim PRIMA",
        variables: ["{nama}", "{medicationName}", "{dosage}", "{timingInstructions}", "{sideEffects}"],
        description: "Pengingat obat dengan peringatan efek samping",
        supportsMedication: true,
      },
      {
        id: "motivation_with_video",
        name: "Motivasi + Video",
        category: "EDUCATIONAL",
        template:
          "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
        variables: ["{nama}", "{video_url}"],
        description: "Pesan motivasi dengan video inspiratif",
        supportsMedication: false,
      },
      {
        id: "nutrition_reminder",
        name: "Pengingat Nutrisi",
        category: "EDUCATIONAL",
        template:
          "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
        variables: ["{nama}", "{artikel_url}"],
        description: "Pengingat nutrisi dengan artikel panduan",
        supportsMedication: false,
      },
      {
        id: "exercise_motivation",
        name: "Motivasi Olahraga",
        category: "EDUCATIONAL",
        template:
          "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
        variables: ["{nama}", "{video_url}"],
        description: "Motivasi olahraga dengan video panduan",
        supportsMedication: false,
      },
    ];

    // Get published articles and videos for content suggestions
    const [articles, videos] = await Promise.all([
      db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          slug: cmsArticles.slug,
          category: cmsArticles.category,
          excerpt: cmsArticles.excerpt,
        })
        .from(cmsArticles)
        .where(eq(cmsArticles.status, "PUBLISHED"))
        .limit(10),

      db
        .select({
          id: cmsVideos.id,
          title: cmsVideos.title,
          slug: cmsVideos.slug,
          category: cmsVideos.category,
          description: cmsVideos.description,
        })
        .from(cmsVideos)
        .where(eq(cmsVideos.status, "PUBLISHED"))
        .limit(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        enhancedTemplates,
        availableArticles: articles.map((article) => ({
          ...article,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article.slug}`,
          type: "article",
        })),
        availableVideos: videos.map((video) => ({
          ...video,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video.slug}`,
          type: "video",
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching enhanced templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Schema for template creation request
const createTemplateSchema = z.object({
  templateId: z.string(),
  contentId: z.string().optional(),
  contentType: z.enum(['article', 'video']).optional(),
  patientData: z.record(z.string(), z.string()).optional(),
  medicationData: z.object({
    name: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    timing: z.string().optional(),
    category: z.string().optional(),
    instructions: z.string().optional(),
    sideEffects: z.array(z.string()).optional(),
  }).optional(),
});

// Create enhanced reminder with content and medication support
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);
    const { templateId, contentId, contentType, patientData, medicationData } = validatedData;

    // Enhanced templates with medication support
    const enhancedTemplates = [
      {
        id: "medication_with_article",
        template:
          "Halo {nama}, saatnya minum {medicationName} {dosage}! 💊\n\n{timingInstructions}\n\n📖 Baca tips kesehatan: {artikel_url}\n\nSemoga cepat sembuh! 🙏",
        variables: ["{nama}", "{medicationName}", "{dosage}", "{timingInstructions}", "{artikel_url}"],
        supportsMedication: true,
      },
      {
        id: "medication_reminder_detailed",
        template:
          "Halo {nama}! 💊⏰\n\n{reminderHeader}\n\n📋 *Detail Obat:*\n• Nama: {medicationName}\n• Dosis: {dosage}\n• Frekuensi: {frequency}\n• Waktu: {timing}\n\n{specialInstructions}\n\nApakah sudah minum obatnya? Balas \"SUDAH\" atau \"BELUM\".\n\n💙 Tim PRIMA",
        variables: ["{nama}", "{reminderHeader}", "{medicationName}", "{dosage}", "{frequency}", "{timing}", "{specialInstructions}"],
        supportsMedication: true,
      },
      {
        id: "medication_side_effect_reminder",
        template:
          "Halo {nama}! 💊⏰\n\nSaatnya minum {medicationName} {dosage}. {timingInstructions}\n\n⚠️ *Catatan:* Jika mengalami {sideEffects}, segera hubungi relawan PRIMA.\n\nApakah sudah minum obatnya? Balas \"SUDAH\" atau \"BELUM\".\n\n💙 Tim PRIMA",
        variables: ["{nama}", "{medicationName}", "{dosage}", "{timingInstructions}", "{sideEffects}"],
        supportsMedication: true,
      },
      {
        id: "motivation_with_video",
        template:
          "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
        variables: ["{nama}", "{video_url}"],
        supportsMedication: false,
      },
    ];

    const selectedTemplate = enhancedTemplates.find((t) => t.id === templateId);
    if (!selectedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Validate medication requirements
    if (selectedTemplate.supportsMedication && !medicationData) {
      return NextResponse.json(
        { error: "Medication data required for this template" },
        { status: 400 }
      );
    }

    // Get content URL
    let contentUrl = "";
    if (contentId && contentType) {
      if (contentType === "article") {
        const article = await db
          .select({ slug: cmsArticles.slug })
          .from(cmsArticles)
          .where(eq(cmsArticles.id, contentId))
          .limit(1);

        if (article.length > 0) {
          contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/articles/${article[0].slug}`;
        }
      } else if (contentType === "video") {
        const video = await db
          .select({ slug: cmsVideos.slug })
          .from(cmsVideos)
          .where(eq(cmsVideos.id, contentId))
          .limit(1);

        if (video.length > 0) {
          contentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/content/videos/${video[0].slug}`;
        }
      }
    }

    // Replace variables in template
    let finalMessage = selectedTemplate.template;

    // Replace patient variables
    if (patientData) {
      Object.keys(patientData).forEach((key) => {
        const placeholder = `{${key}}`;
        if (finalMessage.includes(placeholder)) {
          finalMessage = finalMessage.replaceAll(
            placeholder,
            patientData[key] || ""
          );
        }
      });
    }

    // Replace medication variables if medication data is provided
    if (medicationData) {
      const medicationDetails = MedicationParser.validateMedicationDetails({
        name: medicationData.name,
        dosage: medicationData.dosage || '',
        frequency: (medicationData.frequency as 'ONCE_DAILY' | 'TWICE_DAILY' | 'THREE_TIMES_DAILY' | 'FOUR_TIMES_DAILY' | 'EVERY_8_HOURS' | 'EVERY_12_HOURS' | 'EVERY_24_HOURS' | 'EVERY_WEEK' | 'EVERY_MONTH' | 'AS_NEEDED' | 'CUSTOM') || 'ONCE_DAILY',
        timing: (medicationData.timing as 'BEFORE_MEAL' | 'WITH_MEAL' | 'AFTER_MEAL' | 'BEDTIME' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME') || 'ANYTIME',
        category: (medicationData.category as 'CHEMOTHERAPY' | 'TARGETED_THERAPY' | 'IMMUNOTHERAPY' | 'HORMONAL_THERAPY' | 'PAIN_MANAGEMENT' | 'ANTIEMETIC' | 'ANTIBIOTIC' | 'ANTIVIRAL' | 'ANTIFUNGAL' | 'SUPPLEMENT' | 'OTHER') || 'OTHER',
        instructions: medicationData.instructions,
        sideEffects: medicationData.sideEffects,
      });

      if (!medicationDetails) {
        return NextResponse.json(
          { error: "Invalid medication data" },
          { status: 400 }
        );
      }

      // Replace medication-specific variables
      finalMessage = finalMessage.replaceAll(/{medicationName}/g, medicationDetails.name);
      finalMessage = finalMessage.replaceAll(/{dosage}/g, medicationDetails.dosage);
      finalMessage = finalMessage.replaceAll(/{frequency}/g, medicationDetails.frequency);
      finalMessage = finalMessage.replaceAll(/{timing}/g, medicationDetails.timing);

      // Generate contextual medication instructions
      const timingInstructions = generateTimingInstructions(medicationDetails.timing);
      finalMessage = finalMessage.replaceAll(/{timingInstructions}/g, timingInstructions);

      const specialInstructions = generateSpecialInstructions(medicationDetails);
      finalMessage = finalMessage.replaceAll(/{specialInstructions}/g, specialInstructions);

      const sideEffects = medicationDetails.sideEffects?.join(', ') || '';
      finalMessage = finalMessage.replaceAll(/{sideEffects}/g, sideEffects);

      const reminderHeader = generateReminderHeader(medicationDetails);
      finalMessage = finalMessage.replaceAll(/{reminderHeader}/g, reminderHeader);
    }

    // Replace content URLs
    finalMessage = finalMessage.replaceAll(/{artikel_url}/g, contentUrl);
    finalMessage = finalMessage.replaceAll(/{video_url}/g, contentUrl);

    return NextResponse.json({
      success: true,
      data: {
        message: finalMessage,
        contentUrl,
        template: selectedTemplate,
        medicationData: medicationData ? {
          name: medicationData.name,
          dosage: medicationData.dosage,
          frequency: medicationData.frequency,
          timing: medicationData.timing,
        } : undefined,
      },
    });
  } catch (error) {
    console.error("Error creating enhanced reminder:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions for medication template generation
function generateTimingInstructions(timing: string): string {
  const timingMap: Record<string, string> = {
    'BEFORE_MEAL': 'Minum 30 menit sebelum makan',
    'WITH_MEAL': 'Minum saat makan',
    'AFTER_MEAL': 'Minum 30 menit setelah makan',
    'BEDTIME': 'Minum sebelum tidur',
    'MORNING': 'Minum di pagi hari',
    'AFTERNOON': 'Minum di siang hari',
    'EVENING': 'Minum di sore hari',
    'ANYTIME': 'Minum sesuai jadwal'
  };

  return timingMap[timing] || 'Minum sesuai jadwal';
}

function generateSpecialInstructions(medicationDetails: MedicationDetails): string {
  const instructions = [];

  if (medicationDetails.category === 'CHEMOTHERAPY') {
    instructions.push('💉 Obat kemoterapi - pastikan istirahat yang cukup setelah minum obat.');
  }

  if (medicationDetails.sideEffects && medicationDetails.sideEffects.length > 0) {
    instructions.push('⚠️ Perhatikan efek samping dan segera hubungi relawan jika diperlukan.');
  }

  if (medicationDetails.instructions) {
    instructions.push(`📋 ${medicationDetails.instructions}`);
  }

  return instructions.join('\n') || '';
}

function generateReminderHeader(medicationDetails: MedicationDetails): string {
  const highPriorityCategories = ['CHEMOTHERAPY', 'TARGETED_THERAPY', 'IMMUNOTHERAPY'];
  return highPriorityCategories.includes(medicationDetails.category) ?
    '⚠️ *Pengingat Obat Penting*' : '💊 *Pengingat Obat*';
}
