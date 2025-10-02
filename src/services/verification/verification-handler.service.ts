// Simplified Verification Handler - Single responsibility for YA/TIDAK responses
import { db, patients, type Patient } from "@/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ConversationStateService } from "@/services/conversation-state.service";
import { WhatsAppService } from "@/services/whatsapp/whatsapp.service";
import { invalidateAfterPatientOperation } from "@/lib/cache-invalidation";

export type VerificationResult = {
    processed: boolean;
    action: 'verified' | 'declined' | 'unsubscribed' | 'clarification_requested';
    message: string;
};

export class VerificationHandler {
    private conversationService: ConversationStateService;
    private whatsappService: WhatsAppService;

    constructor() {
        this.conversationService = new ConversationStateService();
        this.whatsappService = new WhatsAppService();
    }

    /**
     * Process verification response using keyword-based detection only
     */
    async process(message: string, patient: Patient): Promise<VerificationResult> {
        const intent = this.detectIntent(message);

        logger.info("Processing simplified verification", {
            patientId: patient.id,
            message: message.substring(0, 50),
            detectedIntent: intent,
        });

        switch (intent) {
            case 'accept':
                return this.handleAccept(patient);
            case 'decline':
                return this.handleDecline(patient);
            case 'unsubscribe':
                return this.handleUnsubscribe(patient);
            default:
                return this.handleLowConfidence(patient);
        }
    }

    /**
     * Simple keyword-based intent detection
     */
    private detectIntent(message: string): 'accept' | 'decline' | 'unsubscribe' | 'other' {
        const msg = message.toLowerCase().trim();

        // Accept patterns
        const acceptPatterns = ['ya', 'iya', 'yes', 'y', 'setuju', 'boleh', 'ok', 'oke'];
        if (acceptPatterns.some(pattern => msg.includes(pattern))) {
            return 'accept';
        }

        // Decline patterns
        const declinePatterns = ['tidak', 'no', 'n', 'tolak', 'ga', 'gak', 'engga'];
        if (declinePatterns.some(pattern => msg.includes(pattern))) {
            return 'decline';
        }

        // Unsubscribe patterns
        const unsubscribePatterns = ['berhenti', 'stop', 'unsubscribe', 'cabut'];
        if (unsubscribePatterns.some(pattern => msg.includes(pattern))) {
            return 'unsubscribe';
        }

        return 'other';
    }

    private async handleAccept(patient: Patient): Promise<VerificationResult> {
        await db
            .update(patients)
            .set({
                verificationStatus: "VERIFIED",
                verificationResponseAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(patients.id, patient.id));

        // Invalidate cache after verification status update
        await invalidateAfterPatientOperation(patient.id, 'update');

        await this.whatsappService.sendAck(
            patient.phoneNumber,
            `Terima kasih ${patient.name}! ✅\n\nAnda akan menerima pengingat dari relawan PRIMA.\n\nUntuk berhenti kapan saja, ketik: *BERHENTI*\n\n💙 Tim PRIMA`
        );

        await this.conversationService.clearContext(patient.id);

        return {
            processed: true,
            action: 'verified',
            message: "Patient verified via simplified handler",
        };
    }

    private async handleDecline(patient: Patient): Promise<VerificationResult> {
        await db
            .update(patients)
            .set({
                verificationStatus: "DECLINED",
                verificationResponseAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(patients.id, patient.id));

        // Invalidate cache after verification status update
        await invalidateAfterPatientOperation(patient.id, 'update');

        await this.whatsappService.sendAck(
            patient.phoneNumber,
            `Baik ${patient.name}, terima kasih atas responsnya.\n\nSemoga sehat selalu! 🙏\n\n💙 Tim PRIMA`
        );

        await this.conversationService.clearContext(patient.id);

        return {
            processed: true,
            action: 'declined',
            message: "Patient declined verification via simplified handler",
        };
    }

    private async handleUnsubscribe(patient: Patient): Promise<VerificationResult> {
        await db
            .update(patients)
            .set({
                verificationStatus: "DECLINED",
                verificationResponseAt: new Date(),
                updatedAt: new Date(),
                isActive: false,
            })
            .where(eq(patients.id, patient.id));

        // Invalidate cache after verification status update
        await invalidateAfterPatientOperation(patient.id, 'update');

        await this.whatsappService.sendAck(
            patient.phoneNumber,
            `Baik ${patient.name}, kami akan berhenti mengirimkan pengingat. 🛑\n\nSemoga sehat selalu! 🙏💙`
        );

        await this.conversationService.clearContext(patient.id);

        return {
            processed: true,
            action: 'unsubscribed',
            message: "Patient unsubscribed via simplified handler",
        };
    }

    private async handleLowConfidence(patient: Patient): Promise<VerificationResult> {
        await this.whatsappService.sendAck(
            patient.phoneNumber,
            `Halo ${patient.name}, mohon balas dengan jelas:\n\n✅ *YA* atau *SETUJU* untuk menerima pengingat\n❌ *TIDAK* atau *TOLAK* untuk menolak\n\nTerima kasih! 💙 Tim PRIMA`
        );

        return {
            processed: true,
            action: 'clarification_requested',
            message: "Low confidence response - clarification sent via simplified handler",
        };
    }
}