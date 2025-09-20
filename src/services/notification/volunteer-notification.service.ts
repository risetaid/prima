import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/index";
import { logger } from "@/lib/logger";
import {
  volunteerNotifications,
  patients,
  users,
  VolunteerNotification,
  NewVolunteerNotification,
} from "@/db/schema";

type Patient = typeof patients.$inferSelect;
type User = typeof users.$inferSelect;
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";

export type EscalationReason = string; // 'emergency_detection' | 'low_confidence' | 'complex_inquiry'
export type NotificationPriority = string; // 'emergency' | 'high' | 'medium' | 'low'
export type NotificationStatus = string; // 'pending' | 'assigned' | 'responded' | 'resolved' | 'dismissed'

export interface EscalationData {
  patientId: string;
  message: string;
  reason: EscalationReason;
  confidence?: number;
  intent?: string;
  patientContext?: Record<string, unknown>;
}

export interface NotificationChannel {
  type: "whatsapp" | "email" | "dashboard";
  enabled: boolean;
  recipients?: string[];
}

export class VolunteerNotificationService {
  private whatsappService: WhatsAppService;

  constructor() {
    this.whatsappService = new WhatsAppService();
  }

  /**
   * Create a new volunteer notification based on escalation rules
   */
  async createNotification(
    data: EscalationData
  ): Promise<VolunteerNotification> {
    const priority = this.determinePriority(data.reason, data.confidence);
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, data.patientId))
      .limit(1);

    if (!patient.length) {
      throw new Error(`Patient with ID ${data.patientId} not found`);
    }

    const notificationData: NewVolunteerNotification = {
      patientId: data.patientId,
      message: data.message,
      priority,
      escalationReason: data.reason,
      confidence: data.confidence,
      intent: data.intent,
      patientContext: data.patientContext,
    };

    const [notification] = await db
      .insert(volunteerNotifications)
      .values(notificationData)
      .returning();

    // Send notifications through configured channels
    await this.sendNotifications(notification, patient[0]);

    return notification;
  }

  /**
   * Determine notification priority based on escalation reason and confidence
   */
  private determinePriority(
    reason: EscalationReason,
    confidence?: number
  ): string {
    switch (reason) {
      case "emergency_detection":
        return "emergency";
      case "low_confidence":
        return confidence && confidence < 30 ? "high" : "medium";
      case "complex_inquiry":
        return "medium";
      default:
        return "low";
    }
  }

  /**
   * Send notifications through all configured channels
   */
  private async sendNotifications(
    notification: VolunteerNotification,
    patient: Patient
  ): Promise<void> {
    const channels = await this.getNotificationChannels();

    const promises = channels
      .filter((channel) => channel.enabled)
      .map((channel) => this.sendToChannel(channel, notification, patient));

    await Promise.allSettled(promises);
  }

  /**
   * Get configured notification channels
   */
  private async getNotificationChannels(): Promise<NotificationChannel[]> {
    // TODO: Load from configuration/database
    // For now, return default channels
    return [
      {
        type: "dashboard",
        enabled: true,
      },
      {
        type: "whatsapp",
        enabled: true,
        recipients: await this.getVolunteerWhatsAppNumbers(),
      },
      {
        type: "email",
        enabled: false, // Email service not implemented yet
      },
    ];
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: VolunteerNotification,
    patient: Patient
  ): Promise<void> {
    switch (channel.type) {
      case "whatsapp":
        await this.sendWhatsAppNotification(channel, notification, patient);
        break;
      case "email":
        await this.sendEmailNotification(channel, notification, patient);
        break;
      case "dashboard":
        // Dashboard notifications are handled by the UI
        break;
    }
  }

  /**
   * Send WhatsApp notification to volunteers
   */
  private async sendWhatsAppNotification(
    channel: NotificationChannel,
    notification: VolunteerNotification,
    patient: Patient
  ): Promise<void> {
    if (!channel.recipients || channel.recipients.length === 0 || !patient) {
      return;
    }

    const message = this.buildWhatsAppMessage(notification, patient);

    const promises = channel.recipients.map((recipient) =>
      this.whatsappService.send(recipient, message)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send email notification (placeholder for future implementation)
   */
  private async sendEmailNotification(
    channel: NotificationChannel,
    notification: VolunteerNotification,
    patient: Patient
  ): Promise<void> {
    // TODO: Implement email service
    logger.info("Email notification:", { channel, notification, patient });
  }

  /**
   * Build WhatsApp message for volunteer notification
   */
  private buildWhatsAppMessage(
    notification: VolunteerNotification,
    patient: Patient
  ): string {
    const priorityEmoji = this.getPriorityEmoji(notification.priority);
    const reasonText = this.getReasonText(notification.escalationReason);

    let message = `${priorityEmoji} *NOTIFIKASI VOLUNTEER* ${priorityEmoji}

*Pasien:* ${patient.name}
*No. HP:* ${patient.phoneNumber}
*Alasan:* ${reasonText}
*Prioritas:* ${notification.priority.toUpperCase()}`;

    if (notification.confidence) {
      message += `\n*Tingkat Keyakinan:* ${notification.confidence}%`;
    }

    if (notification.intent) {
      message += `\n*Intent:* ${notification.intent}`;
    }

    message += `

*Pesan Pasien:*
"${notification.message}"

Silakan periksa dashboard untuk detail lengkap dan respons yang sesuai.

💙 Tim PRIMA`;

    return message;
  }

  /**
   * Get priority emoji for WhatsApp message
   */
  private getPriorityEmoji(priority: NotificationPriority): string {
    switch (priority) {
      case "emergency":
        return "🚨";
      case "high":
        return "⚠️";
      case "medium":
        return "📋";
      case "low":
        return "ℹ️";
      default:
        return "📝";
    }
  }

  /**
   * Get human-readable reason text
   */
  private getReasonText(reason: EscalationReason): string {
    switch (reason) {
      case "emergency_detection":
        return "Deteksi Darurat";
      case "low_confidence":
        return "Respons Tidak Yakin";
      case "complex_inquiry":
        return "Pertanyaan Kompleks";
      default:
        return reason;
    }
  }

  /**
   * Get volunteer WhatsApp numbers (placeholder - should be from database)
   */
  private async getVolunteerWhatsAppNumbers(): Promise<string[]> {
    // Volunteer WhatsApp numbers would be retrieved from users table
    // Requires proper user management system with volunteer role assignment
    logger.debug(
      "Volunteer WhatsApp lookup not implemented - requires user management system"
    );
    return [];
  }

  /**
   * Get notifications for dashboard
   */
  async getNotifications(
    status?: NotificationStatus,
    priority?: NotificationPriority,
    limit: number = 50,
    offset: number = 0
  ): Promise<VolunteerNotification[]> {
    let whereClause = undefined;

    if (status || priority) {
      const conditions = [];
      if (status) conditions.push(eq(volunteerNotifications.status, status));
      if (priority)
        conditions.push(eq(volunteerNotifications.priority, priority));
      whereClause = and(...conditions);
    }

    const results = await db
      .select()
      .from(volunteerNotifications)
      .where(whereClause)
      .orderBy(desc(volunteerNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  /**
   * Get notifications with patient and volunteer details for dashboard
   */
  async getNotificationsWithDetails(
    status?: NotificationStatus,
    priority?: NotificationPriority,
    limit: number = 50,
    offset: number = 0
  ): Promise<
    Array<{
      notification: VolunteerNotification;
      patient: Patient | null;
      assignedVolunteer: User | null;
    }>
  > {
    let whereClause = undefined;

    if (status || priority) {
      const conditions = [];
      if (status) conditions.push(eq(volunteerNotifications.status, status));
      if (priority)
        conditions.push(eq(volunteerNotifications.priority, priority));
      whereClause = and(...conditions);
    }

    return await db
      .select({
        notification: volunteerNotifications,
        patient: patients,
        assignedVolunteer: users,
      })
      .from(volunteerNotifications)
      .leftJoin(patients, eq(volunteerNotifications.patientId, patients.id))
      .leftJoin(users, eq(volunteerNotifications.assignedVolunteerId, users.id))
      .where(whereClause)
      .orderBy(desc(volunteerNotifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Assign notification to volunteer
   */
  async assignNotification(
    notificationId: string,
    volunteerId: string
  ): Promise<VolunteerNotification> {
    const [notification] = await db
      .update(volunteerNotifications)
      .set({
        assignedVolunteerId: volunteerId,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(volunteerNotifications.id, notificationId))
      .returning();

    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Mark notification as responded
   */
  async markAsResponded(
    notificationId: string,
    response: string
  ): Promise<VolunteerNotification> {
    const [notification] = await db
      .update(volunteerNotifications)
      .set({
        status: "responded",
        respondedAt: new Date(),
        response,
        updatedAt: new Date(),
      })
      .where(eq(volunteerNotifications.id, notificationId))
      .returning();

    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Resolve notification
   */
  async resolveNotification(
    notificationId: string
  ): Promise<VolunteerNotification> {
    const [notification] = await db
      .update(volunteerNotifications)
      .set({
        status: "resolved",
        updatedAt: new Date(),
      })
      .where(eq(volunteerNotifications.id, notificationId))
      .returning();

    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    emergency: number;
    high: number;
    avgResponseTime: number;
  }> {
    const notifications = await db.select().from(volunteerNotifications);

    const total = notifications.length;
    const pending = notifications.filter((n) => n.status === "pending").length;
    const emergency = notifications.filter(
      (n) => n.priority === "emergency"
    ).length;
    const high = notifications.filter((n) => n.priority === "high").length;

    // Calculate average response time for resolved notifications
    const resolvedNotifications = notifications.filter(
      (n) => n.status === "responded" && n.respondedAt
    );

    const avgResponseTime =
      resolvedNotifications.length > 0
        ? resolvedNotifications.reduce((sum, n) => {
            const responseTime =
              n.respondedAt!.getTime() - n.createdAt.getTime();
            return sum + responseTime;
          }, 0) /
          resolvedNotifications.length /
          (1000 * 60) // Convert to minutes
        : 0;

    return {
      total,
      pending,
      emergency,
      high,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }
}
