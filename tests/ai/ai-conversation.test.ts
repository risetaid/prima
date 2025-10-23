// Unit tests for AI Conversation Service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AIConversationService,
  getAIConversationService,
  resetAIConversationService,
} from '@/services/ai/ai-conversation.service';
import type { AIConversationContext } from '@/lib/ai-types';

// Create mock functions
const mockSendMessage = vi.fn();
const mockGetUsageStats = vi.fn(() => ({
  requestCount: 0,
  totalCost: 0,
  averageCostPerRequest: 0,
}));

// Mock AI client
vi.mock('@/services/ai/ai-client', () => ({
  getAIClient: vi.fn(() => ({
    sendMessage: mockSendMessage,
    getUsageStats: mockGetUsageStats,
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AIConversationService', () => {
  let service: AIConversationService;

  beforeEach(() => {
    process.env.AI_CONVERSATION_ENABLED = 'true';

    mockSendMessage.mockReset();
    mockGetUsageStats.mockReset();
    mockGetUsageStats.mockReturnValue({
      requestCount: 0,
      totalCost: 0,
      averageCostPerRequest: 0,
    });

    resetAIConversationService();
    service = new AIConversationService();
  });

  describe('respond', () => {
    it('should generate response for health question', async () => {
      mockSendMessage.mockResolvedValue({
        content:
          'Obat kemoterapi memang dapat menyebabkan mual. Ini adalah efek samping yang umum. Sebaiknya minum obat anti-mual yang diresepkan dokter. Jika mual sangat parah, hubungi dokter Anda.',
        usage: {
          requestId: 'msg_health',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 200,
          outputTokens: 150,
          totalTokens: 350,
          cost: 0.00095,
          latencyMs: 800,
          timestamp: new Date(),
        },
      });

      const context: AIConversationContext = {
        patientId: 'patient_123',
        patientName: 'Budi',
        conversationHistory: [],
        patientContext: {
          cancerStage: 'Stage 2',
        },
      };

      const result = await service.respond('Obat kemo bikin mual, normal ga?', context);

      expect(result.message).toContain('mual');
      expect(result.message).toContain('dokter');
      expect(result.shouldEscalate).toBe(true); // Should escalate for severe symptoms
      expect(result.suggestedAction).toBe('notify_volunteer');
      expect(result.metadata.tokensUsed).toBe(350);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    it('should detect emergency and escalate', async () => {
      mockSendMessage.mockResolvedValue({
        content:
          '🚨 Ini situasi darurat! Sesak nafas parah memerlukan perhatian medis segera. Segera hubungi dokter atau ke rumah sakit terdekat. Jangan tunda!',
        usage: {
          requestId: 'msg_emergency',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 150,
          outputTokens: 100,
          totalTokens: 250,
          cost: 0.00065,
          latencyMs: 600,
          timestamp: new Date(),
        },
      });

      const context: AIConversationContext = {
        patientId: 'patient_456',
        patientName: 'Ani',
        conversationHistory: [],
      };

      const result = await service.respond('sesak nafas parah, ga bisa bernapas', context);

      expect(result.shouldEscalate).toBe(true);
      expect(result.suggestedAction).toBe('mark_emergency');
      expect(result.escalationReason).toContain('emergency');
    });

    it('should handle multi-turn conversation', async () => {
      mockSendMessage.mockResolvedValue({
        content:
          'Untuk obat merah (doxorubicin), sebaiknya diminum setelah makan untuk mengurangi mual. Obat biru (cisplatin) bisa diminum sebelum atau sesudah makan.',
        usage: {
          requestId: 'msg_followup',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 300,
          outputTokens: 120,
          totalTokens: 420,
          cost: 0.00102,
          latencyMs: 900,
          timestamp: new Date(),
        },
      });

      const context: AIConversationContext = {
        patientId: 'patient_789',
        patientName: 'Citra',
        conversationHistory: [
          {
            role: 'user',
            content: 'Kapan harus minum obat?',
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'Obat kemoterapi biasanya diminum sesuai jadwal dokter.',
            timestamp: new Date(),
          },
        ],
      };

      const result = await service.respond('Apa bedanya obat merah dan biru?', context);

      expect(result.message).toContain('obat');
      expect(result.shouldEscalate).toBe(false); // General question, not emergency
      expect(result.suggestedAction).toBe('send_message');
    });

    it('should return default response when disabled', async () => {
      process.env.AI_CONVERSATION_ENABLED = 'false';
      resetAIConversationService();
      const disabledService = new AIConversationService();

      const context: AIConversationContext = {
        patientId: 'patient_disabled',
        patientName: 'Test',
        conversationHistory: [],
      };

      const result = await disabledService.respond('test question', context);

      expect(result.message).toContain('tidak dapat menjawab');
      expect(result.metadata.model).toBe('fallback');
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should handle AI error gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('API Error'));

      const context: AIConversationContext = {
        patientId: 'patient_error',
        patientName: 'Error Test',
        conversationHistory: [],
      };

      const result = await service.respond('test question', context);

      expect(result.message).toContain('kesulitan');
      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('error');
    });

    it('should detect complex medical questions requiring escalation', async () => {
      mockSendMessage.mockResolvedValue({
        content:
          'Perubahan dosis obat harus dikonsultasikan dengan dokter Anda. Saya tidak dapat memberikan rekomendasi dosis. Silakan hubungi dokter untuk penyesuaian.',
        usage: {
          requestId: 'msg_complex',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 180,
          outputTokens: 90,
          totalTokens: 270,
          cost: 0.00063,
          latencyMs: 650,
          timestamp: new Date(),
        },
      });

      const context: AIConversationContext = {
        patientId: 'patient_complex',
        patientName: 'Deni',
        conversationHistory: [],
      };

      const result = await service.respond('Bisa ganti dosis obat ga?', context);

      expect(result.shouldEscalate).toBe(true);
      expect(result.escalationReason).toContain('professional judgment');
      expect(result.message).toContain('dokter');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const service1 = getAIConversationService();
      const service2 = getAIConversationService();
      expect(service1).toBe(service2);
    });

    it('should reset singleton', () => {
      const service1 = getAIConversationService();
      resetAIConversationService();
      const service2 = getAIConversationService();
      expect(service1).not.toBe(service2);
    });
  });
});
