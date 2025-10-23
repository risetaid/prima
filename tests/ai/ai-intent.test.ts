// Unit tests for AI Intent Service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIIntentService, getAIIntentService, resetAIIntentService } from '@/services/ai/ai-intent.service';
import type { AIIntentResult } from '@/lib/ai-types';

// Create mock function at module level
const mockSendStructuredRequest = vi.fn();
const mockGetUsageStats = vi.fn(() => ({
  requestCount: 0,
  totalCost: 0,
  averageCostPerRequest: 0,
}));

// Mock AI client
vi.mock('@/services/ai/ai-client', () => ({
  getAIClient: vi.fn(() => ({
    sendStructuredRequest: mockSendStructuredRequest,
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

describe('AIIntentService', () => {
  let service: AIIntentService;

  beforeEach(() => {
    // Set up environment
    process.env.AI_INTENT_CLASSIFICATION_ENABLED = 'true';
    process.env.AI_CONFIDENCE_THRESHOLD = '70';

    // Reset mocks
    mockSendStructuredRequest.mockReset();
    mockGetUsageStats.mockReset();
    mockGetUsageStats.mockReturnValue({
      requestCount: 0,
      totalCost: 0,
      averageCostPerRequest: 0,
    });

    // Reset service
    resetAIIntentService();
    service = new AIIntentService();
  });

  describe('classifyIntent', () => {
    it('should classify reminder_confirmed with high confidence', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'reminder_confirmed',
          confidence: 95,
          reasoning: 'Pasien jelas menyatakan sudah minum obat',
        },
        usage: {
          requestId: 'msg_123',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 500,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyIntent('sudah minum obat tadi pagi');

      expect(result.intent).toBe('reminder_confirmed');
      expect(result.confidence).toBe(95);
      expect(result.confidenceLevel).toBe('high');
      expect(mockSendStructuredRequest).toHaveBeenCalledTimes(1);
    });

    it('should classify reminder_missed', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'reminder_missed',
          confidence: 88,
          reasoning: 'Pasien belum menyelesaikan tindakan',
        },
        usage: {
          requestId: 'msg_456',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 450,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyIntent('belum sempat, nanti sore');

      expect(result.intent).toBe('reminder_missed');
      expect(result.confidence).toBe(88);
      expect(result.confidenceLevel).toBe('high');
    });

    it('should classify verification_accept', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'verification_accept',
          confidence: 92,
          reasoning: 'Kata "boleh" menunjukkan persetujuan',
        },
        usage: {
          requestId: 'msg_789',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 480,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyIntent('boleh dong, kirim aja');

      expect(result.intent).toBe('verification_accept');
      expect(result.confidence).toBe(92);
    });

    it('should return unclear for low confidence', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'unclear',
          confidence: 40,
          reasoning: 'Pesan hanya emoji tanpa konteks',
        },
        usage: {
          requestId: 'msg_unclear',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 400,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyIntent('👍');

      expect(result.intent).toBe('unclear');
      expect(result.confidence).toBe(0);
      expect(result.confidenceLevel).toBe('low');
    });

    it('should return unclear when below confidence threshold', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'reminder_confirmed',
          confidence: 65, // Below threshold of 70
          reasoning: 'Tidak yakin, bisa jadi konfirmasi atau bukan',
        },
        usage: {
          requestId: 'msg_low_conf',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 450,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyIntent('mungkin');

      expect(result.intent).toBe('unclear');
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('Low confidence');
    });

    it('should return unclear on AI error', async () => {
      mockSendStructuredRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.classifyIntent('test message');

      expect(result.intent).toBe('unclear');
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('Classification error');
    });

    it('should return unclear when disabled', async () => {
      process.env.AI_INTENT_CLASSIFICATION_ENABLED = 'false';
      resetAIIntentService();
      const disabledService = new AIIntentService();

      const result = await disabledService.classifyIntent('test message');

      expect(result.intent).toBe('unclear');
      expect(result.reasoning).toContain('disabled');
      expect(mockSendStructuredRequest).not.toHaveBeenCalled();
    });
  });

  describe('classifyReminderConfirmation', () => {
    it('should call classifyIntent with reminder context', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'reminder_confirmed',
          confidence: 90,
          reasoning: 'Clear confirmation',
        },
        usage: {
          requestId: 'msg_reminder',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 460,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyReminderConfirmation('sudah', 'Budi');

      expect(result.intent).toBe('reminder_confirmed');
      expect(mockSendStructuredRequest).toHaveBeenCalled();
    });
  });

  describe('classifyVerificationResponse', () => {
    it('should call classifyIntent with verification context', async () => {
      mockSendStructuredRequest.mockResolvedValue({
        data: {
          intent: 'verification_accept',
          confidence: 85,
          reasoning: 'Patient accepts',
        },
        usage: {
          requestId: 'msg_verify',
          model: 'claude-haiku-4-5-20251001',
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: 0.00035,
          latencyMs: 470,
          timestamp: new Date(),
        },
      });

      const result = await service.classifyVerificationResponse('ya setuju', 'Ani');

      expect(result.intent).toBe('verification_accept');
    });
  });

  describe('isEmergency', () => {
    it('should detect emergency keywords', () => {
      expect(service.isEmergency('sesak nafas parah')).toBe(true);
      expect(service.isEmergency('muntah darah')).toBe(true);
      expect(service.isEmergency('darurat tolong')).toBe(true);
      expect(service.isEmergency('pusing parah sekali')).toBe(true);
    });

    it('should not flag normal messages', () => {
      expect(service.isEmergency('sudah minum obat')).toBe(false);
      expect(service.isEmergency('terima kasih')).toBe(false);
      expect(service.isEmergency('kapan jadwal kontrol?')).toBe(false);
    });
  });

  describe('getConfidenceLevel', () => {
    it('should map confidence scores correctly', () => {
      const result1: AIIntentResult = {
        intent: 'reminder_confirmed',
        confidence: 85,
        confidenceLevel: 'high',
        reasoning: 'Test',
      };
      expect(result1.confidenceLevel).toBe('high');

      const result2: AIIntentResult = {
        intent: 'reminder_confirmed',
        confidence: 65,
        confidenceLevel: 'medium',
        reasoning: 'Test',
      };
      expect(result2.confidenceLevel).toBe('medium');

      const result3: AIIntentResult = {
        intent: 'unclear',
        confidence: 40,
        confidenceLevel: 'low',
        reasoning: 'Test',
      };
      expect(result3.confidenceLevel).toBe('low');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const service1 = getAIIntentService();
      const service2 = getAIIntentService();
      expect(service1).toBe(service2);
    });

    it('should reset singleton', () => {
      const service1 = getAIIntentService();
      resetAIIntentService();
      const service2 = getAIIntentService();
      expect(service1).not.toBe(service2);
    });
  });
});
