import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, cmsArticles, cmsVideos } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { logger } from '@/lib/logger';
// Enhanced reminder templates with CMS content integration
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Enhanced template suggestions for general reminders
    const enhancedTemplates = [
      {
        id: "motivation_with_video",
        name: "Motivasi + Video",
        category: "EDUCATIONAL",
        template:
          "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
        variables: ["{nama}", "{video_url}"],
        description: "Pesan motivasi dengan video inspiratif",
      },
      {
        id: "nutrition_reminder",
        name: "Pengingat Nutrisi",
        category: "EDUCATIONAL",
        template:
          "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
        variables: ["{nama}", "{artikel_url}"],
        description: "Pengingat nutrisi dengan artikel panduan",
      },
      {
        id: "exercise_motivation",
        name: "Motivasi Olahraga",
        category: "EDUCATIONAL",
        template:
          "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
        variables: ["{nama}", "{video_url}"],
        description: "Motivasi olahraga dengan video panduan",
      },
      {
        id: "general_reminder",
        name: "Pengingat Umum",
        category: "REMINDER",
        template:
          "Halo {nama}! ⏰\n\nIni adalah pengingat untuk Anda. {customMessage}\n\nJangan lupa dilakukan ya! 💙 Tim PRIMA",
        variables: ["{nama}", "{customMessage}"],
        description: "Pengingat umum dengan pesan custom",
      },
      {
        id: "wellness_check",
        name: "Cek Kesehatan",
        category: "WELLNESS",
        template:
          "Halo {nama}! 💙\n\nBagaimana kabar Anda hari ini? {customMessage}\n\nKami siap membantu jika ada yang dibutuhkan. 🙏 Tim PRIMA",
        variables: ["{nama}", "{customMessage}"],
        description: "Pengecekan kesehatan dan dukungan",
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
  } catch (error: unknown) {
    logger.error("Error fetching enhanced templates:", error instanceof Error ? error : new Error(String(error)));
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
});

// Create enhanced reminder with content support
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);
    const { templateId, contentId, contentType, patientData } = validatedData;

    // Enhanced templates for general reminders
    const enhancedTemplates = [
      {
        id: "motivation_with_video",
        template:
          "Semangat {nama}! 💪\n\n🎬 Tonton video motivasi: {video_url}\n\nAnda tidak sendirian dalam perjuangan ini! ❤️",
        variables: ["{nama}", "{video_url}"],
      },
      {
        id: "nutrition_reminder",
        template:
          "Halo {nama}, jangan lupa makan bergizi hari ini! 🥗\n\n📚 Tips nutrisi untuk pasien kanker: {artikel_url}\n\nMakan yang cukup ya! 😊",
        variables: ["{nama}", "{artikel_url}"],
      },
      {
        id: "exercise_motivation",
        template:
          "Waktu olahraga ringan, {nama}! 🚶‍♀️\n\n🎥 Video gerakan sederhana: {video_url}\n\nTubuh sehat, jiwa kuat! 💪",
        variables: ["{nama}", "{video_url}"],
      },
      {
        id: "general_reminder",
        template:
          "Halo {nama}! ⏰\n\nIni adalah pengingat untuk Anda. {customMessage}\n\nJangan lupa dilakukan ya! 💙 Tim PRIMA",
        variables: ["{nama}", "{customMessage}"],
      },
      {
        id: "wellness_check",
        template:
          "Halo {nama}! 💙\n\nBagaimana kabar Anda hari ini? {customMessage}\n\nKami siap membantu jika ada yang dibutuhkan. 🙏 Tim PRIMA",
        variables: ["{nama}", "{customMessage}"],
      },
    ];

    const selectedTemplate = enhancedTemplates.find((t) => t.id === templateId);
    if (!selectedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
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

    // Replace content URLs
    finalMessage = finalMessage.replaceAll(/{artikel_url}/g, contentUrl);
    finalMessage = finalMessage.replaceAll(/{video_url}/g, contentUrl);

    return NextResponse.json({
      success: true,
      data: {
        message: finalMessage,
        contentUrl,
        template: selectedTemplate,
      },
    });
  } catch (error: unknown) {
    logger.error("Error creating enhanced reminder:", error instanceof Error ? error : new Error(String(error)));
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