/**
 * Knowledge Base Service
 * Provides reliable health information and general medical knowledge
 * with safety filtering and Indonesian language support
 */

import { logger } from "@/lib/logger";
import { db, cmsArticles } from "@/db";
import { eq, and, isNull, ilike, desc, sql } from "drizzle-orm";
import { ConversationContext } from "@/services/llm/llm.types";
import { contentCategoryEnum } from "@/db/enums";

// TypeScript interfaces for type safety
interface QuestionAnalysis {
  intent: "information" | "advice" | "explanation" | "comparison";
  category: string;
  keywords: string[];
  confidence: number;
  language: "id" | "en";
}

type ContentCategory = typeof contentCategoryEnum.enumValues[number];

export interface KnowledgeQuery {
  question: string;
  category?: string;
  language?: "id" | "en";
  difficulty?: "basic" | "intermediate" | "advanced";
  includeReferences?: boolean;
}

export interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: "basic" | "intermediate" | "advanced";
  language: "id" | "en";
  source: string;
  references?: string[];
  confidence: number;
  lastUpdated: Date;
}

export interface HealthCategory {
  id: string;
  name: string;
  description: string;
  parentCategory?: string;
  subcategories: string[];
}

export class KnowledgeBaseService {
  private readonly HEALTH_CATEGORIES: HealthCategory[] = [
    {
      id: "general_health",
      name: "Kesehatan Umum",
      description: "Informasi kesehatan umum dan pencegahan penyakit",
      subcategories: ["nutrition", "exercise", "sleep", "hygiene"]
    },
    {
      id: "medication_info",
      name: "Informasi Obat",
      description: "Informasi umum tentang obat-obatan dan penggunaannya",
      subcategories: ["pain_relief", "antibiotics", "vitamins", "chronic_meds"]
    },
    {
      id: "first_aid",
      name: "Pertolongan Pertama",
      description: "Panduan pertolongan pertama untuk situasi darurat",
      subcategories: ["wounds", "burns", "choking", "poisoning"]
    },
    {
      id: "chronic_conditions",
      name: "Kondisi Kronis",
      description: "Informasi tentang penyakit kronis dan manajemennya",
      subcategories: ["diabetes", "hypertension", "asthma", "heart_disease"]
    },
    {
      id: "mental_health",
      name: "Kesehatan Mental",
      description: "Kesehatan mental dan kesejahteraan psikologis",
      subcategories: ["stress", "anxiety", "depression", "coping_strategies"]
    },
    {
      id: "cancer_care",
      name: "Perawatan Kanker",
      description: "Informasi spesifik tentang perawatan paliatif dan kanker",
      subcategories: ["pain_management", "symptom_control", "palliative_care", "side_effects"]
    }
  ];

  private readonly EMERGENCY_KEYWORDS = [
    "emergency", "darurat", "gawat", "sesak napas", "nyeri dada", "stroke",
    "jantung", "pingsan", "kejang", "perdarahan hebat", "trauma"
  ];

  private readonly HIGH_RISK_KEYWORDS = [
    "diagnosis", "mendiagnosis", "pengobatan", "treatment", "dosage", "dosis",
    "resep", "prescription", "ganti obat", "stop medication"
  ];

  /**
   * Search knowledge base for health information
   */
  async searchKnowledge(
    query: KnowledgeQuery,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: ConversationContext
  ): Promise<{
    results: KnowledgeResult[];
    querySummary: string;
    suggestions: string[];
    safetyNotice?: string;
  }> {
    try {
      logger.info("Searching knowledge base", {
        question: query.question,
        category: query.category,
        language: query.language
      });

      // Safety check first
      const safetyCheck = this.performSafetyCheck(query.question);
      if (safetyCheck.blocked) {
        return {
          results: [],
          querySummary: "Pertanyaan tidak dapat diproses karena alasan keamanan",
          suggestions: safetyCheck.suggestions,
          safetyNotice: safetyCheck.notice
        };
      }

      // Parse and categorize the question
      const analysis = this.analyzeQuestion(query);

      // Search database for relevant content
      const dbResults = await this.searchDatabase(analysis);

      // Generate fallback results if no database results
      const fallbackResults = dbResults.length === 0 ?
        await this.generateFallbackResponse(analysis) : [];

      const allResults = [...dbResults, ...fallbackResults];

      // Generate query summary and suggestions
      const querySummary = this.generateQuerySummary(analysis, allResults.length);
      const suggestions = this.generateSuggestions(analysis, allResults);

      logger.info("Knowledge search completed", {
        resultsFound: allResults.length,
        category: analysis.category,
        confidence: analysis.confidence
      });

      return {
        results: allResults,
        querySummary,
        suggestions,
        safetyNotice: safetyCheck.notice
      };

    } catch (error) {
      logger.error("Failed to search knowledge base", error instanceof Error ? error : new Error(String(error)));

      // Return safe fallback response
      return {
        results: [{
          id: "error_fallback",
          title: "Informasi Kesehatan Umum",
          content: "Maaf, saya tidak dapat mengakses database informasi kesehatan saat ini. " +
                  "Untuk informasi kesehatan yang akurat, silakan konsultasi dengan tenaga kesehatan atau " +
                  "hubungi fasilitas kesehatan terdekat.",
          category: "general_health",
          difficulty: "basic",
          language: "id",
          source: "system_fallback",
          confidence: 0.3,
          lastUpdated: new Date()
        }],
        querySummary: "Sistem tidak dapat memproses permintaan saat ini",
        suggestions: [
          "Coba tanyakan dengan kata-kata yang lebih sederhana",
          "Konsultasi dengan tenaga kesehatan untuk informasi medis spesifik",
          "Hubungi layanan darurat jika Anda mengalami kondisi serius"
        ]
      };
    }
  }

