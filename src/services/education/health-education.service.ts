/**
 * Health Education Service
 * Provides proactive health education content delivery to patients
 * with personalized recommendations and tracking
 */

import { logger } from "@/lib/logger";
import { db, cmsArticles, patients, medicalRecords } from "@/db";
import { eq, and, isNull, ilike, desc, or } from "drizzle-orm";
import { ConversationContext } from "@/services/llm/llm.types";
import { contentCategoryEnum } from "@/db/enums";

// TypeScript interfaces for type safety
interface PatientProfile {
  activeConditions: string[];
  cancerStage?: string;
  age?: number;
  gender?: string;
  treatmentPhase?: string;
}

type ContentCategory = typeof contentCategoryEnum.enumValues[number];

export interface EducationContent {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: "basic" | "intermediate" | "advanced";
  relevanceScore: number;
  deliveryMethod: "proactive" | "reactive" | "scheduled";
  readTime: number; // in minutes
  tags: string[];
  lastUpdated: Date;
}

export interface EducationPreferences {
  patientId: string;
  preferredCategories: string[];
  preferredDifficulty: "basic" | "intermediate" | "advanced";
  preferredLanguage: "id" | "en";
  deliveryFrequency: "daily" | "weekly" | "monthly" | "as_needed";
  topicsOfInterest: string[];
  avoidedTopics: string[];
}

export interface EducationSession {
  id: string;
  patientId: string;
  contentId: string;
  sessionType: "proactive_tip" | "reactive_education" | "follow_up_content";
  deliveredAt: Date;
  readAt?: Date;
  engagementScore?: number;
  feedback?: string;
  followUpQuestions?: string[];
}

export interface EducationRecommendation {
  content: EducationContent;
  reason: string;
  priority: "high" | "medium" | "low";
  deliveryTiming: "immediate" | "next_session" | "scheduled";
  context?: string;
}

export class HealthEducationService {
  private readonly HEALTH_CATEGORIES = [
    "general", "medical", "psychological", "nutrisi", "olahraga", "motivational", "faq"
  ];

  private readonly CONDITION_TOPIC_MAPPING: Record<string, string[]> = {
    "diabetes": ["nutrisi", "medical", "olahraga"],
    "hypertension": ["medical", "olahraga", "nutrisi"],
    "asthma": ["medical", "psychological"],
    "cancer": ["medical", "psychological", "motivational"],
    "chronic_pain": ["medical", "psychological", "olahraga"]
  };

