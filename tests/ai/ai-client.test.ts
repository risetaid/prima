// Unit tests for AI Client
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIClient, getAIClient, resetAIClient } from '@/services/ai/ai-client';

// Create mock functions
const mockCreate = vi.fn();

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    status: number;
    headers?: Record<string, string>;
    constructor(message: string, status = 500, headers?: Record<string, string>) {
      super(message);
      this.status = status;
      this.headers = headers;
      this.name = 'APIError';
    }
  }

  const MockAnthropic: any = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));

  MockAnthropic.APIError = MockAPIError;

  return {
    default: MockAnthropic,
  };
});

// Mock tokenizer
vi.mock('@anthropic-ai/tokenizer', () => ({
  countTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AIClient', () => {
  let client: AIClient;

  beforeEach(() => {
    // Reset environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    process.env.AI_MODEL = 'claude-haiku-4-5-20251001';
    process.env.AI_MAX_TOKENS = '1024';
    process.env.AI_TEMPERATURE = '0.3';

    // Reset mocks
    mockCreate.mockReset();

    // Create fresh client
    resetAIClient();
    client = new AIClient();
  });

  afterEach(() => {
    resetAIClient();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with environment config', () => {
      const stats = client.getUsageStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.totalCost).toBe(0);
    });

    it('should throw error if API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AIClient()).toThrow('ANTHROPIC_API_KEY is required');
    });

    it('should accept custom configuration', () => {
      const customClient = new AIClient({
        apiKey: 'custom-key',
        model: 'custom-model',
        maxTokens: 2048,
        temperature: 0.5,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      // Mock successful response
      mockCreate.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Test response from Claude' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      });

      const result = await client.sendMessage({
        systemPrompt: 'You are a helpful assistant',
        userMessage: 'Hello',
      });

      expect(result.content).toBe('Test response from Claude');
      expect(result.usage.requestId).toBe('msg_123');
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
      expect(result.usage.cost).toBeGreaterThan(0);

      // Verify API was called correctly
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        temperature: 0.3,
        system: 'You are a helpful assistant',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      });
    });

    it('should handle multiple text blocks', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_456',
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' },
        ],
        usage: { input_tokens: 50, output_tokens: 30 },
      });

      const result = await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'User',
      });

      expect(result.content).toBe('First part\nSecond part');
    });

    it('should track usage stats', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_789',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message 1',
      });

      await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message 2',
      });

      const stats = client.getUsageStats();
      expect(stats.requestCount).toBe(2);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.averageCostPerRequest).toBeGreaterThan(0);
    });

    it('should handle rate limit errors', async () => {
      const RateLimitError = {
        name: 'APIError',
        message: 'Rate limit exceeded',
        status: 429,
        headers: { 'retry-after': '60' },
      };

      mockCreate.mockRejectedValue(RateLimitError);

      await expect(
        client.sendMessage({
          systemPrompt: 'System',
          userMessage: 'Message',
        })
      ).rejects.toMatchObject({
        name: 'AIRateLimitError',
        code: 'RATE_LIMIT',
        retryAfter: 60,
      });
    });

    it('should handle timeout errors', async () => {
      const TimeoutError = {
        name: 'APIError',
        message: 'Request timeout',
        status: 408,
      };
      mockCreate.mockRejectedValue(TimeoutError);

      await expect(
        client.sendMessage({
          systemPrompt: 'System',
          userMessage: 'Message',
        })
      ).rejects.toMatchObject({
        name: 'AITimeoutError',
        code: 'TIMEOUT',
      });
    });

    it('should handle generic API errors', async () => {
      const GenericError = {
        name: 'APIError',
        message: 'Server error',
        status: 500,
      };
      mockCreate.mockRejectedValue(GenericError);

      await expect(
        client.sendMessage({
          systemPrompt: 'System',
          userMessage: 'Message',
        })
      ).rejects.toMatchObject({
        name: 'AIServiceError',
        code: 'API_ERROR',
      });
    });
  });

  describe('sendStructuredRequest', () => {
    it('should parse JSON response', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_structured',
        content: [
          {
            type: 'text',
            text: '```json\n{"intent":"reminder_confirmed","confidence":95}\n```',
          },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await client.sendStructuredRequest<{
        intent: string;
        confidence: number;
      }>({
        systemPrompt: 'Classify intent',
        userMessage: 'sudah minum obat',
      });

      expect(result.data.intent).toBe('reminder_confirmed');
      expect(result.data.confidence).toBe(95);
      expect(result.usage.requestId).toBe('msg_structured');
    });

    it('should parse JSON without code blocks', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_plain_json',
        content: [
          { type: 'text', text: '{"status":"success","value":42}' },
        ],
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      const result = await client.sendStructuredRequest<{
        status: string;
        value: number;
      }>({
        systemPrompt: 'System',
        userMessage: 'Message',
      });

      expect(result.data.status).toBe('success');
      expect(result.data.value).toBe(42);
    });

    it('should throw error on invalid JSON', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_invalid',
        content: [{ type: 'text', text: 'This is not JSON' }],
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      await expect(
        client.sendStructuredRequest({
          systemPrompt: 'System',
          userMessage: 'Message',
        })
      ).rejects.toMatchObject({
        name: 'AIServiceError',
        code: 'INVALID_RESPONSE',
      });
    });
  });

  describe('countTokens', () => {
    it('should count tokens', () => {
      const count = client.countTokens('Hello world');
      expect(count).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const count = client.countTokens('');
      expect(count).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const client1 = getAIClient();
      const client2 = getAIClient();
      expect(client1).toBe(client2);
    });

    it('should reset singleton', () => {
      const client1 = getAIClient();
      resetAIClient();
      const client2 = getAIClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost correctly', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_cost',
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 1_000_000, // 1M tokens
          output_tokens: 1_000_000, // 1M tokens
        },
      });

      const result = await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message',
      });

      // Haiku pricing: $1/1M input, $5/1M output
      // Expected: 1*1 + 1*5 = $6.00
      expect(result.usage.cost).toBeCloseTo(6.0, 2);
    });

    it('should track cumulative costs', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_cumulative',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message 1',
      });

      const firstCost = client.getUsageStats().totalCost;

      await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message 2',
      });

      const secondCost = client.getUsageStats().totalCost;
      expect(secondCost).toBeGreaterThan(firstCost);
      expect(secondCost).toBeCloseTo(firstCost * 2, 6);
    });
  });

  describe('resetStats', () => {
    it('should reset usage statistics', async () => {
      mockCreate.mockResolvedValue({
        id: 'msg_reset',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await client.sendMessage({
        systemPrompt: 'System',
        userMessage: 'Message',
      });

      expect(client.getUsageStats().requestCount).toBe(1);

      client.resetStats();

      expect(client.getUsageStats().requestCount).toBe(0);
      expect(client.getUsageStats().totalCost).toBe(0);
    });
  });
});