  /**
   * Perform safety check on user query
   */
  private performSafetyCheck(question: string): {
    blocked: boolean;
    notice?: string;
    suggestions: string[];
  } {
    const normalizedQuestion = question.toLowerCase();
    const suggestions: string[] = [];

    // Check for emergency keywords
    for (const keyword of this.EMERGENCY_KEYWORDS) {
      if (normalizedQuestion.includes(keyword)) {
        return {
          blocked: false,
          notice: "Jika Anda mengalami kondisi darurat, segera hubungi layanan darurat (112) atau " +
                  "fasilitas kesehatan terdekat. Informasi yang diberikan bukan pengganti layanan medis darurat.",
          suggestions: [
            "Hubungi layanan darurat jika kondisi mengancam jiwa",
            "Kunjungi rumah sakit atau klinik terdekat",
            "Jangan menunda untuk mendapatkan bantuan medis profesional"
          ]
        };
      }
    }

    // Check for high-risk keywords that require professional medical advice
    for (const keyword of this.HIGH_RISK_KEYWORDS) {
      if (normalizedQuestion.includes(keyword)) {
        suggestions.push(
          "Informasi yang diberikan bersifat umum dan bukan pengganti nasihat medis profesional",
          "Selalu konsultasi dengan dokter atau tenaga kesehatan untuk diagnosis dan pengobatan"
        );
      }
    }

    return {
      blocked: false,
      suggestions
    };
  }

  /**
   * Analyze question to determine intent and category
   */
  private analyzeQuestion(query: KnowledgeQuery): {
    intent: "information" | "advice" | "explanation" | "comparison";
    category: string;
    keywords: string[];
    confidence: number;
    language: "id" | "en";
  } {
    const normalizedQuestion = query.question.toLowerCase();
    const keywords: string[] = [];

    // Determine language
    const language = this.detectLanguage(normalizedQuestion);

    // Extract keywords based on health categories
    const categoryKeywords: Record<string, string[]> = {
      "general_health": ["nutrisi", "makanan", "olahraga", "tidur", "gizi", "diet", "kesehatan"],
      "medication_info": ["obat", "tablet", "kapsul", "sirup", "efek samping", " dosis"],
      "first_aid": ["luka", "luka bakar", "tersedak", "pingsan", "perdarahan"],
      "chronic_conditions": ["diabetes", "hipertensi", "asam urat", "asma", "jantung"],
      "mental_health": ["stres", "cemas", "depresi", "kecemasan", "mood"],
      "cancer_care": ["kanker", "kemoterapi", "radiasi", "tumor", "paliatif"]
    };

    // Find matching category
    let bestCategory = "general_health";
    let maxMatches = 0;

    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      const matches = catKeywords.filter(keyword =>
        normalizedQuestion.includes(keyword)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }

    // Extract medical terms as keywords
    const medicalTerms = normalizedQuestion.match(/\b(obat|sakit|nyeri|demam|batuk|pilek|alergi|vitamin|suplemen)\b/g);
    if (medicalTerms) {
      keywords.push(...medicalTerms);
    }

    // Determine intent
    let intent: "information" | "advice" | "explanation" | "comparison" = "information";
    if (normalizedQuestion.includes("bagaimana") || normalizedQuestion.includes("how to")) {
      intent = "advice";
    } else if (normalizedQuestion.includes("kenapa") || normalizedQuestion.includes("mengapa") || normalizedQuestion.includes("why")) {
      intent = "explanation";
    } else if (normalizedQuestion.includes("perbedaan") || normalizedQuestion.includes("compare")) {
      intent = "comparison";
    }

    // Calculate confidence based on keyword matches
    const confidence = Math.min(0.3 + (maxMatches * 0.2) + (keywords.length * 0.1), 0.9);

    return {
      intent,
      category: bestCategory,
      keywords,
      confidence,
      language
    };
  }