  /**
   * Get personalized education recommendations for a patient
   */
  async getPersonalizedRecommendations(
    patientId: string,
    context?: ConversationContext
  ): Promise<EducationRecommendation[]> {
    try {
      logger.info("Generating personalized education recommendations", {
        patientId,
        hasContext: !!context
      });

      // Get patient preferences and profile
      const preferences = await this.getPatientPreferences(patientId);
      const patientProfile = await this.getPatientEducationProfile(patientId);

      // Analyze current context for relevant topics
      const contextTopics = this.analyzeContextForTopics(context);

      // Generate recommendations based on multiple factors
      const recommendations = await this.generateRecommendations(
        patientId,
        preferences,
        patientProfile,
        contextTopics
      );

      // Sort by priority and relevance
      return recommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });

    } catch (error) {
      logger.error("Failed to generate education recommendations", error instanceof Error ? error : new Error(String(error)), {
        patientId
      });
      return [];
    }
  }

  /**
   * Get daily health tip for proactive delivery
   */
  async getDailyHealthTip(patientId: string): Promise<EducationContent | null> {
    try {
      const preferences = await this.getPatientPreferences(patientId);
      const patientProfile = await this.getPatientEducationProfile(patientId);

      // Get today's tip based on patient preferences and profile
      const tip = await this.getProactiveContent(
        patientId,
        preferences,
        patientProfile,
        "daily_tip"
      );

      return tip;

    } catch (error) {
      logger.error("Failed to get daily health tip", error instanceof Error ? error : new Error(String(error)), {
        patientId
      });
      return null;
    }
  }

  /**
   * Get context-aware education content based on conversation
   */
  async getContextualEducation(
    patientId: string,
    context: ConversationContext
  ): Promise<EducationContent[]> {
    try {
      // Analyze conversation for education opportunities
      const educationTriggers = this.identifyEducationTriggers(context);

      if (educationTriggers.length === 0) {
        return [];
      }

      // Get relevant content for each trigger
      const relevantContent: EducationContent[] = [];

      for (const trigger of educationTriggers) {
        const content = await this.getContentForTrigger(trigger, patientId);
        relevantContent.push(...content);
      }

      // Remove duplicates and sort by relevance
      const uniqueContent = this.deduplicateContent(relevantContent);
      return uniqueContent.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error("Failed to get contextual education", error instanceof Error ? error : new Error(String(error)), {
        patientId
      });
      return [];
    }
  }

  /**
   * Track education session engagement
   */
  async trackEducationSession(session: Omit<EducationSession, "id" | "deliveredAt">): Promise<string> {
    try {
      const sessionId = crypto.randomUUID();

      // In a real implementation, this would be saved to a database
      logger.info("Tracking education session", {
        sessionId,
        patientId: session.patientId,
        contentId: session.contentId,
        sessionType: session.sessionType
      });

      // Update patient preferences based on engagement
      if (session.engagementScore && session.engagementScore > 0.7) {
        await this.updatePreferencesBasedOnEngagement(
          session.patientId,
          session.contentId,
          session.engagementScore
        );
      }

      return sessionId;

    } catch (error) {
      logger.error("Failed to track education session", error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get patient education preferences
   */
  private async getPatientPreferences(patientId: string): Promise<EducationPreferences> {
    try {
      // Get patient data to infer preferences
      const patient = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.id, patientId),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (!patient.length) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Default preferences based on patient profile
      return {
        patientId,
        preferredCategories: ["general", "medical"],
        preferredDifficulty: "basic",
        preferredLanguage: "id",
        deliveryFrequency: "weekly",
        topicsOfInterest: [],
        avoidedTopics: []
      };

    } catch (error) {
      logger.error("Failed to get patient preferences", error instanceof Error ? error : new Error(String(error)));
      // Return default preferences
      return {
        patientId,
        preferredCategories: ["general"],
        preferredDifficulty: "basic",
        preferredLanguage: "id",
        deliveryFrequency: "weekly",
        topicsOfInterest: [],
        avoidedTopics: []
      };
    }
  }

  /**
   * Get patient education profile
   */
  private async getPatientEducationProfile(patientId: string): Promise<{
    activeConditions: string[];
    medications: string[];
    recentTopics: string[];
    engagementLevel: "high" | "medium" | "low";
  }> {
    try {
      // Get patient medical records to infer conditions and medications
      const patientMedicalRecords = await db
        .select({
          title: medicalRecords.title,
          description: medicalRecords.description,
          recordType: medicalRecords.recordType
        })
        .from(medicalRecords)
        .where(
          and(
            eq(medicalRecords.patientId, patientId),
            or(
              eq(medicalRecords.recordType, "TREATMENT" as const),
              eq(medicalRecords.recordType, "DIAGNOSIS" as const)
            )
          )
        )
        .orderBy(desc(medicalRecords.recordedDate))
        .limit(10);

      // Extract medications and conditions from medical records
      const medications: string[] = [];
      const conditions: string[] = [];

      for (const record of patientMedicalRecords) {
        const content = `${record.title} ${record.description}`.toLowerCase();

        // Extract medication names (simplified pattern matching)
        const medicationPatterns = [
          /\b(metformin|insulin|amlodipine|lisinopril|salbutamol|paracetamol)\b/gi
        ];

        for (const pattern of medicationPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            medications.push(...matches);
          }
        }

        // Extract conditions
        const conditionPatterns = [
          /\b(diabetes|hypertension|asthma|cancer|chronic pain)\b/gi
        ];

        for (const pattern of conditionPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            conditions.push(...matches);
          }
        }
      }

      // Remove duplicates
      const uniqueMedications = [...new Set(medications)];
      const uniqueConditions = [...new Set(conditions)];

      return {
        activeConditions: uniqueConditions,
        medications: uniqueMedications,
        recentTopics: [],
        engagementLevel: "medium" // Default, would be calculated from historical data
      };

    } catch (error) {
      logger.error("Failed to get patient education profile", error instanceof Error ? error : new Error(String(error)));
      return {
        activeConditions: [],
        medications: [],
        recentTopics: [],
        engagementLevel: "medium"
      };
    }
  }

  /**
   * Analyze conversation context for relevant topics
   */
  private analyzeContextForTopics(context?: ConversationContext): string[] {
    if (!context || !context.previousMessages || context.previousMessages.length === 0) {
      return [];
    }

    // Get the most recent user message
    const lastUserMessage = context.previousMessages
      .filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return [];
    }

    const normalizedMessage = lastUserMessage.content.toLowerCase();
    const topics: string[] = [];

    // Topic keywords mapping
    const topicKeywords: Record<string, string[]> = {
      "nutrisi": ["makan", "diet", "gizi", "nutrisi", "makanan", "minuman"],
      "olahraga": ["olahraga", "aktivitas", "gerak", "sehat", "bugar"],
      "medical": ["obat", "pengobatan", "dokter", "sakit", "nyeri"],
      "psychological": ["stres", "cemas", "depresi", "mood", "emosi"],
      "tidur": ["tidur", "istirahat", "lelah", "capek"]
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => normalizedMessage.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Generate education recommendations
   */
  private async generateRecommendations(
    patientId: string,
    preferences: EducationPreferences,
    profile: PatientProfile,
    contextTopics: string[]
  ): Promise<EducationRecommendation[]> {
    const recommendations: EducationRecommendation[] = [];

    // Condition-based recommendations
    for (const condition of profile.activeConditions) {
      const relatedTopics = this.CONDITION_TOPIC_MAPPING[condition] || [];
      for (const topic of relatedTopics) {
        const content = await this.getContentByTopic(topic, preferences);
        for (const item of content) {
          recommendations.push({
            content: item,
            reason: `Rekomendasi berdasarkan kondisi ${condition}`,
            priority: "high",
            deliveryTiming: "next_session",
            context: `Manajemen ${condition}`
          });
        }
      }
    }

    // Context-based recommendations
    for (const topic of contextTopics) {
      const content = await this.getContentByTopic(topic, preferences);
      for (const item of content.slice(0, 2)) { // Limit context recommendations
        recommendations.push({
          content: item,
          reason: `Berdasarkan pembicaraan terakhir tentang ${topic}`,
          priority: "medium",
          deliveryTiming: "immediate"
        });
      }
    }

    // Interest-based recommendations
    for (const category of preferences.preferredCategories) {
      const content = await this.getContentByCategory(category, preferences);
      for (const item of content.slice(0, 1)) { // One per category
        recommendations.push({
          content: item,
          reason: `Sesuai minat Anda dalam ${category}`,
          priority: "low",
          deliveryTiming: "scheduled"
        });
      }
    }

    return recommendations;
  }

  /**
   * Get proactive content for daily tips
   */
  private async getProactiveContent(
    patientId: string,
    preferences: EducationPreferences,
    profile: PatientProfile,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentType: "daily_tip" | "weekly_roundup"
  ): Promise<EducationContent | null> {
    try {
      // Get content based on patient profile and preferences
      const relevantCategories = this.getRelevantCategories(profile, preferences);

      const content = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          content: cmsArticles.content,
          category: cmsArticles.category,
          publishedAt: cmsArticles.publishedAt,
          tags: cmsArticles.tags
        })
        .from(cmsArticles)
        .where(
          and(
            isNull(cmsArticles.deletedAt),
            eq(cmsArticles.status, "PUBLISHED"),
            // Prefer patient's preferred categories
            or(...relevantCategories.map(cat => eq(cmsArticles.category, cat as ContentCategory)))
          )
        )
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(10);

      if (content.length === 0) {
        return null;
      }

      // Select the most appropriate content
      const selectedContent = content[Math.floor(Math.random() * Math.min(content.length, 3))];

      return {
        id: selectedContent.id,
        title: selectedContent.title,
        content: selectedContent.content.substring(0, 500) + "...", // Truncate for tips
        category: selectedContent.category,
        difficulty: preferences.preferredDifficulty,
        relevanceScore: 0.8,
        deliveryMethod: "proactive",
        readTime: this.estimateReadTime(selectedContent.content),
        tags: selectedContent.tags || [],
        lastUpdated: selectedContent.publishedAt || new Date()
      };

    } catch (error) {
      logger.error("Failed to get proactive content", error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Identify education opportunities in conversation
   */
  private identifyEducationTriggers(context: ConversationContext): string[] {
    const triggers: string[] = [];

    // Get the most recent user message
    const lastUserMessage = context.previousMessages
      ?.filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return [];
    }

    const normalizedMessage = lastUserMessage.content.toLowerCase();

    // Education trigger patterns
    const triggerPatterns: Record<string, RegExp[]> = {
      "nutrisi": [/makan ?apa|diet|gizi|nutrisi|kalori/i],
      "olahraga": [/olahraga|aktivitas|gerak|bugar|sehat/i],
      "medical": [/obat|pengobatan|dokter|sakit|nyeri|gejala/i],
      "psychological": [/stres|cemas|depresi|cemas|takut/i],
      "tidur": [/tidur|istirahat|lelah|capek|insomnia/i]
    };

    for (const [topic, patterns] of Object.entries(triggerPatterns)) {
      if (patterns.some(pattern => pattern.test(normalizedMessage))) {
        triggers.push(topic);
      }
    }

    return triggers;
  }

  /**
   * Get content for specific trigger
   */
  private async getContentForTrigger(trigger: string, patientId: string): Promise<EducationContent[]> {
    try {
      const preferences = await this.getPatientPreferences(patientId);

      const content = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          content: cmsArticles.content,
          category: cmsArticles.category,
          publishedAt: cmsArticles.publishedAt,
          tags: cmsArticles.tags
        })
        .from(cmsArticles)
        .where(
          and(
            isNull(cmsArticles.deletedAt),
            eq(cmsArticles.status, "PUBLISHED"),
            or(
              eq(cmsArticles.category, trigger as ContentCategory),
              ilike(cmsArticles.tags, `%${trigger}%`)
            )
          )
        )
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(5);

      return content.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        difficulty: preferences.preferredDifficulty,
        relevanceScore: 0.9,
        deliveryMethod: "reactive",
        readTime: this.estimateReadTime(item.content),
        tags: item.tags || [],
        lastUpdated: item.publishedAt || new Date()
      }));

    } catch (error) {
      logger.error("Failed to get content for trigger", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get content by topic
   */
  private async getContentByTopic(topic: string, preferences: EducationPreferences): Promise<EducationContent[]> {
    try {
      const content = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          content: cmsArticles.content,
          category: cmsArticles.category,
          publishedAt: cmsArticles.publishedAt,
          tags: cmsArticles.tags
        })
        .from(cmsArticles)
        .where(
          and(
            isNull(cmsArticles.deletedAt),
            eq(cmsArticles.status, "PUBLISHED"),
            or(
              eq(cmsArticles.category, topic as ContentCategory),
              ilike(cmsArticles.tags, `%${topic}%`)
            )
          )
        )
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(3);

      return content.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        difficulty: preferences.preferredDifficulty,
        relevanceScore: 0.8,
        deliveryMethod: "scheduled",
        readTime: this.estimateReadTime(item.content),
        tags: item.tags || [],
        lastUpdated: item.publishedAt || new Date()
      }));

    } catch (error) {
      logger.error("Failed to get content by topic", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Get content by category
   */
  private async getContentByCategory(category: string, preferences: EducationPreferences): Promise<EducationContent[]> {
    try {
      const content = await db
        .select({
          id: cmsArticles.id,
          title: cmsArticles.title,
          content: cmsArticles.content,
          category: cmsArticles.category,
          publishedAt: cmsArticles.publishedAt,
          tags: cmsArticles.tags
        })
        .from(cmsArticles)
        .where(
          and(
            isNull(cmsArticles.deletedAt),
            eq(cmsArticles.status, "PUBLISHED"),
            eq(cmsArticles.category, category as ContentCategory)
          )
        )
        .orderBy(desc(cmsArticles.publishedAt))
        .limit(2);

      return content.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        difficulty: preferences.preferredDifficulty,
        relevanceScore: 0.7,
        deliveryMethod: "scheduled",
        readTime: this.estimateReadTime(item.content),
        tags: item.tags || [],
        lastUpdated: item.publishedAt || new Date()
      }));

    } catch (error) {
      logger.error("Failed to get content by category", error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Remove duplicate content
   */
  private deduplicateContent(content: EducationContent[]): EducationContent[] {
    const seen = new Set<string>();
    return content.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Get relevant categories for patient
   */
  private getRelevantCategories(profile: PatientProfile, preferences: EducationPreferences): string[] {
    const categories = new Set(preferences.preferredCategories);

    // Add categories based on conditions
    for (const condition of profile.activeConditions) {
      const relatedCategories = this.CONDITION_TOPIC_MAPPING[condition] || [];
      relatedCategories.forEach(cat => categories.add(cat));
    }

    return Array.from(categories);
  }

  /**
   * Infer conditions from medications
   */
  private inferConditionsFromMedications(medications: string[]): string[] {
    const conditions: string[] = [];
    const medicationPatterns: Record<string, string> = {
      "metformin": "diabetes",
      "insulin": "diabetes",
      "amlodipine": "hypertension",
      "lisinopril": "hypertension",
      "salbutamol": "asthma",
      "paracetamol": "chronic_pain"
    };

    for (const medication of medications) {
      for (const [medPattern, condition] of Object.entries(medicationPatterns)) {
        if (medication.toLowerCase().includes(medPattern)) {
          conditions.push(condition);
        }
      }
    }

    return [...new Set(conditions)];
  }

  /**
   * Estimate read time in minutes
   */
  private estimateReadTime(content: string): number {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Update preferences based on engagement
   */
  private async updatePreferencesBasedOnEngagement(
    patientId: string,
    contentId: string,
    engagementScore: number
  ): Promise<void> {
    // In a real implementation, this would update patient preferences
    // based on their engagement with different types of content
    logger.info("Updating preferences based on engagement", {
      patientId,
      contentId,
      engagementScore
    });
  }

  /**
   * Format education content for delivery
   */
  formatContentForDelivery(content: EducationContent, format: "whatsapp" | "web" = "whatsapp"): string {
    if (format === "whatsapp") {
      return `💡 *${content.title}*\n\n` +
             `${content.content.substring(0, 300)}...\n\n` +
             `📚 Kategori: ${content.category}\n` +
             `⏱️ Waktu baca: ${content.readTime} menit\n\n` +
             `Semoga bermanfaat! 💙`;
    } else {
      return `# ${content.title}\n\n` +
             `${content.content}\n\n` +
             `**Kategori:** ${content.category} | **Waktu baca:** ${content.readTime} menit`;
    }
  }
}

// Export singleton instance
export const healthEducationService = new HealthEducationService();