  /**
   * Detect language of the query
   */
  private detectLanguage(text: string): "id" | "en" {
    const indonesianKeywords = ["bagaimana", "kenapa", "apa", "dimana", "kapan", "berapa", "obat", "sakit", "demam"];
    const englishKeywords = ["how", "why", "what", "where", "when", "medicine", "sick", "fever"];

    const idCount = indonesianKeywords.filter(keyword => text.includes(keyword)).length;
    const enCount = englishKeywords.filter(keyword => text.includes(keyword)).length;

    return idCount >= enCount ? "id" : "en";
  }

  /**
   * Search database for relevant health content
   */
  private async searchDatabase(analysis: {
    intent: string;
    category: string;
    keywords: string[];
    confidence: number;
    language: "id" | "en";
  }): Promise<KnowledgeResult[]> {
    try {
      const whereConditions = [
        isNull(cmsArticles.deletedAt),
        eq(cmsArticles.status, "PUBLISHED")
      ];

      // Add category filter - map to CMS categories
      const cmsCategoryMapping: Record<string, ContentCategory> = {
        "general_health": "GENERAL",
        "medication_info": "MEDICAL",
        "first_aid": "MEDICAL",
        "chronic_conditions": "MEDICAL",
        "mental_health": "GENERAL",
        "cancer_care": "MEDICAL"
      };

      if (analysis.category && analysis.category !== "general_health") {
        const mappedCategory = cmsCategoryMapping[analysis.category] || "GENERAL";
        whereConditions.push(eq(cmsArticles.category, mappedCategory));
      }

      // Add keyword filters
      if (analysis.keywords.length > 0) {
        const keyword = analysis.keywords[0]; // Use first keyword for simplicity
        whereConditions.push(ilike(cmsArticles.content, `%${keyword}%`));
      }

      const results = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          content: cmsArticles.content,
          category: cmsArticles.category,
          difficulty: sql<"basic" | "intermediate" | "advanced">`'basic'`, // Default difficulty for CMS articles
          language: sql<"id" | "en">`'id'`, // Default to Indonesian
          source: sql<string>`'database'`,
          references: sql<string[]>`[]`, // CMS articles don't have references field
          lastUpdated: cmsArticles.updatedAt
        })
        .from(cmsArticles)
        .where(and(...whereConditions))
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(5);

      return results.map(result => ({
        ...result,
        references: result.references as string[] || [],
        confidence: analysis.confidence,
        difficulty: "basic" as const,
        language: "id" as const
      }));

    } catch (error) {
      logger.error("Failed to search database for knowledge", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Generate fallback response when database has no results
   */
  private async generateFallbackResponse(analysis: {
    intent: string;
    category: string;
    keywords: string[];
    confidence: number;
    language: "id" | "en";
  }): Promise<KnowledgeResult[]> {
    // Basic general health information based on category
    const fallbackContent: Record<string, string> = {
      "general_health": "Kesehatan umum meliputi berbagai aspek seperti nutrisi yang seimbang, " +
                         "olahraga teratur, tidur yang cukup, dan kebersihan diri. " +
                         "Untuk informasi spesifik, konsultasikan dengan tenaga kesehatan.",
      "medication_info": "Informasi obat harus selalu didapatkan dari sumber yang terpercaya. " +
                         "Selalu ikuti petunjuk dokter atau apoteker dalam menggunakan obat. " +
                         "Jangan mengubah dosis tanpa konsultasi medis.",
      "first_aid": "Untuk pertolongan pertama, pastikan keamanan diri dan korban terlebih dahulu. " +
                  "Hubungi layanan darurat jika situasi mengancam jiwa. " +
                  "Pelajari teknik dasar pertolongan pertama dari sumber terpercaya.",
      "chronic_conditions": "Penyakit kronis memerlukan manajemen jangka panjang dengan bantuan medis. " +
                           "Disiplin dalam pengobatan dan gaya hidup sehat sangat penting.",
      "mental_health": "Kesehatan mental sama pentingnya dengan kesehatan fisik. " +
                      "Jangan ragu untuk mencari bantuan profesional jika Anda mengalami kesulitan.",
      "cancer_care": "Perawatan kanker memerlukan pendekatan holistik dengan tim medis multidisiplin. " +
                    "Fokus pada kualitas hidup dan manajemen gejala sangat penting."
    };

    const content = fallbackContent[analysis.category] || fallbackContent["general_health"];

    return [{
      id: `fallback_${analysis.category}`,
      title: `Informasi ${analysis.category === "cancer_care" ? "Perawatan Kanker" : "Kesehatan Umum"}`,
      content,
      category: analysis.category,
      difficulty: "basic",
      language: analysis.language,
      source: "system_fallback",
      confidence: Math.max(0.3, analysis.confidence - 0.2),
      lastUpdated: new Date()
    }];
  }

  /**
   * Generate query summary
   */
  private generateQuerySummary(analysis: QuestionAnalysis, resultsCount: number): string {
    const categoryNames: Record<string, string> = {
      "general_health": "Kesehatan Umum",
      "medication_info": "Informasi Obat",
      "first_aid": "Pertolongan Pertama",
      "chronic_conditions": "Kondisi Kronis",
      "mental_health": "Kesehatan Mental",
      "cancer_care": "Perawatan Kanker"
    };

    const categoryName = categoryNames[analysis.category] || "Kesehatan Umum";

    return `Ditemukan ${resultsCount} artikel dalam kategori ${categoryName}`;
  }

  /**
   * Generate suggestions for follow-up questions
   */
  private generateSuggestions(analysis: QuestionAnalysis, results: KnowledgeResult[]): string[] {
    const suggestions: string[] = [];

    // Add general health maintenance suggestions
    if (results.length > 0) {
      suggestions.push(
        "Konsultasi dengan tenaga kesehatan untuk informasi yang dipersonalisasi",
        "Perhatikan bahwa informasi yang diberikan bersifat umum"
      );
    }

    // Add category-specific suggestions
    const categorySuggestions: Record<string, string[]> = {
      "general_health": [
        "Tanyakan tentang nutrisi seimbang",
        "Pelajari tentang pentingnya olahraga teratur"
      ],
      "medication_info": [
        "Selalu periksa label obat sebelum digunakan",
        "Simpan obat di tempat yang aman dan jauh dari jangkauan anak-anak"
      ],
      "first_aid": [
        "Pelajari teknik CPR dan pertolongan pertama dasar",
        "Simpan nomor darurat di ponsel Anda"
      ],
      "chronic_conditions": [
        "Pantau kondisi kesehatan secara teratur",
        "Ikuti jadwal pengobatan yang telah ditentukan"
      ]
    };

    const specificSuggestions = categorySuggestions[analysis.category];
    if (specificSuggestions) {
      suggestions.push(...specificSuggestions.slice(0, 2));
    }

    return suggestions;
  }

  /**
   * Get health categories with descriptions
   */
  getHealthCategories(): HealthCategory[] {
    return this.HEALTH_CATEGORIES;
  }

  /**
   * Format knowledge results for LLM consumption
   */
  formatKnowledgeForLLM(results: KnowledgeResult[]): string {
    if (results.length === 0) {
      return "Maaf, saya tidak menemukan informasi kesehatan yang relevan dengan pertanyaan Anda.";
    }

    const formattedResults = results.map((result, index) => {
      return `${index + 1}. ${result.title}\n` +
             `   ${result.content}\n` +
             `   Sumber: ${result.source} | Kategori: ${result.category}\n` +
             (result.references && result.references.length > 0 ?
               `   Referensi: ${result.references.join(', ')}\n` : '');
    }).join('\n\n');

    return `Informasi Kesehatan:\n${formattedResults}\n\n` +
           `Catatan: Informasi ini bersifat umum dan bukan pengganti nasihat medis profesional.`;
  }

  /**
   * Check if question is appropriate for knowledge base
   */
  isAppropriateQuestion(question: string): boolean {
    const normalizedQuestion = question.toLowerCase();

    // Questions that should be directed to medical professionals
    const professionalOnlyQuestions = [
      "diagnosis", "mendiagnosis", "pengobatan spesifik", "resep obat",
      "operasi", "prosedur medis", "tes laboratorium"
    ];

    for (const term of professionalOnlyQuestions) {
      if (normalizedQuestion.includes(term)) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();